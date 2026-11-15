import React from "react";
import { Activity, Cpu, Layers, Terminal } from "lucide-react";

export interface Spec {
  label: string;
  val: string;
}

export interface ComponentData {
  id: string;
  num: string;
  iconName: string;
  title: string;
  subTitle: string;
  desc: string;
  specs: Spec[];
}

export const ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  Activity,
  Cpu,
  Layers,
  Terminal,
};
