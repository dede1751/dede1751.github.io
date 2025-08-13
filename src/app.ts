import { chessApp } from './chessApp';

declare global {
    interface Window {
        terminalSite: TerminalSite;
    }
}

class TerminalSite {
    currentPage: string;

    constructor() {
        this.currentPage = this.getInitialPage();

        this.setupNavigation();
        this.loadPage(this.currentPage);
        this.setupExternalLinks();
        this.setupPopState();
    }

    getInitialPage(): string {
        // On first load, use hash (/#about) if present; else home.
        const hash = window.location.hash.slice(1);
        if (hash && ['home', 'about', 'chess', 'github'].includes(hash)) {
            return hash;
        }
        return 'home';
    }

    setupNavigation() {
        // Nav tab clicks
        const navLinks = document.querySelectorAll<HTMLAnchorElement>('.nav-link');
        navLinks.forEach(link => {
            link.addEventListener('click', e => {
                e.preventDefault();
                const page = link.getAttribute('data-page');
                if (page && page !== this.currentPage) {
                    this.loadPage(page);
                }
            });
        });

        // Keyboard navigation (number)
        document.addEventListener('keydown', (e: KeyboardEvent) => {
            switch (e.key) {
                case '1': e.preventDefault(); this.loadPage('home'); break;
                case '2': e.preventDefault(); this.loadPage('about'); break;
                case '3': e.preventDefault(); this.loadPage('chess'); break;
                case '4': e.preventDefault(); this.loadPage('github'); break;
            }
        });
    }

    loadPage(pageName: string) {
        // Hide all pages, show only the selected one
        const pages = document.querySelectorAll<HTMLElement>('.page');
        pages.forEach(pageDiv => {
            if (pageDiv.id === `page-${pageName}`) {
                pageDiv.classList.add('active');
            } else {
                pageDiv.classList.remove('active');
            }
        });
        this.currentPage = pageName;
        this.updateNavigation(pageName);
        window.scrollTo(0, 0);

        // update URL/history
        const url = (pageName === 'home') ? '/' : `/#${pageName}`;
        history.pushState({ page: pageName }, '', url);

        document.title = "asgobbi / " + pageName;

        // Initialize page-specific logic
        if (pageName === 'chess') chessApp.reset();
    }

    updateNavigation(activePage: string) {
        document.querySelectorAll<HTMLAnchorElement>('.nav-link').forEach(link => {
            const page = link.getAttribute('data-page');
            if (page === activePage) link.classList.add('active');
            else link.classList.remove('active');
        });
    }

    setupExternalLinks() {
        // External links: open in new tab
        // (run each time content changes!)
        const sel = 'a[href^="http"]:not([href*="' + window.location.host + '"]),a[target="_blank"]';
        const extLinks = document.querySelectorAll<HTMLAnchorElement>(sel);
        extLinks.forEach(link => {
            link.setAttribute('target', '_blank');
            link.setAttribute('rel', 'noopener noreferrer');
        });
    }

    setupPopState() {
        window.addEventListener('popstate', (e: PopStateEvent) => {
            if (e.state && e.state.page) {
                this.loadPage(e.state.page);
            } else {
                this.loadPage('home');
            }
        });
    }
}

// Bootstrap app, console, accessibility
window.terminalSite = new TerminalSite();

// Accessibility: skip to nav on Tab
document.addEventListener('keydown', (e: KeyboardEvent) => {
    if (e.key === 'Tab' && e.target === document.body) {
        const firstNavLink = document.querySelector<HTMLAnchorElement>('.nav-link');
        if (firstNavLink) {
            e.preventDefault(); firstNavLink.focus();
        }
    }
});
