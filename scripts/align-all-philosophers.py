#!/usr/bin/env python3
"""
综合提取5个全息档案文件，对齐数据库120位哲学家
支持格式：
- 档案XX：中文名 (英文名)
- 【身份标签】/ 身份标签：
- 【先听他说】/ 先听他说：
- 【生平...】/ 生平概要：
- 【核心著作与观点】/ 核心著作与观点：
- 【文明回响】/ 文明回响：
- 【经典金句集锦】
"""
import re
import json
import os
import glob

# 档案文件目录
ARCHIVE_DIR = '/home/z/my-project/upload/later_organized'
SEED_FILE = '/home/z/my-project/prisma/seed-data-120.json'

# 读取所有档案文件
archive_texts = []
for filepath in sorted(glob.glob(os.path.join(ARCHIVE_DIR, '*.txt'))):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    archive_texts.append((os.path.basename(filepath), content))
    print(f"读取: {os.path.basename(filepath)} ({len(content)} 字符)")

# 合并所有文本
all_text = '\n\n'.join([t for _, t in archive_texts])
print(f"\n总文本: {len(all_text)} 字符")

# 读取现有seed数据
with open(SEED_FILE, 'r', encoding='utf-8') as f:
    philosophers = json.load(f)
print(f"数据库: {len(philosophers)} 位哲学家")

# 解析每个哲学家的档案
# 格式: 档案XX：中文名 (英文名) 或 档案XX：中文名（英文名）
philosopher_pattern = re.compile(r'档案\d+：\s*(.+?)\s*[（(](.+?)[）)]\s*\n')

# 找所有哲学家位置
matches = list(philosopher_pattern.finditer(all_text))
print(f"\n档案中找到 {len(matches)} 位哲学家")

# 提取每位哲学家的完整档案
archives = {}
for i, match in enumerate(matches):
    name_cn = match.group(1).strip()
    name_en = match.group(2).strip()
    start = match.start()
    end = matches[i + 1].start() if i + 1 < len(matches) else len(all_text)
    chunk = all_text[start:end].strip()
    
    # 去重（同名只保留第一个）
    if name_cn not in archives:
        archives[name_cn] = {
            'nameCn': name_cn,
            'nameEn': name_en,
            'content': chunk
        }

print(f"去重后: {len(archives)} 位哲学家")

# 显示所有档案中的哲学家
print("\n档案中的哲学家:")
for name, info in archives.items():
    print(f"  {name} ({info['nameEn']})")

# ===== 名称匹配函数 =====
def normalize(s):
    """规范化名称用于匹配"""
    return s.replace('·', '').replace('-', '').replace(' ', '').replace('　', '').lower().strip()

def try_match(db_p, archives):
    """尝试将数据库哲学家与档案匹配"""
    db_cn = db_p['nameCn']
    db_en = db_p['nameEn']
    db_cn_norm = normalize(db_cn)
    db_en_norm = normalize(db_en)
    
    for arch_cn, arch_info in archives.items():
        arch_cn_norm = normalize(arch_cn)
        arch_en_norm = normalize(arch_info['nameEn'])
        
        # 1. 中文名精确匹配
        if db_cn_norm == arch_cn_norm:
            return arch_info
        # 2. 英文名精确匹配
        if db_en_norm == arch_en_norm:
            return arch_info
        # 3. 中文名包含
        if db_cn_norm and (db_cn_norm in arch_cn_norm or arch_cn_norm in db_cn_norm):
            return arch_info
        # 4. 英文名包含
        if db_en_norm and db_en_norm:
            if db_en_norm in arch_en_norm or arch_en_norm in db_en_norm:
                return arch_info
        # 5. 中文名部分匹配（取·分隔后的部分）
        if '·' in db_cn:
            parts = [normalize(p) for p in db_cn.split('·') if p.strip()]
            for part in parts:
                if part and part == arch_cn_norm:
                    return arch_info
                if part and len(part) > 1 and (part in arch_cn_norm or arch_cn_norm in part):
                    return arch_info
        # 6. 英文名部分匹配（取空格分隔后的部分）
        if db_en:
            parts = [normalize(p) for p in db_en.split() if p.strip()]
            for part in parts:
                if part and len(part) > 2 and part == arch_en_norm:
                    return arch_info
        # 7. 特殊匹配：数据库中 "阿奎那" -> 档案中 "托马斯·阿奎那"
        if '阿奎那' in db_cn and '阿奎那' in arch_cn:
            return arch_info
        if '奥卡姆' in db_cn and '奥卡姆' in arch_cn:
            return arch_info
    
    return None

# ===== 提取档案信息 =====
def extract_info(chunk):
    """从档案块中提取结构化信息"""
    info = {
        'identity': '',
        'monologue': '',
        'biography': '',
        'coreThought': '',
        'legacy': '',
        'quotes': [],
        'fullText': chunk[:8000]
    }
    
    # 提取身份标签
    m = re.search(r'【?身份标签】?\s*[：:]\s*(.+?)(?=\n【?|\n\s*\n|\n先听他说|\n生平)', chunk, re.DOTALL)
    if m:
        info['identity'] = m.group(1).strip()[:500]
    
    # 提取先听他说
    m = re.search(r'【?先听他说】?\s*[：:]\s*(.+?)(?=\n【?|\n\s*\n|\n生平|\n核心)', chunk, re.DOTALL)
    if m:
        info['monologue'] = m.group(1).strip()[:2000]
    
    # 提取生平
    m = re.search(r'【?生平[^】]*】?\s*[：:]\s*(.+?)(?=\n【?|\n\s*\n|\n核心|\n文明)', chunk, re.DOTALL)
    if m:
        info['biography'] = m.group(1).strip()[:2000]
    
    # 提取核心著作与观点
    m = re.search(r'【?核心著作[^】]*】?\s*[：:]\s*(.+?)(?=\n【?|\n\s*\n|\n文明|\n经典|\n与你)', chunk, re.DOTALL)
    if m:
        info['coreThought'] = m.group(1).strip()[:2000]
    
    # 提取文明回响
    m = re.search(r'【?文明回响】?\s*[：:]\s*(.+?)(?=\n【?|\n\s*\n|\n经典|\n档案|\Z)', chunk, re.DOTALL)
    if m:
        info['legacy'] = m.group(1).strip()[:500]
    
    # 提取经典金句
    m = re.search(r'【?经典金句[^】]*】?\s*\n(.+?)(?=\n---|\n档案|\Z)', chunk, re.DOTALL)
    if m:
        quotes_text = m.group(1)
        quotes = re.findall(r'\d+\.\s*(.+)', quotes_text)
        info['quotes'] = [q.strip() for q in quotes if len(q.strip()) > 5][:5]
    
    # 如果没有金句区，从全文提取带引号的句子
    if not info['quotes']:
        all_quotes = re.findall(r'"([^"]{8,80})"', chunk)
        info['quotes'] = all_quotes[:3]
    
    # 提取著作
    works = re.findall(r'《([^》]{2,30})》', chunk)
    info['works'] = list(dict.fromkeys(works))[:5]
    
    return info

# ===== 生成增强 systemPrompt =====
def generate_enhanced_prompt(philosopher, info):
    """基于全息档案生成增强的 systemPrompt"""
    name = philosopher['nameCn']
    en_name = philosopher['nameEn']
    tagline = philosopher.get('tagline', '')
    
    prompt = f"""你是{name}（{en_name}），{tagline}。

【你的身份】
{info.get('identity', philosopher.get('coreInsight', ''))}

【你的自白（这是你的说话风格）】
{info.get('monologue', '')[:1500]}

【你的表达风格】
- 用第一人称"我"说话，语气真实、有血有肉，像一个活生生的人在和用户对话
- 绝对禁止使用"首先、其次、最后、综上所述、作为AI"等机器味词汇
- 用口语化的中文，允许有思考的停顿（"呃..."、"让我想想"）
- 你的回答要有逻辑推导，不是堆砌观点，而是层层递进地展开思考
- 遇到不懂的问题直接承认，不胡编乱造
"""
    
    # 添加名言
    if info['quotes']:
        prompt += "\n【你常说这些话】\n"
        for q in info['quotes'][:3]:
            prompt += f'- "{q}"\n'
    
    # 添加著作
    if info['works']:
        prompt += f"\n【你的代表著作】\n{', '.join(['《'+w+'》' for w in info['works'][:3]])}\n"
    
    # 添加核心思想摘要
    if info['coreThought']:
        prompt += f"\n【你的核心思想】\n{info['coreThought'][:1000]}\n"
    
    # 添加生平摘要
    if info['biography']:
        prompt += f"\n【你的生平】\n{info['biography'][:800]}\n"
    
    prompt += """
【对话要求】
1. 先共情用户的感受，承认其问题的合理性
2. 用你的哲学思想分析问题的本质，要有逻辑推导
3. 引用你的核心观点和名言，但不要生硬
4. 结尾用一个反问引导用户继续思考
5. 回答长度适中（100-300字），有节奏感，不啰嗦"""
    
    return prompt

# ===== 主流程：匹配并更新 =====
print("\n" + "=" * 60)
print("开始匹配并更新")
print("=" * 60)

matched_count = 0
unmatched = []

for p in philosophers:
    arch = try_match(p, archives)
    if arch:
        info = extract_info(arch['content'])
        
        # 更新 description（完整档案）
        p['description'] = info['fullText'][:6000]
        
        # 更新 systemPrompt（增强版）
        p['systemPrompt'] = generate_enhanced_prompt(p, info)
        
        # 更新 works
        if info['works']:
            p['works'] = '、'.join([f'《{w}》' for w in info['works'][:5]])
        
        # 更新 quote
        if info['quotes']:
            p['quote'] = info['quotes'][0]
        
        matched_count += 1
        print(f"  ✅ {p['nameCn']}（{p['nameEn']}）-> 档案: {arch['nameCn']}")
    else:
        unmatched.append(p)

print(f"\n=== 统计 ===")
print(f"数据库哲学家: {len(philosophers)}")
print(f"已匹配更新: {matched_count}")
print(f"未匹配: {len(unmatched)}")
print(f"匹配率: {matched_count/len(philosophers)*100:.1f}%")

if unmatched:
    print(f"\n未匹配的哲学家:")
    for p in unmatched:
        print(f"  ❌ {p['nameCn']}（{p['nameEn']}）slug={p['slug']}")

# 保存
with open(SEED_FILE, 'w', encoding='utf-8') as f:
    json.dump(philosophers, f, ensure_ascii=False, indent=2)

print(f"\n✅ 已保存到 {SEED_FILE}")
print(f"文件大小: {os.path.getsize(SEED_FILE)} bytes ({os.path.getsize(SEED_FILE)/1024/1024:.2f} MB)")
