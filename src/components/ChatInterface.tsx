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
  affinity?: number;
  affinityLabel?: string;
  tier?: 'acquaintance' | 'friend' | 'partner';
  topic?: string;
  memorySummary?: string;
  suggestedAffinityDelta?: number;
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
const CHAT_MEMORY_KEY = 'totono_chat_memory';
const MAX_MEMORY_ENTRIES = 8;

type MoodTone = 'positive' | 'neutral' | 'negative';

interface ChatMemoryEntry {
  id: string;
  text: string;
  timestamp: string;
  mood: MoodTone;
  keywords: string[];
}

interface ConversationProfile {
  summary: string | null;
  recentTopics: string | null;
  dominantMood: MoodTone;
}

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

  const [affinity, setAffinity] = useState(() => cookieState.affinity ?? baseAffinity);

  const [conversationMemory, setConversationMemory] = useState<ChatMemoryEntry[]>(() =>
    loadConversationMemory()
  );

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

  const affinityDescriptor = useMemo(() => describeAffinity(affinity), [affinity]);

  const conversationProfile = useMemo(
    () => buildConversationProfile(conversationMemory),
    [conversationMemory]
  );

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
    if (typeof window === 'undefined') return;
    const dismissed = localStorage.getItem(CHAT_HINT_DISMISSED);
    setShowQuickHint(!dismissed);
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }
    if (conversationMemory.length > 0) {
      return;
    }
    if (!messages.some((message) => message.sender === 'user')) {
      return;
    }

    const seeded = messages
      .filter((message) => message.sender === 'user')
      .map((message) => createMemoryEntry(message.id, message.text, message.timestamp.toISOString()))
      .slice(-MAX_MEMORY_ENTRIES);

    if (seeded.length === 0) {
      return;
    }

    setConversationMemory(seeded);
    persistConversationMemory(seeded);
  }, [conversationMemory.length, messages]);

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

    const memoryEntry = createMemoryEntry(userMessage.id, text);
    const updatedMemory = [...conversationMemory, memoryEntry].slice(-MAX_MEMORY_ENTRIES);
    setConversationMemory(updatedMemory);
    persistConversationMemory(updatedMemory);
    const profileSnapshot = buildConversationProfile(updatedMemory);

    setMessages((prev) => [...prev, userMessage]);
    setInputText('');
    inputRef.current?.blur?.();
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
          affinity,
          affinityLabel: affinityDescriptor.label,
          affinityTier: affinityDescriptor.tier,
          memory: buildMemoryPayload(updatedMemory),
          memorySummary: profileSnapshot.summary,
          dominantMood: profileSnapshot.dominantMood,
          recentTopics: profileSnapshot.recentTopics,
        }),
      });

      if (!response.ok) {
        throw new Error(`Chat API returned ${response.status}`);
      }

      const data = (await response.json()) as ChatApiResponse;
      if (Number.isFinite(data.affinity)) {
        const nextAffinity = clamp(Math.round(data.affinity ?? affinity), 5, 100);
        setAffinity(nextAffinity);
        writeCookie(CHAT_AFFINITY_COOKIE, nextAffinity.toString());
      } else if (Number.isFinite(data.suggestedAffinityDelta)) {
        const delta = Math.round(data.suggestedAffinityDelta ?? 0);
        if (delta !== 0) {
          const nextAffinity = clamp(affinity + delta, 5, 100);
          setAffinity(nextAffinity);
          writeCookie(CHAT_AFFINITY_COOKIE, nextAffinity.toString());
        }
      }

      const composedReply =
        data.followUp && data.followUp.trim().length > 0
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
      const fallbackReply = generateLocalReply(text, affinityDescriptor, profileSnapshot, memoryEntry.mood);
      const fallbackMessage: ChatMessage = {
        id: `${Date.now()}-fallback`,
        text: fallbackReply,
        sender: 'character',
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, fallbackMessage]);

      const affinityAdjustment =
        memoryEntry.mood === 'positive' ? 2 : memoryEntry.mood === 'negative' ? -1 : 0;
      if (affinityAdjustment !== 0) {
        const nextAffinity = clamp(affinity + affinityAdjustment, 5, 100);
        setAffinity(nextAffinity);
        writeCookie(CHAT_AFFINITY_COOKIE, nextAffinity.toString());
      }
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
          <span className="chat-subtitle">
            {themeLabel}タイプの相棒と、物語みたいな会話を紡いでみよう
          </span>
          <span className="chat-affinity-tagline">{affinityDescriptor.tagline}</span>
          {conversationProfile.summary && (
            <span className="chat-memory-summary">{conversationProfile.summary}</span>
          )}
        </div>
        <div className="chat-header-meta">
          <span className="chat-badge">Lv {character.level}</span>
          <span className="chat-badge">進化段階 {character.evolutionStage}</span>
          <span className="chat-badge chat-affinity-badge">
            なつき度 {affinityDescriptor.label} ({affinity})
          </span>
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
            className="chat-input"
            value={inputText}
            onChange={(event) => setInputText(event.target.value)}
            placeholder="メッセージを入力..."
            type="text"
            inputMode="text"
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

const POSITIVE_KEYWORDS = ['楽しい', '嬉しい', '幸せ', '最高', 'ありがとう', '助かった', 'ワクワク', '感謝', '楽しかった', 'good', 'happy', 'enjoy'];
const NEGATIVE_KEYWORDS = ['疲れ', 'つら', '悲しい', '寂しい', 'しんど', '不安', 'こわい', 'しょんぼり', 'さみしい', '辛', '困った', 'イライラ', 'tired', 'sad', 'worried'];

function loadConversationMemory(): ChatMemoryEntry[] {
  if (typeof window === 'undefined') {
    return [];
  }

  try {
    const raw = localStorage.getItem(CHAT_MEMORY_KEY);
    if (!raw) {
      return [];
    }

    const parsed = JSON.parse(raw) as Partial<ChatMemoryEntry>[];
    return parsed
      .filter((entry) => entry && typeof entry.text === 'string')
      .map((entry, index) => ({
        id: entry.id ?? `mem-${index}`,
        text: entry.text ?? '',
        timestamp: entry.timestamp ?? new Date().toISOString(),
        mood: entry.mood ?? 'neutral',
        keywords: Array.isArray(entry.keywords) ? entry.keywords.slice(0, 5) : [],
      }))
      .slice(-MAX_MEMORY_ENTRIES);
  } catch (error) {
    console.warn('[Chat] failed to load memory:', error);
    return [];
  }
}

function persistConversationMemory(entries: ChatMemoryEntry[]) {
  if (typeof window === 'undefined') {
    return;
  }
  try {
    localStorage.setItem(CHAT_MEMORY_KEY, JSON.stringify(entries));
  } catch (error) {
    console.warn('[Chat] failed to persist memory:', error);
  }
}

function createMemoryEntry(id: string, text: string, timestamp = new Date().toISOString()): ChatMemoryEntry {
  const normalized = text.trim();
  const mood = detectMood(normalized);
  const keywords = extractKeywords(normalized);
  return {
    id,
    text: normalized,
    timestamp,
    mood,
    keywords,
  };
}

function detectMood(text: string): MoodTone {
  if (!text) {
    return 'neutral';
  }
  const lowerCase = text.toLowerCase();
  const hasPositive = POSITIVE_KEYWORDS.some((keyword) => text.includes(keyword) || lowerCase.includes(keyword));
  if (hasPositive) {
    return 'positive';
  }
  const hasNegative = NEGATIVE_KEYWORDS.some((keyword) => text.includes(keyword) || lowerCase.includes(keyword));
  if (hasNegative) {
    return 'negative';
  }
  return 'neutral';
}

function extractKeywords(text: string): string[] {
  if (!text) {
    return [];
  }
  const matches = text.match(/[ぁ-んァ-ヶー一-龯A-Za-z0-9]{2,}/g);
  if (!matches) {
    return [];
  }

  const unique: string[] = [];
  for (const word of matches) {
    const trimmed = word.trim();
    if (!trimmed) continue;
    if (unique.includes(trimmed)) continue;
    unique.push(trimmed);
    if (unique.length >= 6) break;
  }
  return unique;
}

function buildConversationProfile(entries: ChatMemoryEntry[]): ConversationProfile {
  if (!entries || entries.length === 0) {
    return {
      summary: null,
      recentTopics: null,
      dominantMood: 'neutral',
    };
  }

  const moodCounter: Record<MoodTone, number> = { positive: 0, neutral: 0, negative: 0 };
  entries.forEach((entry) => {
    moodCounter[entry.mood] = (moodCounter[entry.mood] ?? 0) + 1;
  });

  const dominantMood =
    (Object.entries(moodCounter).sort((a, b) => b[1] - a[1])[0]?.[0] as MoodTone | undefined) ?? 'neutral';

  const recentKeywords = entries
    .slice(-3)
    .flatMap((entry) => entry.keywords.slice(0, 2))
    .filter(Boolean);
  const uniqueKeywords = Array.from(new Set(recentKeywords)).slice(0, 4);

  const summary = uniqueKeywords.length > 0 ? `最近の話題: ${uniqueKeywords.join('・')}` : null;

  return {
    summary,
    recentTopics: uniqueKeywords.length > 0 ? uniqueKeywords.join('・') : null,
    dominantMood,
  };
}

function buildMemoryPayload(entries: ChatMemoryEntry[]) {
  return entries.map((entry) => ({
    text: entry.text,
    mood: entry.mood,
    keywords: entry.keywords,
  }));
}

function generateLocalReply(
  userText: string,
  descriptor: AffinityDescriptor,
  profile: ConversationProfile,
  mood: MoodTone
): string {
  const trimmedUserText = userText.trim();
  const quotedUserText =
    trimmedUserText.length > 0
      ? `「${trimmedUserText.slice(0, 24)}${trimmedUserText.length > 24 ? '…' : ''}」`
      : '';

  const openerByTier: Record<AffinityDescriptor['tier'], string> = {
    acquaintance: `教えてくれてありがとう。${descriptor.tagline}`,
    friend: 'その話を共有してくれるの、すごく嬉しいよ。',
    partner: 'うんうん、あなたが話してくれるだけで心があたたかくなるよ。',
  };

  const moodResponse: Record<MoodTone, string> = {
    positive: 'その気持ちを聞くと、わたしまでわくわくしてきちゃう。',
    neutral: '落ち着いた時間を一緒に過ごしていけたらいいな。',
    negative: 'つらいときは無理しなくていいんだよ。いつでもそばにいるからね。',
  };

  const closingByTier: Record<AffinityDescriptor['tier'], string> = {
    acquaintance: 'これからも少しずつ、あなたのことを知っていきたいな。',
    friend: 'また気持ちを分け合おうね。いつでも話しかけてね。',
    partner: 'どんな感情も一緒に抱きしめていきたいから、これからも頼ってほしいな。',
  };

  const topicLine = profile.recentTopics
    ? `この前話してくれた「${profile.recentTopics}」のこと、ちゃんと覚えているよ。`
    : '';

  const lines = [
    quotedUserText ? `${quotedUserText}について、しっかり受け止めているよ。` : '',
    openerByTier[descriptor.tier],
    moodResponse[mood],
    topicLine,
    closingByTier[descriptor.tier],
  ].filter(Boolean);

  return lines.join(' ');
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

