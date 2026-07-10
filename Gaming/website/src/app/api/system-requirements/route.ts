import { NextResponse } from 'next/server';

export async function GET() {
  const systemRequirements = {
    os: ["Windows 10", "Windows 11", "Ubuntu 22.04+", "Arch Linux"],
    gpu: {
      minimum: "NVIDIA GTX 1060 (6GB VRAM)",
      recommended: "NVIDIA RTX 2060 (6GB VRAM) or better",
      note: "Strictly requires NVIDIA hardware for TensorRT local inference."
    },
    ram: {
      minimum: "16 GB",
      recommended: "32 GB"
    },
    storage: {
      minimum: "5 GB SSD",
      recommended: "20 GB NVMe SSD for fast model loading"
    },
    isFree: true,
    isOpenSource: true
  };

  return NextResponse.json(systemRequirements);
}
