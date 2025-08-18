// Pre-compile the carp-wasm module for faster worker initialization.

const wasmUrl = new URL(
  "../carp-wasm/carp_wasm_bg.wasm",
  import.meta.url,
).toString();

export const wasmModulePromise: Promise<WebAssembly.Module> =
  WebAssembly.compileStreaming
    ? WebAssembly.compileStreaming(fetch(wasmUrl))
    : fetch(wasmUrl)
        .then((r) => r.arrayBuffer())
        .then(WebAssembly.compile);
