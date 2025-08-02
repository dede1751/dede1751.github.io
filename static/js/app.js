
class TerminalSite {
  constructor() {
    this.currentPage = 'home';
    this.pageContainer = document.getElementById('page-container');
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
    const navLinks = document.querySelectorAll('.nav-link');
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
    document.addEventListener('keydown', (e) => {
      switch (e.key) {
        case '1': e.preventDefault(); this.loadPage('home'); break;
        case '2': e.preventDefault(); this.loadPage('about'); break;
        case '3': e.preventDefault(); this.loadPage('chess'); break;
        case '4': e.preventDefault(); this.loadPage('github'); break;
      }
    });
  }

  async loadPage(pageName) {
    try {
      const response = await fetch(`static/html/${pageName}.html`);
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
        this.initializeChessBoard('w');
      }
    
      // Need to apply ext link logic each time
      this.setupExternalLinks();
    } catch (err) {
      this.pageContainer.innerHTML = "<p>Page failed to load.</p>";
    }
  }

  updateNavigation(activePage) {
    document.querySelectorAll('.nav-link').forEach(link => {
      const page = link.getAttribute('data-page');
      if (page === activePage) link.classList.add('active');
      else link.classList.remove('active');
    });
  }

  setupExternalLinks() {
    // External links: open in new tab
    // (run each time content changes!)
    const sel = 'a[href^="http"]:not([href*="' + window.location.host + '"]),a[target="_blank"]';
    const extLinks = this.pageContainer.querySelectorAll(sel);
    extLinks.forEach(link => {
      link.setAttribute('target', '_blank');
      link.setAttribute('rel', 'noopener noreferrer');
    });
  }

  setupPopState() {
    window.addEventListener('popstate', (e) => {
      if (e.state && e.state.page) {
        this.loadPage(e.state.page);
      } else {
        this.loadPage('home');
      }
    });
  }

  getInitialPage() {
    // On first load, use hash (/#about) if present; else home.
    const hash = window.location.hash.slice(1);
    if (hash && ['home', 'about', 'chess', 'github'].includes(hash)) {
      return hash;
    }
    return 'home';
  }

  async make_opponent_move () {
    if (this.game.game_over()) return;

    const legalMoves = this.game.moves();
    const randomIdx = Math.floor(Math.random() * legalMoves.length);
    this.game.move(legalMoves[randomIdx]);
    this.board.position(this.game.fen(), false);
  }

  initializeChessBoard(player) {
    const self = this;

    // Highlight legal moves
    function removeGreySquares () {
      $('#myBoard .square-55d63').css('background', '');
    }

    function greySquare (square) {
      const whiteSquareHighlight = '#629d82ff';
      const blackSquareHighlight = '#4e7a65ff';
      var $square = $('#myBoard .square-' + square);

      var background = whiteSquareHighlight;
      if ($square.hasClass('black-3c85d')) {
        background = blackSquareHighlight;
      }

      $square.css('background', background);
    }

    function onMouseoverSquare (square, piece) {
      // get list of possible moves for this square
      var moves = self.game.moves({
        square: square,
        verbose: true
      });

      // exit if there are no moves available for this square
      if (moves.length === 0) return

      // highlight the square they moused over
      greySquare(square);

      // highlight the possible squares for this piece
      for (var i = 0; i < moves.length; i++) {
        greySquare(moves[i].to);
      }
    }

    function onMouseoutSquare (square, piece) {
      removeGreySquares();
    }

    function onDrop (source, target, piece) {
      const pieceColor = piece.charAt(0);
  
      if (pieceColor !== player || player !== self.game.turn()) return 'snapback'; // not your turn/piece
      if (source == target) return 'snapback'; // no move
      if (self.game.game_over()) return 'snapback'; // game over

      var move = self.game.move({ from: source, to: target, promotion: 'q' });
      if (move == null) {
        return 'snapback';
      }

      self.make_opponent_move();
    }

    function onSnapEnd () {
      self.board.position(self.game.fen(), false);
      removeGreySquares();
    }

    var config = {
      draggable: true,
      dropOffBoard: 'snapback',
      position: 'start',
      pieceTheme: 'img/{piece}.png',
      showNotation: false,
      onDrop,
      onSnapEnd,
      onMouseoverSquare,
      onMouseoutSquare
    };

    this.game = new Chess();
    this.board = Chessboard('myBoard', config);

    if (player === 'b') {
      this.board.orientation('black');
    }
  }
}

// Bootstrap app, console, accessibility
document.addEventListener('DOMContentLoaded', () => {
  window.terminalSite = new TerminalSite();

  // Accessibility: skip to nav on Tab
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Tab' && e.target === document.body) {
      const firstNavLink = document.querySelector('.nav-link');
      if (firstNavLink) {
        e.preventDefault(); firstNavLink.focus();
      }
    }
  });
});
