"""
RenKairo RDTP Cloud Accelerator Consumer Daemon.
Runs on remote GPU virtual machines (AWS EC2 g5.xlarge, RunPod, Lambda Labs, or local dev node).
Manages pinned host RAM circular ring buffer (N=3), overlaps PCIe DMA with computation,
and issues application-level credit tokens back to the student workstation.
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

from rdtp import RDTPConsumer

def main():
    port = 50051
    buffer_depth = 3
    print("================================================================")
    print("      RENKAIRO RDTP: Cloud Accelerator Consumer Worker          ")
    print("================================================================")
    print(f"[Config] Listening on port: {port}")
    print(f"[Memory] Pinned Host RAM Ring Buffer depth: N={buffer_depth} (cudaHostAlloc)")
    print(f"[Lifecycle] Ephemeral input tensor purging: ENABLED (0 cloud disk persistence)")
    print("----------------------------------------------------------------")

    consumer = RDTPConsumer(listen_port=port, buffer_depth=buffer_depth)
    if not consumer.start():
        print(f"[Fatal] Failed to bind to 0.0.0.0:{port}. Port may already be in use.")
        return

    print(f"[Ready] Waiting for outbound connection from edge workstation...")
    try:
        step = 0
        while True:
            # Pulls next batch from pinned ring buffer
            batch = consumer.fetch_next_batch(timeout=1.0)
            if batch:
                header, payload = batch
                step += 1
                # Simulates forward, backward, and optimizer parameter update
                print(f"[GPU Kernel] Step #{step:03d} | Epoch {header.epoch_id} | Batch {header.batch_id} "
                      f"({header.sample_count} samples, {len(payload)}B) -> VRAM Purged | Credit ACK Sent")
                time.sleep(0.06) # Simulated 60ms kernel compute time
    except KeyboardInterrupt:
        print("\n[Shutdown] Stopping cloud consumer worker...")
    finally:
        consumer.stop()
        print("[Shutdown] Pinned memory deallocated. Worker exited cleanly.")

if __name__ == "__main__":
    main()

