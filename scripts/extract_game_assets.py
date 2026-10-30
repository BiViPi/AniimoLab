"""
Aniimo Game Asset Extractor
===========================
Công cụ trích xuất hình ảnh (Textures, Sprites, Item Icons, Event Banners)
từ bộ cài đặt game Aniimo (sử dụng Unity Engine & YooAsset Package Management).

Yêu cầu môi trường:
    - Python 3.10+
    - Thư viện: UnityPy, Pillow (đã cài đặt trong `scratch/extractor_env`)

Cách chạy:
    1. Chạy với môi trường ảo:
       .\\scratch\\extractor_env\\Scripts\\python.exe scripts\\extract_game_assets.py [OPTIONS]

    2. Ví dụ lệnh:
       - Trích xuất ảnh theo từ khóa:
         .\\scratch\\extractor_env\\Scripts\\python.exe scripts\\extract_game_assets.py --keywords pumpkin lantern seed

       - Trích xuất toàn bộ icon vật phẩm (4.000+ item icons):
         .\\scratch\\extractor_env\\Scripts\\python.exe scripts\\extract_game_assets.py --all-items --out-dir web/images/items

       - Trích xuất tài nguyên sự kiện & Homeland:
         .\\scratch\\extractor_env\\Scripts\\python.exe scripts\\extract_game_assets.py --event-only --out-dir web/images/events
"""

import os
import re
import sys
import argparse
import binascii
from pathlib import Path

# Đảm bảo tương thích UTF-8 console Windows
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")
if hasattr(sys.stderr, "reconfigure"):
    sys.stderr.reconfigure(encoding="utf-8")

try:
    import UnityPy
except ImportError:
    print("[!] Lỗi: Chưa tìm thấy thư viện UnityPy. Hãy chạy bằng Python trong venv: scratch\\extractor_env\\Scripts\\python.exe")
    sys.exit(1)

DEFAULT_GAME_DIR = r"G:\Games\Aniimo"
DEFAULT_OUT_DIR = r"E:\Games\AniimoLab\scratch\extracted_assets"

def parse_bundle_map(manifest_path, cache_dir):
    print(f"[*] Đang đọc manifest tại: {manifest_path}...")
    with open(manifest_path, "rb") as f:
        f.seek(36000000)
        data = f.read()

    pattern = re.compile(rb"([a-zA-Z0-9_.-]+\.uab)(.{16})", re.DOTALL)
    matches = pattern.findall(data)

    bundle_map = {}
    for name_b, raw_hash in matches:
        name = name_b.decode(errors="ignore")
        h = binascii.hexlify(raw_hash).decode()
        uab_path = os.path.join(cache_dir, h[:2], h, "cdata.uab")
        if os.path.exists(uab_path):
            bundle_map[name] = uab_path

    print(f"[+] Tìm thấy {len(bundle_map)} AssetBundle có sẵn trên ổ cứng.")
    return bundle_map

def extract_from_bundles(bundles_to_extract, out_dir, keywords=None):
    os.makedirs(out_dir, exist_ok=True)
    total_saved = 0

    if keywords:
        keywords = [k.lower() for k in keywords]
        print(f"[*] Đang quét và lọc theo từ khóa: {keywords}")
    else:
        print(f"[*] Đang trích xuất toàn bộ ảnh từ {len(bundles_to_extract)} bundle...")

    for i, (bundle_name, bundle_path) in enumerate(bundles_to_extract.items()):
        try:
            env = UnityPy.load(bundle_path)
            bundle_saved = 0
            for obj in env.objects:
                if obj.type.name in ["Texture2D", "Sprite"]:
                    data = obj.read()
                    name = getattr(data, "m_Name", getattr(data, "name", "unnamed"))
                    
                    if keywords:
                        name_lower = name.lower()
                        if not any(k in name_lower for k in keywords):
                            continue
                    
                    img = getattr(data, "image", None)
                    if img:
                        out_path = os.path.join(out_dir, f"{name}.png")
                        img.save(out_path)
                        bundle_saved += 1
                        total_saved += 1

            if bundle_saved > 0:
                print(f"  [{i+1}/{len(bundles_to_extract)}] {bundle_name}: đã xuất {bundle_saved} ảnh.")
        except Exception as e:
            print(f"  [!] Lỗi đọc bundle {bundle_name}: {e}")

    print(f"\n[+] ĐÃ HOÀN TẤT: Xuất tổng cộng {total_saved} ảnh vào: {out_dir}")
    return total_saved

def main():
    parser = argparse.ArgumentParser(description="Aniimo Game Asset Extractor")
    parser.add_argument("--game-dir", default=DEFAULT_GAME_DIR, help="Thư mục cài đặt Aniimo")
    parser.add_argument("--out-dir", default=DEFAULT_OUT_DIR, help="Thư mục xuất ảnh")
    parser.add_argument("--all-items", action="store_true", help="Trích xuất toàn bộ icon vật phẩm (4.000+ items)")
    parser.add_argument("--event-only", action="store_true", help="Chỉ trích xuất ảnh Event & Homeland")
    parser.add_argument("--keywords", nargs="*", default=None, help="Từ khóa lọc tên ảnh (ví dụ: pumpkin lantern seed)")

    args = parser.parse_args()

    manifest_path = os.path.join(
        args.game_dir,
        r"game\Aniimo_Data\cvs\res\uab\win\DefaultPackage\ManifestFiles\PackageManifest_DefaultPackage_3846247.bytes"
    )
    cache_dir = os.path.join(
        args.game_dir,
        r"game\Aniimo_Data\cvs\res\uab\win\DefaultPackage\CacheBundleFiles"
    )

    if not os.path.exists(manifest_path):
        print(f"[!] Không tìm thấy manifest tại: {manifest_path}")
        sys.exit(1)

    bundle_map = parse_bundle_map(manifest_path, cache_dir)
    target_bundles = {}

    item_bundles = {n: p for n, p in bundle_map.items() if "ar_xgui_icon_item_i_b07ce535_png_" in n}
    texture_bundles = {n: p for n, p in bundle_map.items() if "mres_xgui_texture_expng_" in n or "mres_xgui_common_expng_" in n}
    event_bundles = {n: p for n, p in bundle_map.items() if "ar_xgui_icon_event_" in n or "ar_xgui_event_image_" in n or "ar_xgui_home_image_" in n or "ar_xgui_homecollec_" in n}

    if args.all_items:
        target_bundles.update(item_bundles)
    elif args.event_only:
        target_bundles.update(event_bundles)
    else:
        target_bundles.update(item_bundles)
        target_bundles.update(texture_bundles)
        target_bundles.update(event_bundles)

    extract_from_bundles(target_bundles, args.out_dir, keywords=args.keywords)

if __name__ == "__main__":
    main()
