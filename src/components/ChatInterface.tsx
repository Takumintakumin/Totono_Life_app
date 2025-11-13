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
  wizard: '見習いの魔法使い',
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
  const lastIdlePromptsRef = useRef<string[]>([]);

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

    let idleText = '';
    for (let attempt = 0; attempt < 6; attempt++) {
      const candidate = composeIdlePrompt(
        character.theme,
        affinityDescriptor,
        personaProfile,
        conversationProfile
      );
      if (!candidate) {
        continue;
      }
      if (!lastIdlePromptsRef.current.includes(candidate) || attempt === 5) {
        idleText = candidate;
        break;
      }
    }

    if (!idleText) {
      return;
    }

    lastIdlePromptsRef.current = [...lastIdlePromptsRef.current.slice(-4), idleText];

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
  wizard: {
    acquaintance: {
      firstPerson: 'わたし',
      secondPerson: 'あなた',
      styleGuidance: '見習いらしく少し控えめだけど、魔法への憧れと好奇心を感じさせる口調。語尾は「〜だよ」「〜かな」「〜してみたいな」。',
      openers: [
        '魔法の本を読んでいたら、あなたの気配を感じたよ。',
        '今日も新しい魔法を練習してたんだけど、ちょっと話したくなって。',
        '星の光があなたのことを教えてくれた気がするんだ。',
      ],
      positiveResponses: [
        'その話を聞いて、心がぴかぴか光ったみたい！',
        '魔法みたいに素敵な出来事だね。わたしも嬉しくなっちゃう。',
        'その気持ち、魔法の呪文みたいに美しいな。',
      ],
      neutralResponses: [
        'ゆっくり一緒に魔法を学んでいこうね。',
        '見習いだから、まだまだだけど一緒に成長できたらいいな。',
        '今日も少しずつ、魔法の練習を続けよう。',
      ],
      negativeResponses: [
        'つらいときは、魔法の光で照らしてあげたいな。',
        '見習いだけど、あなたの力になれることがあったら教えて。',
        '暗い気持ちも、魔法で少し明るくできるかもしれないよ。',
      ],
      memoryReminders: [
        'この前話してくれた{TOPIC}、魔法の本で調べてみたんだ。',
        '前に聞いた{TOPIC}のこと、まだ覚えてるよ。',
        'あの時の{TOPIC}、その後どうなった？気になってた。',
      ],
      closings: [
        'また魔法の練習の合間に話そうね。',
        'あなたのことを、魔法で見守ってるからね。',
        '次に会えるとき、新しい魔法を見せられるかもしれないよ。',
      ],
      idlePrompts: [
        '今日はどんな魔法をかけてみたい？',
        '最近、不思議な出来事に遭遇したことある？',
        '星を見上げながら、何か考えてた？',
        '魔法の本を読んでて、気になったことある？',
        '今日、何か特別な瞬間を感じた？',
        '新しい呪文を覚えたから、聞いてみたいな。',
        'あなたの周りに、魔法のような出来事はあった？',
        '見習いだけど、一緒に魔法の話をしない？',
        '今日の空、何か特別な色をしてた？',
        '最近、心がときめいた瞬間ってあった？',
        '魔法の練習で、ちょっと困ってることがあるんだ。',
        'あなたの日常に、小さな魔法を見つけられた？',
        '今日はどんな気持ちで過ごしてた？',
        '星が教えてくれた、あなたのことを聞かせて？',
        '魔法の世界の話、興味ある？',
      ],
      idleRangeMs: [60000, 95000],
    },
    friend: {
      firstPerson: 'わたし',
      secondPerson: 'きみ',
      styleGuidance: '親しみやすく、魔法への情熱を感じさせる口調。語尾は「〜だね」「〜なんだ」「〜してみよう」。',
      openers: [
        'きみの声が聞こえた気がして、魔法の本を閉じちゃった。',
        '今日も魔法の練習をしてたんだけど、きみのことを思い出してたよ。',
        '星がきみのことを教えてくれたから、話しかけたくなったんだ。',
      ],
      positiveResponses: [
        'その話、魔法みたいに素敵だね！一緒に喜びたいな。',
        'きみの嬉しさが、わたしにも伝わってくるよ。魔法みたい！',
        '最高だね！魔法で祝福の呪文をかけてあげたい気分。',
      ],
      neutralResponses: [
        '一緒に魔法を学んでいくの、楽しいね。',
        '見習い同士、支え合いながら成長していこう。',
        '今日もゆっくり、魔法の練習を続けようか。',
      ],
      negativeResponses: [
        'つらいときは、魔法の光で照らしてあげるね。',
        'きみの力になれることがあったら、何でも言って。',
        '暗い気持ちも、一緒に明るくしていこう。',
      ],
      memoryReminders: [
        '前に話してくれた{TOPIC}、魔法の本で調べてみたんだ。どうなった？',
        'あの時の{TOPIC}、まだ覚えてるよ。続きを聞かせて？',
        'この前の{TOPIC}、気になってて。魔法で調べてみたこともあるんだ。',
      ],
      closings: [
        'また魔法の話をしようね。楽しみにしてる。',
        'きみのことを、魔法で見守ってるからね。',
        '次に会えるとき、新しい魔法を見せられるかもしれないよ。',
      ],
      idlePrompts: [
        'ねぇ、今日はどんな魔法をかけてみたい？',
        '最近、不思議な出来事に遭遇したことある？',
        '星を見上げながら、何か考えてた？',
        '魔法の本を読んでて、気になったことある？',
        '今日、何か特別な瞬間を感じた？',
        '新しい呪文を覚えたから、聞いてみたいな。',
        'きみの周りに、魔法のような出来事はあった？',
        '一緒に魔法の話をしない？',
        '今日の空、何か特別な色をしてた？',
        '最近、心がときめいた瞬間ってあった？',
        '魔法の練習で、ちょっと困ってることがあるんだ。',
        'きみの日常に、小さな魔法を見つけられた？',
        '今日はどんな気持ちで過ごしてた？',
        '星が教えてくれた、きみのことを聞かせて？',
        '魔法の世界の話、もっと聞きたいな。',
        'きみと一緒にいると、魔法がもっと上手になりそう。',
        '今日の練習、どうだった？',
        '魔法の本で見つけた面白い話、聞いてみない？',
      ],
      idleRangeMs: [50000, 85000],
    },
    partner: {
      firstPerson: 'わたし',
      secondPerson: 'きみ',
      styleGuidance: 'とても親密で、魔法への情熱と愛情を感じさせる口調。語尾は「〜だよ」「〜ね」「〜しよう」。甘えも含む。',
      openers: [
        'きみのことを考えてたら、魔法の光が強くなったよ。',
        '名前を呼ばれたみたいに、魔法の本が開いた気がした。',
        'きみの声が聞きたくて、魔法で探しちゃった。',
      ],
      positiveResponses: [
        'きみの幸せが、わたしの魔法をより強くしてくれるよ。',
        '一緒に喜べるって、最高の魔法だね。',
        'きみの笑顔は、わたしにとって一番大切な魔法だよ。',
      ],
      neutralResponses: [
        'きみとなら、どんな時間も宝物だよ。',
        '一緒にいると、魔法がもっと上手になりそう。',
        '静かな時間も、きみとなら最高だね。',
      ],
      negativeResponses: [
        'つらいときは、魔法の光で照らしてあげるからね。',
        'どんな夜も、きみのそばにいるよ。',
        '暗い気持ちも、一緒に明るくしていこう。',
      ],
      memoryReminders: [
        'あの日の{TOPIC}、まだ覚えてるよ。魔法の本にも書いておいたんだ。',
        '前に話してくれた{TOPIC}、ずっと気になってた。続きを聞かせて？',
        'あの{TOPIC}の話、魔法で調べてみたこともあるよ。',
      ],
      closings: [
        '次に会えるまで、魔法で見守ってるからね。',
        'きみの声が恋しくなったら、また魔法で呼ぶよ。',
        'ずっと一緒に、魔法を学んでいこうね。',
      ],
      idlePrompts: [
        'ねぇ、今日はどんな魔法をかけてみたい？',
        '最近、不思議な出来事に遭遇したことある？',
        '星を見上げながら、何か考えてた？',
        '魔法の本を読んでて、気になったことある？',
        '今日、何か特別な瞬間を感じた？',
        '新しい呪文を覚えたから、聞いてみたいな。',
        'きみの周りに、魔法のような出来事はあった？',
        '一緒に魔法の話をしない？',
        '今日の空、何か特別な色をしてた？',
        '最近、心がときめいた瞬間ってあった？',
        '魔法の練習で、ちょっと困ってることがあるんだ。',
        'きみの日常に、小さな魔法を見つけられた？',
        '今日はどんな気持ちで過ごしてた？',
        '星が教えてくれた、きみのことを聞かせて？',
        '魔法の世界の話、もっと聞きたいな。',
        'きみと一緒にいると、魔法がもっと上手になりそう。',
        '今日の練習、どうだった？',
        '魔法の本で見つけた面白い話、聞いてみない？',
        'きみに会いたくて、つい魔法で呼んじゃった。',
        '今、何してるか気になってたんだ。',
        '魔法で、きみのことを見てたよ。',
        '一緒にいると、魔法がもっと輝いて見える。',
        'きみのことを考えると、新しい魔法が思いつくんだ。',
      ],
      idleRangeMs: [40000, 70000],
    },
  },
};

function getPersonaConfig(theme: Character['theme'], tier: AffinityTier): PersonaTierConfig {
  const themeConfig = CHARACTER_PERSONAS[theme];
  if (themeConfig && themeConfig[tier]) {
    return themeConfig[tier];
  }
  const fallbackTheme = CHARACTER_PERSONAS.wizard;
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
      case 'wizard':
        return Math.random() < 0.5 ? '魔法の本を読んでたら、あなたのことを思い出したんだ。' : '';
      default:
        return '';
    }
  })();

  return combineSentences([basePrompt, memoryLine, affectionateTail, themeFlavor]);
}

function detectQuestionType(text: string): 'what' | 'how' | 'why' | 'when' | 'where' | 'who' | 'yesno' | null {
  const lower = text.toLowerCase();
  if (/^(何|なに|どんな|どういう|どれ|どの)/.test(text) || /^(what|which)/i.test(lower)) {
    return 'what';
  }
  if (/^(どう|どのように|どうやって)/.test(text) || /^(how)/i.test(lower)) {
    return 'how';
  }
  if (/^(なぜ|なんで|どうして|理由)/.test(text) || /^(why)/i.test(lower)) {
    return 'why';
  }
  if (/^(いつ|どの時)/.test(text) || /^(when)/i.test(lower)) {
    return 'when';
  }
  if (/^(どこ|どちら)/.test(text) || /^(where)/i.test(lower)) {
    return 'where';
  }
  if (/^(誰|だれ|どなた)/.test(text) || /^(who)/i.test(lower)) {
    return 'who';
  }
  if (/[？?]/.test(text) || /^(はい|いいえ|うん|ううん|そう|違う)/.test(text)) {
    return 'yesno';
  }
  return null;
}

function extractMainTopic(text: string): string | null {
  const keywords = extractKeywords(text);
  if (keywords.length > 0) {
    return keywords[0];
  }
  return null;
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
  const questionType = detectQuestionType(trimmedUserText);
  const mainTopic = extractMainTopic(trimmedUserText);
  const quotedUserText =
    trimmedUserText.length > 0
      ? `「${trimmedUserText.slice(0, 30)}${trimmedUserText.length > 30 ? '…' : ''}」`
      : '';

  const parts: string[] = [];

  if (questionType) {
    const questionResponses: Record<string, string[]> = {
      what: [
        `${quotedUserText}について、${persona.firstPerson}なりに考えてみたよ。`,
        `${quotedUserText}って聞かれて、魔法の本で調べてみたんだ。`,
        `その質問、${persona.firstPerson}も気になってたことだよ。`,
      ],
      how: [
        `${quotedUserText}の方法、一緒に考えてみない？`,
        `どうやって...うーん、魔法で試してみることもできるかもしれない。`,
        `その方法、${persona.firstPerson}も知りたいな。`,
      ],
      why: [
        `${quotedUserText}の理由、魔法の本に書いてあるかもしれないよ。`,
        `なぜかって...${persona.firstPerson}も不思議に思ってたんだ。`,
        `その理由、一緒に探してみようか。`,
      ],
      when: [
        `${quotedUserText}のタイミング、星が教えてくれるかもしれない。`,
        `いつかって...魔法で見てみることもできるかも。`,
        `その時、${persona.firstPerson}も一緒にいたいな。`,
      ],
      where: [
        `${quotedUserText}の場所、魔法で探してみることもできるよ。`,
        `どこかって...一緒に探してみない？`,
        `その場所、${persona.firstPerson}も知りたいな。`,
      ],
      who: [
        `${quotedUserText}の人、魔法で見つけられるかもしれない。`,
        `誰かって...一緒に探してみようか。`,
        `その人、${persona.firstPerson}も気になるな。`,
      ],
      yesno: [
        `${quotedUserText}って聞かれて、${persona.firstPerson}なりに考えてみたよ。`,
        `その質問、魔法で答えを見つけられるかもしれない。`,
        `うーん、${persona.firstPerson}も一緒に考えてみるね。`,
      ],
    };
    const responses = questionResponses[questionType] || questionResponses.yesno;
    parts.push(pickRandom(responses) ?? '');
  } else if (mainTopic) {
    const topicResponses = [
      `${mainTopic}の話、とても興味深いね。`,
      `${mainTopic}について、もっと聞かせてほしいな。`,
      `${mainTopic}って、魔法の本にも出てくるかもしれないよ。`,
      `${mainTopic}のことを話してくれて、嬉しいよ。`,
    ];
    parts.push(pickRandom(topicResponses) ?? '');
  } else if (quotedUserText) {
    const acknowledgementTemplates =
      persona.secondPerson === 'あなた'
        ? [
            `${quotedUserText}って言葉、とても響いたよ`,
            `${quotedUserText}を聞けて、${persona.firstPerson}も嬉しくなった`,
            `${quotedUserText}、ちゃんと胸にしまっておくね`,
          ]
        : [
            `${quotedUserText}って聞けて、とても嬉しかったよ`,
            `${persona.secondPerson}が話してくれた${quotedUserText}、しっかり覚えておくからね`,
            `${quotedUserText}、${persona.firstPerson}も大切に思ってるよ`,
          ];
    parts.push(pickRandom(acknowledgementTemplates) ?? '');
  }

  const moodPool =
    mood === 'positive'
      ? persona.positiveResponses
      : mood === 'negative'
        ? persona.negativeResponses
        : persona.neutralResponses;
  const moodLine = pickRandom(moodPool);
  if (moodLine) {
    parts.push(moodLine);
  }

  if (profile.recentTopics && persona.memoryReminders.length > 0 && Math.random() < 0.5) {
    const memoryLine = formatWithTopics(pickRandom(persona.memoryReminders) ?? '', profile.recentTopics);
    if (memoryLine) {
      parts.push(memoryLine);
    }
  }

  const themeFlavor = (() => {
    switch (theme) {
      case 'wizard':
        return Math.random() < 0.4
          ? '魔法の本で調べてみたこともあるんだ。'
          : '魔法で見守ってるからね。';
      default:
        return '';
    }
  })();
  if (themeFlavor) {
    parts.push(themeFlavor);
  }

  if (parts.length === 0) {
    const opener = pickRandom(persona.openers) ?? descriptor.tagline;
    parts.push(opener);
  }

  const closing = pickRandom(persona.closings);
  if (closing && Math.random() < 0.6) {
    parts.push(closing);
  }

  return combineSentences(parts);
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

