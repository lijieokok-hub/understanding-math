from pathlib import Path
import re

root = Path(__file__).resolve().parent.parent
base = (root / 'style.css').read_text()
css = (root / 'rectangle.css').read_text()
assert re.search(r'\.brand:before\s*\{\s*content\s*:\s*[\'"]◇[\'"]', base), 'Generic brand rule should remain unchanged'
assert re.search(r'\.story-brand::before\s*\{\s*content\s*:\s*none\s*;?\s*\}', css), 'Story logo must suppress generic diamond'
for name in ('rectangle.html', 'en/rectangle.html'):
    html = (root / name).read_text()
    assert re.search(r'class=[\'"]brand story-brand[\'"]', html), name
    assert re.search(r'href=[\'"][^\'"]*rectangle\.css\?v=20261103-logo-fix[\'"]', html), name
print('PASS bilingual story logo override is scoped; generic brand rule retained')
