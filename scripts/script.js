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