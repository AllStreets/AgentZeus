"use client";

import { Zap, Send, Code, Calendar, Target, Shield, Brain, Globe, MapPin, TrendingUp, Pen, Search, Eye } from "lucide-react";

const iconMap: Record<string, React.ComponentType<{ size?: number; className?: string }>> = {
  zap: Zap,
  send: Send,
  code: Code,
  calendar: Calendar,
  target: Target,
  shield: Shield,
  brain: Brain,
  globe: Globe,
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
}

export default function AgentIcon({ icon, size = 18, className }: AgentIconProps) {
  const Icon = iconMap[icon];
  if (!Icon) return null;
  return <Icon size={size} className={className} />;
}
