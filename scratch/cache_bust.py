with open('web/index.html', 'r', encoding='utf-8') as f:
    html = f.read()

html = html.replace('<link rel="stylesheet" href="style.css">', '<link rel="stylesheet" href="style.css?v=aniimolab_v2">')
html = html.replace('<script type="module" src="app.js"></script>', '<script type="module" src="app.js?v=aniimolab_v2"></script>')

with open('web/index.html', 'w', encoding='utf-8') as f:
    f.write(html)
print('Updated cache-busting tags in index.html')
