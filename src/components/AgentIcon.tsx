"use client";

import { Zap, Send, Code, Calendar, Target, Shield, Brain, Cpu, MapPin, TrendingUp, Pen, Search, Eye } from "lucide-react";
import MeridianGlobe from "./MeridianGlobe";

const iconMap: Record<string, React.ComponentType<{ size?: number; className?: string }>> = {
  zap: Zap,
  send: Send,
  code: Code,
  calendar: Calendar,
  target: Target,
  shield: Shield,
  brain: Brain,
  cpu: Cpu,
  "map-pin": MapPin,
  "trending-up": TrendingUp,
  pen: Pen,
  search: Search,
  eye: Eye,
};

interface AgentIconProps {
  icon: string;
  size?: number;
  className?: string;
  color?: string;
}

export default function AgentIcon({ icon, size = 18, className, color }: AgentIconProps) {
  if (icon === "globe") {
    return <MeridianGlobe size={size} color={color || "currentColor"} />;
  }
  const Icon = iconMap[icon];
  if (!Icon) return null;
  return <Icon size={size} className={className} />;
}
