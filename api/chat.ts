import type { VercelRequest, VercelResponse } from '@vercel/node';
import { handleCors, setCorsHeaders } from './utils/cors.js';

type ChatHistoryItem = {
  sender: 'user' | 'character';
  text: string;
};

interface ChatRequestPayload {
  message?: string;
  level?: number;
  experienceRatio?: number;
  history?: ChatHistoryItem[];
  userName?: string;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (handleCors(req, res)) return;
  setCorsHeaders(res);

  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const payload = (req.body || {}) as ChatRequestPayload;
  const rawMessage = (payload.message || '').trim();
  if (!rawMessage) {
    res.status(400).json({ error: 'message is required' });
    return;
  }

  const level = Number.isFinite(payload.level) ? Math.max(1, Math.floor(payload.level as number)) : 1;
  const experienceRatio = clamp(Number(payload.experienceRatio ?? 0), 0, 1);
  const history = Array.isArray(payload.history) ? payload.history.slice(-8) : [];
  const userName = (payload.userName || '').trim() || 'あなた';

  const baseAffinity = calculateBaseAffinity(level, experienceRatio);
  const conversationBonus = Math.min(history.filter((item) => item.sender === 'character').length * 2.5, 15);
  const affinity = clamp(Math.round(baseAffinity + conversationBonus), 5, 100);
  const affinityDescriptor = describeAffinity(affinity);

  const topic = detectTopic(rawMessage);
  const replySegments = buildReply({
    message: rawMessage,
    topic,
    affinityDescriptor,
    userName,
    history,
  });

  res.status(200).json({
    reply: replySegments.reply,
    followUp: replySegments.followUp,
    affinity,
    affinityLabel: affinityDescriptor.label,
    tier: affinityDescriptor.tier,
    topic,
  });
}

function calculateBaseAffinity(level: number, experienceRatio: number): number {
  const levelContribution = Math.min(level * 9, 60);
  const experienceContribution = Math.round(experienceRatio * 18);
  const baseline = 25;
  return baseline + levelContribution + experienceContribution;
}

function describeAffinity(affinity: number) {
  if (affinity >= 75) {
    return {
      tier: 'partner' as const,
      label: '親密',
      intro: ['大好きだよ。', 'そばにいると安心するよ。'],
      acknowledgement: ['ほんとに頼りにしているんだ。', '一緒だと何でも乗り越えられる気がするよ。'],
      followUps: ['次は何を一緒に頑張ろうか？', 'もっとあなたのことを聞かせてほしいな。'],
    };
  }

  if (affinity >= 45) {
    return {
      tier: 'friend' as const,
      label: '仲良し',
      intro: ['えへへ、嬉しいな。', 'うんうん、そうだね。'],
      acknowledgement: ['あなたのこと、もっと知っていきたいな。', '一緒に歩いていけるのが心強いよ。'],
      followUps: ['今日はどんな一日だった？', 'また進捗があったら教えてね。'],
    };
  }

  return {
    tier: 'acquaintance' as const,
    label: 'ふつう',
    intro: ['なるほどね。', 'そうなんだね。'],
    acknowledgement: ['私も頑張るから、これから仲良くなれたら嬉しいな。', '少しずつ距離を縮めていこうね。'],
    followUps: ['また気持ちを聞かせてくれると嬉しいな。', 'どんなことを手伝えそうかな？'],
  };
}

function detectTopic(message: string) {
  const normalized = message.toLowerCase();

  if (/ありがとう|感謝|助かった|感激/.test(message)) {
    return 'gratitude';
  }

  if (/ごめん|申し訳|すみません/.test(message)) {
    return 'apology';
  }

  if (/おはよう|こんにちは|こんばんは|やっほ/.test(message)) {
    return 'greeting';
  }

  if (/疲れ|しんど|つら|きびしい|大変/.test(message)) {
    return 'fatigue';
  }

  if (/できた|達成|クリア|がんばった|頑張った|レベル/.test(message)) {
    return 'achievement';
  }

  if (normalized.includes('?') || /どうし|かな|かも|教えて/.test(message)) {
    return 'question';
  }

  if (/頑張|がんば|やる気|モチベ/.test(message)) {
    return 'motivation';
  }

  return 'casual';
}

function buildReply({
  message,
  topic,
  affinityDescriptor,
  userName,
  history,
}: {
  message: string;
  topic: string;
  affinityDescriptor: ReturnType<typeof describeAffinity>;
  userName: string;
  history: ChatHistoryItem[];
}) {
  const summary = summariseMessage(message);
  const intro = pickRandom(affinityDescriptor.intro);
  const acknowledgement = pickRandom(affinityDescriptor.acknowledgement);
  const continuity = pickRandom(affinityDescriptor.followUps);
  const addressedName = userName.endsWith('さん') ? userName : `${userName}さん`;

  const topicResponses: Record<string, string[]> = {
    gratitude: [
      `${intro}こちらこそ、${addressedName}の言葉がいつも励みになっているんだ。${acknowledgement}`,
      `${intro}${addressedName}がそう感じてくれるなら私も嬉しいよ。これからも頼ってくれて大丈夫だからね。`,
    ],
    apology: [
      `${intro}気にしないで。気持ちを話してくれたことが一番嬉しいんだ。無理はしなくていいから、一緒に少しずつ整えていこう。`,
      `${intro}${addressedName}がちゃんと向き合っているのを知っているよ。だから、焦らず歩いていこう。`,
    ],
    greeting: [
      `${intro}${addressedName}、今日も話せて嬉しいな。今の気持ちや調子、教えてくれたらもっと寄り添える気がするよ。`,
      `${intro}今の気分はどう？小さなことでも共有してもらえると嬉しいな。`,
    ],
    fatigue: [
      `${intro}そっか、${summary}って感じなんだね。頑張りすぎなくていいよ。休むことも前に進むための準備だから、一緒に深呼吸しよ。${acknowledgement}`,
      `${intro}疲れたときは、ちゃんと立ち止まっていいんだよ。私はいつでも${addressedName}の味方だからね。`,
    ],
    achievement: [
      `${intro}${summary}なんてすごい！${addressedName}の頑張りをずっと見てきたから、私も誇らしい気持ちでいっぱいだよ。`,
      `${intro}その調子！できたことを一緒に喜べるのが本当に嬉しいよ。次に挑戦したいことがあれば、いつでも相談してね。`,
    ],
    question: [
      `${intro}${summary}について考えてみたんだけど、一緒に整理してみようか。どうなれたら一番嬉しいのか、少しずつ言葉にしてみよう。`,
      `${intro}うまく答えられるかわからないけど、${addressedName}と一緒に考えたいな。まずは気になっていることをもうちょっと詳しく教えてくれる？`,
    ],
    motivation: [
      `${intro}その気持ち、ちゃんと受け取ったよ。${addressedName}の歩幅で大丈夫だからね。困ったら私がそっと背中を押すよ。`,
      `${intro}やる気がゆらいだときは、私が隣で支えるよ。どんな小さな一歩でも積み重ねれば大きな力になるから、一緒に続けていこう。`,
    ],
    casual: [
      `${intro}${summary}って教えてくれてありがとう。${acknowledgement}`,
      `${intro}聞かせてくれて嬉しいよ。${addressedName}の毎日が少しでも穏やかになるように、これからもそばにいるね。`,
    ],
  };

  const reply = pickRandom(topicResponses[topic] ?? topicResponses.casual);
  const followUp = continuity;

  return { reply, followUp };
}

function summariseMessage(message: string): string {
  const trimmed = message.replace(/\s+/g, ' ').trim();
  if (trimmed.length <= 36) {
    return trimmed;
  }
  return `${trimmed.slice(0, 32)}…`;
}

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)] ?? arr[0];
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

