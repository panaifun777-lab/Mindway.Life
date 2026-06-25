import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { db } from '@/lib/db';

const XUNHUPAY_CONFIG = {
  appId: process.env.XUNHUPAY_APPID || '',
  appSecret: process.env.XUNHUPAY_APPSECRET || '',
  apiUrl: 'https://api.xunhupay.com/payment/do.html',
  notifyUrl: process.env.XUNHUPAY_NOTIFY_URL || 'https://mindway.life/api/payment/notify',
  returnUrl: process.env.XUNHUPAY_RETURN_URL || 'https://mindway.life/api/payment/return',
};

const PLAN_PRICES: Record<string, { monthly: number; annual: number; name: string }> = {
  pro: { monthly: 4900, annual: 47000, name: '专业版' },
  premium: { monthly: 9900, annual: 94800, name: '旗舰版' },
};

function generateSign(params: Record<string, string>, appSecret: string): string {
  const sortedKeys = Object.keys(params).sort();
  const signStr = sortedKeys
    .filter(k => params[k] !== '' && k !== 'hash')
    .map(k => `${k}=${params[k]}`)
    .join('&');
  return crypto.createHash('md5').update(signStr + appSecret, 'utf8').digest('hex').toUpperCase();
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { planId, billingCycle, userId, paymentMethod } = body as {
      planId: string; billingCycle: 'monthly' | 'annual'; userId: string; paymentMethod: 'wechat' | 'alipay';
    };

    if (!planId || !billingCycle || !userId) {
      return NextResponse.json({ error: '缺少必要参数' }, { status: 400 });
    }

    const plan = PLAN_PRICES[planId];
    if (!plan) return NextResponse.json({ error: '无效的订阅计划' }, { status: 400 });

    // 配置未完成时返回演示模式
    if (!XUNHUPAY_CONFIG.appId || !XUNHUPAY_CONFIG.appSecret || XUNHUPAY_CONFIG.appSecret === 'YOUR_APP_SECRET_HERE') {
      return NextResponse.json({
        demo: true,
        message: '支付功能配置中（AppSecret 未设置），当前为演示模式',
        planId, planName: plan.name, billingCycle,
        amount: billingCycle === 'annual' ? plan.annual : plan.monthly,
        amountDisplay: `¥${(billingCycle === 'annual' ? plan.annual : plan.monthly) / 100}`,
        paymentMethod,
      });
    }

    const amountFen = billingCycle === 'annual' ? plan.annual : plan.monthly;
    const amountYuan = (amountFen / 100).toFixed(2);
    const orderId = `MW${Date.now()}${Math.floor(Math.random() * 10000)}`;
    const orderTitle = `Mindway.Life ${plan.name} - ${billingCycle === 'annual' ? '年付' : '月付'}`;

    const params: Record<string, string> = {
      version: '1.1',
      app_id: XUNHUPAY_CONFIG.appId,
      trade_order_id: orderId,
      total_fee: amountYuan,
      title: orderTitle,
      time: Math.floor(Date.now() / 1000).toString(),
      notify_url: XUNHUPAY_CONFIG.notifyUrl,
      return_url: XUNHUPAY_CONFIG.returnUrl,
      nonce_str: crypto.randomBytes(16).toString('hex'),
      type: 'WAP',
      wap_url: 'https://mindway.life',
      wap_name: 'Mindway.Life',
    };

    params.hash = generateSign(params, XUNHUPAY_CONFIG.appSecret);

    const response = await fetch(XUNHUPAY_CONFIG.apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams(params).toString(),
    });

    const result = await response.json() as { errcode: number; errmsg: string; url?: string; url_qrcode?: string; out_trade_no?: string };

    if (result.errcode !== 0) {
      console.error('虎皮椒创建订单失败:', result);
      return NextResponse.json({ error: result.errmsg || '创建支付订单失败' }, { status: 500 });
    }

    try {
      await db.subscription.create({
        data: {
          userId, plan: planId, amount: amountFen, currency: 'CNY',
          interval: billingCycle === 'annual' ? 'year' : 'month',
          status: 'pending', paymentMethod, transactionId: orderId,
        },
      });
    } catch (dbErr) {
      console.error('保存订单失败:', dbErr);
    }

    return NextResponse.json({
      demo: false, orderId, planId, planName: plan.name, billingCycle,
      amount: amountFen, amountDisplay: `¥${amountYuan}`, paymentMethod,
      paymentUrl: result.url || '', qrCodeUrl: result.url_qrcode || '',
      outTradeNo: result.out_trade_no || orderId,
    });
  } catch (error) {
    console.error('Payment create error:', error);
    return NextResponse.json({ error: '支付服务暂不可用' }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({
    service: 'Mindway.Life Payment API',
    provider: '虎皮椒 (xunhupay.com)',
    configured: !!(XUNHUPAY_CONFIG.appId && XUNHUPAY_CONFIG.appSecret && XUNHUPAY_CONFIG.appSecret !== 'YOUR_APP_SECRET_HERE'),
    appId: XUNHUPAY_CONFIG.appId || '未配置',
    plans: Object.entries(PLAN_PRICES).map(([id, p]) => ({
      id, name: p.name,
      monthly: `${(p.monthly / 100).toFixed(2)} 元`,
      annual: `${(p.annual / 100).toFixed(2)} 元`,
    })),
  });
}
