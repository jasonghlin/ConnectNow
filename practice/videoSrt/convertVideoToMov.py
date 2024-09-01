import boto3
import json
import subprocess
from dotenv import load_dotenv
import os
import time
import socketio
import jwt

sqs = boto3.client('sqs', region_name='us-west-2')
s3 = boto3.client('s3')


load_dotenv(dotenv_path='../.env')
BUCKET_NAME = os.environ.get("BUCKET_NAME", "")
SQS_URL = os.environ.get("SQS_URL", "")
AWS_ACCESS_KEY_ID = os.environ.get("AWS_ACCESS_KEY", "")
AWS_SECRET_ACCESS_KEY = os.environ.get("AWS_SECRET_KEY", "")
JWT_SECRET_KEY = os.environ.get("JWT_SECRET_KEY", "")
CDN_URL = os.environ.get("CDN_URL", "")


# Generate the JWT token
def generate_token():
    payload = {
        'user_id': 'video-convert',  # Example payload
        'exp': time.time() + 60 * 20  # Token expires in 10 minutes
    }
    token = jwt.encode(payload, JWT_SECRET_KEY, algorithm='HS256')
    return token

# Initialize S3 client and Socket.IO
s3_client = boto3.client('s3')
sio = socketio.Client(logger=True )
token = generate_token()
# Connect to a Socket.IO server
sio.connect('https://www.connectnow.website' if ENV == 'production' else 'http://127.0.0.1:8080', auth={'token': token})
# Define event handlers
@sio.event
def connect():
    print("Connection established")

# Ensure boto3 uses these credentials
boto3.setup_default_session(
    aws_access_key_id=AWS_ACCESS_KEY_ID,
    aws_secret_access_key=AWS_SECRET_ACCESS_KEY
)

def monitor_sqs():
    while True:
        print("process start:")
        response = sqs.receive_message(
            QueueUrl=SQS_URL,
            MaxNumberOfMessages=1,
            WaitTimeSeconds=20  # Long polling
        )

        if 'Messages' in response:
            message = response['Messages'][0]
            process_message(message)
        else:
            print("No new messages. Waiting...")
            time.sleep(10)  # Wait for 10 seconds before checking again

def check_file_in_file_a(file_key):
    # Read File A from S3
    file_a_bucket = BUCKET_NAME
    file_a_key = 'videoRecord/raw-videos/processed-videos.json'
    
    try:
        response = s3.get_object(Bucket=file_a_bucket, Key=file_a_key)
        file_a_content = json.loads(response['Body'].read().decode('utf-8'))
        processed_files = file_a_content.get('processed_files', [])

        return file_key in processed_files
    except s3.exceptions.ClientError as e:
        if e.response['Error']['Code'] == '404':
            print(f"File A not found: {file_a_bucket}/{file_a_key}")
            return False
        else:
            raise

def check_file_exists(bucket, key):
    try:
        s3.head_object(Bucket=bucket, Key=key)
        return True
    except s3.exceptions.ClientError as e:
        if e.response['Error']['Code'] == '404':
            return False
        else:
            raise

def process_message(message):
    # Extract the message body
    print("Message received")
    message_body = json.loads(message['Body'])
    bucket = message_body['s3Bucket']
    key = message_body['s3Key']

    # Check if the file exists in S3
    if not check_file_exists(bucket, key):
        print(f"File not found in S3: {bucket}/{key}")
        return

    # Check if the file has already been processed (exists in File A)
    if check_file_in_file_a(key):
        print(f"File already processed: {key}")
        return

    # Process the message (convert the file and upload to S3)
    convert_file(bucket, key)

    # Mark as processed in File A
    mark_as_processed(key)

    # Delete the message from the queue after processing
    sqs.delete_message(QueueUrl=SQS_URL, ReceiptHandle=message['ReceiptHandle'])

    print(f"Processed and deleted message: {message['MessageId']}")

# sudo apt-get update
# sudo apt-get install ffmpeg
def convert_file(bucket, key):
    # Download the video file from S3
    local_input_path = f"/tmp/{os.path.basename(key)}"
    s3.download_file(Bucket=bucket, Key=key, Filename=local_input_path)

    # Define the output path for the converted file
    local_output_path = f"/tmp/{os.path.splitext(os.path.basename(key))[0]}.mov"

    # Run ffmpeg to convert the video to .mov format
    ffmpeg_command = [
        'ffmpeg',
        '-i', local_input_path,  # Input file
        '-q:v', '1',  # Video quality
        '-q:a', '1',  # Audio quality
        local_output_path  # Output file
    ]

    try:
        subprocess.run(ffmpeg_command, check=True)
        print(f"File converted successfully: {local_output_path}")

        # Upload the converted file back to S3
        output_s3_key = f"videoRecord/converted-videos/{os.path.basename(local_output_path)}"
        s3.upload_file(Filename=local_output_path, Bucket=bucket, Key=output_s3_key)
        print(f"Converted file uploaded to S3: {output_s3_key}")

        s3_cdn_url = f"{CDN_URL}{output_s3_key}"
       
        notify_user(s3_cdn_url)
        # Cleanup local files
        os.remove(local_input_path)
        os.remove(local_output_path)

    except subprocess.CalledProcessError as e:
        print(f"Error converting file: {e}")

def mark_as_processed(file_name):
    file_a_bucket = BUCKET_NAME
    file_a_key = 'videoRecord/raw-videos/processed-videos.json'
    response = s3.get_object(Bucket=file_a_bucket, Key=file_a_key)
    file_a_content = json.loads(response['Body'].read().decode('utf-8'))

    file_a_content['processed_files'].append(file_name)
    
    s3.put_object(Bucket=file_a_bucket, Key=file_a_key, Body=json.dumps(file_a_content))
    

def notify_user(cdn_url):
    # Notify frontend user the file is ready for download
    # You can use WebSocket or any other real-time communication method
    print("video_ready event emit")
    sio.emit('video_ready', {'url': cdn_url})

if __name__ == '__main__':
    monitor_sqs()