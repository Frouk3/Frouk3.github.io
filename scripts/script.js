var lastScrollTop = 0;

window.addEventListener('scroll', function()
{
    var element = this.document.querySelector('.main-nav-list');

    if (this.scrollY > lastScrollTop)
    {
        element.classList.add('hide');
    }
    else
    {
        element.classList.remove('hide');
    }
    lastScrollTop = this.scrollY;
});

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

document.addEventListener('DOMContentLoaded', renderRecentPosts);

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

document.addEventListener('DOMContentLoaded', () => renderAllBlogPosts());