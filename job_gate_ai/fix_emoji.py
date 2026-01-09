import re

file_path = 'app/api/endpoints/cv_analysis.py'
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

replacements = {
    '🔍': '[CV]',
    '📄': '[File]',
    '📝': '[Text]',
    '🤖': '[AI]',
    '⚠️': '[Warn]',
    '⚙️': '[FB]',
    '⏱️': '[Time]',
    '📊': '[Score]',
    '💾': '[DB]',
    '🧹': '[Clean]',
    '❌': '[ERR]',
    '✅': '[OK]'
}

for emoji, replacement in replacements.items():
    content = content.replace(emoji, replacement)

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)

print('[OK] Fixed emoji in cv_analysis.py')
