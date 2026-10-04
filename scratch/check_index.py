with open('web/index.html', 'r', encoding='utf-8') as f:
    text = f.read()

pos = text.find('id="seeds-needed-table"')
print(text[pos:pos+1500])
