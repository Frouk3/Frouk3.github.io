// Theme toggling
const THEME_KEY = 'theme';
let themeToggleBtn = null;
let suppressFadeUntil = 0;
const BLOG_CONTENT_INDEX_URL = 'https://raw.githubusercontent.com/Frouk3/web_page_content_pages/main/index.json';
const BLOG_POST_PAGE_URL = 'blog/post.html';

function resolveContentUrl(path, baseUrl = window.location.href) {
    if (!path) return '';
    if (/^https?:\/\//i.test(path)) return path;
    return new URL(path.replace(/^\.\//, ''), baseUrl).toString();
}

function escapeHtml(text) {
    return String(text)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function escapeAttr(text) {
    return escapeHtml(text).replace(/`/g, '&#96;');
}

function safeUrl(url, baseUrl = window.location.href) {
    const value = String(url || '').trim();
    if (!value) return '#';
    if (value.startsWith('#')) return value;
    try {
        const resolved = new URL(value, baseUrl);
        if (['http:', 'https:', 'mailto:', 'tel:'].includes(resolved.protocol)) {
            return resolved.toString();
        }
    } catch (e) {
        return '#';
    }
    return '#';
}

function renderInlineMarkdown(text, baseUrl) {
    let html = escapeHtml(text);
    html = html.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, (_, alt, url) => {
        const safe = safeUrl(url, baseUrl);
        return `<img src="${safe}" alt="${escapeAttr(alt)}">`;
    });
    html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_, label, url) => {
        const safe = safeUrl(url, baseUrl);
        const external = /^https?:\/\//i.test(safe);
        const rel = external ? ' rel="noopener noreferrer" target="_blank"' : '';
        return `<a href="${safe}"${rel}>${label}</a>`;
    });
    html = html.replace(/`([^`]+)`/g, '<code>$1</code>');
    html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
    html = html.replace(/__([^_]+)__/g, '<strong>$1</strong>');
    html = html.replace(/(^|[^*])\*([^*\n]+)\*(?!\*)/g, '$1<em>$2</em>');
    html = html.replace(/(^|[^_])_([^_\n]+)_(?!_)/g, '$1<em>$2</em>');
    html = html.replace(/&lt;br\b[^&]*?&gt;/gi, '<br>');
    return html;
}

function renderMarkdown(markdown, baseUrl) {
    const lines = String(markdown || '').replace(/\r\n/g, '\n').split('\n');
    const blocks = [];
    let paragraph = [];
    let listType = '';
    let listItems = [];
    let inCode = false;
    let codeLang = '';
    let codeLines = [];

    const flushParagraph = () => {
        if (!paragraph.length) return;
        blocks.push(`<p>${renderInlineMarkdown(paragraph.join(' ').trim(), baseUrl)}</p>`);
        paragraph = [];
    };

    const flushList = () => {
        if (!listItems.length) return;
        const tag = listType === 'ol' ? 'ol' : 'ul';
        blocks.push(`<${tag}>${listItems.map((item) => `<li>${renderInlineMarkdown(item, baseUrl)}</li>`).join('')}</${tag}>`);
        listItems = [];
        listType = '';
    };

    const flushCode = () => {
        if (!inCode) return;
        const className = codeLang ? ` class="language-${escapeAttr(codeLang)}"` : '';
        blocks.push(`<pre><code${className}>${escapeHtml(codeLines.join('\n'))}</code></pre>`);
        inCode = false;
        codeLang = '';
        codeLines = [];
    };

    for (const rawLine of lines) {
        const line = rawLine.trimEnd();
        const codeFence = line.match(/^```\s*([\w-]+)?\s*$/);

        if (codeFence) {
            if (inCode) {
                flushCode();
            } else {
                flushParagraph();
                flushList();
                inCode = true;
                codeLang = codeFence[1] || '';
            }
            continue;
        }

        if (inCode) {
            codeLines.push(rawLine);
            continue;
        }

        if (!line.trim()) {
            flushParagraph();
            flushList();
            continue;
        }

        const heading = line.match(/^(#{1,6})\s+(.+)$/);
        if (heading) {
            flushParagraph();
            flushList();
            const level = heading[1].length;
            blocks.push(`<h${level}>${renderInlineMarkdown(heading[2], baseUrl)}</h${level}>`);
            continue;
        }

        if (/^(-{3,}|\*{3,}|_{3,})$/.test(line)) {
            flushParagraph();
            flushList();
            blocks.push('<hr>');
            continue;
        }

        const unordered = line.match(/^[-*+]\s+(.+)$/);
        if (unordered) {
            flushParagraph();
            if (listType && listType !== 'ul') flushList();
            listType = 'ul';
            listItems.push(unordered[1]);
            continue;
        }

        const ordered = line.match(/^\d+\.\s+(.+)$/);
        if (ordered) {
            flushParagraph();
            if (listType && listType !== 'ol') flushList();
            listType = 'ol';
            listItems.push(ordered[1]);
            continue;
        }

        const quote = line.match(/^>\s+(.+)$/);
        if (quote) {
            flushParagraph();
            flushList();
            blocks.push(`<blockquote><p>${renderInlineMarkdown(quote[1], baseUrl)}</p></blockquote>`);
            continue;
        }

        paragraph.push(line);
    }

    flushParagraph();
    flushList();
    flushCode();
    return blocks.join('\n');
}

function buildPostPageUrl(item, baseUrl) {
    const slug = item.slug || item.id || '';
    const href = item.href || '';
    const body = item.body || '';
    if (href && /\.html?(?:$|\?)/i.test(href)) {
        return resolveContentUrl(href, baseUrl);
    }
    if (slug) {
        return `${BLOG_POST_PAGE_URL}?post=${encodeURIComponent(slug)}`;
    }
    const source = body || href;
    if (source) {
        return `${BLOG_POST_PAGE_URL}?src=${encodeURIComponent(resolveContentUrl(source, baseUrl))}`;
    }
    return BLOG_POST_PAGE_URL;
}

async function fetchBlogIndex() {
    const sources = [
        { url: BLOG_CONTENT_INDEX_URL, baseUrl: 'https://raw.githubusercontent.com/Frouk3/web_page_content_pages/main/' }
    ];
    for (const source of sources) {
        try {
            const resp = await fetch(source.url, { cache: 'no-cache' });
            if (!resp.ok) continue;
            const items = await resp.json();
            if (Array.isArray(items) && items.length > 0) {
                return { items, baseUrl: source.baseUrl };
            }
        } catch (e) {
            continue;
        }
    }
    return { items: [], baseUrl: window.location.href };
}

function normalizeBlogItem(item, baseUrl) {
    if ((item.type && item.type !== 'post') || (item.kind && item.kind !== 'post')) {
        return null;
    }
    const href = item.href || item.body || '';
    return {
        title: item.title || 'Untitled post',
        href: buildPostPageUrl(item, baseUrl),
        preview: resolveContentUrl(item.preview || item.cover || '', baseUrl),
        date: item.date || item.mtime || '',
        description: item.description || item.summary || '',
        slug: item.slug || '',
        body: item.body || href
    };
}

function parseBlogDate(value) {
    const parsed = Date.parse(value);
    return Number.isFinite(parsed) ? parsed : 0;
}

async function resolveBlogPostBySlug(slug) {
    const { items, baseUrl } = await fetchBlogIndex();
    const normalizedSlug = String(slug || '').trim();
    if (!normalizedSlug) return null;

    const candidate = items.find((item) => {
        if ((item.type && item.type !== 'post') || (item.kind && item.kind !== 'post')) return false;
        if (item.slug && item.slug === normalizedSlug) return true;
        const body = item.body || item.href || '';
        const fileName = String(body).split('/').pop() || '';
        const stem = fileName.replace(/\.[^.]+$/, '');
        return stem === normalizedSlug;
    });

    if (!candidate) return null;

    return {
        ...candidate,
        sourceUrl: resolveContentUrl(candidate.body || candidate.href || '', baseUrl),
        previewUrl: resolveContentUrl(candidate.preview || candidate.cover || '', baseUrl),
        indexBaseUrl: baseUrl
    };
}

function applyTheme(theme) 
{
    const body = document.body;
    const isDark = theme === 'dark';
    body.classList.toggle('theme-dark', isDark);
    try { localStorage.setItem(THEME_KEY, theme); } catch (e) { /* ignore */ }
    if (themeToggleBtn) 
    {
        const label = isDark ? 'Switch to light mode' : 'Switch to dark mode';
        if (!isDark)
            themeToggleBtn.innerHTML = `<img src="/assets/moon.svg" alt="" width="18" height="18">`;
        else
            themeToggleBtn.innerHTML = `<img src="/assets/sun.svg" alt="" width="18" height="18" style="filter: invert(1);">`;
        themeToggleBtn.setAttribute('aria-label', label);
        themeToggleBtn.setAttribute('title', label);
    }
    updateGiscusTheme(theme);
}

function initThemeToggle() 
{
    const saved = (() => {
        try { return localStorage.getItem(THEME_KEY); } catch (e) { return null; }
    })();
    const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    const initial = saved || (prefersDark ? 'dark' : 'light');

    themeToggleBtn = document.createElement('button');
    themeToggleBtn.type = 'button';
    themeToggleBtn.className = 'theme-toggle';
    themeToggleBtn.addEventListener('click', () => {
        const next = document.body.classList.contains('theme-dark') ? 'light' : 'dark';
        const prefersReduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        if (!prefersReduced) 
        {
            document.body.classList.add('theme-fade');
            setTimeout(() => document.body.classList.remove('theme-fade'), 220);
        }
        suppressFadeUntil = Date.now() + 600; // guard: prevent fade-out immediately after theme toggle
        document.body.classList.add('suppress-fade');
        setTimeout(() => document.body.classList.remove('suppress-fade'), 700);
        applyTheme(next);
    });

    applyTheme(initial);

    const nav = document.querySelector('.main-nav-list');
    if (nav) 
    {
        nav.appendChild(themeToggleBtn);
    } 
    else 
    {
        document.body.prepend(themeToggleBtn);
    }
}

function updateGiscusTheme(theme) {
    const desired = theme === 'dark' ? 'dark' : 'light';
    const frame = document.querySelector('iframe.giscus-frame');
    if (frame && frame.contentWindow) 
    {
        frame.contentWindow.postMessage({ giscus: { setConfig: { theme: desired } } }, 'https://giscus.app');
    } 
    else 
    {
        // retry shortly after load in case giscus iframe isn't ready yet
        setTimeout(() => {
            const f2 = document.querySelector('iframe.giscus-frame');
            if (f2 && f2.contentWindow) {
                f2.contentWindow.postMessage({ giscus: { setConfig: { theme: desired } } }, 'https://giscus.app');
            }
        }, 500);
    }
}

// Page fade transitions between internal links
function initPageFade() 
{
    const reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!reduceMotion) 
    {
        document.addEventListener('click', (ev) => {
            const link = ev.target.closest && ev.target.closest('a');
            if (!link) return;
            const href = link.getAttribute('href');
            const target = link.getAttribute('target');
            const rel = link.getAttribute('rel') || '';
            if (document.body.classList.contains('suppress-fade') || Date.now() < suppressFadeUntil) return;
            if (!href || href.startsWith('http') || href.startsWith('mailto:') || href.startsWith('tel:')) return;
            if (target === '_blank' || rel.includes('noopener') || rel.includes('noreferrer')) return;
            // Internal navigation: fade out then navigate
            ev.preventDefault();
            document.body.classList.add('page-fade');
            setTimeout(() => { window.location.href = href; }, 140);
        });
    }
}

// Render last three blog posts using posts.json (with dates)
async function renderRecentPosts() 
{
    const container = document.getElementById('recent-posts');
    if (!container) return;
    try 
    {
        const { items, baseUrl } = await fetchBlogIndex();
        const normalized = items.map((item) => normalizeBlogItem(item, baseUrl)).filter(Boolean);
        if (!Array.isArray(normalized) || normalized.length === 0) {
            container.innerHTML = '<li class="muted">No recent posts found.</li>';
            return;
        }
            const fmt = (iso) => {
            if (!iso) return '';
            const d = new Date(iso);
            return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
        };
        const recent = normalized
            .slice()
            .sort((a, b) => parseBlogDate(b.date) - parseBlogDate(a.date))
            .slice(0, 3);
        container.innerHTML = recent.map(({ title, href, preview, date, description }) => `
            <li class="blog-card">
                <a href="${href}">
                    <span class="thumb">
                        <img src="${preview || 'assets/not-found.svg'}" alt="${title} preview" loading="lazy" onerror="this.src='assets/not-found.svg'">
                    </span>
                    ${date ? `<span class="post-date">${fmt(date)}</span>` : ''}
                    <h3>${title}</h3>
                    ${description ? `<span class=\"post-desc\">${description}</span>` : ''}
                </a>
            </li>
        `).join('');
    }
    catch (e) 
    {
        console.error(e);
        container.innerHTML = '<li class="muted">No recent posts found.</li>';
    }
}

document.addEventListener('DOMContentLoaded', () => {
    renderRecentPosts();
    renderAllBlogPosts();
    renderBlogPostPage();
    initThemeToggle();
    initPageFade();
    // ensure giscus matches stored/system theme on first load
    const saved = (() => { try { return localStorage.getItem(THEME_KEY); } catch (e) { return null; } })();
    const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    const initial = saved || (prefersDark ? 'dark' : 'light');
    updateGiscusTheme(initial);
});

async function renderAllBlogPosts(containerId = 'all-posts') 
{
    const container = document.getElementById(containerId);
    if (!container) return;
    try 
    {
        const { items, baseUrl } = await fetchBlogIndex();
        const normalized = items.map((item) => normalizeBlogItem(item, baseUrl)).filter(Boolean);
        if (!Array.isArray(normalized) || normalized.length === 0) 
        {
            container.innerHTML = '<li class="muted">No posts available.</li>';
            return;
        }
            const fmt = (iso) => {
            if (!iso) return '';
            const d = new Date(iso);
            return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
        };
        container.innerHTML = normalized.map(({ title, href, preview, date, description }) => `
            <li class="blog-card">
                <a href="${href}">
                    <span class="thumb">
                        <img src="${preview || 'assets/not-found.svg'}" alt="${title} preview" loading="lazy" onerror="this.src='assets/not-found.svg'">
                    </span>
                    ${date ? `<span class="post-date">${fmt(date)}</span>` : ''}
                    <h3>${title}</h3>
                    ${description ? `<span class=\"post-desc\">${description}</span>` : ''}
                </a>
            </li>
        `).join('');
    }
    catch (e) 
    {
        console.error(e);
        container.innerHTML = '<li class="muted">Failed to load posts.</li>';
    }
}

async function renderBlogPostPage() {
    const container = document.getElementById('post-content');
    if (!container) return;

    const params = new URLSearchParams(window.location.search);
    const src = params.get('src');
    const slug = params.get('post') || params.get('slug');

    try {
        let post = null;
        let sourceUrl = '';
        let title = '';
        let previewUrl = '';
        let description = '';
        let date = '';

        if (slug) {
            post = await resolveBlogPostBySlug(slug);
            if (!post) throw new Error('Post not found');
            sourceUrl = post.sourceUrl;
            title = post.title || 'Untitled post';
            previewUrl = post.previewUrl || '';
            description = post.description || '';
            date = post.date || '';
        } else if (src) {
            sourceUrl = src;
            title = params.get('title') || 'Blog post';
            previewUrl = params.get('cover') || '';
            description = params.get('description') || '';
            date = params.get('date') || '';
        } else {
            throw new Error('No post source specified');
        }

        const resp = await fetch(sourceUrl, { cache: 'no-cache' });
        if (!resp.ok) throw new Error('Failed to load post body');
        const markdown = await resp.text();
        const prettyDate = date ? new Date(date).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }) : '';

        document.title = title;
        container.innerHTML = `
            <header class="post-header">
                <a class="post-back" href="../blog.html">Back to blog</a>
                <h1>${escapeHtml(title)}</h1>
                ${prettyDate ? `<span class="post-date">${escapeHtml(prettyDate)}</span>` : ''}
                ${description ? `<p class="post-summary">${escapeHtml(description)}</p>` : ''}
                ${previewUrl ? `<img class="post-cover" src="${safeUrl(previewUrl, sourceUrl)}" alt="${escapeAttr(title)} cover">` : ''}
            </header>
            <article class="post-article post-content-body">
                ${renderMarkdown(markdown, sourceUrl)}
            </article>
        `;
    } catch (error) {
        console.error(error);
        container.innerHTML = '<p class="muted">Failed to load this post.</p>';
    }
}

