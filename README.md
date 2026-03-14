# dede1751.github.io
[![pages-build-deployment](https://github.com/dede1751/dede1751.github.io/actions/workflows/pages/pages-build-deployment/badge.svg)](https://github.com/dede1751/dede1751.github.io/actions/workflows/pages/pages-build-deployment)

This repository holds my personal website [dede1751.github.io](https://dede1751.github.io).

This website is a minimalistic portfolio built using `typescript` and `vite`, with the simple
addition of a chess interface to play against a WebAssembly version of my chess engine
[Carp](https://github.com/dede1751/carp). It also hosts my solver for the Italian card game
[Machiavelli](https://en.wikipedia.org/wiki/Machiavelli_(Italian_card_game)).

In true Rust fashion, it's designed to be lightweight
and ***🚀 blazingly fast***.

## Building the website
```bash
# Clone this repository with the submodules
git clone --recurse-submodules https://github.com/dede1751/dede1751.github.io

# Install required npm packages
npm ci

# If you have rustup and wasm-pack:
./scripts/build.sh
# Otherwise:
./scripts/build-ci.sh

# Start dev server:
npm run dev
```

## Credits
- [dpbriggs.ca](https://github.com/dpbriggs/dpbriggs-blog/tree/master) for the overall website design.
- [Weblatro](https://github.com/TyconXon/Weblatro) for the card icons.