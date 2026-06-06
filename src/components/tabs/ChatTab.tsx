import { useEffect, useRef, useState, useCallback } from 'react';
import { Activity, Zap, ArrowDown } from 'lucide-react';
import { ChatMessage } from '@/components/ChatMessage';
import { useChatSimulation } from '@/hooks/useChatSimulation';
import { cn } from '@/lib/utils';

export const ChatTab = () => {
  const { messages } = useChatSimulation();
  const scrollRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const [atBottom, setAtBottom] = useState(true);
  const [unread, setUnread] = useState(0);
  const prevCount = useRef(messages.length);

  const scrollToBottom = useCallback((behavior: ScrollBehavior = 'smooth') => {
    bottomRef.current?.scrollIntoView({ behavior, block: 'end' });
    setUnread(0);
  }, []);

  // Track scroll position to know if the user is reading older messages
  const handleScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const distance = el.scrollHeight - el.scrollTop - el.clientHeight;
    const isBottom = distance < 80;
    setAtBottom(isBottom);
    if (isBottom) setUnread(0);
  }, []);

  // React to new messages: auto-scroll only when already at bottom, else bump unread
  useEffect(() => {
    const added = messages.length - prevCount.current;
    prevCount.current = messages.length;
    if (added <= 0) return;
    if (atBottom) {
      scrollToBottom('smooth');
    } else {
      setUnread((u) => u + added);
    }
  }, [messages, atBottom, scrollToBottom]);

  // Snap to bottom on first mount
  useEffect(() => {
    scrollToBottom('auto');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
          <span className="text-sm font-medium tabular-nums">{messages.length} updates</span>
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
      <div className="relative flex-1 min-h-0">
        <div
          ref={scrollRef}
          onScroll={handleScroll}
          className="absolute inset-0 overflow-y-auto overscroll-contain space-y-2 pr-2 scroll-smooth"
        >
          {messages.map((message) => (
            <div key={message.id} className="animate-fade-in">
              <ChatMessage
                message={message.message}
                type={message.type}
                timestamp={message.timestamp}
              />
            </div>
          ))}
          <div ref={bottomRef} />
        </div>

        {/* Unread / jump-to-latest pill */}
        <button
          onClick={() => scrollToBottom('smooth')}
          className={cn(
            'absolute left-1/2 -translate-x-1/2 bottom-3 z-10 flex items-center gap-2 rounded-full px-4 py-2',
            'gradient-primary text-primary-foreground text-sm font-semibold shadow-float',
            'transition-all duration-300 ease-out',
            atBottom
              ? 'opacity-0 translate-y-3 pointer-events-none'
              : 'opacity-100 translate-y-0',
          )}
        >
          <ArrowDown className="w-4 h-4" />
          {unread > 0 ? `${unread} new update${unread > 1 ? 's' : ''}` : 'Latest'}
        </button>
      </div>
    </div>
  );
};
