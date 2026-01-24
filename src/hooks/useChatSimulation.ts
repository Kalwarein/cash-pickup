import { useState, useEffect } from 'react';

interface ChatMessage {
  id: string;
  message: string;
  type: 'info' | 'alert' | 'trade' | 'news';
  timestamp: Date;
}

const CHAT_MESSAGES = [
  { message: "Large buy order detected on TSLA", type: "trade" as const },
  { message: "Market sentiment turning bullish", type: "info" as const },
  { message: "Mining sector gaining momentum", type: "news" as const },
  { message: "High volatility alert: KND", type: "alert" as const },
  { message: "New investors joining the platform", type: "info" as const },
  { message: "Sell pressure detected on META", type: "trade" as const },
  { message: "Tech sector showing strong momentum", type: "news" as const },
  { message: "Market dipping slightly", type: "info" as const },
  { message: "Large institutional buy order placed", type: "trade" as const },
  { message: "Breaking: Energy sector rallying", type: "news" as const },
  { message: "Resistance level reached at 1250", type: "alert" as const },
  { message: "Support holding strong at 1100", type: "info" as const },
  { message: "Volume spike detected", type: "alert" as const },
  { message: "Bullish trend forming on SGM", type: "trade" as const },
  { message: "Market makers active", type: "info" as const },
  { message: "Breakout imminent on DTB", type: "trade" as const },
  { message: "Investor confidence rising", type: "news" as const },
  { message: "High trading activity detected", type: "alert" as const },
  { message: "WAT showing strong buy signals", type: "trade" as const },
  { message: "Market stabilizing after volatility", type: "info" as const },
  { message: "Foreign investment flowing in", type: "news" as const },
  { message: "Flash rally on GESL", type: "trade" as const },
  { message: "Profit taking observed", type: "info" as const },
  { message: "Diamond sector outperforming", type: "news" as const },
  { message: "Short squeeze potential on M360", type: "alert" as const },
];

export const useChatSimulation = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);

  useEffect(() => {
    // Initialize with a few messages
    const initialMessages: ChatMessage[] = CHAT_MESSAGES.slice(0, 5).map((msg, i) => ({
      id: `init-${i}`,
      message: msg.message,
      type: msg.type,
      timestamp: new Date(Date.now() - (5 - i) * 60000),
    }));
    setMessages(initialMessages);

    // Add new messages periodically
    const interval = setInterval(() => {
      const randomMsg = CHAT_MESSAGES[Math.floor(Math.random() * CHAT_MESSAGES.length)];
      const newMessage: ChatMessage = {
        id: `msg-${Date.now()}`,
        message: randomMsg.message,
        type: randomMsg.type,
        timestamp: new Date(),
      };

      setMessages(prev => [...prev.slice(-19), newMessage]);
    }, 3000 + Math.random() * 4000);

    return () => clearInterval(interval);
  }, []);

  return { messages };
};
