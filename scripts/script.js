// Theme toggling
const THEME_KEY = 'theme';
let themeToggleBtn = null;
let suppressFadeUntil = 0;

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
        const resp = await fetch('blog/posts.json', { cache: 'no-cache' });
        if (!resp.ok) throw new Error('Failed to load blog/posts.json');
        const items = await resp.json();
        if (!Array.isArray(items) || items.length === 0) {
            container.innerHTML = '<li class="muted">No recent posts found.</li>';
            return;
        }
            const fmt = (iso) => {
            if (!iso) return '';
            const d = new Date(iso);
            return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
        };
            const getMetaDate = async (href) => {
            try {
                const r = await fetch(href, { cache: 'no-cache' });
                if (!r.ok) return null;
                const html = await r.text();
                const m = html.match(/<meta[^>]*(?:property|name)=["'](?:article:published_time|og:published_time|date)["'][^>]*content=["']([^"']+)["'][^>]*>/i);
                return m ? m[1] : null;
            } catch { return null; }
        };
            const getMetaDesc = async (href) => {
                try {
                    const r = await fetch(href, { cache: 'no-cache' });
                    if (!r.ok) return null;
                    const html = await r.text();
                    const m = html.match(/<meta[^>]*property=["']og:description["'][^>]*content=["']([^"']+)["'][^>]*>/i) ||
                              html.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']+)["'][^>]*>/i);
                    return m ? m[1] : null;
                } catch { return null; }
            };
        const recent = await Promise.all(items.slice(0, 3).map(async (it) => {
            if (it.date) return it;
                const [metaDate, metaDesc] = await Promise.all([getMetaDate(it.href), getMetaDesc(it.href)]);
                return { ...it, date: metaDate || it.mtime, description: metaDesc };
        }));
        container.innerHTML = recent.map(({ title, href, preview, date, description }) => `
            <li class="blog-card">
                <a href="${href}">
                    <span class="thumb">
                        <img src="${preview || 'assets/not-found.svg'}" alt="${title} preview" loading="lazy" onerror="this.src='assets/not-found.svg'">
                    </span>
                    <h3>${title}</h3>
                    ${description ? `<span class=\"post-desc\">${description}</span>` : ''}
                    ${date ? `<span class="post-date">${fmt(date)}</span>` : ''}
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
        const resp = await fetch('blog/posts.json', { cache: 'no-cache' });
        if (!resp.ok) throw new Error('Failed to load blog/posts.json');
        const items = await resp.json();
        if (!Array.isArray(items) || items.length === 0) 
        {
            container.innerHTML = '<li class="muted">No posts available.</li>';
            return;
        }
            const fmt = (iso) => {
            if (!iso) return '';
            const d = new Date(iso);
            return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
        };
            const getMetaDate = async (href) => {
            try {
                const r = await fetch(href, { cache: 'no-cache' });
                if (!r.ok) return null;
                const html = await r.text();
                const m = html.match(/<meta[^>]*(?:property|name)=["'](?:article:published_time|og:published_time|date)["'][^>]*content=["']([^"']+)["'][^>]*>/i);
                return m ? m[1] : null;
            } catch { return null; }
        };
            const getMetaDesc = async (href) => {
                try {
                    const r = await fetch(href, { cache: 'no-cache' });
                    if (!r.ok) return null;
                    const html = await r.text();
                    const m = html.match(/<meta[^>]*property=["']og:description["'][^>]*content=["']([^"']+)["'][^>]*>/i) ||
                              html.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']+)["'][^>]*>/i);
                    return m ? m[1] : null;
                } catch { return null; }
            };
        const enriched = await Promise.all(items.map(async (it) => {
            if (it.date) return it;
                const [metaDate, metaDesc] = await Promise.all([getMetaDate(it.href), getMetaDesc(it.href)]);
                return { ...it, date: metaDate || it.mtime, description: metaDesc };
        }));
        container.innerHTML = enriched.map(({ title, href, preview, date, description }) => `
            <li class="blog-card">
                <a href="${href}">
                    <span class="thumb">
                        <img src="${preview || 'assets/not-found.svg'}" alt="${title} preview" loading="lazy" onerror="this.src='assets/not-found.svg'">
                    </span>
                    <h3>${title}</h3>
                    ${description ? `<span class=\"post-desc\">${description}</span>` : ''}
                    ${date ? `<span class="post-date">${fmt(date)}</span>` : ''}
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

