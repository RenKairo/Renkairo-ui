import React from 'react';
import { Cpu, Server, HardDrive, ShieldAlert, Cloud, Database } from 'lucide-react';

export const CloudResourcesPanel: React.FC = () => {
  const resources = [
    { name: 'eks-prod-cluster-01', type: 'AWS EKS Kubernetes', status: 'Healthy', nodes: '8 Nodes', icon: Cloud, color: 'text-[#38BDF8]' },
    { name: 'renkairo-s3-artifacts', type: 'AWS S3 Bucket', status: 'Active', size: '1.2 TB', icon: Database, color: 'text-amber-400' },
    { name: 'gcp-compute-gpu-02', type: 'GCP N2-Standard', status: 'Running', spec: 'NVIDIA A100', icon: Cpu, color: 'text-[#FF4D4D]' },
    { name: 'azure-db-pg-master', type: 'Azure PostgreSQL', status: 'Online', spec: '32 vCPU', icon: Server, color: 'text-emerald-400' }
  ];

  return (
    <aside className="w-full bg-[#0B0D11] border-r border-[#232734] flex flex-col select-none h-full z-10 font-sans">
      <div className="h-9 px-3 border-b border-[#232734] flex items-center justify-between text-xs text-gray-400 font-semibold uppercase tracking-wider">
        <span>CLOUD RESOURCES</span>
      </div>

      <div className="p-3 space-y-3 font-mono">
        <div className="text-[10px] text-gray-400 font-semibold uppercase px-1">
          CLOUD INFRASTRUCTURE ({resources.length})
        </div>

        <div className="space-y-2">
          {resources.map((r) => {
            const Icon = r.icon;
            return (
              <div key={r.name} className="bg-[#12151C] border border-[#232734] rounded-lg p-2.5 space-y-1.5">
                <div className="flex items-center space-x-2">
                  <Icon className={`w-4 h-4 ${r.color} shrink-0`} />
                  <div className="truncate">
                    <h4 className="text-xs font-semibold text-white truncate">{r.name}</h4>
                    <span className="text-[9px] text-gray-500">{r.type}</span>
                  </div>
                </div>

                <div className="flex justify-between items-center pt-1 border-t border-[#232734]/60 text-[10px] text-gray-400">
                  <span>{r.nodes || r.size || r.spec}</span>
                  <span className="text-emerald-400 font-semibold">{r.status}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </aside>
  );
};
