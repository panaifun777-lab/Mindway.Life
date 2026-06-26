/**
 * 智能降级响应生成器
 * 
 * 当 ZAI API 不可用时（隧道断开），根据用户问题类型 + 哲学家人设
 * 生成多样化、有逻辑的降级回复，避免模板化重复。
 */

// 问题类型检测
type QuestionType = 'choice' | 'career' | 'relationship' | 'emotion' | 'meaning' | 'anxiety' | 'general';

// 飘叔开场白池（随机选择，避免重复）
const PIAOSHU_OPENERS = [
  '哎，你说的这个事儿——', '我琢磨了一下你的问题——', '说白了，你现在卡在——',
  '让我想想啊...你问的这个——', '你这问题，问到点子上了——',
  '飘叔见多了这种事儿——', '先别急，我帮你捋捋——', '你这脑子现在是一团浆糊吧——',
];

// 哲学家开场白池
const PHILOSOPHER_OPENERS = [
  '你问的这个问题——', '有意思。让我想想——', '这正是我思考过的——',
  '你触到了一个要害——', '好问题，但不好回答——', '我年轻时就想过这个——',
  '呵，你以为只有你困惑？——', '听我说——',
];

// 问题类型关键词映射
const QUESTION_PATTERNS: Record<QuestionType, { keywords: string[]; angle: string }> = {
  choice: {
    keywords: ['还是', '或者', '选择', '怎么办', '该不该', '要不要', '哪个'],
    angle: '选择不是选对的，是选了之后把它变成对的',
  },
  career: {
    keywords: ['工作', '职业', '上班', '创业', '辞职', '跳槽', '方向', '迷茫'],
    angle: '职业不是找来的，是走出来的——你站在原地永远看不到路',
  },
  relationship: {
    keywords: ['感情', '恋爱', '分手', '婚姻', '朋友', '家人', '关系', '喜欢'],
    angle: '关系里的问题，根源都在于你想改变对方，却忘了改变自己',
  },
  emotion: {
    keywords: ['焦虑', '抑郁', '崩溃', '痛苦', '难过', '哭', '难受', '累'],
    angle: '情绪不是敌人，它是信使——它来了，是告诉你某个地方需要被看见',
  },
  meaning: {
    keywords: ['意义', '为什么活着', '没意思', '空虚', '存在', '价值', '人生'],
    angle: '意义不是找到的，是创造的——你活着这件事本身，就是意义',
  },
  anxiety: {
    keywords: ['压力', '焦虑', '紧张', '怕', '担心', '恐惧', '害怕'],
    angle: '焦虑的本质，是你想控制你控制不了的东西',
  },
  general: {
    keywords: [],
    angle: '问题的答案，往往不在问题本身，而在你提问的方式里',
  },
};

function detectQuestionType(userMessage: string): QuestionType {
  const msg = userMessage.toLowerCase();
  for (const [type, pattern] of Object.entries(QUESTION_PATTERNS)) {
    if (type === 'general') continue;
    if (pattern.keywords.some(kw => msg.includes(kw))) {
      return type as QuestionType;
    }
  }
  return 'general';
}

function randomItem<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

/**
 * 生成智能降级响应
 */
export function generateSmartFallback(
  philosopher: any,
  userMessage: string,
  isHost: boolean
): string {
  const msg = userMessage.slice(0, 80);
  const qType = detectQuestionType(userMessage);
  const angle = QUESTION_PATTERNS[qType].angle;
  const opener = isHost ? randomItem(PIAOSHU_OPENERS) : randomItem(PHILOSOPHER_OPENERS);

  // 飘叔的降级回复（旁观者+指路风格）
  if (isHost) {
    const guidanceMap: Record<QuestionType, string> = {
      choice: '这种"二选一"的困局，你得去问问存在主义那帮人——萨特说过"人被判定为自由"，选择本身就是负担。或者，让克尔凯郭尔帮你看看"信仰之跃"。',
      career: '职业迷茫这事儿，杜威的"经验主义"能帮你——他专治"想太多做太少"。或者去问问亚里士多德，他那套"潜能与现实"能让你看清自己到底能干啥。',
      relationship: '关系的事儿，别自己扛。去找波伏娃聊聊，她和萨特那套"自由与责任"能让你看清关系里的权力游戏。或者，让列维纳斯给你讲讲"他者的脸"。',
      emotion: '情绪这东西，斯多葛学派最懂。爱比克泰德能教你"区分可控与不可控"。或者，让叔本华陪你坐坐——他比你还悲观，但你反而会好受点。',
      meaning: '意义的问题，加缪是你的菜——"西西弗斯推石头"的故事专治"活着为什么"。或者，让弗兰克尔跟你聊聊，他在集中营里找到了意义。',
      anxiety: '焦虑这事儿，克尔凯郭尔研究了一辈子——他说焦虑是"自由的眩晕"。或者，让海德格尔帮你看看"向死而生"是什么意思。',
      general: '这事儿，你得找个对口的哲学家聊聊。我在这儿给你指路——告诉我是哪方面的困惑，我帮你匹配。',
    };

    return `${opener}${msg}\n\n${angle}。\n\n${guidanceMap[qType]}\n\n我现在的"脑子"暂时转得慢——但你想清楚要聊哪方面，我可以把你引荐给对应的哲学家。他们比我更能帮到你。\n\n你现在最想搞明白的一件事，是什么？`;
  }

  // 哲学家的降级回复（以其人设+思想角度回答）
  const worries = philosopher.worries ? philosopher.worries.split('、').slice(0, 3).join('、') : '人生';
  
  const philosopherGuidance = `${philosopher.nameCn}的看法是：${philosopher.coreInsight}\n\n用我的话说——${angle}。\n\n你问的这个"${msg}"，其实藏着一个更深的问题。我能感觉到你的困惑，但今天我的思绪有点乱，没法给你完整的回答。\n\n记住我这句话："${philosopher.quote}"。这不是套话，是我用一辈子悟出来的。\n\n你愿意的话，把你的情况再说具体点——我${worries}这些事儿，见过不少。`;

  return `${opener}${philosopherGuidance}`;
}

/**
 * 生成带"思考中"提示的降级响应（当 ZAI 暂时不可用时）
 */
export function generateThinkingFallback(philosopher: any, userMessage: string): string {
  const isHost = philosopher.isHost;
  const fallback = generateSmartFallback(philosopher, userMessage, isHost);
  return fallback;
}
