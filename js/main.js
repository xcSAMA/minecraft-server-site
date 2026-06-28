// ========== 导航栏滚动效果 ==========
document.addEventListener('scroll', () => {
    const navbar = document.querySelector('.navbar');
    navbar.classList.toggle('scrolled', window.scrollY > 50);

    // 高亮当前 section 的导航链接
    const sections = document.querySelectorAll('.section, .hero');
    const navLinks = document.querySelectorAll('.nav-link');

    let current = '';
    sections.forEach(section => {
        const top = section.offsetTop - 200;
        if (window.scrollY >= top) {
            current = section.getAttribute('id') || 'home';
        }
    });

    navLinks.forEach(link => {
        link.classList.toggle('active', link.getAttribute('href') === `#${current}`);
    });
});

// ========== 滚动到指定区域 ==========
function scrollToSection(id) {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
}

window.scrollToSection = scrollToSection;
