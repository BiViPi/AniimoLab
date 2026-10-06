with open('web/aniimo-data.js', 'r', encoding='utf-8') as f:
    text = f.read()

# 1. Somniwing in ANIIMO_DB
old_somniwing = '''      {
        "ability_en": "Grass",
        "ability_vi": "Mộc / Thảo",
        "base_level": 4,
        "prismana_level": 4
      },
      {
        "ability_en": "Wind",
        "ability_vi": "Phong",
        "base_level": 3,
        "prismana_level": 4
      },
      {
        "ability_en": "Leisure",
        "ability_vi": "Giải Trí",
        "base_level": 4,
        "prismana_level": 4
      }'''

new_somniwing = '''      {
        "ability_en": "Grass",
        "ability_vi": "Mộc / Thảo",
        "base_level": 3,
        "prismana_level": 4
      },
      {
        "ability_en": "Wind",
        "ability_vi": "Phong",
        "base_level": 3,
        "prismana_level": 4
      },
      {
        "ability_en": "Leisure",
        "ability_vi": "Giải Trí",
        "base_level": 3,
        "prismana_level": 4
      }'''

# 2. Irisalis in ANIIMO_DB
old_irisalis = '''      {
        "ability_en": "Grass",
        "ability_vi": "Mộc / Thảo",
        "base_level": 4,
        "prismana_level": 4
      },
      {
        "ability_en": "Leisure",
        "ability_vi": "Giải Trí",
        "base_level": 4,
        "prismana_level": 4
      }'''

new_irisalis = '''      {
        "ability_en": "Grass",
        "ability_vi": "Mộc / Thảo",
        "base_level": 3,
        "prismana_level": 4
      },
      {
        "ability_en": "Leisure",
        "ability_vi": "Giải Trí",
        "base_level": 3,
        "prismana_level": 4
      }'''

assert old_somniwing in text, 'old_somniwing not found'
assert old_irisalis in text, 'old_irisalis not found'

text = text.replace(old_somniwing, new_somniwing, 1)
text = text.replace(old_irisalis, new_irisalis, 1)

# 3. In ABILITY_WORKERS, find and replace any "base_level": 4 with "base_level": 3 for Somniwing and Irisalis
# Let's inspect them
text = text.replace('"name": "Somniwing",\n        "number": "030",\n        "pet_head": "UI_PetHead_10233.webp",\n        "img_url": "https://aniidex.com/images/aniimo/UI_PetHead_10233.webp",\n        "base_level": 4',
                    '"name": "Somniwing",\n        "number": "030",\n        "pet_head": "UI_PetHead_10233.webp",\n        "img_url": "https://aniidex.com/images/aniimo/UI_PetHead_10233.webp",\n        "base_level": 3')

text = text.replace('"name": "Irisalis",\n        "number": "10001",\n        "pet_head": "UI_PetHead_10213.webp",\n        "img_url": "https://aniidex.com/images/aniimo/UI_PetHead_10213.webp",\n        "base_level": 4',
                    '"name": "Irisalis",\n        "number": "10001",\n        "pet_head": "UI_PetHead_10213.webp",\n        "img_url": "https://aniidex.com/images/aniimo/UI_PetHead_10213.webp",\n        "base_level": 3')

with open('web/aniimo-data.js', 'w', encoding='utf-8') as f:
    f.write(text)

print('Updated successfully!')
