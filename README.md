# dede1751.github.io

This repository holds my personal website [dede1751.github.io](https://dede1751.github.io), the style is 
heavily-inspired by [dpbriggs.ca](https://github.com/dpbriggs/dpbriggs-blog/tree/master).

This website is a simple static portfolio built with `typescript` and `vite`, with the simple
addition of a chess interface to play against a WebAssembly version of my chess engine
[Carp](https://github.com/dede1751/carp).

## carp-wasm
You can build the `carp-wasm` package from the `wasm` branch of [carp](https://github.com/dede1751/carp/tree/wasm):

```wasm-pack build carp-wasm --target web```

The package will be in `carp-wasm/pkg/`.
