#!/bin/bash
wasm-pack build carp/crates/wasm --release --target web --out-dir ../../../carp-wasm --out-name carp-wasm
wasm-pack build wasmavelli --release --target web --out-dir ../wasmavelli-wasm --out-name wasmavelli