import init, {
  CarpEngine,
  SearchOutput,
  PerftOutput,
} from "../carp-wasm/carp_wasm.js";

let engine: CarpEngine | null = null;

(self as any).update_perft_data = (data: PerftOutput) => {
  self.postMessage({ type: "perftResult", data: data.asObject() });
};
(self as any).update_search_data = (data: SearchOutput) => {
  self.postMessage({ type: "searchResult", data: data.asObject() });
};
(self as any).update_engine_pick = (data: string) => {
  self.postMessage({ type: "enginePick", data });
};

self.onmessage = async (e) => {
  const { type, data, module } = e.data;

  if (type === "init") {
    if (module) {
      await init(module as WebAssembly.Module); // Use the pre-compiled WASM module if available
    } else {
      await init(); // legacy fallback
    }
    engine = new CarpEngine();
    engine.resize_tt(256);
    self.postMessage({ type: "ready" });
  } else if (type === "search" && engine) {
    const { position, tc } = data;
    engine.search(position, tc);
  } else if (type === "perft" && engine) {
    const { position, depth } = data;
    engine.perft(position, depth);
  }
};
