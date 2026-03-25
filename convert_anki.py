#!/usr/bin/env python3
"""
把 Anki 匯出的 tab 分隔 CSV 轉成 anki-app 格式
用法: python3 convert_anki.py input.txt output.csv
"""
import sys
import csv
import re

def clean_html(text):
    """移除 HTML 標籤"""
    return re.sub(r'<[^>]+>', '', text).strip()

def extract_sound(text):
    """從 [sound:xxx.mp3] 提取檔名，這裡直接移除"""
    return re.sub(r'\[sound:[^\]]+\]', '', text).strip()

def parse_anki(input_path, output_path):
    with open(input_path, encoding='utf-8') as f:
        lines = f.readlines()

    rows = []
    for line in lines:
        # 跳過 # 開頭的 metadata
        if line.startswith('#'):
            continue
        line = line.rstrip('\n')
        if not line:
            continue

        cols = line.split('\t')
        if len(cols) < 2:
            continue

        # 嘗試找 front/back：跳過前面的 ID、牌組名稱等非內容欄
        # Anki 匯出通常: col0=note_id, col1=deck, col2=notetype, col3=front, col4=back ...
        # 但不同版本欄位數不同，取最後幾欄比較可靠
        # 根據截圖判斷: col0=id, col1=deck, col2=lang, col3=front, col4=back, col5=audio
        front = clean_html(extract_sound(cols[3])) if len(cols) > 3 else ""
        back  = clean_html(extract_sound(cols[4])) if len(cols) > 4 else ""

        # 用牌組名稱當 tag（取最後一段，去掉 :: 前綴）
        deck = cols[1].strip() if len(cols) > 1 else ""
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
        print("用法: python3 convert_anki.py <anki匯出.txt> <輸出.csv>")
        sys.exit(1)
    parse_anki(sys.argv[1], sys.argv[2])
