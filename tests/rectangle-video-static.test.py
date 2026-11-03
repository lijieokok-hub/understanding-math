#!/usr/bin/env python3
"""Check both film embeds and their HTTP resources.

Run a local server on :4173 first. Set VIDEO_BASE_URL to test another deployment;
set REQUIRE_RANGE=1 when the actual host must support seeking by byte range.
"""
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import urljoin
from urllib.request import Request, urlopen
import os
import re

ROOT = Path(__file__).resolve().parent.parent
BASE = os.environ.get('VIDEO_BASE_URL', 'http://127.0.0.1:4173/').rstrip('/') + '/'
REQUIRE_RANGE = os.environ.get('REQUIRE_RANGE') == '1'

class FilmParser(HTMLParser):
    def __init__(self):
        super().__init__()
        self.in_film = False
        self.depth = 0
        self.videos = []
        self.sources = []
        self.links = []
        self.text = []
    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if tag == 'section' and attrs.get('id') == 'video':
            self.in_film = True
            self.depth = 1
            return
        if not self.in_film:
            return
        if tag == 'section': self.depth += 1
        if tag == 'video': self.videos.append(attrs)
        if tag == 'source': self.sources.append(attrs)
        if tag == 'a': self.links.append(attrs)
    def handle_endtag(self, tag):
        if self.in_film and tag == 'section':
            self.depth -= 1
            if self.depth == 0: self.in_film = False
    def handle_data(self, data):
        if self.in_film: self.text.append(data)

def get(url, method='GET', headers=None):
    return urlopen(Request(url, method=method, headers=headers or {}), timeout=30)

for language, path in [('zh', 'rectangle.html'), ('en', 'en/rectangle.html')]:
    page_url = urljoin(BASE, path)
    with get(page_url) as response:
        assert response.status == 200, page_url
        parser = FilmParser()
        parser.feed(response.read().decode('utf-8'))
    assert len(parser.videos) == len(parser.sources) == 1, language
    video, source = parser.videos[0], parser.sources[0]
    assert 'controls' in video and 'playsinline' in video and video.get('preload') == 'none', language
    assert 'autoplay' not in video, language
    assert video.get('aria-label') and video.get('aria-describedby'), language
    assert source.get('type') == 'video/mp4', language
    for text in (['中文旁白', '中文字幕', '文字稿'] if language == 'zh' else ['Chinese narration', 'Chinese subtitles', 'English subtitles are not available', 'transcript']):
        assert text.lower() in ' '.join(parser.text).lower(), (language, text)
    source_url = urljoin(page_url, source['src'])
    poster_url = urljoin(page_url, video['poster'])
    transcripts = [a for a in parser.links if a.get('href', '').endswith('transcript-zh.txt')]
    assert len(transcripts) == 1, language
    assert any(urljoin(page_url, a.get('href', '')) == source_url and 'download' in a for a in parser.links), language
    with get(poster_url, method='HEAD') as response:
        assert response.status == 200 and response.headers.get_content_type().startswith('image/'), poster_url
    with get(urljoin(page_url, transcripts[0]['href'])) as response:
        transcript = response.read().decode('utf-8')
        assert response.status == 200 and len(transcript) > 1000 and '正方形' in transcript, language
    with get(source_url, method='HEAD') as response:
        assert response.status == 200 and response.headers.get_content_type() == 'video/mp4', source_url
        assert int(response.headers['Content-Length']) > 1_000_000, source_url
        total = int(response.headers['Content-Length'])
    with get(source_url, headers={'Range': 'bytes=0-1023'}) as response:
        if response.status == 206:
            assert re.fullmatch(r'bytes 0-1023/\d+', response.headers.get('Content-Range', '')), source_url
            assert len(response.read()) == 1024, source_url
            print('PASS', language, 'byte-range HTTP 206', source_url)
        else:
            assert not REQUIRE_RANGE, f'{source_url}: host returned {response.status} instead of HTTP 206'
            assert response.status == 200, source_url
            print('NOTE', language, 'host does not serve byte ranges; check production host separately')
    print('PASS', language, 'embed, poster, transcript, video MIME and content length', total)
