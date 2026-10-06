import re

code = open("web/app.js", encoding="utf-8").read()
matches = re.findall(r'document\.getElementById\([^)]+\)\.addEventListener\([^)]+\)', code)
for m in matches[:10]:
    print(m)

# Find where plan is triggered on load
onloads = re.findall(r'.{0,50}(?:optimize-btn|findPlan|plan\b).{0,50}', code)
print("\nSome occurrences:")
for o in onloads[:5]:
    print(o.strip())
