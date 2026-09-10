import React from "react";
import { Metadata } from "next";
import ServerArchitectureClient from "./ServerArchitectureClient";

export const metadata: Metadata = {
  title: "Distributed Server Architecture — Discover From Web & Multi-PC Node Management | Mission Control",
  description:
    "Comprehensive technical breakdown of Mission Control's distributed server cluster, multi-pool load balancer, 3-tier Discover From Web engine, and multi-PC Manage Nodes mesh.",
  keywords: [
    "Mission Control",
    "Distributed Server",
    "Discover From Web",
    "Manage Nodes",
    "Game Library Cluster",
    "Load Balancer",
    "Microservices",
    "PC Gaming Mesh",
    "Game Metadata Crawler",
    "Steam Deck Sync",
    "LAN Gaming Cluster",
    "Supabase Gaming Database",
    "Hardware Telemetry"
  ],
  openGraph: {
    title: "Distributed Server Architecture — Discover From Web & Manage Nodes | Mission Control",
    description:
      "Explore how Mission Control's dual-pool microservice cluster decouples heavy web discovery and multi-launcher scraping from real-time desktop client gameplay.",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Mission Control Distributed Server Architecture",
    description:
      "Dual-pool load balancing, Discover From Web harvesting, and Manage Nodes multi-PC synchronization.",
  },
};

export default function ServerPage() {
  return <ServerArchitectureClient />;
}
