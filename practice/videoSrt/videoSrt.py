import boto3
import torch
import soundfile as sf
import torchaudio.transforms as T
from transformers import WhisperProcessor, WhisperForConditionalGeneration
from io import BytesIO
from moviepy.editor import VideoFileClip
from datetime import timedelta
from dotenv import load_dotenv
import os
import tempfile
import socketio
import asyncio
import time
import json
import jwt

load_dotenv(dotenv_path='../.env')
BUCKET_NAME = os.environ.get("BUCKET_NAME", "")
SQS_URL = os.environ.get("SQS_URL_2", "")
AWS_ACCESS_KEY_ID = os.environ.get("AWS_ACCESS_KEY", "")
AWS_SECRET_ACCESS_KEY = os.environ.get("AWS_SECRET_KEY", "")
JWT_SECRET_KEY = os.environ.get("JWT_SECRET_KEY", "")
CDN_URL = os.environ.get("CDN_URL", "")
INSTANCE_ID = os.environ.get("INSTANCE_ID", "")
ENV = os.environ.get("INSTANCE_ID", "")
# Ensure boto3 uses these credentials
boto3.setup_default_session(
    aws_access_key_id=AWS_ACCESS_KEY_ID,
    aws_secret_access_key=AWS_SECRET_ACCESS_KEY,
    region_name='us-west-2'
)

# Generate the JWT token
def generate_token():
    payload = {
        'user_id': 'srt-convert',  # Example payload
        'exp': time.time() + 60 * 20  # Token expires in 10 minutes
    }
    token = jwt.encode(payload, JWT_SECRET_KEY, algorithm='HS256')
    return token

# Initialize S3 client and Socket.IO
s3_client = boto3.client('s3')

# Initialize EC2 client
ec2_client = boto3.client('ec2', region_name='us-west-2')
INSTANCE_ID = os.environ.get("INSTANCE_ID", "")

sio = socketio.Client()
token = generate_token()
# Connect to a Socket.IO server
sio.connect('https://www.connectnow.website' if ENV == 'production' else 'http://127.0.0.1:8080', auth={'token': token})
# Define event handlers


# Initialize SQS client
sqs_client = boto3.client('sqs', region_name='us-west-2')
# Your SQS Queue URL
sqs_queue_url = SQS_URL

# Load the Whisper model and processor
model_name = "openai/whisper-large"
processor = WhisperProcessor.from_pretrained(model_name)

# Move model to GPU if available
device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
print("cuda_available: ", torch.cuda.is_available())
model = WhisperForConditionalGeneration.from_pretrained(model_name).to(device)

def format_time(seconds):
    """Convert time to SRT format timestamp"""
    td = timedelta(seconds=seconds)
    total_seconds = int(td.total_seconds())
    milliseconds = int((seconds - total_seconds) * 1000)
    hours, remainder = divmod(total_seconds, 3600)
    minutes, seconds = divmod(remainder, 60)
    return f"{hours:02}:{minutes:02}:{seconds:02},{milliseconds:03}"

def create_srt(transcriptions, timestamps):
    """Generate SRT file content"""
    srt_content = []
    for i, (transcription, (start_time, end_time)) in enumerate(zip(transcriptions, timestamps)):
        srt_content.append(f"{i+1}")
        srt_content.append(f"{format_time(start_time)} --> {format_time(end_time)}")
        srt_content.append(transcription)
        srt_content.append("")

    return "\n".join(srt_content)

async def process_video_from_s3(bucket_name, file_key, file_a):
    # Check if the file is in file_a
    if file_key in file_a:
        return

    # Download the video file from S3
    video_stream = BytesIO()
    s3_client.download_fileobj(bucket_name, file_key, video_stream)
    video_stream.seek(0)

    # Write the video to a temporary file
    with tempfile.NamedTemporaryFile(delete=False, suffix=".mov") as temp_file:
        temp_file.write(video_stream.read())
        temp_file_path = temp_file.name

    # Load the MOV file and extract audio
    video_clip = VideoFileClip(temp_file_path)
    audio_path = temp_file_path.replace(".mov", ".wav")
    video_clip.audio.write_audiofile(audio_path, codec='pcm_s16le')

    # Load audio and prepare for processing
    speech_array, sampling_rate = sf.read(audio_path)
    speech_array = torch.tensor(speech_array, dtype=torch.float32).to(device)

    if len(speech_array.shape) > 1:
        speech_array = speech_array.mean(dim=1)

    resampler = T.Resample(sampling_rate, 16000).to(device)
    speech_array = resampler(speech_array)
    sampling_rate = 16000

    # Segment the audio into 30-second segments for finer detail
    segment_length = sampling_rate * 30
    segments = [speech_array[i:i + segment_length] for i in range(0, len(speech_array), segment_length)]
    timestamps = [(i * segment_length / sampling_rate, min((i + 1) * segment_length, len(speech_array)) / sampling_rate) for i in range(len(segments))]

    # Transcribe each segment
    transcriptions = []
    for segment in segments:
        inputs = processor(segment.cpu(), sampling_rate=sampling_rate, return_tensors="pt").to(device)
        attention_mask = torch.ones_like(inputs.input_features)

        with torch.no_grad():
            predicted_ids = model.generate(
                inputs.input_features.to(device),
                num_beams=5,  # Increased beam width for better transcription quality
                early_stopping=True,
                max_length=250,  # Increased max length to capture more content
                min_length=20,  # Increased min length to avoid short incomplete sentences
                attention_mask=attention_mask.to(device)
            )

        transcription = processor.batch_decode(predicted_ids, skip_special_tokens=True)
        transcriptions.append(transcription[0] if transcription else "")

    # Post-process transcriptions to remove duplicates
    final_transcriptions = []
    for transcription in transcriptions:
        if final_transcriptions and transcription == final_transcriptions[-1]:
            continue  # Skip if the current transcription is the same as the last one
        final_transcriptions.append(transcription)

    # Generate SRT content
    srt_content = create_srt(final_transcriptions, timestamps)

    # Upload the SRT file to S3
    srt_file_key = file_key.replace("converted-videos", "videoSrt").replace(".mov", ".srt")
    srt_stream = BytesIO(srt_content.encode('utf-8'))
    s3_client.upload_fileobj(srt_stream, bucket_name, srt_file_key, ExtraArgs={'ContentType': 'text/plain'})

    # Generate the S3 CDN URL
    s3_cdn_url = f"{CDN_URL}{srt_file_key}"

    # Notify the frontend via Socket.IO
    sio.emit('srt_ready', {'url': s3_cdn_url})

    # Clean up temporary files
    os.remove(temp_file_path)
    os.remove(audio_path)

# Last message time
last_message_time = time.time()

async def check_sqs_and_shutdown():
    global last_message_time
    while True:
        current_time = time.time()

        # Check if 10 minutes have passed since the last message
        if current_time - last_message_time > 60:  # 600 seconds = 10 minutes
            print("No SQS messages received in the last 10 minutes. Shutting down EC2 instance.")
            ec2_client.stop_instances(InstanceIds=[INSTANCE_ID])
            break  # Exit the loop to stop the script

        await asyncio.sleep(30)  # Check every 30 seconds

async def listen_to_sqs():
    global last_message_time  # 添加這一行以使用全局變數
    while True:
        # Poll SQS for new messages
        print("Polling SQS...")
        response = sqs_client.receive_message(
            QueueUrl=sqs_queue_url,
            MaxNumberOfMessages=1,  # Process one message at a time
            WaitTimeSeconds=20  # Long polling for 20 seconds
        )

        if 'Messages' in response:
            print("Message received")
            last_message_time = time.time()  # Reset the timer when a message is received
            for message in response['Messages']:
                message_body = json.loads(message['Body'])
                bucket_name = message_body['bucket']
                file_key = message_body['file']

                # Check if the file is in file_a
                file_a_bucket = BUCKET_NAME
                file_a_key = 'videoRecord/converted-videos/transcribed-videos.json'
                # 下載 file_a.json 檔案
                response = s3_client.get_object(Bucket=file_a_bucket, Key=file_a_key)
                # 讀取並解析 JSON 檔案
                file_a_content = json.loads(response['Body'].read().decode('utf-8'))
                processed_files = set(file_a_content.get('processed_files', []))
                
                if file_key not in processed_files:
                    # Process the video to generate SRT
                    await process_video_from_s3(bucket_name, file_key, processed_files)
                    
                    # Add the file to processed_files after processing
                    processed_files.add(file_key)
                    
                    # Update the file_a_content with the new processed files list
                    file_a_content['processed_files'] = list(processed_files)
                    
                    # Convert updated file_a_content to JSON and upload back to S3
                    updated_file_a_content = json.dumps(file_a_content)
                    s3_client.put_object(Bucket=BUCKET_NAME, Key='videoRecord/converted-videos/transcribed-videos.json', Body=updated_file_a_content)

                     # 刪除本地 file_a 檔案
                    if os.path.exists('transcribed-videos.json'):
                        os.remove('transcribed-videos.json')

                    # Delete the message from the queue after processing
                    sqs_client.delete_message(
                        QueueUrl=sqs_queue_url,
                        ReceiptHandle=message['ReceiptHandle']
                    )
        else:
            # No messages, wait before next poll
            await asyncio.sleep(5)

async def main():
    await asyncio.gather(
        listen_to_sqs(),
        check_sqs_and_shutdown()
    )

# Start listening to SQS and monitoring the shutdown condition
asyncio.run(main())
