import init, { CarpEngine, SearchOutput, PerftOutput } from '../carp-wasm/carp_wasm.js';

let engine: CarpEngine | null = null;

(self as any).update_perft_data = (data: PerftOutput) => {
    self.postMessage({ type: 'perftResult', data: data.asObject() });
};
(self as any).update_search_data = (data: SearchOutput) => {
    self.postMessage({ type: 'searchResult', data: data.asObject() });
};
(self as any).update_engine_pick = (data: string) => {
    self.postMessage({ type: 'enginePick', data });
};

self.onmessage = async (e) => {
    const { type, data } = e.data;
    if (type === 'init') {
        await init();
        engine = new CarpEngine();
        self.postMessage({ type: 'ready' });
    } else if (type === 'search' && engine) {
        const { position, tc } = data;
        engine.search(position, tc);
    } else if (type === 'perft' && engine) {
        const { position, depth } = data;
        engine.perft(position, depth);
    }
};