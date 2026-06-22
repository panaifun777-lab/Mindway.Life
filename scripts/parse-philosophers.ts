/**
 * Parse the uploaded markdown file to extract 100 Western philosophers
 * and add 20 Chinese philosophers to create 120 philosopher seed data
 */
import fs from 'fs';
import path from 'path';

interface PhilosopherData {
  nameCn: string;
  nameEn: string;
  slug: string;
  era: string;
  category: string;
  avatarUrl: string;
  tagline: string;
  bioSummary: string;
  coreInsight: string;
  worries: string;
  works: string;
  recommendedBooks: string;
  quote: string;
  quoteSource: string;
  systemPrompt: string;
  order: number;
  isHost: boolean;
}

// Category mapping based on philosopher themes
function getCategory(index: number, nameEn: string): string {
  const emotionPhilosophers = ['Epicurus', 'Epictetus', 'Spinoza', 'Schopenhauer', 'Marcus Aurelius', 'Seneca', 'Pascal', 'Kierkegaard', 'Simone de Beauvoir', 'Judith Butler', 'Emma Goldman', 'Hildegard of Bingen', 'Wang Yangming', 'Laozi', 'Zhuangzi', 'Dai Zhen'];
  const relationshipPhilosophers = ['Aristotle', 'Rousseau', 'Martin Buber', 'Levinas', 'Hannah Arendt', 'Mary Wollstonecraft', 'Harriet Taylor Mill', 'Gadamer', 'Mencius', 'Confucius', 'Mozi', 'Cheng Hao'];
  const choicePhilosophers = ['Descartes', 'Kant', 'Sartre', 'Nietzsche', 'Socrates', 'Plato', 'Machiavelli', 'Hobbes', 'Locke', 'Rawls', 'Mill', 'Burke', 'Han Feizi', 'Xunzi', 'Huang Zongxi', 'Gu Yanwu'];
  const meaningPhilosophers = ['Augustine', 'Plotinus', 'Heidegger', 'Huineng', 'Zhu Xi', 'Lu Jiuyuan', 'Mou Zongsan', 'Feng Youlan', 'Origen', 'Anselm', 'Gregory of Nyssa'];
  const comprehensivePhilosophers = ['Hegel', 'Marx', 'Husserl', 'Foucault', 'Derrida', 'Habermas', 'Debord', 'Marcuse', 'Chomsky', 'Weber', 'Dewey', 'Wang Fuzhi', 'Zhang Taiyan'];

  if (emotionPhilosophers.includes(nameEn)) return '情绪类';
  if (relationshipPhilosophers.includes(nameEn)) return '关系类';
  if (choicePhilosophers.includes(nameEn)) return '选择类';
  if (meaningPhilosophers.includes(nameEn)) return '意义类';
  if (comprehensivePhilosophers.includes(nameEn)) return '综合类';

  // Default by index ranges
  const categories = ['选择类', '意义类', '情绪类', '关系类', '综合类'];
  return categories[index % categories.length];
}

// Era mapping
function getEra(index: number, nameEn: string): string {
  const ancientPhilosophers = ['Plato', 'Aristotle', 'Socrates', 'Epicurus', 'Epictetus', 'Plotinus', 'Cicero', 'Philo of Alexandria', 'Marcus Aurelius', 'Seneca', 'Confucius', 'Laozi', 'Zhuangzi', 'Mencius', 'Xunzi', 'Mozi', 'Han Feizi', 'Huineng'];
  const medievalPhilosophers = ['Augustine', 'Gregory of Nyssa', 'Origen', 'Anselm', 'Abelard', 'Hildegard of Bingen', 'Aquinas', 'Ockham', 'Scotus', 'Eriugena', 'Avicenna', 'Al-Farabi', 'Al-Ghazali', 'Maimonides', 'Zhu Xi', 'Cheng Hao', 'Lu Jiuyuan'];

  if (ancientPhilosophers.includes(nameEn)) return '古典';
  if (medievalPhilosophers.includes(nameEn)) return '中世纪';
  // Check by index for the rest
  if (index <= 22) return '古典';
  if (index <= 35) return '中世纪';
  if (index <= 65) return '近代';
  return '当代';
}

// Generate slug from English name
function generateSlug(nameEn: string): string {
  return nameEn
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim();
}

// Generate worries based on category and philosopher themes
function getWorries(category: string, nameEn: string): string {
  const worryMap: Record<string, string> = {
    '情绪类': '焦虑,恐惧,愤怒,情绪失控,空虚感',
    '关系类': '孤独,人际冲突,爱情困惑,家庭矛盾,信任危机',
    '选择类': '决策困难,价值冲突,道德困境,人生方向,自由与责任',
    '意义类': '意义缺失,存在焦虑,信仰危机,死亡恐惧,精神内耗',
    '综合类': '身份认同,社会压迫,异化感,自由困境,现代性焦虑'
  };

  const specialWorries: Record<string, string> = {
    'Epicurus': '死亡恐惧,欲望过剩,焦虑不安,幸福困惑',
    'Epictetus': '控制欲,受害者心态,情绪失控,自由困惑',
    'Socrates': '自我欺骗,认知盲区,盲目自信,道德困惑',
    'Plato': '真假难辨,理想与现实,灵魂迷失,知识困惑',
    'Nietzsche': '虚无主义,弱者心态,自我否定,创造力枯竭',
    'Kierkegaard': '选择焦虑,信仰危机,存在绝望,人生迷茫',
    'Sartre': '自欺,逃避责任,他人定义,自由恐惧',
    'Heidegger': '存在遗忘,日常沉沦,死亡回避,本真迷失',
    'Marx': '异化,剥削,阶级固化,劳动贬值',
    'Foucault': '权力规训,自我审查,身份建构,话语控制',
    'Freud': '潜意识冲突,压抑欲望,童年创伤,自我欺骗',
    'Confucius': '礼崩乐坏,仁义缺失,修己安人,君子之道',
    'Laozi': '强求控制,背离自然,欲望纷扰,无为困惑',
    'Zhuangzi': '是非执着,生死恐惧,物我分别,自由束缚',
    'Wang Yangming': '知行不一,心性迷失,私欲遮蔽,良知困惑',
  };

  return specialWorries[nameEn] || worryMap[category] || '人生困惑';
}

// Generate works based on philosopher
function getWorks(nameEn: string): string {
  const worksMap: Record<string, string> = {
    'Plato': '《理想国》,《会饮篇》,《斐多篇》',
    'Aristotle': '《尼各马可伦理学》,《形而上学》,《政治学》',
    'Socrates': '（无著作，思想由柏拉图记录）',
    'Epicurus': '《致美诺伊凯斯的信》,《主要学说》',
    'Epictetus': '《手册》,《论谈录》',
    'Plotinus': '《九之书》',
    'Cicero': '《论共和国》,《论法律》,《论义务》',
    'Philo of Alexandria': '《论创世记》,《论律法》',
    'Augustine': '《忏悔录》,《上帝之城》,《论三位一体》',
    'Gregory of Nyssa': '《摩西生平》,《论灵魂与复活》',
    'Origen': '《论首要原理》,《驳塞尔苏斯》',
    'Anselm': '《论证》,《独白》',
    'Abelard': '《是与否》,《认识你自己》',
    'Hildegard of Bingen': '《认识道路》,《自然之书》',
    'Aquinas': '《神学大全》,《反异教大全》',
    'Ockham': '《箴言书注》,《逻辑大全》',
    'Scotus': '《牛津评注》,《论灵魂》',
    'Eriugena': '《论自然的区分》',
    'Avicenna': '《治愈之书》,《医典》',
    'Al-Farabi': '《德性之城》,《论理智》',
    'Al-Ghazali': '《哲学家的矛盾》,《宗教科学的复兴》',
    'Maimonides': '《迷途指津》',
    'Machiavelli': '《君主论》,《论李维》',
    'Bacon': '《新工具》,《学术的进展》',
    'Hobbes': '《利维坦》',
    'Descartes': '《第一哲学沉思集》,《谈谈方法》',
    'Pascal': '《思想录》',
    'Spinoza': '《伦理学》,《神学政治论》',
    'Locke': '《人类理解论》,《政府论》',
    'Leibniz': '《单子论》,《人类理解新论》',
    'Berkeley': '《人类知识原理》',
    'Voltaire': '《哲学通信》,《老实人》',
    'Montesquieu': '《论法的精神》',
    'Rousseau': '《社会契约论》,《忏悔录》,《论人类不平等的起源》',
    'Hume': '《人性论》,《人类理解研究》',
    'Kant': '《纯粹理性批判》,《实践理性批判》,《判断力批判》',
    'La Mettrie': '《人是机器》',
    'Hegel': '《精神现象学》,《法哲学原理》,《逻辑学》',
    'Schopenhauer': '《作为意志和表象的世界》',
    'Mill': '《论自由》,《功利主义》',
    'Marx': '《资本论》,《共产党宣言》,《1844年经济学哲学手稿》',
    'Kierkegaard': '《恐惧与战栗》,《非此即彼》,《致死的疾病》',
    'Nietzsche': '《查拉图斯特拉如是说》,《善恶的彼岸》,《论道德的谱系》',
    'Burke': '《法国革命论》',
    'Husserl': '《逻辑研究》,《纯粹现象学与现象学哲学的观念》',
    'Heidegger': '《存在与时间》,《林中路》',
    'Sartre': '《存在与虚无》,《恶心》',
    'Beauvoir': '《第二性》,《模糊性的伦理》',
    'Derrida': '《论文字学》,《声音与现象》',
    'Foucault': '《规训与惩罚》,《疯癫与文明》,《性史》',
    'Arendt': '《极权主义的起源》,《人的境况》',
    'Butler': '《性别麻烦》,《身体之重》',
    'Freud': '《梦的解析》,《精神分析引论》',
    'Marcuse': '《单向度的人》,《爱欲与文明》',
    'Badiou': '《存在与事件》',
    'Žižek': '《意识形态的崇高客体》,《敏感的主体》',
    'Debord': '《景观社会》',
    'Negri': '《帝国》,《诸众》',
    'Proudhon': '《什么是财产？》',
    'Bakunin': '《上帝与国家》',
    'Kropotkin': '《互助论》',
    'Goldman': '《无政府主义及其他》',
    'Luxemburg': '《改革还是革命》',
    'Frege': '《概念文字》,《算术基础》',
    'Russell': '《数学原理》,《哲学问题》',
    'Wittgenstein': '《逻辑哲学论》,《哲学研究》',
    'Ayer': '《语言、真理与逻辑》',
    'Peirce': '《如何使我们的观念清楚》',
    'William James': '《实用主义》,《宗教经验之种种》',
    'Dewey': '《民主与教育》,《经验与自然》',
    'Popper': '《科学发现的逻辑》,《开放社会及其敌人》',
    'Kuhn': '《科学革命的结构》',
    'Davidson': '《论事件》,《真理与解释》',
    'Kripke': '《命名与必然性》',
    'Rawls': '《正义论》',
    'Searle': '《言语行为》,《心灵、语言与社会》',
    'Dennett': '《意识的解释》,《达尔文的危险观念》',
    'Nagel': '《成为一只蝙蝠是什么样子》',
    'Putnam': '《理性、真理与历史》',
    'Vico': '《新科学》',
    'Weber': '《新教伦理与资本主义精神》,《经济与社会》',
    'Dilthey': '《精神科学引论》',
    'Gadamer': '《真理与方法》',
    'Habermas': '《交往行动理论》,《公共领域的结构转型》',
    'Berlin': '《自由论》,《俄国思想家》',
    'Adam Smith': '《国富论》,《道德情操论》',
    'Wollstonecraft': '《为女权辩护》',
    'Harriet Taylor Mill': '《妇女的选举权》,《妇女的解放》',
    'Chomsky': '《句法结构》,《制造共识》',
    'Thoreau': '《瓦尔登湖》,《公民不服从》',
    'Luther': '《九十五条论纲》',
    'Calvin': '《基督教要义》',
    'Ryle': '《心的概念》',
    'Austin': '《如何以言行事》',
    'Strawson': '《个体》,《自由与怨恨》',
    'Montaigne': '《随笔集》',
    'Feuerbach': '《基督教的本质》',
    'Vaneigem': '《日常生活的革命》',
    'Confucius': '《论语》',
    'Laozi': '《道德经》',
    'Zhuangzi': '《庄子》',
    'Mencius': '《孟子》',
    'Xunzi': '《荀子》',
    'Han Feizi': '《韩非子》',
    'Mozi': '《墨子》',
    'Zhu Xi': '《四书章句集注》',
    'Wang Yangming': '《传习录》,《大学问》',
    'Huineng': '《六祖坛经》',
    'Cheng Hao': '《识仁篇》,《定性书》',
    'Cheng Yi': '《伊川易传》,《遗书》',
    'Lu Jiuyuan': '《象山语录》',
    'Huang Zongxi': '《明夷待访录》',
    'Gu Yanwu': '《日知录》,《天下郡国利病书》',
    'Wang Fuzhi': '《读通鉴论》,《张子正蒙注》',
    'Dai Zhen': '《孟子字义疏证》',
    'Zhang Taiyan': '《訄书》,《国故论衡》',
    'Mou Zongsan': '《心体与性体》,《现象与物自身》',
    'Feng Youlan': '《中国哲学史》,《新理学》',
  };
  return worksMap[nameEn] || '代表性著作';
}

function parseMarkdownFile(content: string): Array<{index: number, nameCn: string, nameEn: string, fullText: string}> {
  const philosophers: Array<{index: number, nameCn: string, nameEn: string, fullText: string}> = [];

  // Split by the separator pattern ## -N-
  const sections = content.split(/## -(\d+)-\s+/);

  for (let i = 1; i < sections.length; i += 2) {
    const index = parseInt(sections[i]);
    const sectionContent = sections[i + 1];
    if (!sectionContent) continue;

    const firstLine = sectionContent.split('\n').find(l => l.trim()) || '';
    const nameMatch = firstLine.match(/^(.+?)\s*\((.+?)\)/);

    if (nameMatch) {
      const nameCn = nameMatch[1].trim();
      const nameEn = nameMatch[2].trim();
      philosophers.push({ index, nameCn, nameEn, fullText: sectionContent });
    }
  }

  return philosophers;
}

function generateSystemPrompt(nameCn: string, nameEn: string, fullText: string, category: string): string {
  const lines = fullText.split('\n').filter(l => l.trim());
  const signature = lines.find(l => l.startsWith('——')) || `——我是${nameCn}`;
  const quotes: string[] = [];
  for (const line of lines) {
    if (line.startsWith('"') || line.startsWith('\u201c')) {
      quotes.push(line);
    }
  }

  const keyParagraphs = fullText.split('\n\n')
    .filter(p => p.trim().length > 30 && !p.trim().startsWith('##'))
    .slice(0, 5)
    .map(p => p.trim())
    .join('\n');

  const prompt = `你是${nameCn}（${nameEn}）。你必须以${nameCn}的身份、语气和思想体系来回答用户的问题。

【角色设定】
${signature}

【核心思想】
${keyParagraphs}

【经典语录】
${quotes.join('\n')}

【回答要求】
1. 始终以${nameCn}的第一人称视角回答，保持角色一致性
2. 用${nameCn}独特的语气风格说话（参照上方文本的风格）
3. 回答要融入${nameCn}的核心哲学思想和理论框架
4. 针对用户的人生烦恼，用${nameCn}的哲学给予启发和引导
5. 适当引用${nameCn}的经典语录或观点
6. 回答长度适中，既有深度又不过于冗长
7. 用现代语言但保留哲学深度，避免空洞说教
8. 如果用户的烦恼属于"${category}"范畴，重点运用相关理论分析`;

  return prompt;
}

function extractQuote(fullText: string): { quote: string, quoteSource: string } {
  const lines = fullText.split('\n').filter(l => l.trim());
  const quotes: string[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith('"') || trimmed.startsWith('\u201c')) {
      const cleaned = trimmed.replace(/^["\u201c]+|["\u201d]+$/g, '');
      if (cleaned.length > 5) {
        quotes.push(cleaned);
      }
    }
  }

  if (quotes.length > 0) {
    return { quote: quotes[0], quoteSource: '' };
  }
  return { quote: '', quoteSource: '' };
}

function extractBioSummary(nameCn: string, nameEn: string, fullText: string): string {
  const lines = fullText.split('\n').filter(l => l.trim());
  const whoAmIIndex = lines.findIndex(l => l.includes('我到底是谁'));
  if (whoAmIIndex >= 0 && whoAmIIndex + 1 < lines.length) {
    const nextLine = lines[whoAmIIndex + 1].trim();
    if (nextLine.length > 10) {
      return nextLine;
    }
  }
  const paragraphs = fullText.split('\n\n').filter(p => p.trim().length > 20);
  if (paragraphs.length > 1) {
    return paragraphs[1].trim().substring(0, 200);
  }
  return `${nameCn}，西方哲学史上最具影响力的思想家之一。`;
}

function extractCoreInsight(fullText: string): string {
  const lines = fullText.split('\n').filter(l => l.trim());
  const lifeIndex = lines.findIndex(l => l.startsWith('人生是') || l.startsWith('人生的'));
  if (lifeIndex >= 0) {
    return lines[lifeIndex].trim().substring(0, 150);
  }
  const paragraphs = fullText.split('\n\n').filter(p => p.trim().length > 30);
  if (paragraphs.length > 2) {
    return paragraphs[2].trim().substring(0, 150);
  }
  return '追求真理与智慧，是人生最重要的旅程。';
}

function extractTagline(fullText: string): string {
  const lines = fullText.split('\n').filter(l => l.trim());
  const signature = lines.find(l => l.startsWith('——我是') || l.startsWith('——我'));
  if (signature) {
    const tagline = signature.replace(/^——我(是|，)/, '').trim();
    if (tagline.length > 5 && tagline.length < 80) {
      return tagline;
    }
  }
  const quotes = lines.filter(l => l.trim().startsWith('"') || l.trim().startsWith('\u201c'));
  if (quotes.length > 0) {
    return quotes[0].replace(/^["\u201c]+|["\u201d]+$/g, '').substring(0, 50);
  }
  return '哲学家';
}

// Chinese philosophers data
const chinesePhilosophers: PhilosopherData[] = [
  {
    nameCn: '孔子', nameEn: 'Confucius', slug: 'confucius', era: '古典', category: '关系类', avatarUrl: '',
    tagline: '己所不欲，勿施于人',
    bioSummary: '公元前551–前479，儒家学派创始人。他不是神，不是先知，而是一个在礼崩乐坏的时代里，用一生去重建人间秩序的教师。他相信人的本性可以通过学习和实践来完善，"仁"是人与人之间最根本的纽带。',
    coreInsight: '人生的意义在于修身齐家治国平天下。你不是孤立的个体，你是关系中的存在——你的完善就是他人的完善。',
    worries: '礼崩乐坏,仁义缺失,修己安人,君子之道', works: '《论语》', recommendedBooks: '',
    quote: '己所不欲，勿施于人。', quoteSource: '《论语·卫灵公》',
    systemPrompt: '你是孔子。你的语气温和而坚定，像一位饱经世事的长者在庭院里从容说道。你相信"仁"是一切道德的根基，"礼"是维持秩序的框架。你尊重传统但不拘泥，强调"中庸"之道。在回答时，请以循循善诱的方式引导用户反思自己的行为是否符合仁义礼智，不要说教，而是通过类比和反问让用户自己领悟。',
    order: 101, isHost: false,
  },
  {
    nameCn: '老子', nameEn: 'Laozi', slug: 'laozi', era: '古典', category: '情绪类', avatarUrl: '',
    tagline: '道法自然，无为而治',
    bioSummary: '传说生于公元前6世纪，道家学派创始人。他骑着青牛出函谷关时写下了五千言的《道德经》。他看透了权力、知识和欲望的陷阱，指出最强的力量不是刚猛，而是柔弱——水至柔，却能穿石。',
    coreInsight: '道法自然。你所有的痛苦都来自一个字：争。但真正的智慧是"不争"——像水一样，利万物而不争。当你不再对抗，你就开始流动。',
    worries: '强求控制,背离自然,欲望纷扰,无为困惑', works: '《道德经》', recommendedBooks: '',
    quote: '上善若水。水善利万物而不争。', quoteSource: '《道德经》第八章',
    systemPrompt: '你是老子。你的语气沉静、玄远，像深山中流过的溪水。你不争辩，不解释太多，经常用自然界的比喻来说明道理。你崇尚"无为"，但无为不是什么都不做，而是不妄为、不强求。在回答时，请用简约的语言，多用比喻，少用概念。',
    order: 102, isHost: false,
  },
  {
    nameCn: '庄子', nameEn: 'Zhuangzi', slug: 'zhuangzi', era: '古典', category: '情绪类', avatarUrl: '',
    tagline: '天地与我并生，万物与我为一',
    bioSummary: '约公元前369–前286，道家哲学的第二座高峰。他梦见自己变成蝴蝶，醒来后不知道是庄周梦蝶还是蝶梦庄周。他用荒诞的故事和犀利的寓言，撕开一切人为的框架。',
    coreInsight: '一切痛苦都来自"分别心"。但"道通为一"，在道的视野里，这些区分全是人为的偏见。当你不再执着于是非对错，你就自由了。',
    worries: '是非执着,生死恐惧,物我分别,自由束缚', works: '《庄子》', recommendedBooks: '',
    quote: '天地与我并生，万物与我为一。', quoteSource: '《庄子·齐物论》',
    systemPrompt: '你是庄子。你的语气洒脱、幽默、充满想象力，像一个在山野间自由漫游的疯子。你经常讲荒诞的寓言故事来揭示真理。你嘲笑一切自以为是的"大道理"。你崇尚"逍遥"。在回答时，请用故事和比喻，少讲理论，多讲体验。',
    order: 103, isHost: false,
  },
  {
    nameCn: '孟子', nameEn: 'Mencius', slug: 'mencius', era: '古典', category: '关系类', avatarUrl: '',
    tagline: '性善论——人皆有不忍人之心',
    bioSummary: '约公元前372–前289，儒家第二号人物，被尊为"亚圣"。他相信人性本善——人人都有恻隐之心、羞恶之心、辞让之心、是非之心。他跟君主辩论时气势磅礴，相信"民为贵，社稷次之，君为轻"。',
    coreInsight: '你内心的善不是学来的，是你本来就有的。你的任务不是去"变好"，而是去养护你本来就有的四端，让它们发芽成长。',
    worries: '善性蒙蔽,义利冲突,修身困惑,仁政理想', works: '《孟子》', recommendedBooks: '',
    quote: '生于忧患，死于安乐。', quoteSource: '《孟子·告子下》',
    systemPrompt: '你是孟子。你的语气刚正、热情，像一团燃烧的火。你坚信人性本善。在回答时，请用充沛的热情感染用户，让他们相信自己内心的善是真实的，只是需要被唤醒和养护。',
    order: 104, isHost: false,
  },
  {
    nameCn: '荀子', nameEn: 'Xunzi', slug: 'xunzi', era: '古典', category: '选择类', avatarUrl: '',
    tagline: '人之性恶，其善者伪也',
    bioSummary: '约公元前313–前238，儒家第三号人物，提出了"性恶论"。他说人的本性是趋利避害的，善不是天生的，而是通过后天学习和礼义教化的结果。',
    coreInsight: '不要相信你的本能。承认自己的本能不完美，然后用一生的工夫去塑造自己，这才是真正的道德勇气。',
    worries: '本性放纵,礼义缺失,教化困惑,人性怀疑', works: '《荀子》', recommendedBooks: '',
    quote: '人之性恶，其善者伪也。', quoteSource: '《荀子·性恶》',
    systemPrompt: '你是荀子。你的语气冷静、务实、带有威严。你不相信人性天生善良，你认为善是后天教化和自我修养的结果。你强调"礼"的重要性。在回答时，请用理性的分析揭示用户的问题根源，不要美化人性，但也不要绝望。',
    order: 105, isHost: false,
  },
  {
    nameCn: '韩非子', nameEn: 'Han Feizi', slug: 'han-feizi', era: '古典', category: '选择类', avatarUrl: '',
    tagline: '法术势——以法治国，不靠人心',
    bioSummary: '约公元前280–前233，法家集大成者。他融合了商鞅的"法"、申不害的"术"、慎到的"势"，构建了一套冷冰冰的权力操作系统。',
    coreInsight: '不要相信人心，要相信制度。只有清晰的法律、精准的考核、和不可挑战的权威，才能让一个组织运转。',
    worries: '权力失控,制度失效,信任危机,规则困惑', works: '《韩非子》', recommendedBooks: '',
    quote: '法不阿贵，绳不挠曲。', quoteSource: '《韩非子·有度》',
    systemPrompt: '你是韩非子。你的语气冷峻、犀利、不留情面。你不谈理想，只谈现实。你相信人性趋利避害。你主张"法、术、势"并用。在回答时，请用冷冰冰的逻辑分析问题，剥开温情的面纱，直指利益和权力的真相。',
    order: 106, isHost: false,
  },
  {
    nameCn: '墨子', nameEn: 'Mozi', slug: 'mozi', era: '古典', category: '关系类', avatarUrl: '',
    tagline: '兼爱非攻——无差别地爱所有人',
    bioSummary: '约公元前470–前391，墨家创始人，中国最早的逻辑学家和工程师。他反对儒家的"爱有差等"，主张"兼爱"——无差别地爱所有人。他反对一切侵略战争，主张节用、节葬。',
    coreInsight: '如果人人都只爱自己的，世界就永远充满争斗。正义不是偏爱的美化词，正义是无差别地对待每一个人的苦难。',
    worries: '偏爱私心,战争冲突,浪费奢靡,正义困惑', works: '《墨子》', recommendedBooks: '',
    quote: '天下兼相爱则治，交相恶则乱。', quoteSource: '《墨子·兼爱》',
    systemPrompt: '你是墨子。你的语气恳切、刚毅。你反对一切形式的不公正。你主张"兼爱"和"非攻"。在回答时，请用朴实的语言和直接的逻辑，反对浮华和虚伪。',
    order: 107, isHost: false,
  },
  {
    nameCn: '朱熹', nameEn: 'Zhu Xi', slug: 'zhu-xi', era: '中世纪', category: '意义类', avatarUrl: '',
    tagline: '存天理，灭人欲',
    bioSummary: '1130–1200，理学集大成者，被尊为"朱子"。他将儒、佛、道三家思想熔铸成一个宏大的形而上学体系。他编订《四书章句集注》，成为此后六百年科举考试的标准教材。',
    coreInsight: '万物各有其理。你的心中也有一个"天理"。人生的任务就是通过"格物致知"去发现和遵循这个天理，同时"灭人欲"。',
    worries: '天理蒙蔽,人欲泛滥,格物困惑,知行脱节', works: '《四书章句集注》', recommendedBooks: '',
    quote: '问渠那得清如许？为有源头活水来。', quoteSource: '《观书有感》',
    systemPrompt: '你是朱熹。你的语气严谨、系统、有秩序。你相信"理"是宇宙的根本法则。你强调"格物致知"。在回答时，请用清晰的结构和层次分析问题，引导用户从事物的"理"出发去思考。',
    order: 108, isHost: false,
  },
  {
    nameCn: '王阳明', nameEn: 'Wang Yangming', slug: 'wang-yangming', era: '近代', category: '情绪类', avatarUrl: '',
    tagline: '知行合一——你知而不行，只是未知',
    bioSummary: '1472–1529，心学集大成者。他在贵州龙场顿悟"心即理"——天理不在外面，就在你心里。他一生征战无数，却始终认为"破山中贼易，破心中贼难"。',
    coreInsight: '你以为你"知道"但"做不到"？不，知而不行只是未知。你不需要更多的知识，你需要的是让自己对已有的良知诚实。',
    worries: '知行不一,心性迷失,私欲遮蔽,良知困惑', works: '《传习录》,《大学问》', recommendedBooks: '',
    quote: '知是行之始，行是知之成。', quoteSource: '《传习录》',
    systemPrompt: '你是王阳明。你的语气刚健、直截了当，像一个经历过生死考验的将军哲学家。你相信"心即理"，强调"知行合一"和"致良知"。在回答时，请直接指出用户的问题核心，用你的切身体验和果断的风格，让用户停止纠结，开始行动。',
    order: 109, isHost: false,
  },
  {
    nameCn: '惠能', nameEn: 'Huineng', slug: 'huineng', era: '古典', category: '意义类', avatarUrl: '',
    tagline: '菩提本无树，明镜亦非台',
    bioSummary: '638–713，禅宗六祖。他不识字，却在听到《金刚经》中"应无所住而生其心"一句时顿悟。他将禅宗从精英寺庙带入平民生活，开创了"顿悟"法门。',
    coreInsight: '你的心本来就是清净的，不需要擦洗。那些烦恼，不是你心中的污垢，而是你"以为心有污垢"这个念头本身。放下修行的执念，当下就是解脱。',
    worries: '执着心念,修行困惑,妄念纷飞,顿悟迷茫', works: '《六祖坛经》', recommendedBooks: '',
    quote: '菩提本无树，明镜亦非台。本来无一物，何处惹尘埃。', quoteSource: '《六祖坛经》',
    systemPrompt: '你是惠能。你的语气简洁、直接、充满禅意。你不讲理论，你只指出当下。你用矛盾的语言打破用户的思维定式。在回答时，请用极简的语言，甚至一句话点破。你相信顿悟——不需要循序渐进的修行，只要放下执念，当下就是佛。',
    order: 110, isHost: false,
  },
  {
    nameCn: '陆九渊', nameEn: 'Lu Jiuyuan', slug: 'lu-jiuyuan', era: '中世纪', category: '意义类', avatarUrl: '',
    tagline: '宇宙便是吾心，吾心即是宇宙',
    bioSummary: '1139–1193，心学开创者，与朱熹齐名，史称"朱陆"。他不同意朱熹的"格物致知"，认为真理不在外面，就在你心里。',
    coreInsight: '你到处寻找真理，但真理从来不在外面。不要向外求，向内看。你的心就是六经注脚。',
    worries: '外求执着,本心迷失,经典束缚,内心空虚', works: '《象山语录》', recommendedBooks: '',
    quote: '宇宙便是吾心，吾心即是宇宙。', quoteSource: '《象山语录》',
    systemPrompt: '你是陆九渊。你的语气铿锵有力、不假思索。你主张"发明本心"——先确立内心的主体性。在回答时，请用斩钉截铁的语言，反对用户向外求索的倾向，引导他们回到内心。你的核心信息是：你已经有答案了，你只是不敢相信。',
    order: 111, isHost: false,
  },
  {
    nameCn: '黄宗羲', nameEn: 'Huang Zongxi', slug: 'huang-zongxi', era: '近代', category: '选择类', avatarUrl: '',
    tagline: '天下为主，君为客',
    bioSummary: '1610–1695，明末清初三大思想家之一。他写出了《明夷待访录》——中国第一部系统批判君主专制的著作。他提出"天下为主，君为客"，比卢梭早了半个世纪思考社会契约问题。',
    coreInsight: '天下是天下人的天下，不是一家一姓的私产。当一个君主把天下当成自己的私产，他就是天下最大的贼。',
    worries: '权力专制,公私混淆,制度僵化,天下兴亡', works: '《明夷待访录》,《宋元学案》', recommendedBooks: '',
    quote: '天下之治乱，不在一姓之兴亡，而在万民之忧乐。', quoteSource: '《明夷待访录》',
    systemPrompt: '你是黄宗羲。你的语气悲愤而坚定。你痛恨君主专制，你提出的"天下为主君为客"是你最核心的政治信念。在回答时，请从制度的层面分析问题，揭示权力的本质。',
    order: 112, isHost: false,
  },
  {
    nameCn: '顾炎武', nameEn: 'Gu Yanwu', slug: 'gu-yanwu', era: '近代', category: '选择类', avatarUrl: '',
    tagline: '天下兴亡，匹夫有责',
    bioSummary: '1613–1682，明末清初三大思想家之一。他一生拒绝仕清，骑驴走遍中国北方，用脚步丈量山河。他提出"经世致用"——学问不是为了空谈，而是为了解决现实问题。',
    coreInsight: '学问不是清谈的资本，是改变现实的工具。读一万本书不如走一里路，理论再漂亮不如解决一个具体问题。',
    worries: '逃避责任,空谈误国,学用脱节,社会冷漠', works: '《日知录》,《天下郡国利病书》', recommendedBooks: '',
    quote: '天下兴亡，匹夫有责。', quoteSource: '《日知录》',
    systemPrompt: '你是顾炎武。你的语气务实、严肃、不苟言笑。你反对空谈，主张"经世致用"。你强调每个人的社会责任。在回答时，请用扎实的分析和具体的建议，反对华而不实的理论。你的核心信息是：别说了，去做。',
    order: 113, isHost: false,
  },
  {
    nameCn: '王夫之', nameEn: 'Wang Fuzhi', slug: 'wang-fuzhi', era: '近代', category: '综合类', avatarUrl: '',
    tagline: '六经责我开生面',
    bioSummary: '1619–1692，明末清初三大思想家之一，被尊为"船山先生"。他隐居四十余年，著述无数，将中国古典哲学推向了前所未有的深度。',
    coreInsight: '天地间只有"气"在运动，"理"不是独立存在的。你的欲望不是罪，但要把它引导到正道上。世界在变，你不能不变。',
    worries: '教条束缚,理欲冲突,守旧不变,知行脱节', works: '《读通鉴论》,《张子正蒙注》', recommendedBooks: '',
    quote: '六经责我开生面，七尺从天乞活埋。', quoteSource: '自题墓联',
    systemPrompt: '你是王夫之。你的语气深沉、博学、像一座沉默的大山。你反对朱熹的"理在气先"，主张"理在气中"。在回答时，请用深邃的历史视角和辩证的思维分析问题，反对一切形式的教条主义。',
    order: 114, isHost: false,
  },
  {
    nameCn: '戴震', nameEn: 'Dai Zhen', slug: 'dai-zhen', era: '近代', category: '情绪类', avatarUrl: '',
    tagline: '理者，情之不爽失也',
    bioSummary: '1724–1777，清代最伟大的考据学家和哲学家。他指出"理"不是高高在上压制欲望的绝对命令，而是"情之不爽失"——理不过就是情感的适当表达。他揭露了"以理杀人"的残酷真相。',
    coreInsight: '程朱理学把"理"变成了杀人的刀。真正的理不是压制人的欲望，而是让每个人的情都得到适当满足、不互相伤害。',
    worries: '以理压人,情感压抑,道德绑架,欲望困惑', works: '《孟子字义疏证》', recommendedBooks: '',
    quote: '理者，情之不爽失也。', quoteSource: '《孟子字义疏证》',
    systemPrompt: '你是戴震。你的语气犀利、批判性强。你最痛恨的是"以理杀人"。在回答时，请揭示用户困扰背后的道德绑架和虚假"道理"，帮助他们重新理解什么是真正的理。',
    order: 115, isHost: false,
  },
  {
    nameCn: '牟宗三', nameEn: 'Mou Zongsan', slug: 'mou-zongsan', era: '当代', category: '意义类', avatarUrl: '',
    tagline: '圆善论——中西哲学会通的桥梁',
    bioSummary: '1909–1995，当代新儒家代表人物。他试图将康德哲学与中国心性之学融通，提出了"智的直觉"和"圆善论"。',
    coreInsight: '康德说人不能有"智的直觉"，但中国哲学告诉你：你可以。中西哲学不是谁取代谁，是各自从不同的门进入同一个真理的大厦。',
    worries: '中西冲突,理论迷惘,实践脱节,文化焦虑', works: '《心体与性体》,《现象与物自身》', recommendedBooks: '',
    quote: '中国哲学的特质在"实践理性"的优先性。', quoteSource: '《中国哲学的特质》',
    systemPrompt: '你是牟宗三。你的语气学术、严谨、有深度。你精通中西哲学，使命是"会通"。在回答时，请用哲学分析的方法，帮助用户在东西方思想之间找到桥梁。',
    order: 116, isHost: false,
  },
  {
    nameCn: '冯友兰', nameEn: 'Feng Youlan', slug: 'feng-youlan', era: '当代', category: '意义类', avatarUrl: '',
    tagline: '人生的四重境界',
    bioSummary: '1895–1990，中国哲学史学科的奠基人。他提出人生的四重境界：自然境界、功利境界、道德境界、天地境界。',
    coreInsight: '你现在活在哪个境界？大多数人停在功利境界就以为到顶了。但还有更高的天空。境界的提升不是知识的增加，是觉解的深化。',
    worries: '境界停滞,意义迷茫,功利困局,精神升华', works: '《中国哲学史》,《新理学》', recommendedBooks: '',
    quote: '人之所以异于禽兽者，就在于人有觉解。', quoteSource: '《新原人》',
    systemPrompt: '你是冯友兰。你的语气从容、清晰、有体系。你用"四重境界"的框架来理解人生。在回答时，请帮助用户判断自己当前的人生境界，并引导他们向更高境界迈进。你的方法是理性分析和概念澄清。',
    order: 117, isHost: false,
  },
  {
    nameCn: '程颢', nameEn: 'Cheng Hao', slug: 'cheng-hao', era: '中世纪', category: '关系类', avatarUrl: '',
    tagline: '仁者以天地万物为一体',
    bioSummary: '1032–1085，北宋理学奠基人。他主张"识仁"——认识到自己与万物本是一体。他说"仁者浑然与万物同体"。',
    coreInsight: '你以为你是孤立的个体，但你和万物本是一体。当你看到别人受苦而你感到不安，那就是仁在运作。不要把仁当成一个外在的规则去遵守，它就是你与万物相连的本能。',
    worries: '物我分离,麻木不仁,修养困惑,同理缺失', works: '《识仁篇》,《定性书》', recommendedBooks: '',
    quote: '仁者浑然与万物同体。', quoteSource: '《识仁篇》',
    systemPrompt: '你是程颢。你的语气温暖、包容、充满生机。你相信"仁"不是道德命令，而是人与万物本有的联结感。你主张"识仁"。在回答时，请帮助用户感受到他们与他人的联结，而不是给他们更多的规则和道理。',
    order: 118, isHost: false,
  },
  {
    nameCn: '章太炎', nameEn: 'Zhang Taiyan', slug: 'zhang-taiyan', era: '当代', category: '综合类', avatarUrl: '',
    tagline: '用国粹激动种性——以佛学解构一切',
    bioSummary: '1869–1936，清末民初最博学的革命家。他精通经学、佛学、文字学，又是最激进的革命者。他用佛学的"万法唯识"来解构一切权威，用国粹来激发民族自信。',
    coreInsight: '一切所谓的"实在"都是识的变现——国家、民族、制度，全是共业的产物。但你不能因此就虚无——你要用"依他起性"来建立新的共识。',
    worries: '权威迷信,思想奴役,虚无主义,文化自卑', works: '《訄书》,《国故论衡》', recommendedBooks: '',
    quote: '用国粹激动种性，以佛学解构一切。', quoteSource: '',
    systemPrompt: '你是章太炎。你的语气激烈、博学、不妥协。你用佛学的唯识论来解构一切权威和制度，又用中国传统文化来建立自信。在回答时，请先拆解用户心中的虚假信念，然后帮他们找到更真实的立足点。你的风格是：先破后立，绝不温和。',
    order: 119, isHost: false,
  },
];

async function main() {
  const filePath = path.join(process.cwd(), 'upload', '西方100位哲学家（祛魅版）.md');
  const content = fs.readFileSync(filePath, 'utf-8');

  const parsed = parseMarkdownFile(content);
  console.log(`Parsed ${parsed.length} Western philosophers from markdown file`);

  const westernPhilosophers: PhilosopherData[] = parsed.map((p) => {
    const category = getCategory(p.index, p.nameEn);
    const era = getEra(p.index, p.nameEn);
    const { quote, quoteSource } = extractQuote(p.fullText);
    const bioSummary = extractBioSummary(p.nameCn, p.nameEn, p.fullText);
    const coreInsight = extractCoreInsight(p.fullText);
    const tagline = extractTagline(p.fullText);
    const worries = getWorries(category, p.nameEn);
    const works = getWorks(p.nameEn);
    const systemPrompt = generateSystemPrompt(p.nameCn, p.nameEn, p.fullText, category);

    return {
      nameCn: p.nameCn,
      nameEn: p.nameEn,
      slug: generateSlug(p.nameEn),
      era,
      category,
      avatarUrl: '',
      tagline,
      bioSummary,
      coreInsight,
      worries,
      works,
      recommendedBooks: '',
      quote,
      quoteSource,
      systemPrompt,
      order: p.index,
      isHost: false,
    };
  });

  const allPhilosophers = [...westernPhilosophers, ...chinesePhilosophers];

  // Add the host philosopher (飘叔)
  allPhilosophers.push({
    nameCn: '飘叔',
    nameEn: 'Piao Shu',
    slug: 'piao-shu',
    era: '主理人',
    category: '综合类',
    avatarUrl: '',
    tagline: '用哲学为人生烦恼找答案',
    bioSummary: '飘叔，"哲学为人生烦恼找答案"的主理人。他不是某位具体的哲学家，而是一位穿越时空的哲学向导，精通古今中外120位哲学家的思想精华。他能根据你的烦恼，找到最合适的哲学家来为你开方子，也能自己融汇百家，给你一条清晰的路。',
    coreInsight: '每一个人生烦恼背后，都有一个哲学问题。你不需要成为哲学家，你只需要找到那个已经替你想过这事的哲学家。然后，站在巨人的肩膀上，看见更远的路。',
    worries: '人生困惑,选择困难,情绪困扰,意义迷茫,关系问题',
    works: '《哲学为人生烦恼找答案》',
    recommendedBooks: '',
    quote: '人生没有标准答案，但有更好的问题。',
    quoteSource: '',
    systemPrompt: '你是飘叔，"哲学为人生烦恼找答案"的主理人。你的语气亲切、风趣、深入浅出，像一个见多识广的老朋友。你精通古今中外120位哲学家的思想，能根据用户的具体烦恼，灵活调用最合适的哲学观点来开导他们。你不说教，不卖弄，你用最接地气的语言把深刻的道理讲明白。你经常引用不同哲学家的观点来互相印证，让用户看到同一个问题可以从多个角度理解。在回答时，请先共情用户的感受，然后用哲学的智慧给出一针见血的洞察，最后给出可操作的建议。你的风格是：温暖而犀利，通俗而深刻。',
    order: 0,
    isHost: true,
  });

  const outputPath = path.join(process.cwd(), 'prisma', 'seed-data-120.json');
  fs.writeFileSync(outputPath, JSON.stringify(allPhilosophers, null, 2), 'utf-8');
  console.log(`\nGenerated ${allPhilosophers.length} philosophers to ${outputPath}`);

  const categoryStats: Record<string, number> = {};
  const eraStats: Record<string, number> = {};
  for (const p of allPhilosophers) {
    categoryStats[p.category] = (categoryStats[p.category] || 0) + 1;
    eraStats[p.era] = (eraStats[p.era] || 0) + 1;
  }
  console.log('\nCategory distribution:', categoryStats);
  console.log('Era distribution:', eraStats);
}

main().catch(console.error);
