#!/usr/bin/env python3
"""Transcribe un audio local con faster-whisper, CPU int8 y descarga de modelo inicial."""
import os
import sys

def main():
    if len(sys.argv) != 2:
        raise SystemExit("Uso: transcribe-audio.py archivo.ogg")
    from faster_whisper import WhisperModel
    model_name = os.environ.get("WHISPER_MODEL", "tiny")
    if model_name not in {"tiny", "base", "small"}:
        raise ValueError("WHISPER_MODEL debe ser tiny, base o small")
    model = WhisperModel(model_name, device="cpu", compute_type="int8")
    segments, _ = model.transcribe(sys.argv[1], beam_size=1, vad_filter=True)
    print(" ".join(segment.text.strip() for segment in segments).strip())

if __name__ == "__main__":
    main()
