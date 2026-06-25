import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const orderId = searchParams.get('trade_order_id') || searchParams.get('out_trade_no');
  
  const html = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>支付结果 - Mindway.Life</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, "Noto Serif SC", serif; background: linear-gradient(135deg, #f5f0e8 0%, #faf8f3 100%); min-height: 100vh; display: flex; align-items: center; justify-content: center; color: #2d2418; }
    .container { background: white; border-radius: 16px; padding: 48px 40px; max-width: 480px; width: 90%; text-align: center; box-shadow: 0 10px 40px rgba(45,36,24,0.08); }
    .icon { width: 80px; height: 80px; margin: 0 auto 24px; border-radius: 50%; background: linear-gradient(135deg, #c9a96e 0%, #b8975a 100%); display: flex; align-items: center; justify-content: center; }
    .icon svg { width: 40px; height: 40px; color: white; }
    h1 { font-size: 24px; margin-bottom: 12px; color: #2d2418; }
    p { color: #6b5d4f; font-size: 15px; line-height: 1.6; margin-bottom: 8px; }
    .order-info { background: #faf8f3; border-radius: 12px; padding: 16px; margin: 24px 0; font-size: 13px; color: #6b5d4f; }
    .order-info strong { color: #2d2418; }
    .btn { display: inline-block; background: linear-gradient(135deg, #c9a96e 0%, #b8975a 100%); color: white; padding: 14px 40px; border-radius: 10px; text-decoration: none; font-size: 15px; font-weight: 600; transition: transform 0.2s; }
    .btn:hover { transform: translateY(-1px); box-shadow: 0 6px 20px rgba(201,169,110,0.4); }
  </style>
</head>
<body>
  <div class="container">
    <div class="icon">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
        <polyline points="20 6 9 17 4 12"></polyline>
      </svg>
    </div>
    <h1>支付完成</h1>
    <p>感谢您订阅 Mindway.Life！</p>
    <p>您的会员权益已激活，现在可以享受全部功能。</p>
    ${orderId ? `<div class="order-info">订单号: <strong>${orderId}</strong></div>` : ''}
    <a href="https://mindway.life" class="btn">返回首页</a>
  </div>
</body>
</html>`;
  
  return new NextResponse(html, { headers: { 'Content-Type': 'text/html; charset=utf-8' } });
}
