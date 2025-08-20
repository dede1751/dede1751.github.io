import { ChessApp } from "./chessApp";

declare global {
  interface Window {
    terminalSite: TerminalSite;
  }
}

class TerminalSite {
  private currentPage: string = "";
  private chessApp: ChessApp = new ChessApp();

  constructor() {
    this.setupNavigation();
    this.setupExternalLinks();
    this.setupPopState();

    // Setup hash page routing
    window.addEventListener("hashchange", () => this.routeFromHash());
    this.routeFromHash();

    this.chessApp.initEngine(); // Start initialization in background
  }

  private async loadPage(pageName: string) {
    if (this.currentPage === pageName) return; // No change

    // Hide all pages, show only the selected one
    const pages = document.querySelectorAll<HTMLElement>(".page");
    pages.forEach((pageDiv) => {
      if (pageDiv.id === `page-${pageName}`) {
        pageDiv.classList.add("active");
      } else {
        pageDiv.classList.remove("active");
      }
    });

    this.currentPage = pageName;
    this.updateNavigation(pageName);
    window.scrollTo(0, 0);
    document.title = "asgobbi / " + pageName;

    // Initialize page-specific logic
    if (pageName === "chess") {
      await this.chessApp.startGame(); // (also waits for engine initialization)
    } else {
      this.chessApp.initEngine(true); // Reset engine in background for other pages.
    }
  }

  private getCurrentPage(): string {
    const hash = (window.location.hash || "").slice(1);
    return ["home", "about", "chess", "github"].includes(hash) ? hash : "home";
  }

  private routeFromHash() {
    const page = this.getCurrentPage();
    if (!window.location.hash || window.location.hash.slice(1) !== page) {
      window.location.hash = page;
    }
    this.loadPage(page);
  }

  private setupNavigation() {
    // Skip to nav-links on Tab
    document.addEventListener("keydown", (e: KeyboardEvent) => {
      if (e.key === "Tab" && e.target === document.body) {
        const firstNavLink = document.querySelector<HTMLAnchorElement>(".nav-link");
        if (firstNavLink) {
          e.preventDefault();
          firstNavLink.focus();
        }
      }
    });

    // Nav tab clicks
    const navLinks = document.querySelectorAll<HTMLAnchorElement>(".nav-link");
    navLinks.forEach((link) => {
      link.addEventListener("click", (e) => {
        e.preventDefault();
        const page = link.getAttribute("data-page");
        if (page) window.location.hash = page;
      });
    });

    // Keyboard navigation (number)
    document.addEventListener("keydown", (e: KeyboardEvent) => {
      // Input fields: blur on Escape/Enter, prevent navigation inputs.
      const tgt = e.target as HTMLElement;
      if (tgt?.tagName === "INPUT") {
        if (e.key === "Escape" || e.key === "Enter") tgt.blur();
        return;
      }

      const keyToPage: Record<string, string> = {
        "1": "home",
        "2": "about",
        "3": "chess",
        "4": "github",
      };
      if (keyToPage[e.key]) {
        e.preventDefault();
        window.location.hash = keyToPage[e.key];
      }
    });
  }

  private updateNavigation(activePage: string) {
    document
      .querySelectorAll<HTMLAnchorElement>(".nav-link")
      .forEach((link) => {
        const page = link.getAttribute("data-page");
        if (page === activePage) link.classList.add("active");
        else link.classList.remove("active");
      });
  }

  // External links: open in new tab
  private setupExternalLinks() {
    const sel =
      'a[href^="http"]:not([href*="' +
      window.location.host +
      '"]),a[target="_blank"]';
    const extLinks = document.querySelectorAll<HTMLAnchorElement>(sel);
    extLinks.forEach((link) => {
      link.setAttribute("target", "_blank");
      link.setAttribute("rel", "noopener noreferrer");
    });
  }

  // Handle browser back/forward navigation
  private setupPopState() {
    window.addEventListener("popstate", (e: PopStateEvent) => {
      if (e.state && e.state.page) {
        this.loadPage(e.state.page);
      } else {
        this.routeFromHash();
      }
    });
  }
}

window.terminalSite = new TerminalSite();
