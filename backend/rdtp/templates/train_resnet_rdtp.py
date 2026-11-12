"""
RenKairo RDTP Template: ResNet-50 ImageNet Edge-to-Cloud Streaming Training.
This script demonstrates the I/O-bound operating regime from Section V-B of the IEEE paper,
where ResNet-50's fast kernel execution requires high compression or higher uplink bandwidth.
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

from rdtp import RDTPStreamLoader, RDTPStreamDataset, CodecType, Theorem1Audit

def main():
    print("================================================================")
    print("      RENKAIRO IDE: ResNet-50 ImageNet RDTP Streaming           ")
    print("================================================================")
    
    # 1. Audit Theorem 1 operating boundaries
    audit = Theorem1Audit.evaluate(
        workload_name="resnet",
        batch_size=64,
        uplink_mbps=40.0,
        resolution=224,
        t_gpu_ms=210.0,
    )
    print(f"[Theorem 1 Check] Workload: ResNet-50 (B=64)")
    print(f"  • Uplink: {audit.uplink_mbps} Mbps | T_net: {audit.t_net_ms} ms | T_gpu: {audit.t_gpu_ms} ms")
    print(f"  • Status: {'COMPUTE-BOUND' if audit.is_compute_bound else 'I/O-BOUND (Starvation Risk)'}")
    print(f"  • Predicted GPU Kernel Duty Cycle: {audit.predicted_gpu_duty_cycle_pct}%")
    print(f"  • Diagnosis: {audit.recommendation}")
    print("----------------------------------------------------------------")

    # 2. Configure Local Edge Dataset (ImageNet 224x224 RGB JPEG)
    print("[1/3] Preparing ImageNet batch bitstreams...")
    synthetic_samples = [f"imagenet_sample_{i:05d}".encode('utf-8') for i in range(320)] # 5 batches
    dataset = RDTPStreamDataset(
        data_samples=synthetic_samples,
        batch_size=64,
        codec=CodecType.JPEG
    )

    # 3. Connect to Remote Cloud Accelerator Endpoint
    cloud_gpu_endpoint = "127.0.0.1:50051"
    host, port = cloud_gpu_endpoint.split(":")
    print(f"[2/3] Connecting Outbound Stream to Cloud Accelerator ({cloud_gpu_endpoint})...")
    loader = RDTPStreamLoader(
        dataset=dataset,
        target_host=host,
        target_port=int(port),
        buffer_depth=3,
    )

    print("[3/3] Commencing Real-Time Latency-Hidden Pipelined Training Loop...")
    start_time = time.time()
    ok = loader.start_streaming()
    if not ok:
        print(f"[Note] Cloud GPU worker at {cloud_gpu_endpoint} is offline. Run 'python templates/rdtp_consumer_worker.py' first.")
        return

    print(f"[Stream Active] Streaming image batches into remote pinned RAM...")
    try:
        time.sleep(3.0)
    finally:
        loader.close()
        elapsed = time.time() - start_time
        print(f"[Done] Session ended after {elapsed:.2f}s. Ephemeral VRAM purged.")

if __name__ == "__main__":
    main()

