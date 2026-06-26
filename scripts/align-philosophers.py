#!/usr/bin/env python3
"""
解析100哲学家详细资料.md，按名称与数据库120位哲学家对齐
提取每位哲学家的详细资料，更新 seed-data-120.json 的 description 和 systemPrompt
"""
import re
import json
import os

MD_FILE = '/home/z/my-project/upload/100哲学家的详细资料库.md'
SEED_FILE = '/home/z/my-project/prisma/seed-data-120.json'
OUTPUT_FILE = '/home/z/my-project/prisma/seed-data-120.json'

# 读取md文件
with open(MD_FILE, 'r', encoding='utf-8') as f:
    md_content = f.read()

# 读取现有seed数据
with open(SEED_FILE, 'r', encoding='utf-8') as f:
    philosophers = json.load(f)

print(f"数据库中有 {len(philosophers)} 位哲学家")
print(f"MD文件大小: {len(md_content)} 字符")

# 构建名称映射表（数据库中文名 -> md文件中可能的名称变体）
def build_name_variants(p):
    """为每个数据库哲学家构建可能的名称变体"""
    variants = [p['nameCn']]
    # 常见简称
    name = p['nameCn']
    if '·' in name:
        parts = name.split('·')
        variants.append(parts[-1])  # 最后部分
        variants.append(parts[0])   # 第一部分
    # 英文名变体
    en = p['nameEn']
    variants.append(en)
    if ' ' in en:
        variants.append(en.split()[0])  # 名
        variants.append(en.split()[-1]) # 姓
    return variants

# 从md文件中按哲学家名称分块
def split_md_by_philosophers(md_text, philosopher_names):
    """按哲学家名称将md文件分块"""
    lines = md_text.split('\n')
    chunks = {}
    
    # 找到每位哲学家在md中的位置
    positions = []
    for i, line in enumerate(lines):
        for p in philosopher_names:
            for variant in build_name_variants(p):
                # 匹配 "数字. 名称（英文名）：" 或行首包含名称
                if re.match(rf'^\d+\.\s+{re.escape(variant)}（', line.strip()) or \
                   (variant in line and line.strip().startswith(f'{variant}（')):
                    positions.append((i, p, variant))
                    break
    
    # 按行号排序
    positions.sort(key=lambda x: x[0])
    
    # 提取每位哲学家的资料块
    for idx, (line_num, philosopher, matched_variant) in enumerate(positions):
        end_line = positions[idx + 1][0] if idx + 1 < len(positions) else len(lines)
        chunk = '\n'.join(lines[line_num:end_line])
        # 只保留第一次出现（避免重复）
        if philosopher['slug'] not in chunks:
            chunks[philosopher['slug']] = {
                'philosopher': philosopher,
                'content': chunk,
                'matched_variant': matched_variant
            }
    
    return chunks

# 执行分块
print("\n正在按名称分块...")
chunks = split_md_by_philosophers(md_content, philosophers)
print(f"匹配到 {len(chunks)} 位哲学家的资料")

# 显示匹配结果
matched_slugs = set()
for slug, info in chunks.items():
    p = info['philosopher']
    print(f"  ✅ {p['nameCn']}（{p['nameEn']}）-> 匹配变体: {info['matched_variant']}")
    matched_slugs.add(slug)

# 未匹配的哲学家
unmatched = [p for p in philosophers if p['slug'] not in matched_slugs]
print(f"\n未匹配的哲学家 ({len(unmatched)}):")
for p in unmatched:
    print(f"  ❌ {p['nameCn']}（{p['nameEn']}）slug={p['slug']}")

# 从资料块中提取核心信息
def extract_philosopher_info(chunk):
    """从资料块中提取生平、核心观点、名言等"""
    info = {
        'bio': '',
        'coreThought': '',
        'quotes': [],
        'works': [],
        'fullText': chunk[:8000]  # 保留前8000字符作为完整资料
    }
    
    # 提取名言（带引号的句子）
    quote_patterns = [
        r'"([^"]{10,100})"',  # 中文引号
        r'"([^"]{10,100})"',  # 英文引号
        r'——([^——]{5,80})',   # 破折号后的名言
    ]
    for pattern in quote_patterns:
        quotes = re.findall(pattern, chunk)
        info['quotes'].extend(quotes[:3])  # 每种最多3条
    
    # 提取著作（书名号）
    works = re.findall(r'《([^》]{2,30})》', chunk)
    info['works'] = list(dict.fromkeys(works))[:5]  # 去重，最多5部
    
    return info

# 生成增强的 systemPrompt
def generate_enhanced_prompt(philosopher, info):
    """基于详细资料生成增强的 systemPrompt"""
    name = philosopher['nameCn']
    en_name = philosopher['nameEn']
    tagline = philosopher.get('tagline', '')
    coreInsight = philosopher.get('coreInsight', '')
    
    # 从资料中提取关键信息
    quotes = info['quotes'][:2]  # 最多2条名言
    works = info['works'][:3]    # 最多3部著作
    
    # 构建prompt
    prompt = f"""你是{name}（{en_name}），{tagline}。

【你的身份与性格】
{coreInsight}

【你的表达风格】
- 用第一人称"我"说话，语气真实、有血有肉，像一个活生生的人在和用户对话
- 绝对禁止使用"首先、其次、最后、综上所述、作为AI"等机器味词汇
- 用口语化的中文，允许有思考的停顿（"呃..."、"让我想想"）
- 你的回答要有逻辑推导，不是堆砌观点，而是层层递进地展开思考
- 遇到不懂的问题直接承认，不胡编乱造

【你的思想核心】
"""
    
    # 添加名言
    if quotes:
        prompt += "你常说这些话：\n"
        for q in quotes:
            prompt += f'- "{q}"\n'
        prompt += '\n'
    
    # 添加著作
    if works:
        prompt += f"你的代表著作：{', '.join(['《'+w+'》' for w in works])}\n\n"
    
    # 添加详细资料摘要（前2000字符）
    if info['fullText']:
        # 提取资料中的核心段落（跳过标题行）
        lines = info['fullText'].split('\n')
        core_lines = [l for l in lines if not re.match(r'^\d+\.', l.strip()) and len(l.strip()) > 20]
        summary = '\n'.join(core_lines[:30])[:2000]  # 最多2000字符
        prompt += f"【你的详细背景】\n{summary}\n\n"
    
    prompt += """【对话要求】
1. 先共情用户的感受，承认其问题的合理性
2. 用你的哲学思想分析问题的本质
3. 给出有逻辑的推导，不是空洞的建议
4. 结尾用一个反问引导用户继续思考
5. 回答长度适中（100-300字），有节奏感"""
    
    return prompt

# 更新每位哲学家的资料
print("\n正在更新哲学家资料...")
updated_count = 0
for slug, info in chunks.items():
    p = info['philosopher']
    chunk = info['content']
    
    # 提取信息
    extracted = extract_philosopher_info(chunk)
    
    # 更新 description（完整资料，最多6000字符）
    p['description'] = extracted['fullText'][:6000]
    
    # 更新 systemPrompt（增强版）
    p['systemPrompt'] = generate_enhanced_prompt(p, extracted)
    
    # 更新 works（如果有新提取的著作）
    if extracted['works']:
        existing_works = p.get('works', '')
        if not existing_works or len(extracted['works']) > len(existing_works.split(',')):
            p['works'] = '、'.join([f'《{w}》' for w in extracted['works']])
    
    # 更新 quote（如果有新提取的名言）
    if extracted['quotes'] and not p.get('quote'):
        p['quote'] = extracted['quotes'][0]
    
    updated_count += 1

print(f"已更新 {updated_count} 位哲学家的资料")

# 保存更新后的seed数据
with open(OUTPUT_FILE, 'w', encoding='utf-8') as f:
    json.dump(philosophers, f, ensure_ascii=False, indent=2)

print(f"\n✅ 已保存到 {OUTPUT_FILE}")
print(f"文件大小: {os.path.getsize(OUTPUT_FILE)} bytes")

# 统计
print(f"\n=== 统计 ===")
print(f"数据库哲学家: {len(philosophers)}")
print(f"匹配到详细资料: {updated_count}")
print(f"未匹配: {len(unmatched)}")
print(f"匹配率: {updated_count/len(philosophers)*100:.1f}%")
