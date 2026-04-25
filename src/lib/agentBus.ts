// Simple client-side event bus — panels subscribe to hear when Zeus responds to their agent
type AgentEvent = {
  agent: string;
  intent: string;
  transcript: string;
  response: string;
};

type Handler = (event: AgentEvent) => void;
const _handlers = new Set<Handler>();

export const agentBus = {
  emit(event: AgentEvent) {
    _handlers.forEach((h) => h(event));
  },
  on(handler: Handler): () => void {
    _handlers.add(handler);
    return () => _handlers.delete(handler);
  },
};
