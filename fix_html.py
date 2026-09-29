import os
import glob

html_files = glob.glob('src/app/components/**/*.html', recursive=True)

for file in html_files:
    with open(file, 'r') as f:
        content = f.read()
        
    new_content = content.replace('<div style="display: flex; gap: 1rem; align-items: center; flex: 1; flex-wrap: wrap;">', '<div class="action-header-left">')
    new_content = new_content.replace('<div style="display: flex; gap: 10px;">', '<div class="action-header-right">')
    
    if new_content != content:
        with open(file, 'w') as f:
            f.write(new_content)
        print(f"Updated {file}")
