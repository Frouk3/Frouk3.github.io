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

async function renderBlogGrid()
{
    const fs = require('fs');
    const path = require('path');
    const container = document.getElementsByClassName('blog-grid')[0];
    if (!container) return;
    const files = fs.readdirSync('./blog').filter(f => f.endsWith('.html'));
    try
    {
        container.innerHtml = files.map(blog => 
            {
                const filePath = path.join('./blog', blog);
                const content = fs.readFileSync(filePath, 'utf-8');
                const titleMatch = content.match(/<h2.*?>(.*?)<\/h2>/);
                const title = titleMatch ? titleMatch[1] : 'Untitled';
                return `
                    <li class="blog-card">
                        <a href="./blog/${blog}">
                            <h3>${title}</h3>
                        </a>
                    </li>
                `
            }).join('');
    }
    catch(e)
    {
        console.error(e);
        container.innerHTML = '<div class="muted">Failed to load blog posts.</div>';
    }
}

document.addEventListener('DOMContentLoaded', renderBlogGrid);
document.addEventListener('DOMContentLoaded', renderRecentPosts);