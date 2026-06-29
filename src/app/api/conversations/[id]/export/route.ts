import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

/**
 * GET /api/conversations/[id]/export
 * 导出对话为纯文本文件。
 *
 * 输出格式：
 *   标题行：哲学家名 + 对话创建日期
 *   分隔线
 *   所有消息按时间顺序，包含角色名、时间戳与内容
 *
 * 响应头：
 *   Content-Type: text/plain; charset=utf-8
 *   Content-Disposition: attachment; filename="conversation.txt"
 *
 * 注意：返回的是纯文本（不是 JSON），前端用 window.open() 或
 * <a download> 触发下载即可。
 */

function pad(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

function formatDateForFilename(d: Date): string {
  // YYYYMMDD-HHmm 避免文件名中有空格/冒号在多系统下出问题
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}-${pad(
    d.getHours()
  )}${pad(d.getMinutes())}`;
}

function formatTimestamp(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(
    d.getHours()
  )}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

const ROLE_LABEL: Record<string, string> = {
  user: '我',
  assistant: '哲学家',
  philosopher1: '哲学家1',
  philosopher2: '哲学家2',
};

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const conversation = await db.conversation.findUnique({
      where: { id },
      include: {
        philosopher: {
          select: { nameCn: true, nameEn: true },
        },
        messages: {
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!conversation) {
      return new NextResponse('Conversation not found', { status: 404 });
    }

    const philosopherName = conversation.philosopher?.nameCn || '未知哲学家';
    const philosopherNameEn = conversation.philosopher?.nameEn || '';
    const createdAt = conversation.createdAt;
    const lines: string[] = [];

    // —— 标题 ——
    lines.push('================================================');
    lines.push(`  对话导出 · ${philosopherName}`);
    if (philosopherNameEn) {
      lines.push(`  ${philosopherNameEn}`);
    }
    lines.push(`  对话开始：${formatTimestamp(createdAt)}`);
    lines.push(`  消息数量：${conversation.messages.length}`);
    if (conversation.mode === 'debate') {
      lines.push('  模式：辩论');
    }
    lines.push('================================================');
    lines.push('');

    if (conversation.messages.length === 0) {
      lines.push('（暂无消息）');
    }

    for (const msg of conversation.messages) {
      const label = ROLE_LABEL[msg.role] || msg.role;
      const ts = formatTimestamp(msg.createdAt);
      lines.push(`【${label}】 ${ts}`);
      lines.push(msg.content || '');
      lines.push('------------------------------------------------');
      lines.push('');
    }

    lines.push('');
    lines.push('—— 由 Mindway.Life 生成 ——');

    const text = lines.join('\n');

    // 文件名：哲学家名_日期.txt
    const safeName = philosopherName.replace(/[\\/:*?"<>|]/g, '');
    const filename = `${safeName}_${formatDateForFilename(createdAt)}.txt`;
    // RFC 5987 编码，确保中文文件名跨浏览器可读
    const filenameStar = encodeURIComponent(filename);

    return new NextResponse(text, {
      status: 200,
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Content-Disposition': `attachment; filename="conversation.txt"; filename*=UTF-8''${filenameStar}`,
        'Cache-Control': 'no-store',
      },
    });
  } catch (error) {
    console.error('Conversation export API error:', error);
    return new NextResponse('Failed to export conversation', { status: 500 });
  }
}
