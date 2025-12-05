import importlib.util
from pathlib import Path

def load_module():
    repo_root = Path(__file__).resolve().parents[2]
    mod_path = repo_root / 'tools' / 'generate_blog_index.py'
    spec = importlib.util.spec_from_file_location('generate_blog_index', str(mod_path))
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def test_extract_title_from_title_tag():
    module = load_module()
    html = '<html><head><title>My Post Title</title></head><body></body></html>'
    assert module.extract_title(html) == 'My Post Title'


def test_extract_title_from_h1():
    module = load_module()
    html = '<html><body><h1>Heading Here</h1></body></html>'
    assert module.extract_title(html) == 'Heading Here'


def test_extract_title_none():
    module = load_module()
    html = '<html><body><p>No title here</p></body></html>'
    assert module.extract_title(html) is None


def test_extract_preview_og_image_property():
    module = load_module()
    html = '<meta property="og:image" content="https://example.com/img.jpg">'
    assert module.extract_preview(html) == 'https://example.com/img.jpg'


def test_extract_preview_meta_name():
    module = load_module()
    html = '<meta name="og:image" content="/assets/pic.png">'
    assert module.extract_preview(html) == '/assets/pic.png'


def test_extract_preview_first_img():
    module = load_module()
    html = '<div><img src="/assets/first.png" alt=""></div>'
    assert module.extract_preview(html) == '/assets/first.png'


def test_extract_preview_none():
    module = load_module()
    html = '<html><body>No images meta or img</body></html>'
    assert module.extract_preview(html) is None
