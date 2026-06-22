import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const bookRecommendations: Record<string, Array<{ title: string; author: string; reason: string }>> = {
  descartes: [
    { title: '第一哲学沉思集', author: '勒内·笛卡尔', reason: '通过六个沉思展示如何从怀疑出发建立确定性，是理解理性主义思维方法的经典入门' },
    { title: '谈谈方法', author: '勒内·笛卡尔', reason: '笛卡尔自传体哲学著作，以优雅的散文阐述理性思维的四条规则，适合初学者' },
    { title: '笛卡尔的主要思想', author: '哈德利', reason: '系统梳理笛卡尔哲学体系的导读书，帮助读者理解其怀疑方法与身心二元论' },
  ],
  pascal: [
    { title: '思想录', author: '布莱兹·帕斯卡', reason: '帕斯卡未完成的遗作，以碎片式沉思探讨人性的渺小与伟大，触动灵魂深处' },
    { title: '帕斯卡：基督徒的生活', author: '彼得·克拉夫特', reason: '深入解读帕斯卡的信仰跳跃与心之逻辑，理解理性边界处的勇气' },
    { title: '人的境况', author: '彼得·斯洛特迪克', reason: '从帕斯卡的芦苇隐喻出发，探讨人类存在的脆弱与尊严' },
  ],
  spinoza: [
    { title: '伦理学', author: '巴鲁赫·斯宾诺莎', reason: '以几何学方式论证情感的本质与自由之路，理解必然性即自由的核心思想' },
    { title: '斯宾诺莎传', author: '史蒂文·纳德勒', reason: '还原这位被驱逐的镜片研磨师的生平，理解其哲学如何源于生活' },
    { title: '斯宾诺莎与表达的潜力', author: '吉尔·德勒兹', reason: '德勒兹对斯宾诺莎情感理论的创造性解读，揭示身体与思想的深层关联' },
  ],
  locke: [
    { title: '人类理解论', author: '约翰·洛克', reason: '白板说的核心论证，展示经验如何塑造心灵，理解自我重塑的可能性' },
    { title: '政府论', author: '约翰·洛克', reason: '自然权利与社会契约的经典阐述，理解个人权利的哲学根基' },
    { title: '洛克》，作者：约翰·邓恩', author: '约翰·邓恩', reason: '精炼导读书，帮助读者快速把握洛克认识论与政治哲学的核心脉络' },
  ],
  hume: [
    { title: '人性论', author: '大卫·休谟', reason: '休谟哲学的基石，揭示因果关系不过是心理习惯，打破绝对确定性的执念' },
    { title: '道德原则研究', author: '大卫·休谟', reason: '更精炼的道德哲学论述，论证道德源于情感而非理性，解脱道德焦虑' },
    { title: '大卫·休谟：宗教著作', author: '大卫·休谟', reason: '休谟对宗教信仰的冷静审视，展示怀疑论如何应用于终极问题' },
  ],
  kant: [
    { title: '道德形而上学奠基', author: '伊曼努尔·康德', reason: '绝对命令的清晰阐述，教你如何用理性法则指导道德选择' },
    { title: '纯粹理性批判', author: '伊曼努尔·康德', reason: '哲学史上最重要的著作之一，划定理性的边界，理解为何我们不能逾越' },
    { title: '康德的政治哲学', author: '汉娜·阿伦特', reason: '阿伦特对康德判断力的独到解读，连接道德哲学与公共行动' },
  ],
  hegel: [
    { title: '精神现象学', author: '格奥尔格·黑格尔', reason: '意识从感性确定性到绝对知识的辩证旅程，理解矛盾如何推动精神成长' },
    { title: '法哲学原理', author: '格奥尔格·黑格尔', reason: '黑格尔关于伦理生活与国家哲学的系统论述，理解自由的制度实现' },
    { title: '黑格尔导论', author: '斯蒂芬·霍尔盖特', reason: '清晰梳理黑格尔辩证法的逻辑结构，帮助读者穿越晦涩进入思想深处' },
  ],
  schopenhauer: [
    { title: '作为意志和表象的世界', author: '亚瑟·叔本华', reason: '悲观主义哲学的巅峰之作，揭示欲望如何构成世界的本质，以及如何超越它' },
    { title: '人生的智慧', author: '亚瑟·叔本华', reason: '叔本华最通俗的作品，提供关于幸福、名誉和独处的冷峻忠告' },
    { title: '叔本华的哲学', author: '克里斯托弗·贾纳斯', reason: '系统解读意志哲学与审美救赎之路，帮助理解如何在痛苦中寻找出路' },
  ],
  kierkegaard: [
    { title: '非此即彼', author: '索伦·克尔凯郭尔', reason: '以两种截然不同的生活方式展示选择的两难，逼迫读者直面自己的存在抉择' },
    { title: '恐惧与颤栗', author: '索伦·克尔凯郭尔', reason: '通过对亚伯拉罕献祭的沉思，探讨信仰跳跃的荒谬与勇气' },
    { title: '克尔凯郭尔：焦虑的概念', author: '索伦·克尔凯郭尔', reason: '首次系统论述焦虑的哲学著作，揭示焦虑作为自由之可能性的积极面向' },
  ],
  nietzsche: [
    { title: '查拉图斯特拉如是说', author: '弗里德里希·尼采', reason: '尼采最具诗意的哲学宣言，超人、永恒回归与权力意志的宏大叙事' },
    { title: '善恶的彼岸', author: '弗里德里希·尼采', reason: '对传统道德的深度拆解，揭示奴隶道德如何扼杀生命力量' },
    { title: '尼采：作为哲学家的生理学家', author: '弗朗茨·奥弗贝克', reason: '从生命哲学角度解读尼采，理解身体、力量与价值的内在关联' },
  ],
  james: [
    { title: '实用主义', author: '威廉·詹姆斯', reason: '真理即有用的经典论证，打破抽象思辨，回到行动与效果本身' },
    { title: '宗教经验种种', author: '威廉·詹姆斯', reason: '对宗教体验的心理学分析，展示信仰如何真实地改变人的生命' },
    { title: '心理学原理', author: '威廉·詹姆斯', reason: '美国心理学奠基之作，其中关于习惯与自我的论述至今影响深远' },
  ],
  freud: [
    { title: '梦的解析', author: '西格蒙德·弗洛伊德', reason: '精神分析的开山之作，揭示梦是通往潜意识的大道，理解被压抑的欲望' },
    { title: '文明及其不满', author: '西格蒙德·弗洛伊德', reason: '弗洛伊德对现代文明的深刻诊断，揭示幸福为何如此困难' },
    { title: '精神分析引论', author: '西格蒙德·弗洛伊德', reason: '弗洛伊德亲自撰写的入门讲义，以清晰语言阐述精神分析的基本概念' },
  ],
  jung: [
    { title: '红书', author: '卡尔·荣格', reason: '荣格最私密的灵性记录，直面潜意识深处的原型与幻象' },
    { title: '心理类型', author: '卡尔·荣格', reason: '内倾与外倾、四种功能类型的经典划分，帮助理解自己与他人的差异' },
    { title: '荣格自传：回忆·梦·思考', author: '卡尔·荣格', reason: '荣格晚年对自己内心旅程的回顾，理解自性化过程的生动范本' },
  ],
  wittgenstein: [
    { title: '逻辑哲学论', author: '路德维希·维特根斯坦', reason: '早期维特根斯坦的格言体杰作，划定可言说与须沉默的边界' },
    { title: '哲学研究', author: '路德维希·维特根斯坦', reason: '后期维特根斯坦的语言游戏理论，展示意义如何在用法中生成' },
    { title: '维特根斯坦传：天才之为责任', author: '瑞·蒙克', reason: '一部杰出传记，还原这位哲学家如何以生命践行对精确的极端追求' },
  ],
  heidegger: [
    { title: '存在与时间', author: '马丁·海德格尔', reason: '深入理解此在、被抛性与向死而生的必读之作，存在哲学的巅峰' },
    { title: '林中路', author: '马丁·海德格尔', reason: '海德格尔关于艺术、真理与存在的散文集，语言优美而深邃' },
    { title: '海德格尔导论', author: '理查德·波尔特', reason: '最清晰的海德格尔入门读物之一，帮助读者穿越存在哲学的密林' },
  ],
  sartre: [
    { title: '存在与虚无', author: '让-保罗·萨特', reason: '存在主义哲学的系统论述，论证自由的绝对性与自欺的结构' },
    { title: '恶心', author: '让-保罗·萨特', reason: '萨特的哲学小说，以文学方式呈现存在的荒诞感与自由的重负' },
    { title: '存在主义是一种人道主义', author: '让-保罗·萨特', reason: '萨特对存在主义的通俗辩护，清晰阐述存在先于本质的核心主张' },
  ],
  beauvoir: [
    { title: '第二性', author: '西蒙娜·德·波伏娃', reason: '女性主义哲学的奠基之作，揭示社会如何将女性建构为他者' },
    { title: '模糊性的伦理学', author: '西蒙娜·德·波伏娃', reason: '波伏娃的伦理学著作，论证如何在承认人生模糊性的同时承担自由责任' },
    { title: '波伏娃传', author: '迪尔德丽·贝尔', reason: '全面还原这位思想家如何用一生践行存在主义的自由与责任' },
  ],
  camus: [
    { title: '局外人', author: '阿尔贝·加缪', reason: '以冷漠的笔触揭示荒诞的存在处境，感受个体面对世界的疏离感' },
    { title: '西西弗神话', author: '阿尔贝·加缪', reason: '对荒诞哲学的经典阐述，论证在无意义中如何找到反抗的尊严' },
    { title: '反抗者', author: '阿尔贝·加缪', reason: '加缪对反抗与革命的深刻反思，区分了创造性的反抗与毁灭性的革命' },
  ],
  marcuse: [
    { title: '单向度的人', author: '赫伯特·马尔库塞', reason: '对发达工业社会的深刻批判，揭示技术理性如何消灭了否定性思维' },
    { title: '爱欲与文明', author: '赫伯特·马尔库塞', reason: '对弗洛伊德与马克思的创造性综合，论证非压抑性文明的可能性' },
    { title: '美学的维度', author: '赫伯特·马尔库塞', reason: '马尔库塞晚期著作，论证艺术如何保存否定的力量与解放的潜能' },
  ],
  arendt: [
    { title: '极权主义的起源', author: '汉娜·阿伦特', reason: '对极权主义的经典分析，揭示群众如何被操控而放弃思考与判断' },
    { title: '人的条件', author: '汉娜·阿伦特', reason: '对劳动、工作与行动的哲学区分，论证行动与言说是人最根本的存在方式' },
    { title: '耶路撒冷的艾希曼', author: '汉娜·阿伦特', reason: '关于平庸之恶的现场报告，警示放弃思考的可怕后果' },
  ],
}

async function main() {
  console.log('Seeding book recommendations...')

  for (const [slug, books] of Object.entries(bookRecommendations)) {
    const philosopher = await prisma.philosopher.findUnique({
      where: { slug },
    })

    if (!philosopher) {
      console.log(`Philosopher not found: ${slug}`)
      continue
    }

    await prisma.philosopher.update({
      where: { slug },
      data: {
        recommendedBooks: JSON.stringify(books),
      },
    })

    console.log(`Updated ${philosopher.nameCn} with ${books.length} book recommendations`)
  }

  console.log('Done!')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
