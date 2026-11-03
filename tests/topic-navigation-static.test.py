from html.parser import HTMLParser
from pathlib import Path
import json

class Page(HTMLParser):
    def __init__(self, path):
        super().__init__(); self.ids=set(); self.anchors=[]; self.h1=[]; self.in_h1=False; self.title=''; self.in_title=False
        self.feed(Path(path).read_text())
    def handle_starttag(self, tag, attrs):
        a=dict(attrs)
        if 'id' in a: self.ids.add(a['id'])
        if tag=='a': self.anchors.append(a)
        if tag=='h1': self.in_h1=True
        if tag=='title' and not self.title: self.in_title=True
    def handle_endtag(self,tag):
        if tag=='h1': self.in_h1=False
        if tag=='title': self.in_title=False
    def handle_data(self,data):
        if self.in_h1: self.h1.append(data)
        if self.in_title: self.title+=data

for prefix in ('','en/'):
    home=Page(prefix+'index.html'); field=Page(prefix+'dynamics.html'); topic=Page(prefix+'topic.html')
    assert 'topics' in home.ids
    assert {'#topics','dynamics.html','rectangle.html'} <= {a.get('href') for a in home.anchors}
    assert 'topic.html' in {a.get('href') for a in field.anchors}
    assert 'dynamics.html' in {a.get('href') for a in topic.anchors}
    assert 'references' in topic.ids and 'topic' in topic.ids and 'intro-video' in topic.ids
    assert 'ergodic theory' not in home.title.lower() and '遍历论' not in home.title
    assert 'ergodic theory' not in ''.join(home.h1).lower() and '遍历论' not in ''.join(home.h1)
    switches=[a for a in field.anchors if a.get('data-language')]
    assert switches and all(a['href'].endswith('dynamics.html') for a in switches)
manifest=json.loads(Path('content-manifest.json').read_text())
assert next(d for d in manifest['documents'] if d['id']=='index')['title']['zh']=='数学·理解'
assert next(d for d in manifest['documents'] if d['id']=='dynamics')['path']=='dynamics.html'
reader=Path('reader.js').read_text()
assert "['#references','#resources','#topic'].includes(location.hash)" in reader
assert "location.replace('topic.html'" in reader
print('PASS bilingual field → topic routes, language targets, title metadata and legacy anchors')
