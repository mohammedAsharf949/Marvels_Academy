import os
from pathlib import Path
from bs4 import BeautifulSoup

# إعدادات
WORKSHEETS_DIR = 'EducationWorksheets'  # مجلد الشيتات الرئيسي
WORKSHEETS_HTML = 'worksheets.html'  # ملف الصفحة
PDF_PLACEHOLDER = 'https://via.placeholder.com/200x150?text=PDF+Worksheet'
IMG_PLACEHOLDER = 'https://via.placeholder.com/200x150?text=Worksheet'

# 1. جمع كل الملفات
cards = []
for grade_folder in sorted(os.listdir(WORKSHEETS_DIR)):
    grade_path = os.path.join(WORKSHEETS_DIR, grade_folder)
    if not os.path.isdir(grade_path):
        continue
    grade_label = grade_folder.replace('grade', 'Grade ').capitalize()
    for fname in sorted(os.listdir(grade_path)):
        fpath = os.path.join(grade_path, fname)
        if not os.path.isfile(fpath):
            continue
        ext = fname.lower().split('.')[-1]
        # صورة مصغرة
        if ext in ['jpg', 'jpeg', 'png', 'gif']:
            img_src = f'{WORKSHEETS_DIR}/{grade_folder}/{fname}'
        elif ext == 'pdf':
            # لو فيه صورة بنفس اسم الملف (مع .jpg) استخدمها
            img_candidate = os.path.splitext(fname)[0] + '.jpg'
            img_path = os.path.join(grade_path, img_candidate)
            if os.path.exists(img_path):
                img_src = f'{WORKSHEETS_DIR}/{grade_folder}/{img_candidate}'
            else:
                img_src = PDF_PLACEHOLDER
        else:
            img_src = IMG_PLACEHOLDER
        # اسم العرض
        display_name = os.path.splitext(fname)[0].replace('_', ' ').replace('-', ' ').title()
        # نوع المادة (اختياري)
        subject = ''
        # كارت HTML
        card = f'''
          <div class="worksheet-card">
            <img src="{img_src}" alt="{display_name} Worksheet" />
            <h3>{display_name}</h3>
            <p>{grade_label}</p>
            <a href="{WORKSHEETS_DIR}/{grade_folder}/{fname}" class="btn btn-outline" download>Download</a>
          </div>'''
        cards.append(card)

# 2. تعديل worksheets.html
with open(WORKSHEETS_HTML, encoding='utf-8') as f:
    soup = BeautifulSoup(f, 'html.parser')

grid = soup.find('div', class_='worksheets-grid')
if grid:
    grid.clear()
    for card in cards:
        grid.append(BeautifulSoup(card, 'html.parser'))

with open(WORKSHEETS_HTML, 'w', encoding='utf-8') as f:
    f.write(str(soup.prettify()))

print(f'Added {len(cards)} worksheet cards to {WORKSHEETS_HTML}') 