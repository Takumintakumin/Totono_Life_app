import { useState, useRef, useEffect } from 'react';
import './ChatInterface.css';

interface ChatMessage {
  id: string;
  text: string;
  sender: 'user' | 'character';
  timestamp: Date;
}

interface ChatInterfaceProps {
  userName: string;
}

const CHARACTER_RESPONSES: Record<string, string[]> = {
  greeting: [
    'こんにちは！今日も一緒に頑張ろうね！',
    'やあ！調子はどう？',
    'おはよう！今日もよろしくね！',
    'こんにちは！元気にしてる？',
  ],
  routine: [
    'ルーティンを続けると、どんどん成長できるよ！',
    '毎日の積み重ねが大切だね。一緒に頑張ろう！',
    'ルーティン達成、おめでとう！すごいよ！',
    '今日もルーティンできてる？応援してるよ！',
  ],
  level: [
    'レベルアップ、おめでとう！一緒に成長してるね！',
    'すごいね！どんどん強くなってる！',
    'レベルアップしたね！これからも頑張ろう！',
  ],
  motivation: [
    '無理しすぎないで、自分のペースで大丈夫だよ！',
    '小さな一歩でも、続けることが大切だよ！',
    '今日できなくても、明日また頑張ればいいよ！',
    'あなたならできる！信じてるよ！',
  ],
  default: [
    'そうなんだ！教えてくれてありがとう！',
    'なるほど！一緒に考えようね！',
    'わかった！何か他に聞きたいことはある？',
    'そうだね！一緒に頑張ろう！',
  ],
};

export default function ChatInterface({ userName }: ChatInterfaceProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: '1',
      text: `こんにちは、${userName}さん！今日も一緒に頑張ろうね！何か話したいことはある？`,
      sender: 'character',
      timestamp: new Date(),
    },
  ]);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  const generateResponse = (userMessage: string): string => {
    const lowerMessage = userMessage.toLowerCase();

    if (lowerMessage.includes('こんにちは') || lowerMessage.includes('おはよう') || lowerMessage.includes('こんばんは')) {
      return CHARACTER_RESPONSES.greeting[Math.floor(Math.random() * CHARACTER_RESPONSES.greeting.length)];
    }

    if (lowerMessage.includes('ルーティン') || lowerMessage.includes('習慣')) {
      return CHARACTER_RESPONSES.routine[Math.floor(Math.random() * CHARACTER_RESPONSES.routine.length)];
    }

    if (lowerMessage.includes('レベル') || lowerMessage.includes('経験値')) {
      return CHARACTER_RESPONSES.level[Math.floor(Math.random() * CHARACTER_RESPONSES.level.length)];
    }

    if (lowerMessage.includes('頑張') || lowerMessage.includes('やる気') || lowerMessage.includes('モチベーション')) {
      return CHARACTER_RESPONSES.motivation[Math.floor(Math.random() * CHARACTER_RESPONSES.motivation.length)];
    }

    return CHARACTER_RESPONSES.default[Math.floor(Math.random() * CHARACTER_RESPONSES.default.length)];
  };

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      text: inputText.trim(),
      sender: 'user',
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputText('');
    setIsTyping(true);

    // キャラクターの応答を生成（少し遅延を入れて自然に）
    setTimeout(() => {
      const response = generateResponse(userMessage.text);
      const characterMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        text: response,
        sender: 'character',
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, characterMessage]);
      setIsTyping(false);
    }, 800 + Math.random() * 500);
  };

  return (
    <div className="chat-interface">
      <div className="chat-messages">
        {messages.map((message) => (
          <div key={message.id} className={`chat-message ${message.sender}`}>
            <div className="chat-message-content">
              {message.text}
            </div>
            <div className="chat-message-time">
              {message.timestamp.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })}
            </div>
          </div>
        ))}
        {isTyping && (
          <div className="chat-message character typing">
            <div className="chat-message-content">
              <span className="typing-indicator">
                <span></span>
                <span></span>
                <span></span>
              </span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>
      <form className="chat-input-form" onSubmit={handleSend}>
        <input
          ref={inputRef}
          type="text"
          className="chat-input"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder="メッセージを入力..."
          disabled={isTyping}
        />
        <button type="submit" className="chat-send-button" disabled={isTyping || !inputText.trim()}>
          送信
        </button>
      </form>
    </div>
  );
}

