"""
RenKairo RDTP Template: Local Peripheral (Webcam) Active Learning Streaming.
Captures live frames directly from local USB3 cameras/sensors and streams them
into a remote cloud neural network without saving static files or cloud storage dumps.
"""

import os
import sys
import time

# Ensure rdtp package is resolvable regardless of run location
_current_dir = os.path.dirname(os.path.abspath(__file__))
_parent_dir = os.path.abspath(os.path.join(_current_dir, ".."))
for _p in (_current_dir, _parent_dir):
    if _p not in sys.path:
        sys.path.insert(0, _p)

from rdtp import RDTPProducer, PeripheralStreamCapture, CodecType

def main():
    print("================================================================")
    print("  RENKAIRO: Live Local Peripheral Active Learning Streaming     ")
    print("================================================================")
    
    target_endpoint = "127.0.0.1:50051"
    host, port = target_endpoint.split(":")
    
    print(f"[Peripheral] Initializing DirectShow / V4L2 60 FPS Camera Reader...")
    capture = PeripheralStreamCapture(device_index=0, fps=30, batch_size=16)
    
    print(f"[Transport] Connecting Outbound TLS 1.3 socket to {target_endpoint}...")
    producer = RDTPProducer(
        target_host=host,
        target_port=int(port),
        buffer_depth=3,
        codec=CodecType.JPEG
    )
    
    if not producer.connect():
        print(f"[Error] Failed to connect to {target_endpoint}. Ensure the Cloud GPU Consumer is running.")
        return

    print("[Stream] Real-time video ingestion active -> streaming directly into GPU VRAM...")
    try:
        batch_idx = 0
        for batch in capture.stream_batches(num_batches=15):
            batch_idx += 1
            ok = producer.send_batch(batch["payload"], batch["sample_count"])
            if ok:
                print(f"  -> Streamed Camera Batch #{batch_idx:02d} (16 frames, {len(batch['payload'])}B) | Credits: {producer.credits}")
            time.sleep(0.08)
    finally:
        capture.stop()
        producer.close()
        print("\n[Done] Active learning session closed. Ephemeral VRAM purged.")

if __name__ == "__main__":
    main()

