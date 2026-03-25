#!/usr/bin/env python3
"""
把 Anki 匯出的檔案（tab 分隔 .txt 或逗號分隔 .csv）轉成 anki-app 格式
用法: python3 convert_anki.py input.txt output.csv
      python3 convert_anki.py input.csv output.csv
"""
import sys
import csv
import re

def clean_html(text):
    return re.sub(r'<[^>]+>', '', text).strip()

def clean(text):
    return clean_html(re.sub(r'\[sound:[^\]]+\]', '', text)).strip()

def parse_anki(input_path, output_path):
    with open(input_path, encoding='utf-8') as f:
        raw = f.read()

    lines = raw.splitlines()

    # 自動偵測分隔符號
    non_meta = [l for l in lines if not l.startswith('#') and l.strip()]
    delimiter = '\t' if non_meta and '\t' in non_meta[0] else ','

    rows = []
    for line in lines:
        if line.startswith('#') or not line.strip():
            continue

        cols = list(csv.reader([line], delimiter=delimiter))[0]

        if delimiter == '\t':
            # Anki txt 匯出: col0=id, col1=deck, col2=notetype, col3=front, col4=back
            front = clean(cols[3]) if len(cols) > 3 else ""
            back  = clean(cols[4]) if len(cols) > 4 else ""
            deck  = cols[1].strip() if len(cols) > 1 else ""
        else:
            # 一般 CSV：嘗試用 header 對應，沒有 header 就用位置
            if line.lower().startswith('front'):
                continue  # 跳過 header 行
            front = clean(cols[0]) if len(cols) > 0 else ""
            back  = clean(cols[1]) if len(cols) > 1 else ""
            deck  = clean(cols[4]) if len(cols) > 4 else ""

        tag = deck.split("::")[-1].strip() if deck else ""

        if front and back:
            rows.append([front, back, "", tag, deck])

    with open(output_path, 'w', encoding='utf-8', newline='') as f:
        writer = csv.writer(f)
        writer.writerow(['front', 'back', 'sentence', 'tags', 'deck'])
        writer.writerows(rows)

    print(f"完成，共轉換 {len(rows)} 筆 → {output_path}")

if __name__ == "__main__":
    if len(sys.argv) < 3:
        print("用法: python3 convert_anki.py <input.txt 或 input.csv> <output.csv>")
        sys.exit(1)
    parse_anki(sys.argv[1], sys.argv[2])
