"""
RDTP Command-Line Interface and Standalone Benchmark Runner.
"""

import os
import sys
import argparse
import time

# Support direct script execution as well as package imports
_current_dir = os.path.dirname(os.path.abspath(__file__))
_parent_dir = os.path.abspath(os.path.join(_current_dir, ".."))
if _parent_dir not in sys.path:
    sys.path.insert(0, _parent_dir)

from rdtp.protocol import CodecType
from rdtp.producer import RDTPProducer, RDTPStreamDataset
from rdtp.consumer import RDTPConsumer
from rdtp.telemetry import Theorem1Audit
from rdtp.peripheral import PeripheralStreamCapture

def run_consumer(port: int, buffer_depth: int):
    print(f"[RDTP Consumer] Initializing Cloud Accelerator Consumer on port {port} (Buffer depth N={buffer_depth})...")
    consumer = RDTPConsumer(listen_port=port, buffer_depth=buffer_depth)
    if not consumer.start():
        print(f"[RDTP Consumer] Failed to bind to port {port}")
        return
    
    print(f"[RDTP Consumer] Worker active and listening. Ready for incoming edge batches.")
    try:
        batch_count = 0
        while True:
            batch = consumer.fetch_next_batch(timeout=2.0)
            if batch:
                header, payload = batch
                batch_count += 1
                print(f"[RDTP GPU Core] Processing Batch #{header.batch_id} (Samples: {header.sample_count}, Payload: {len(payload)}B) -> Optimizer Step")
                time.sleep(0.05) # Simulated forward+backward compute window
            else:
                time.sleep(0.1)
    except KeyboardInterrupt:
        print("\n[RDTP Consumer] Terminating session.")
    finally:
        consumer.stop()

def run_producer(host: str, port: int, workload: str, count: int, buffer_depth: int):
    print(f"[RDTP Producer] Connecting to Cloud GPU Worker at {host}:{port}...")
    producer = RDTPProducer(target_host=host, target_port=port, buffer_depth=buffer_depth)
    if not producer.connect():
        print(f"[RDTP Producer] Connection to {host}:{port} failed.")
        return
    
    print(f"[RDTP Producer] Connected! Streaming {count} batches with credit-based flow control...")
    peripheral = PeripheralStreamCapture(batch_size=32)
    
    try:
        sent = 0
        for batch in peripheral.stream_batches(num_batches=count):
            ok = producer.send_batch(batch["payload"], batch["sample_count"])
            if ok:
                sent += 1
                print(f"[RDTP Ingestion] Streamed Batch #{sent}/{count} ({len(batch['payload'])} bytes, Credits remaining: {producer.credits})")
            else:
                print(f"[RDTP Ingestion] Stream dispatch paused or throttled.")
            time.sleep(0.04) # 40ms edge preprocessing pacing
    finally:
        producer.close()
        print(f"[RDTP Producer] Streaming complete. Total streamed: {sent} batches.")

def run_audit(workload: str, uplink: float, batch_size: int):
    print(f"\n=======================================================")
    print(f"       RDTP THEOREM 1 MATHEMATICAL AUDIT VERIFIER      ")
    print(f"=======================================================\n")
    audit = Theorem1Audit.evaluate(
        workload_name=workload,
        batch_size=batch_size,
        uplink_mbps=uplink,
    )
    print(f"Workload Profile:       {audit.workload_name.upper()} (Batch Size: {audit.batch_size})")
    print(f"Residential Uplink:     {audit.uplink_mbps} Mbps")
    print(f"Raw FP32 Tensor Footprint: {audit.raw_tensor_bytes / (1024*1024):.2f} MiB")
    print(f"In-Flight Wire Payload: {audit.wire_payload_bytes / 1024:.2f} KB (Bloat Ratio: {audit.bloat_ratio}x)")
    print(f"-------------------------------------------------------")
    print(f"Stage Timings (ms):")
    print(f"  • T_prep (Local CPU):   {audit.t_prep_ms} ms")
    print(f"  • T_net  (WAN Transit): {audit.t_net_ms} ms")
    print(f"  • T_dma  (PCIe DMA):    {audit.t_dma_ms} ms")
    print(f"  • T_gpu  (Accelerator): {audit.t_gpu_ms} ms")
    print(f"-------------------------------------------------------")
    status_label = "COMPUTE-BOUND (LATENCY HIDDEN)" if audit.is_compute_bound else "I/O-BOUND (BOTTLENECKED)"
    print(f"Pipeline State:         {status_label}")
    print(f"Limiting Stage:         {audit.bottleneck_stage}")
    print(f"Predicted Duty Cycle:   {audit.predicted_gpu_duty_cycle_pct}%")
    print(f"Sustainable Throughput: {audit.sustainable_throughput_batches_per_sec} batches/sec")
    print(f"\nAnalytical Diagnosis:\n  -> {audit.recommendation}\n")

def main():
    parser = argparse.ArgumentParser(description="RDTP: Real-Time Distributed Training Protocol")
    parser.add_argument("--mode", choices=["consumer", "producer", "audit"], default="audit")
    parser.add_argument("--host", default="127.0.0.1", help="Target cloud consumer host")
    parser.add_argument("--port", type=int, default=50051, help="Consumer port")
    parser.add_argument("--workload", default="vit", choices=["vit", "resnet", "roberta", "diffusion"])
    parser.add_argument("--batch-size", type=int, default=32)
    parser.add_argument("--uplink", type=float, default=40.0, help="Uplink bandwidth in Mbps")
    parser.add_argument("--count", type=int, default=20, help="Number of batches to stream")
    parser.add_argument("--buffer-depth", type=int, default=3, help="Prefetch buffer depth N")
    
    args = parser.parse_args()
    if args.mode == "consumer":
        run_consumer(args.port, args.buffer_depth)
    elif args.mode == "producer":
        run_producer(args.host, args.port, args.workload, args.count, args.buffer_depth)
    else:
        run_audit(args.workload, args.uplink, args.batch_size)

if __name__ == "__main__":
    main()

