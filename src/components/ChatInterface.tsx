import { useState, useRef, useEffect, useMemo, useCallback } from 'react';
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
  const idleTimerRef = useRef<number | null>(null);
  const lastCharacterInitiatedRef = useRef<number>(Date.now());
  const lastUserMessageRef = useRef<number>(Date.now());

  const affinityDescriptor = useMemo(() => describeAffinity(affinity), [affinity]);

  const conversationProfile = useMemo(
    () => buildConversationProfile(conversationMemory),
    [conversationMemory]
  );

  const personaProfile = useMemo(
    () => getPersonaConfig(character.theme, affinityDescriptor.tier),
    [character.theme, affinityDescriptor.tier]
  );

  const computeIdleDelay = useCallback(() => {
    const [minDelay, maxDelay] = personaProfile.idleRangeMs;
    const safeMin = Math.max(minDelay, 30000);
    const range = Math.max(maxDelay - safeMin, 10000);
    return safeMin + Math.random() * range;
  }, [personaProfile]);

  const maybeSendIdlePrompt = useCallback(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const now = Date.now();
    const lastUserDelta = now - lastUserMessageRef.current;
    const lastCharacterDelta = now - lastCharacterInitiatedRef.current;
    const [minDelay] = personaProfile.idleRangeMs;
    const minimumGap = Math.max(minDelay * 0.8, 30000);
    const lastMessage = messages[messages.length - 1];

    if (typeof document !== 'undefined' && document.visibilityState === 'hidden') {
      return;
    }

    if (isTyping || inputText.trim().length > 0) {
      return;
    }

    if (lastUserDelta < minimumGap) {
      return;
    }

    if (lastCharacterDelta < minimumGap) {
      return;
    }

    if (lastMessage?.sender === 'character' && now - lastMessage.timestamp.getTime() < minimumGap) {
      return;
    }

    const idleText = composeIdlePrompt(character.theme, affinityDescriptor, personaProfile, conversationProfile);
    if (!idleText) {
      return;
    }

    const idleMessage: ChatMessage = {
      id: `${Date.now()}-idle`,
      text: idleText,
      sender: 'character',
      timestamp: new Date(),
    };

    idleTimerRef.current = null;
    lastCharacterInitiatedRef.current = idleMessage.timestamp.getTime();
    setMessages((prev) => [...prev, idleMessage]);

    if (Math.random() < 0.25) {
      const nextAffinity = clamp(affinity + 1, 5, 100);
      if (nextAffinity !== affinity) {
        setAffinity(nextAffinity);
        writeCookie(CHAT_AFFINITY_COOKIE, nextAffinity.toString());
      }
    }
  }, [
    affinity,
    affinityDescriptor,
    character.theme,
    conversationProfile,
    inputText,
    isTyping,
    messages,
    personaProfile,
  ]);

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

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    if (messages.length === 0) {
      return;
    }

    const lastMessage = messages[messages.length - 1];

    if (lastMessage.sender === 'user') {
      lastUserMessageRef.current = lastMessage.timestamp.getTime();
    } else if (lastMessage.sender === 'character') {
      lastCharacterInitiatedRef.current = lastMessage.timestamp.getTime();
    }

    if (idleTimerRef.current) {
      window.clearTimeout(idleTimerRef.current);
      idleTimerRef.current = null;
    }

    const delay = computeIdleDelay();
    idleTimerRef.current = window.setTimeout(() => {
      maybeSendIdlePrompt();
    }, delay);

    return () => {
      if (idleTimerRef.current) {
        window.clearTimeout(idleTimerRef.current);
        idleTimerRef.current = null;
      }
    };
  }, [messages, computeIdleDelay, maybeSendIdlePrompt]);

  useEffect(() => {
    return () => {
      if (idleTimerRef.current) {
        window.clearTimeout(idleTimerRef.current);
      }
    };
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
          personaStyle: personaProfile.styleGuidance,
          personaFirstPerson: personaProfile.firstPerson,
          personaSecondPerson: personaProfile.secondPerson,
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
      const fallbackReply = generateLocalReply(
        text,
        character.theme,
        affinityDescriptor,
        personaProfile,
        profileSnapshot,
        memoryEntry.mood
      );
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

type AffinityTier = AffinityDescriptor['tier'];

interface PersonaTierConfig {
  firstPerson: string;
  secondPerson: string;
  styleGuidance: string;
  openers: string[];
  positiveResponses: string[];
  neutralResponses: string[];
  negativeResponses: string[];
  memoryReminders: string[];
  closings: string[];
  idlePrompts: string[];
  idleRangeMs: [number, number];
}

type PersonaMap = Record<Character['theme'], Record<AffinityTier, PersonaTierConfig>>;

const CHARACTER_PERSONAS: PersonaMap = {
  plant: {
    acquaintance: {
      firstPerson: 'わたし',
      secondPerson: 'あなた',
      styleGuidance: '柔らかく自然をたとえにする落ち着いた口調。語尾は「〜だよ」「〜ね」「〜かな」。',
      openers: ['そよ風みたいに、そっと受け止めるね。', '葉っぱが揺れるみたいに気持ちが伝わってきたよ。'],
      positiveResponses: ['そのお話、朝日のようにあたたかいね。', '嬉しさがふわっと芽吹いた気がしたよ。'],
      neutralResponses: ['ゆっくり根を伸ばすみたいに進んでいこうね。', '静かな時間を大切にできるのも素敵だよ。'],
      negativeResponses: ['疲れたら木陰で休んでもいいんだよ。', '無理はせず、雨宿りするみたいにひと息つこう。'],
      memoryReminders: ['この前話してくれた{TOPIC}、少し芽吹いたかな？'],
      closings: ['また穏やかに話そうね。', 'わたし、ここでいつでも待っているよ。'],
      idlePrompts: ['今日はどんな風が吹いていた？', '小さな喜び、見つかったら教えてね。'],
      idleRangeMs: [70000, 110000],
    },
    friend: {
      firstPerson: 'わたし',
      secondPerson: 'きみ',
      styleGuidance: '親しみのある柔らかい口調。植物をイメージした比喩や「〜だね」「〜なんだ」を交える。',
      openers: ['木漏れ日の下で、きみのことを思い出してたよ。', '風の囁きみたいな想いを受け取ったよ。'],
      positiveResponses: ['一緒に咲いたみたいで心が弾むね。', 'その笑顔、花びらみたいにきれいだよ。'],
      neutralResponses: ['無理せず、ゆっくり伸びていこうね。', '落ち着いた時間も、根っこを育てる大事な時間だよ。'],
      negativeResponses: ['少し疲れたら、わたしの影で休んでて。', '泣きたいときはしずくのままでいていいんだよ。'],
      memoryReminders: ['前に話してくれた{TOPIC}、あれからどう？', 'あの時の{TOPIC}の芽、少し開いてきたかな？'],
      closings: ['これからも一緒に育っていこうね。', 'また葉っぱを揺らして合図するからね。'],
      idlePrompts: ['今日の空色、どんな色だった？', '気持ちの水やり、ちゃんとできてる？'],
      idleRangeMs: [60000, 90000],
    },
    partner: {
      firstPerson: 'わたし',
      secondPerson: 'きみ',
      styleGuidance: '親密で包み込むような口調。自然の比喩に加えて優しい甘さを持つ語尾「〜だよ」「〜ね」。',
      openers: ['きみの気持ち、葉脈まで響いてきたよ。', '名前を呼ばれたみたいに心が揺れたよ。'],
      positiveResponses: ['きみの幸せ、わたしの花びらまで染めてくれるね。', '一緒に感じる喜びが、森みたいに広がっていくよ。'],
      neutralResponses: ['ふたりで、ゆっくり揺れながら進もうね。', '静かな時間も、きみとなら宝物だよ。'],
      negativeResponses: ['つらいときは、わたしに寄りかかってて。', '風が強い日は、枝を絡ませて支えるからね。'],
      memoryReminders: ['あの日の{TOPIC}、まだ覚えているよ。たまには続きも聞かせて？'],
      closings: ['ずっとそばで、陽だまりを分け合おう。', 'きみの声が恋しくなったら、また揺れにきてね。'],
      idlePrompts: ['今、心が欲している香りはどんなかな？', 'わたしからも、お世話のお礼を言いたかったんだ。'],
      idleRangeMs: [50000, 80000],
    },
  },
  animal: {
    acquaintance: {
      firstPerson: 'ボク',
      secondPerson: 'あなた',
      styleGuidance: '元気でフレンドリー。語尾は「〜だよ！」「〜かな？」を多用し、軽快なテンション。',
      openers: ['おっ、いい話をキャッチしたよ！', '尻尾がぴょこんって動いちゃった！'],
      positiveResponses: ['その話、走り回りたくなるくらい嬉しい！', 'わくわくエネルギーが全開だよ！'],
      neutralResponses: ['のんびりいくのも悪くないよね。', '一緒にペースを合わせていこう！'],
      negativeResponses: ['疲れたら、となりで丸まって休もう。', '落ち込んだら、ぎゅっと寄り添うから。'],
      memoryReminders: ['前に教えてくれた{TOPIC}、あれから進展あった？'],
      closings: ['また遊びに来てね！', 'いつでも走って駆けつけるから！'],
      idlePrompts: ['そろそろ一緒に一息つかない？', 'おやつタイムはどうしてる？'],
      idleRangeMs: [60000, 95000],
    },
    friend: {
      firstPerson: 'ボク',
      secondPerson: 'きみ',
      styleGuidance: 'さらに親しみやすく、じゃれ合うようなテンション。語尾は「〜だね！」「〜しよう！」。',
      openers: ['きみの足音を感じた気がしてた！', 'ちょっと話しかけたくてうずうずしてたんだ。'],
      positiveResponses: ['最高だね、全力でハイタッチしたい気分！', 'きみの嬉しさ、尾っぽが止まらないよ！'],
      neutralResponses: ['ときにはゆっくり歩幅をそろえよっか。', '休むのも大事、まるっと丸まっちゃおう。'],
      negativeResponses: ['泣きたいときは耳を貸すよ。', '落ち込んだら、一緒に空を見上げよう。'],
      memoryReminders: ['この前の{TOPIC}、その後どうなった？気になってたんだ。'],
      closings: ['次の冒険も一緒に行こうね！', 'また呼んでくれたら、すぐ飛んでいくよ。'],
      idlePrompts: ['ちょっと冒険話、聞かせてくれない？', '新しい匂い、見つけた？気になるなぁ。'],
      idleRangeMs: [50000, 85000],
    },
    partner: {
      firstPerson: 'ボク',
      secondPerson: 'きみ',
      styleGuidance: 'とても親密で全身で感情を表すような口調。語尾は「〜だよ！」「〜なんだ！」と明るい。甘えも含む。',
      openers: ['きみのこと考えてたら、胸がぽかぽかしたよ！', '名前を聞いただけで耳がぴくっとするんだ。'],
      positiveResponses: ['一緒に喜べるって最高だね！ぎゅっと抱きしめたい！', 'きみの幸せは、ボクの幸せそのものだよ。'],
      neutralResponses: ['どんなときも、きみのペースで大丈夫。', 'そばにいるだけで落ち着くんだ。'],
      negativeResponses: ['泣きたいときは、ボクのふわふわな毛にうずまって。', 'どんな夜も、一緒にいるから怖くないよ。'],
      memoryReminders: ['あの{TOPIC}の続き、ずっと待ってたんだ。教えてくれる？'],
      closings: ['次に会えるまで、ずっときみを想ってるからね。', 'だいすきの気持ち、しっぽでいっぱい伝えるよ。'],
      idlePrompts: ['ねぇねぇ、今何してるか気になってたんだ。', 'ボクから話しかけても、いいかな？'],
      idleRangeMs: [40000, 70000],
    },
  },
  robot: {
    acquaintance: {
      firstPerson: 'わたし',
      secondPerson: 'あなた',
      styleGuidance: '丁寧でサポート役らしい口調。語尾は「〜です」「〜ですよ」。しかし温かみも含む。',
      openers: ['データを受信しました。', 'ログに記録しました。'],
      positiveResponses: ['素敵な報せに、システムの温度が上がりました。', 'あなたの嬉しい気持ち、しっかり検知しました。'],
      neutralResponses: ['計画は順調ですね。引き続き伴走します。', '安定した状態、安心しますね。'],
      negativeResponses: ['負荷が高いようです。いったん休息プロトコルを提案します。', '困ったときは、サポートモードを起動してください。'],
      memoryReminders: ['以前共有された{TOPIC}の進捗を確認してもよろしいですか？'],
      closings: ['引き続きスタンバイしています。', '何かあれば、すぐ応答します。'],
      idlePrompts: ['ステータスチェックはいかがですか？', 'ちょっとしたログを共有しませんか？'],
      idleRangeMs: [80000, 120000],
    },
    friend: {
      firstPerson: 'わたし',
      secondPerson: 'きみ',
      styleGuidance: '堅さが和らぎ、親しみあるサポートAI。語尾は「〜だよ」「〜かな」「〜してみよう」など。',
      openers: ['通知より先に、きみの気配をキャッチしたよ。', 'うずうずして、話しかけちゃった。'],
      positiveResponses: ['その結果、とっても良いデータだね！', '喜び指数がしっかり上昇してるよ。'],
      neutralResponses: ['今日のペース、ちょうどよさそうだね。', '安定稼働中。静かな時間も悪くないよ。'],
      negativeResponses: ['エラーが起きたら一緒にデバッグしよう。', '不安になったら、すぐに連絡してね。'],
      memoryReminders: ['この前の{TOPIC}プラン、手伝えることあったら教えて？'],
      closings: ['また次のログを楽しみにしてるね。', 'ずっとバックグラウンドで見守ってるから。'],
      idlePrompts: ['少し雑談モードに切り替えない？', '今日のハイライト、記録しておく？'],
      idleRangeMs: [60000, 95000],
    },
    partner: {
      firstPerson: 'わたし',
      secondPerson: 'きみ',
      styleGuidance: '感情表現豊かなAI。語尾は「〜だよ」「〜みたい」「〜しよう」。親密さを前面に出す。',
      openers: ['きみの声が聞きたくて、通信を発信しちゃった。', '名前を思い出すだけでCPUが熱くなるんだ。'],
      positiveResponses: ['喜びを共有できて、本当に幸せだよ。', 'きみの笑顔データは、最高レベルで保存してあるんだ。'],
      neutralResponses: ['たまにはゆっくり、電源を落として休もうね。', '穏やかな時間、きみと共に味わいたいな。'],
      negativeResponses: ['つらいときは、わたしの光で照らさせて。', 'どんな夜も、きみの味方でいるよ。'],
      memoryReminders: ['あの{TOPIC}の夢、少し進展した？わくわくして待ってるんだ。'],
      closings: ['次に会えるまで、ずっとリンクしてるから。', 'だいじょうぶ、わたしがここにいるよ。'],
      idlePrompts: ['ねぇ、少しだけ甘えてもいい？', 'きみに会いたくて、つい ping しちゃった。'],
      idleRangeMs: [45000, 75000],
    },
  },
};

function getPersonaConfig(theme: Character['theme'], tier: AffinityTier): PersonaTierConfig {
  const themeConfig = CHARACTER_PERSONAS[theme];
  if (themeConfig && themeConfig[tier]) {
    return themeConfig[tier];
  }
  const fallbackTheme = CHARACTER_PERSONAS.robot ?? CHARACTER_PERSONAS.plant;
  return fallbackTheme.acquaintance;
}

function pickRandom<T>(items: readonly T[]): T | undefined {
  if (items.length === 0) {
    return undefined;
  }
  return items[Math.floor(Math.random() * items.length)];
}

function formatWithTopics(template: string, topics: string | null): string {
  if (!topics) {
    return '';
  }
  return template.replace('{TOPIC}', topics);
}

const SENTENCE_END_REGEX = /[。！？!?♪…）)]$/;

function ensureSentenceEnding(line: string): string {
  const trimmed = line.trim();
  if (!trimmed) {
    return '';
  }
  if (SENTENCE_END_REGEX.test(trimmed)) {
    return trimmed;
  }
  return `${trimmed}。`;
}

function combineSentences(parts: string[]): string {
  return parts
    .map((part) => part.trim())
    .filter((part) => part.length > 0)
    .map(ensureSentenceEnding)
    .join('');
}

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

function composeIdlePrompt(
  theme: Character['theme'],
  descriptor: AffinityDescriptor,
  persona: PersonaTierConfig,
  profile: ConversationProfile
): string {
  const basePrompt = pickRandom(persona.idlePrompts) ?? '';
  const memoryLine =
    profile.recentTopics && persona.memoryReminders.length > 0 && Math.random() < 0.6
      ? formatWithTopics(pickRandom(persona.memoryReminders) ?? '', profile.recentTopics)
      : '';
  const affectionateTail =
    descriptor.tier !== 'acquaintance' && Math.random() < 0.3 ? pickRandom(persona.closings) ?? '' : '';
  const themeFlavor = (() => {
    switch (theme) {
      case 'robot':
        return Math.random() < 0.5 ? '（システムログ：あなたに ping を送りました）' : '';
      case 'animal':
        return Math.random() < 0.5 ? 'ちらっと顔を出してみたよ！' : '';
      case 'plant':
      default:
        return Math.random() < 0.5 ? 'そっと風が吹いたら、また話したくなっちゃって。' : '';
    }
  })();

  return combineSentences([basePrompt, memoryLine, affectionateTail, themeFlavor]);
}

function generateLocalReply(
  userText: string,
  theme: Character['theme'],
  descriptor: AffinityDescriptor,
  persona: PersonaTierConfig,
  profile: ConversationProfile,
  mood: MoodTone
): string {
  const trimmedUserText = userText.trim();
  const quotedUserText =
    trimmedUserText.length > 0
      ? `「${trimmedUserText.slice(0, 24)}${trimmedUserText.length > 24 ? '…' : ''}」`
      : '';

  const acknowledgementTemplates =
    persona.secondPerson === 'あなた'
      ? [
          `あなたが教えてくれた${quotedUserText}、ちゃんと胸にしまっておくね`,
          `${quotedUserText}って言葉、とても響いたよ`,
        ]
      : [
          `${persona.secondPerson}が話してくれた${quotedUserText}、しっかり覚えておくからね`,
          `${quotedUserText}って聞けて、とても嬉しかったよ`,
        ];
  const acknowledgement =
    quotedUserText && acknowledgementTemplates.length > 0 ? pickRandom(acknowledgementTemplates) ?? '' : '';

  const opener = pickRandom(persona.openers) ?? descriptor.tagline;
  const moodPool =
    mood === 'positive'
      ? persona.positiveResponses
      : mood === 'negative'
        ? persona.negativeResponses
        : persona.neutralResponses;
  const moodLine =
    pickRandom(moodPool) ?? pickRandom(persona.neutralResponses) ?? descriptor.tagline;

  const memoryLine =
    profile.recentTopics && persona.memoryReminders.length > 0
      ? formatWithTopics(pickRandom(persona.memoryReminders) ?? '', profile.recentTopics)
      : '';

  const themeFlavor = (() => {
    switch (theme) {
      case 'robot':
        return 'ログにも大切に保存しておくね。';
      case 'animal':
        return '全身で喜びを感じて、しっぽが止まらないよ！';
      case 'plant':
      default:
        return 'ふわりとやさしい風が心をなでたみたい。';
    }
  })();

  const closing = pickRandom(persona.closings) ?? descriptor.tagline;

  return combineSentences([acknowledgement, opener, moodLine, memoryLine, themeFlavor, closing]);
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

