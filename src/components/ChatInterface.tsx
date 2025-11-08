import { useState, useRef, useEffect, useMemo } from 'react';
import type { Character } from '../types';
import './ChatInterface.css';

interface ChatMessage {
  id: string;
  text: string;
  sender: 'user' | 'character';
  timestamp: Date;
}

interface PersistedMessage {
  id: string;
  text: string;
  sender: 'user' | 'character';
  timestamp: string;
}

interface ChatInterfaceProps {
  userName: string;
  character: Character;
}

interface ChatApiResponse {
  reply: string;
  followUp?: string;
  affinity: number;
  affinityLabel: string;
  tier: 'acquaintance' | 'friend' | 'partner';
  topic: string;
}

interface AffinityDescriptor {
  label: string;
  tier: 'acquaintance' | 'friend' | 'partner';
  tagline: string;
}

const CHAT_HISTORY_COOKIE = 'totono_chat_history';
const CHAT_AFFINITY_COOKIE = 'totono_affinity';
const COOKIE_MAX_DAYS = 30;
const MAX_STORED_MESSAGES = 6;
const CHAT_HINT_DISMISSED = 'totono_chat_hint_dismissed';

const THEME_LABELS: Record<Character['theme'], string> = {
  plant: '植物',
  animal: 'どうぶつ',
  robot: 'ロボット',
};

function readCookie(name: string): string | null {
  if (typeof document === 'undefined') return null;
  const value = document.cookie
    .split('; ')
    .find((row) => row.startsWith(`${name}=`));
  return value ? decodeURIComponent(value.split('=')[1]) : null;
}

function writeCookie(name: string, value: string, days = COOKIE_MAX_DAYS) {
  if (typeof document === 'undefined') return;
  const expires = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toUTCString();
  document.cookie = `${name}=${encodeURIComponent(value)}; expires=${expires}; path=/`;
}

export default function ChatInterface({ userName, character }: ChatInterfaceProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const experienceRatio = useMemo(() => {
    if (!character.experienceToNext) {
      return 0;
    }
    return Math.min(1, Math.max(0, character.experience / character.experienceToNext));
  }, [character.experience, character.experienceToNext]);

  const baseAffinity = useMemo(
    () => calculateAffinity(character.level, experienceRatio, 0),
    [character.level, experienceRatio]
  );

  const cookieState = useMemo(() => {
    if (typeof document === 'undefined') {
      return { messages: null as ChatMessage[] | null, affinity: null as number | null };
    }

    let storedMessages: ChatMessage[] | null = null;
    let storedAffinity: number | null = null;

    const messageCookie = readCookie(CHAT_HISTORY_COOKIE);
    if (messageCookie) {
      try {
        const parsed = JSON.parse(messageCookie) as PersistedMessage[];
        storedMessages = parsed
          .slice(-MAX_STORED_MESSAGES)
          .map((msg) => ({
            id: msg.id,
            text: msg.text,
            sender: msg.sender,
            timestamp: new Date(msg.timestamp),
          }))
          .filter((msg) => msg.text && msg.sender && !Number.isNaN(msg.timestamp.getTime()));
      } catch (error) {
        console.warn('[Chat] failed to parse history cookie:', error);
      }
    }

    const affinityCookie = readCookie(CHAT_AFFINITY_COOKIE);
    if (affinityCookie) {
      const parsedAffinity = Number.parseInt(affinityCookie, 10);
      if (Number.isFinite(parsedAffinity)) {
        storedAffinity = parsedAffinity;
      }
    }

    return { messages: storedMessages, affinity: storedAffinity };
  }, [character.level, experienceRatio, userName]);

  const initialDescriptor = describeAffinity(cookieState.affinity ?? baseAffinity);

  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    if (cookieState.messages && cookieState.messages.length > 0) {
      return cookieState.messages;
    }
    return [
      {
        id: 'initial',
        text: buildInitialGreeting(userName, initialDescriptor),
        sender: 'character',
        timestamp: new Date(),
      },
    ];
  });

  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [showQuickHint, setShowQuickHint] = useState(false);

  const themeLabel = useMemo(() => THEME_LABELS[character.theme] ?? 'キャラクター', [character.theme]);

  const lastActiveLabel = useMemo(() => {
    if (!character.lastActiveDate) {
      return '最終ログイン: なし';
    }
    const lastActive = new Date(character.lastActiveDate);
    if (Number.isNaN(lastActive.getTime())) {
      return '最終ログイン: なし';
    }
    const formatter = new Intl.DateTimeFormat('ja-JP', {
      month: 'numeric',
      day: 'numeric',
      weekday: 'short',
    });
    return `最終ログイン: ${formatter.format(lastActive)}`;
  }, [character.lastActiveDate]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  useEffect(() => {
    const persisted: PersistedMessage[] = messages
      .slice(-MAX_STORED_MESSAGES)
      .map((msg) => ({
        id: msg.id,
        text: msg.text,
        sender: msg.sender,
        timestamp: msg.timestamp.toISOString(),
      }));
    writeCookie(CHAT_HISTORY_COOKIE, JSON.stringify(persisted));
  }, [messages]);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }
    const dismissed = localStorage.getItem(CHAT_HINT_DISMISSED);
    setShowQuickHint(!dismissed);
  }, []);

  const handleSend = async (event: React.FormEvent) => {
    event.preventDefault();
    const text = inputText.trim();
    if (!text) return;

    const userMessage: ChatMessage = {
      id: `${Date.now()}`,
      text,
      sender: 'user',
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputText('');
    inputRef.current?.focus();
    setIsTyping(true);

    try {
      const historyPayload = messages
        .slice(-6)
        .map((message) => ({ sender: message.sender, text: message.text }));

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: text,
          level: character.level,
          experienceRatio,
          history: [...historyPayload, { sender: 'user', text }],
          userName,
        }),
      });

      if (!response.ok) {
        throw new Error(`Chat API returned ${response.status}`);
      }

      const data = (await response.json()) as ChatApiResponse;
      writeCookie(CHAT_AFFINITY_COOKIE, data.affinity.toString());

      const composedReply = data.followUp && data.followUp.trim().length > 0
        ? `${data.reply}\n${data.followUp}`
        : data.reply;

      const characterMessage: ChatMessage = {
        id: `${Date.now()}-reply`,
        text: composedReply,
        sender: 'character',
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, characterMessage]);
    } catch (error) {
      console.error('Chat API error:', error);
      const fallbackMessage: ChatMessage = {
        id: `${Date.now()}-fallback`,
        text: 'ごめんね、今は上手く考えがまとまらなかったみたい。もう一度教えてくれる？',
        sender: 'character',
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, fallbackMessage]);
    } finally {
      setIsTyping(false);
    }
  };

  const dismissHint = () => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(CHAT_HINT_DISMISSED, 'true');
    }
    setShowQuickHint(false);
    inputRef.current?.focus();
  };

  return (
    <div className="chat-interface">
      <div className="chat-header">
        <div className="chat-header-main">
          <span className="chat-title">💬 おしゃべり</span>
          <span className="chat-subtitle">{themeLabel}タイプの相棒と会話を楽しもう</span>
        </div>
        <div className="chat-header-meta">
          <span className="chat-badge">Lv {character.level}</span>
          <span className="chat-badge">進化段階 {character.evolutionStage}</span>
          <span className="chat-meta-entry">{lastActiveLabel}</span>
        </div>
        {showQuickHint && (
          <button type="button" className="chat-hint-pill" onClick={dismissHint}>
            ヒントを閉じる
            <span aria-hidden="true">✕</span>
          </button>
        )}
      </div>

      <div className="chat-body">
        <div className="chat-messages">
          {showQuickHint && (
            <div className="chat-tip-banner">
              <span>ちょっとした出来事や気持ちを共有すると、会話が自然に続きます。</span>
              <button
                type="button"
                className="chat-tip-close"
                onClick={dismissHint}
                aria-label="ヒントを閉じる"
              >
                ✕
              </button>
            </div>
          )}
          {messages.map((message) => (
            <div key={message.id} className={`chat-message ${message.sender}`}>
              <div className="chat-message-content">{message.text}</div>
              <div className="chat-message-time">
                {message.timestamp.toLocaleTimeString('ja-JP', {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </div>
            </div>
          ))}
          {isTyping && (
            <div className="chat-message character typing">
              <div className="chat-message-content">
                <span className="typing-indicator">
                  <span />
                  <span />
                  <span />
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
            onChange={(event) => setInputText(event.target.value)}
            placeholder="メッセージを入力..."
          />
          <button
            type="button"
            className="chat-voice-button"
            onClick={() => {
              alert('音声入力はまだ準備中です。');
            }}
            aria-label="音声入力"
          >
            🎤
          </button>
          <button type="submit" className="chat-send-button" disabled={!inputText.trim()}>
            送信
          </button>
        </form>
      </div>
    </div>
  );
}

function calculateAffinity(level: number, experienceRatio: number, extraBonus: number) {
  const levelContribution = Math.min(level * 8.5, 60);
  const experienceContribution = Math.round(Math.min(1, Math.max(0, experienceRatio)) * 16);
  return clamp(Math.round(25 + levelContribution + experienceContribution + extraBonus), 5, 100);
}

function describeAffinity(affinity: number): AffinityDescriptor {
  if (affinity >= 75) {
    return {
      label: '親密',
      tier: 'partner',
      tagline: 'ほとんど家族のような信頼関係。何でも話し合える距離感です。',
    };
  }

  if (affinity >= 45) {
    return {
      label: '仲良し',
      tier: 'friend',
      tagline: '気持ちを素直に分かち合える、頼りがいのある関係になってきました。',
    };
  }

  return {
    label: 'ふつう',
    tier: 'acquaintance',
    tagline: 'まだ距離はあるけれど、これから仲良くなる余地がたくさんあります。',
  };
}

function buildInitialGreeting(userName: string, descriptor: AffinityDescriptor) {
  const addressedName = userName ? `${userName}さん` : 'ねえねえ';
  switch (descriptor.tier) {
    case 'partner':
      return `やっほー、${addressedName}！今日も顔が見られて嬉しいな。一緒に楽しい時間を過ごそう？`;
    case 'friend':
      return `こんにちは、${addressedName}！最近の出来事、また聞かせてくれると嬉しいな。`;
    default:
      return `こんにちは、${addressedName}。今日の気持ちを少しずつでも教えてくれたら嬉しいよ。`;
  }
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

