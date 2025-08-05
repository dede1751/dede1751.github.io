import { chessApp } from './chessApp';

declare global {
    interface Window {
        terminalSite: TerminalSite;
    }
}

class TerminalSite {
    currentPage: string;
    pageContainer: HTMLElement;

    constructor() {
        this.currentPage = 'home';
        const container = document.getElementById('page-container');
        if (!container) throw new Error('Missing #page-container');
        this.pageContainer = container;
        this.init();
    }

    init() {
        this.setupNavigation();
        this.loadPage(this.getInitialPage());
        this.setupExternalLinks();
        this.setupPopState();
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

    async loadPage(pageName: string) {
        try {
            const response = await fetch(`/html/${pageName}.html`);
            if (!response.ok) throw new Error(`Page not found`);
            const html = await response.text();
            this.pageContainer.innerHTML = html;
            this.currentPage = pageName;
            this.updateNavigation(pageName);
            window.scrollTo(0, 0);
            // update URL/history
            const url = (pageName === 'home') ? '/' : `/#${pageName}`;
            history.pushState({ page: pageName }, '', url);

            document.title = "asgobbi / " + pageName;

            // Initialize page-specific logic
            if (pageName === 'chess') {
                chessApp.initChessUI();
            }
            // Need to apply ext link logic each time
            this.setupExternalLinks();
        } catch (err) {
            this.pageContainer.innerHTML = "<p>Page failed to load.</p>";
        }
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
        const extLinks = this.pageContainer.querySelectorAll<HTMLAnchorElement>(sel);
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

    getInitialPage(): string {
        // On first load, use hash (/#about) if present; else home.
        const hash = window.location.hash.slice(1);
        if (hash && ['home', 'about', 'chess', 'github'].includes(hash)) {
            return hash;
        }
        return 'home';
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
