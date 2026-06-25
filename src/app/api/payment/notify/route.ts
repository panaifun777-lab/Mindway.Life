import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { db } from '@/lib/db';

const APP_SECRET = process.env.XUNHUPAY_APPSECRET || '';

function verifySign(params: Record<string, string>, appSecret: string): boolean {
  const hash = params.hash;
  if (!hash) return false;
  const sortedKeys = Object.keys(params).sort();
  const signStr = sortedKeys.filter(k => params[k] !== '' && k !== 'hash').map(k => `${k}=${params[k]}`).join('&');
  const expectedHash = crypto.createHash('md5').update(signStr + appSecret, 'utf8').digest('hex').toUpperCase();
  return hash === expectedHash;
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const params: Record<string, string> = {};
    formData.forEach((value, key) => { params[key] = value.toString(); });

    console.log('收到虎皮椒支付回调:', params);

    if (!APP_SECRET || APP_SECRET === 'YOUR_APP_SECRET_HERE') {
      return new NextResponse('fail', { status: 500 });
    }

    if (!verifySign(params, APP_SECRET)) {
      console.error('签名验证失败');
      return new NextResponse('fail', { status: 400 });
    }

    if (params.status !== '1' && params.pay_status !== '1') {
      return new NextResponse('success', { status: 200 });
    }

    const orderId = params.trade_order_id || params.out_trade_no;
    const transactionId = params.transaction_id || params.open_order_id;

    if (!orderId) return new NextResponse('fail', { status: 400 });

    const subscription = await db.subscription.findFirst({ where: { transactionId: orderId } });
    if (!subscription) return new NextResponse('fail', { status: 404 });
    if (subscription.status === 'active') return new NextResponse('success', { status: 200 });

    const now = new Date();
    const endDate = new Date(now);
    if (subscription.interval === 'year') endDate.setFullYear(endDate.getFullYear() + 1);
    else endDate.setMonth(endDate.getMonth() + 1);

    await db.subscription.update({
      where: { id: subscription.id },
      data: { status: 'active', transactionId: transactionId || orderId, startDate: now, endDate },
    });

    const planMap: Record<string, string> = { pro: 'pro', premium: 'premium' };
    await db.user.update({
      where: { id: subscription.userId },
      data: { plan: planMap[subscription.plan] || subscription.plan },
    });

    console.log(`✅ 订阅激活: 用户=${subscription.userId}, 计划=${subscription.plan}`);
    return new NextResponse('success', { status: 200 });
  } catch (error) {
    console.error('支付回调失败:', error);
    return new NextResponse('fail', { status: 500 });
  }
}
