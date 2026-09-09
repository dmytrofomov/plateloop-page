"""Package finished brand assets and their editable campaign source; Python stdlib only."""
from pathlib import Path
from zipfile import ZipFile, ZIP_DEFLATED

docs = Path(__file__).resolve().parents[1] / "docs"
brand = docs / "brand"
archive = brand / "plateloop-brand-kit.zip"
with ZipFile(archive, "w", compression=ZIP_DEFLATED) as bundle:
    for item in sorted(brand.rglob("*")):
        if item.is_file() and item != archive and item != brand / "index.html":
            bundle.write(item, item.relative_to(docs).as_posix())
    for item in sorted((docs / "img").glob("plateloop-*.webp")):
        bundle.write(item, item.relative_to(docs).as_posix())
    bundle.writestr("README.txt", "PlateLoop brand kit\n\nBrand guidelines: brand/README.md\nImage prompts: brand/prompts.md\nCampaign source: brand/campaign.html (serve this directory via python -m http.server)\nReady-to-use files: brand/*.png, brand/*.jpg, brand/*.svg\nOriginal photos: brand/photos/\nWeb images: img/\nPublic gallery: https://plateloop.app/brand/\n")
with ZipFile(archive) as bundle:
    assert bundle.testzip() is None
    print(f"Packaged and checked {len(bundle.namelist())} files: {archive} ({archive.stat().st_size:,} bytes)")
