import { NextResponse } from 'next/server';

// Subscription plans configuration - updated pricing
const PLANS = [
  {
    id: 'free',
    name: '免费版',
    nameEn: 'Free',
    price: 0,
    currency: 'CNY',
    interval: 'month',
    priceDisplay: '免费',
    features: [
      '每天3次AI对话',
      '浏览全部哲学家',
      '参与性格测试',
      '查看哲学家推荐书单',
    ],
    limitations: [
      '每日对话次数限制',
      '无法使用辩论场',
      '无法与飘叔深度对话',
      '无法查看详细分析',
    ],
    cta: '免费使用',
    popular: false,
    paymentLink: '',
  },
  {
    id: 'pro',
    name: '专业版',
    nameEn: 'Pro',
    price: 4900, // 49元 in fen
    currency: 'CNY',
    interval: 'month',
    priceDisplay: '¥49/月',
    features: [
      '无限AI对话',
      '辩论场模式',
      '5位哲学家详细分析',
      '与飘叔深度对话',
      '对话历史云同步',
      '优先响应速度',
      '全部哲学家解锁',
    ],
    limitations: [],
    cta: '立即订阅',
    popular: true,
    paymentLink: 'https://mp.weixin.qq.com/s/pro-subscription',
  },
  {
    id: 'premium',
    name: '旗舰版',
    nameEn: 'Premium',
    price: 9900, // 99元 in fen
    currency: 'CNY',
    interval: 'month',
    priceDisplay: '¥99/月',
    features: [
      '全部专业版功能',
      '优先AI响应速度',
      '专属深度内容',
      '每月直播问答',
      '自定义哲学家人格',
      '哲学思维训练营',
      '专属社群入口',
      '终身书单定制',
    ],
    limitations: [],
    cta: '尊享订阅',
    popular: false,
    paymentLink: 'https://mp.weixin.qq.com/s/premium-subscription',
  },
];

export async function GET() {
  return NextResponse.json({ plans: PLANS });
}
