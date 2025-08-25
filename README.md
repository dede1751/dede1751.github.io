# dede1751.github.io
[![pages-build-deployment](https://github.com/dede1751/dede1751.github.io/actions/workflows/pages/pages-build-deployment/badge.svg)](https://github.com/dede1751/dede1751.github.io/actions/workflows/pages/pages-build-deployment)

This repository holds my personal website [dede1751.github.io](https://dede1751.github.io). The style is 
heavily-inspired by [dpbriggs.ca](https://github.com/dpbriggs/dpbriggs-blog/tree/master).

This website is a simple static portfolio built using `typescript` and `vite`, with the simple
addition of a chess interface to play against a WebAssembly version of my chess engine
[Carp](https://github.com/dede1751/carp). In true Rust fashion, it's designed to be lightweight
and ***🚀 blazingly fast***.

## Building the website
```bash
# Clone this repository with the submodules
git clone --recurse-submodules https://github.com/dede1751/dede1751.github.io

# Install required npm packages
npm ci

# If you have rustup and wasm-pack:
./build-carp.sh
# Otherwise:
./build-carp-ci.sh

# Start dev server:
npm run dev
```
