from fastapi import FastAPI, UploadFile, File
from fastapi.responses import StreamingResponse
from transformers import WhisperProcessor, WhisperForConditionalGeneration
from moviepy.editor import VideoFileClip
from io import BytesIO
import torch
import soundfile as sf
import torchaudio.transforms as T
from datetime import timedelta
import os
import tempfile
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://127.0.0.1:8080", "https://www.connectnow.website"],  # Specify the origin explicitly
    allow_credentials=True,
    allow_methods=["*"],  # Allows all methods
    allow_headers=["*"],  # Allows all headers
)

# Load the Whisper model and processor
model_name = "openai/whisper-medium"
processor = WhisperProcessor.from_pretrained(model_name)
model = WhisperForConditionalGeneration.from_pretrained(model_name)

def format_time(seconds):
    """Convert time to SRT format timestamp"""
    td = timedelta(seconds=seconds)
    return str(td)[:-3].replace(".", ",")

def create_srt(transcriptions, timestamps):
    """Generate SRT file content"""
    srt_content = []
    for i, (transcription, (start_time, end_time)) in enumerate(zip(transcriptions, timestamps)):
        srt_content.append(f"{i+1}")
        srt_content.append(f"{format_time(start_time)} --> {format_time(end_time)}")
        srt_content.append(transcription)
        srt_content.append("")

    return "\n".join(srt_content)

@app.get("/health")
async def health_check():
    return {"status": "ok"}

# processing video srt file
@app.post("/videoSrt")
async def process_video(file: UploadFile = File(...)):
    # Write the uploaded MOV file to a temporary file
    with tempfile.NamedTemporaryFile(delete=False, suffix=".mov") as temp_file:
        temp_file.write(await file.read())
        temp_file_path = temp_file.name

    # Load the MOV file and extract audio
    video_clip = VideoFileClip(temp_file_path)
    audio_path = temp_file_path.replace(".mov", ".wav")
    video_clip.audio.write_audiofile(audio_path, codec='pcm_s16le')

    # Load audio and prepare for processing
    speech_array, sampling_rate = sf.read(audio_path)
    speech_array = torch.tensor(speech_array, dtype=torch.float32)

    if len(speech_array.shape) > 1:
        speech_array = speech_array.mean(dim=1)

    resampler = T.Resample(sampling_rate, 16000)
    speech_array = resampler(speech_array)
    sampling_rate = 16000

    # Segment the audio into 30-second segments for finer detail
    segment_length = sampling_rate * 30
    segments = [speech_array[i:i + segment_length] for i in range(0, len(speech_array), segment_length)]
    timestamps = [(i * segment_length / sampling_rate, min((i + 1) * segment_length, len(speech_array)) / sampling_rate) for i in range(len(segments))]

    # Transcribe each segment
    transcriptions = []
    for segment in segments:
        inputs = processor(segment, sampling_rate=sampling_rate, return_tensors="pt")
        attention_mask = torch.ones_like(inputs.input_features)

        with torch.no_grad():
            predicted_ids = model.generate(
                inputs.input_features,
                num_beams=5,  # Increased beam width for better transcription quality
                early_stopping=True,
                max_length=250,  # Increased max length to capture more content
                min_length=20,  # Increased min length to avoid short incomplete sentences
                attention_mask=attention_mask
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

    # Write SRT content to a temporary file
    srt_path = temp_file_path.replace(".mov", ".srt")
    with open(srt_path, "w") as srt_file:
        srt_file.write(srt_content)

    # Stream the SRT file to the client
    srt_stream = BytesIO()
    with open(srt_path, "rb") as srt_file:
        srt_stream.write(srt_file.read())
    srt_stream.seek(0)

    # Clean up temporary files
    os.remove(temp_file_path)
    os.remove(audio_path)
    os.remove(srt_path)

    return StreamingResponse(srt_stream, media_type="text/plain", headers={
        "Content-Disposition": f"attachment; filename={os.path.splitext(file.filename)[0]}.srt"
    })

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
