// Theme toggling
const THEME_KEY = 'theme';
let themeToggleBtn = null;

function applyTheme(theme) 
{
    const body = document.body;
    const isDark = theme === 'dark';
    body.classList.toggle('theme-dark', isDark);
    try { localStorage.setItem(THEME_KEY, theme); } catch (e) { /* ignore */ }
    if (themeToggleBtn) 
    {
        themeToggleBtn.textContent = isDark ? 'Light mode' : 'Dark mode';
    }
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

// Render last three blog posts from a simple text config
// Format per line: Title|/path/to/post.html|/path/to/preview.jpg
async function renderRecentPosts() 
{
    const container = document.getElementById('recent-posts');
    if (!container) return;
    try 
    {
        const resp = await fetch('blog/posts.txt', { cache: 'no-cache' });
        if (!resp.ok) throw new Error('Failed to load posts.txt');
        const text = await resp.text();
        const lines = text.split(/\r?\n/).map(l => l.trim()).filter(l => l && !l.startsWith('#'));
        const items = lines.map(l => 
        {
            const parts = l.split('|');
            const [title, href, image] = [parts[0] || '', parts[1] || '', parts[2] || 'assets/not-found.svg'];
            return { title, href, image };
        }).reverse().slice(0, 3); // take last three entries

        container.innerHTML = items.map(({ title, href, image }) => `
            <li class="blog-card">
                <a href="${href}">
                    <span class="thumb">
                        <img src="${image || 'assets/not-found.svg'}" alt="${title} preview" loading="lazy" onerror="this.src='assets/not-found.svg'">
                    </span>
                    <h3>${title}</h3>
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
        container.innerHTML = items.map(({ title, href, preview }) => `
            <li class="blog-card">
                <a href="${href}">
                    <span class="thumb">
                        <img src="${preview || 'assets/not-found.svg'}" alt="${title} preview" loading="lazy" onerror="this.src='assets/not-found.svg'">
                    </span>
                    <h3>${title}</h3>
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

