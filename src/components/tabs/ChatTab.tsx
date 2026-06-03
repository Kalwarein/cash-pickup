import { useEffect, useRef } from 'react';
import { Activity, Zap } from 'lucide-react';
import { ChatMessage } from '@/components/ChatMessage';
import { useChatSimulation } from '@/hooks/useChatSimulation';

export const ChatTab = () => {
  const { messages } = useChatSimulation();
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  return (
    <div className="h-[calc(100vh-180px)] flex flex-col animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-display font-bold tracking-tight">Market Feed</h1>
          <p className="text-muted-foreground text-sm">Live trading activity</p>
        </div>
        <div className="flex items-center gap-2 text-success">
          <Activity className="w-4 h-4 animate-pulse" />
          <span className="text-sm font-medium">{messages.length} updates</span>
        </div>
      </div>

      {/* Live Indicator */}
      <div className="glass-card p-3 mb-4 flex items-center gap-3 bg-success/5 border-success/20">
        <div className="w-8 h-8 rounded-full bg-success/20 flex items-center justify-center">
          <Zap className="w-4 h-4 text-success" />
        </div>
        <div>
          <p className="text-sm font-medium text-success">Live Market Updates</p>
          <p className="text-xs text-muted-foreground">Real-time trading signals and market movements</p>
        </div>
      </div>

      {/* Messages */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto space-y-2 pr-2"
      >
        {messages.map((message) => (
          <ChatMessage
            key={message.id}
            message={message.message}
            type={message.type}
            timestamp={message.timestamp}
          />
        ))}
      </div>
    </div>
  );
};
