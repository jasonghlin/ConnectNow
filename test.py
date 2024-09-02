import os
from transformers import WhisperProcessor, WhisperForConditionalGeneration
import torch
import soundfile as sf
from moviepy.editor import VideoFileClip
import torchaudio.transforms as T
from datetime import timedelta

def format_time(seconds):
    """将时间转换为 SRT 格式的时间戳"""
    td = timedelta(seconds=seconds)
    return str(td)[:-3].replace(".", ",")

def create_srt(transcriptions, timestamps):
    """生成 SRT 文件内容"""
    srt_content = []
    for i, (transcription, (start_time, end_time)) in enumerate(zip(transcriptions, timestamps)):
        srt_content.append(f"{i+1}")
        srt_content.append(f"{format_time(start_time)} --> {format_time(end_time)}")
        srt_content.append(transcription)
        srt_content.append("")

    return "\n".join(srt_content)

# 加载模型和处理器
model_name = "openai/whisper-medium"
processor = WhisperProcessor.from_pretrained(model_name)
model = WhisperForConditionalGeneration.from_pretrained(model_name)

# 加载 .mov 文件并提取音频
mov_file_path = ""  # 请将此路径替换为你的 .mov 文件路径
video_clip = VideoFileClip(mov_file_path)
audio_clip = video_clip.audio
audio_path = "temp_audio.wav"
audio_clip.write_audiofile(audio_path, codec='pcm_s16le')  # 保存为WAV文件

# 使用 soundfile 加载音频文件
speech_array, sampling_rate = sf.read(audio_path)
speech_array = torch.tensor(speech_array, dtype=torch.float32)

# 确保音频是单声道，如果不是，取第一声道
if len(speech_array.shape) > 1:
    speech_array = speech_array.mean(dim=1)

# 重采样到16000 Hz
resampler = T.Resample(sampling_rate, 16000)
speech_array = resampler(speech_array)

# 更新采样率
sampling_rate = 16000

# 将音频数据分割成更长的片段
segment_length = sampling_rate * 60  # 每个片段60秒
segments = [speech_array[i:i + segment_length] for i in range(0, len(speech_array), segment_length)]

# 跟踪每个片段的开始和结束时间
timestamps = [(i * segment_length / sampling_rate, min((i + 1) * segment_length, len(speech_array)) / sampling_rate) for i in range(len(segments))]

# 处理每个片段并进行转录
transcriptions = []
for i, segment in enumerate(segments):
    # 预处理音频文件
    inputs = processor(segment, sampling_rate=sampling_rate, return_tensors="pt")
    
    # 注意：确保 attention_mask 被正确传递
    attention_mask = torch.ones_like(inputs.input_features)

    forced_decoder_ids = processor.tokenizer.convert_tokens_to_ids(['<|startoftranscript|>', '<|zh|>', '<|transcribe|>'])

    # 模型推理
    with torch.no_grad():
        predicted_ids = model.generate(
            inputs.input_features,
            num_beams=5,
            early_stopping=True,
            max_length=500,
            min_length=50,
            attention_mask=attention_mask,
            forced_decoder_ids=[[1, forced_decoder_ids[0]], [2, forced_decoder_ids[1]], [3, forced_decoder_ids[2]]]
        )

    # 将模型输出转换为文本
    transcription = processor.batch_decode(predicted_ids, skip_special_tokens=True)
    transcriptions.append(transcription[0] if transcription else "")

# 生成 SRT 内容
srt_content = create_srt(transcriptions, timestamps)

# 保存 SRT 文件
with open("output.srt", "w") as srt_file:
    srt_file.write(srt_content)

print("SRT 字幕文件已生成")

# 删除 .mov 文件
try:
    os.remove(audio_path)
    print(f"{audio_path} 已被删除")
except OSError as e:
    print(f"Error: {audio_path} 删除失败: {e}")
