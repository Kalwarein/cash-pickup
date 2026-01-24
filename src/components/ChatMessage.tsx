import { cn } from '@/lib/utils';
import { AlertCircle, MessageSquare, TrendingUp, Newspaper } from 'lucide-react';

interface ChatMessageProps {
  message: string;
  type: 'info' | 'alert' | 'trade' | 'news';
  timestamp: Date;
}

const typeConfig = {
  info: {
    icon: MessageSquare,
    bgColor: 'bg-primary/10',
    iconColor: 'text-primary',
  },
  alert: {
    icon: AlertCircle,
    bgColor: 'bg-warning/10',
    iconColor: 'text-warning',
  },
  trade: {
    icon: TrendingUp,
    bgColor: 'bg-green-500/10',
    iconColor: 'text-green-400',
  },
  news: {
    icon: Newspaper,
    bgColor: 'bg-accent/10',
    iconColor: 'text-accent',
  },
};

export const ChatMessage = ({ message, type, timestamp }: ChatMessageProps) => {
  const config = typeConfig[type];
  const Icon = config.icon;
  
  return (
    <div className={cn(
      "flex items-start gap-3 p-3 rounded-xl animate-fade-in",
      config.bgColor
    )}>
      <div className={cn(
        "w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0",
        "bg-card"
      )}>
        <Icon className={cn("w-4 h-4", config.iconColor)} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-foreground">{message}</p>
        <p className="text-xs text-muted-foreground mt-1">
          {timestamp.toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit',
          })}
        </p>
      </div>
    </div>
  );
};
