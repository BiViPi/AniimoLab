import glob, csv, re, os

with open('web/asset-map.js', 'r', encoding='utf-8') as f:
    content = f.read()

m = re.search(r'KNOWN_SLUGS = new Set\(\[(.*?)\]\);', content, re.DOTALL)
known = set(re.findall(r'"([^"]+)"', m.group(1)))

aliases_block = re.search(r'const ALIASES = \{(.*?)\};', content, re.DOTALL)
aliases = dict(re.findall(r"'([^']+)':\s*'([^']+)'", aliases_block.group(1)))

missing = set()
for path in glob.glob('data/*.csv'):
    with open(path, 'r', encoding='utf-8') as f:
        reader = csv.reader(f)
        try:
            headers = next(reader, None)
        except:
            continue
        for row in reader:
            if not row or not row[0]: continue
            item = row[0].strip()
            slug = item.lower().replace('_', '-').replace(' ', '-')
            resolved = aliases.get(slug, slug)
            if resolved not in known and not resolved.startswith('quick-'):
                missing.add((item, slug))

print(f"Total unmapped items: {len(missing)}")
for item, slug in sorted(missing):
    print(f"  {item} -> {slug}")
