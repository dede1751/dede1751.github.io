let wasm;

const cachedTextDecoder = (typeof TextDecoder !== 'undefined' ? new TextDecoder('utf-8', { ignoreBOM: true, fatal: true }) : { decode: () => { throw Error('TextDecoder not available') } } );

if (typeof TextDecoder !== 'undefined') { cachedTextDecoder.decode(); };

let cachedUint8ArrayMemory0 = null;

function getUint8ArrayMemory0() {
    if (cachedUint8ArrayMemory0 === null || cachedUint8ArrayMemory0.byteLength === 0) {
        cachedUint8ArrayMemory0 = new Uint8Array(wasm.memory.buffer);
    }
    return cachedUint8ArrayMemory0;
}

function getStringFromWasm0(ptr, len) {
    ptr = ptr >>> 0;
    return cachedTextDecoder.decode(getUint8ArrayMemory0().subarray(ptr, ptr + len));
}

let WASM_VECTOR_LEN = 0;

const cachedTextEncoder = (typeof TextEncoder !== 'undefined' ? new TextEncoder('utf-8') : { encode: () => { throw Error('TextEncoder not available') } } );

const encodeString = (typeof cachedTextEncoder.encodeInto === 'function'
    ? function (arg, view) {
    return cachedTextEncoder.encodeInto(arg, view);
}
    : function (arg, view) {
    const buf = cachedTextEncoder.encode(arg);
    view.set(buf);
    return {
        read: arg.length,
        written: buf.length
    };
});

function passStringToWasm0(arg, malloc, realloc) {

    if (realloc === undefined) {
        const buf = cachedTextEncoder.encode(arg);
        const ptr = malloc(buf.length, 1) >>> 0;
        getUint8ArrayMemory0().subarray(ptr, ptr + buf.length).set(buf);
        WASM_VECTOR_LEN = buf.length;
        return ptr;
    }

    let len = arg.length;
    let ptr = malloc(len, 1) >>> 0;

    const mem = getUint8ArrayMemory0();

    let offset = 0;

    for (; offset < len; offset++) {
        const code = arg.charCodeAt(offset);
        if (code > 0x7F) break;
        mem[ptr + offset] = code;
    }

    if (offset !== len) {
        if (offset !== 0) {
            arg = arg.slice(offset);
        }
        ptr = realloc(ptr, len, len = offset + arg.length * 3, 1) >>> 0;
        const view = getUint8ArrayMemory0().subarray(ptr + offset, ptr + len);
        const ret = encodeString(arg, view);

        offset += ret.written;
        ptr = realloc(ptr, len, offset, 1) >>> 0;
    }

    WASM_VECTOR_LEN = offset;
    return ptr;
}

function isLikeNone(x) {
    return x === undefined || x === null;
}

function _assertClass(instance, klass) {
    if (!(instance instanceof klass)) {
        throw new Error(`expected instance of ${klass.name}`);
    }
}

function takeFromExternrefTable0(idx) {
    const value = wasm.__wbindgen_export_0.get(idx);
    wasm.__externref_table_dealloc(idx);
    return value;
}
/**
 * @enum {0 | 1 | 2}
 */
export const ScoreType = Object.freeze({
    Cp: 0, "0": "Cp",
    Mate: 1, "1": "Mate",
    Mated: 2, "2": "Mated",
});

const CarpEngineFinalization = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(ptr => wasm.__wbg_carpengine_free(ptr >>> 0, 1));

export class CarpEngine {

    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;
        CarpEngineFinalization.unregister(this);
        return ptr;
    }

    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_carpengine_free(ptr, 0);
    }
    constructor() {
        const ret = wasm.carpengine_new();
        this.__wbg_ptr = ret >>> 0;
        CarpEngineFinalization.register(this, this.__wbg_ptr, this);
        return this;
    }
    reset() {
        wasm.carpengine_reset(this.__wbg_ptr);
    }
    /**
     * @param {number} size_mb
     */
    resize_tt(size_mb) {
        wasm.carpengine_resize_tt(this.__wbg_ptr, size_mb);
    }
    /**
     * @param {string} pos_str
     * @param {number} depth
     */
    perft(pos_str, depth) {
        const ptr0 = passStringToWasm0(pos_str, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        wasm.carpengine_perft(this.__wbg_ptr, ptr0, len0, depth);
    }
    /**
     * @param {string} pos_str
     * @param {string} tc_str
     */
    search(pos_str, tc_str) {
        const ptr0 = passStringToWasm0(pos_str, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        const ptr1 = passStringToWasm0(tc_str, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len1 = WASM_VECTOR_LEN;
        wasm.carpengine_search(this.__wbg_ptr, ptr0, len0, ptr1, len1);
    }
}

const PerftOutputFinalization = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(ptr => wasm.__wbg_perftoutput_free(ptr >>> 0, 1));

export class PerftOutput {

    static __wrap(ptr) {
        ptr = ptr >>> 0;
        const obj = Object.create(PerftOutput.prototype);
        obj.__wbg_ptr = ptr;
        PerftOutputFinalization.register(obj, obj.__wbg_ptr, obj);
        return obj;
    }

    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;
        PerftOutputFinalization.unregister(this);
        return ptr;
    }

    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_perftoutput_free(ptr, 0);
    }
    /**
     * @returns {bigint}
     */
    get time() {
        const ret = wasm.__wbg_get_perftoutput_time(this.__wbg_ptr);
        return BigInt.asUintN(64, ret);
    }
    /**
     * @param {bigint} arg0
     */
    set time(arg0) {
        wasm.__wbg_set_perftoutput_time(this.__wbg_ptr, arg0);
    }
    /**
     * @returns {bigint}
     */
    get nodes() {
        const ret = wasm.__wbg_get_perftoutput_nodes(this.__wbg_ptr);
        return BigInt.asUintN(64, ret);
    }
    /**
     * @param {bigint} arg0
     */
    set nodes(arg0) {
        wasm.__wbg_set_perftoutput_nodes(this.__wbg_ptr, arg0);
    }
    /**
     * @returns {number}
     */
    get nps() {
        const ret = wasm.__wbg_get_perftoutput_nps(this.__wbg_ptr);
        return ret;
    }
    /**
     * @param {number} arg0
     */
    set nps(arg0) {
        wasm.__wbg_set_perftoutput_nps(this.__wbg_ptr, arg0);
    }
    /**
     * @returns {string | undefined}
     */
    get mov() {
        const ret = wasm.__wbg_get_perftoutput_mov(this.__wbg_ptr);
        let v1;
        if (ret[0] !== 0) {
            v1 = getStringFromWasm0(ret[0], ret[1]).slice();
            wasm.__wbindgen_free(ret[0], ret[1] * 1, 1);
        }
        return v1;
    }
    /**
     * @param {string | null} [arg0]
     */
    set mov(arg0) {
        var ptr0 = isLikeNone(arg0) ? 0 : passStringToWasm0(arg0, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        var len0 = WASM_VECTOR_LEN;
        wasm.__wbg_set_perftoutput_mov(this.__wbg_ptr, ptr0, len0);
    }
    /**
     * @returns {any}
     */
    asObject() {
        const ret = wasm.perftoutput_asObject(this.__wbg_ptr);
        if (ret[2]) {
            throw takeFromExternrefTable0(ret[1]);
        }
        return takeFromExternrefTable0(ret[0]);
    }
}

const ScoreFinalization = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(ptr => wasm.__wbg_score_free(ptr >>> 0, 1));

export class Score {

    static __wrap(ptr) {
        ptr = ptr >>> 0;
        const obj = Object.create(Score.prototype);
        obj.__wbg_ptr = ptr;
        ScoreFinalization.register(obj, obj.__wbg_ptr, obj);
        return obj;
    }

    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;
        ScoreFinalization.unregister(this);
        return ptr;
    }

    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_score_free(ptr, 0);
    }
    /**
     * @returns {number}
     */
    get val() {
        const ret = wasm.__wbg_get_score_val(this.__wbg_ptr);
        return ret;
    }
    /**
     * @param {number} arg0
     */
    set val(arg0) {
        wasm.__wbg_set_score_val(this.__wbg_ptr, arg0);
    }
    /**
     * @returns {number}
     */
    get w() {
        const ret = wasm.__wbg_get_score_w(this.__wbg_ptr);
        return ret;
    }
    /**
     * @param {number} arg0
     */
    set w(arg0) {
        wasm.__wbg_set_score_w(this.__wbg_ptr, arg0);
    }
    /**
     * @returns {number}
     */
    get d() {
        const ret = wasm.__wbg_get_score_d(this.__wbg_ptr);
        return ret;
    }
    /**
     * @param {number} arg0
     */
    set d(arg0) {
        wasm.__wbg_set_score_d(this.__wbg_ptr, arg0);
    }
    /**
     * @returns {number}
     */
    get l() {
        const ret = wasm.__wbg_get_score_l(this.__wbg_ptr);
        return ret;
    }
    /**
     * @param {number} arg0
     */
    set l(arg0) {
        wasm.__wbg_set_score_l(this.__wbg_ptr, arg0);
    }
}

const SearchOutputFinalization = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(ptr => wasm.__wbg_searchoutput_free(ptr >>> 0, 1));

export class SearchOutput {

    static __wrap(ptr) {
        ptr = ptr >>> 0;
        const obj = Object.create(SearchOutput.prototype);
        obj.__wbg_ptr = ptr;
        SearchOutputFinalization.register(obj, obj.__wbg_ptr, obj);
        return obj;
    }

    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;
        SearchOutputFinalization.unregister(this);
        return ptr;
    }

    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_searchoutput_free(ptr, 0);
    }
    /**
     * @returns {bigint}
     */
    get time() {
        const ret = wasm.__wbg_get_searchoutput_time(this.__wbg_ptr);
        return BigInt.asUintN(64, ret);
    }
    /**
     * @param {bigint} arg0
     */
    set time(arg0) {
        wasm.__wbg_set_searchoutput_time(this.__wbg_ptr, arg0);
    }
    /**
     * @returns {bigint}
     */
    get nodes() {
        const ret = wasm.__wbg_get_searchoutput_nodes(this.__wbg_ptr);
        return BigInt.asUintN(64, ret);
    }
    /**
     * @param {bigint} arg0
     */
    set nodes(arg0) {
        wasm.__wbg_set_searchoutput_nodes(this.__wbg_ptr, arg0);
    }
    /**
     * @returns {number}
     */
    get nps() {
        const ret = wasm.__wbg_get_searchoutput_nps(this.__wbg_ptr);
        return ret;
    }
    /**
     * @param {number} arg0
     */
    set nps(arg0) {
        wasm.__wbg_set_searchoutput_nps(this.__wbg_ptr, arg0);
    }
    /**
     * @returns {number}
     */
    get depth() {
        const ret = wasm.__wbg_get_searchoutput_depth(this.__wbg_ptr);
        return ret >>> 0;
    }
    /**
     * @param {number} arg0
     */
    set depth(arg0) {
        wasm.__wbg_set_searchoutput_depth(this.__wbg_ptr, arg0);
    }
    /**
     * @returns {ScoreType}
     */
    get score_type() {
        const ret = wasm.__wbg_get_searchoutput_score_type(this.__wbg_ptr);
        return ret;
    }
    /**
     * @param {ScoreType} arg0
     */
    set score_type(arg0) {
        wasm.__wbg_set_searchoutput_score_type(this.__wbg_ptr, arg0);
    }
    /**
     * @returns {Score}
     */
    get score() {
        const ret = wasm.__wbg_get_searchoutput_score(this.__wbg_ptr);
        return Score.__wrap(ret);
    }
    /**
     * @param {Score} arg0
     */
    set score(arg0) {
        _assertClass(arg0, Score);
        var ptr0 = arg0.__destroy_into_raw();
        wasm.__wbg_set_searchoutput_score(this.__wbg_ptr, ptr0);
    }
    /**
     * @returns {string}
     */
    get pv() {
        let deferred1_0;
        let deferred1_1;
        try {
            const ret = wasm.__wbg_get_searchoutput_pv(this.__wbg_ptr);
            deferred1_0 = ret[0];
            deferred1_1 = ret[1];
            return getStringFromWasm0(ret[0], ret[1]);
        } finally {
            wasm.__wbindgen_free(deferred1_0, deferred1_1, 1);
        }
    }
    /**
     * @param {string} arg0
     */
    set pv(arg0) {
        const ptr0 = passStringToWasm0(arg0, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        wasm.__wbg_set_searchoutput_pv(this.__wbg_ptr, ptr0, len0);
    }
    /**
     * @returns {any}
     */
    asObject() {
        const ret = wasm.searchoutput_asObject(this.__wbg_ptr);
        if (ret[2]) {
            throw takeFromExternrefTable0(ret[1]);
        }
        return takeFromExternrefTable0(ret[0]);
    }
}

async function __wbg_load(module, imports) {
    if (typeof Response === 'function' && module instanceof Response) {
        if (typeof WebAssembly.instantiateStreaming === 'function') {
            try {
                return await WebAssembly.instantiateStreaming(module, imports);

            } catch (e) {
                if (module.headers.get('Content-Type') != 'application/wasm') {
                    console.warn("`WebAssembly.instantiateStreaming` failed because your server does not serve Wasm with `application/wasm` MIME type. Falling back to `WebAssembly.instantiate` which is slower. Original error:\n", e);

                } else {
                    throw e;
                }
            }
        }

        const bytes = await module.arrayBuffer();
        return await WebAssembly.instantiate(bytes, imports);

    } else {
        const instance = await WebAssembly.instantiate(module, imports);

        if (instance instanceof WebAssembly.Instance) {
            return { instance, module };

        } else {
            return instance;
        }
    }
}

function __wbg_get_imports() {
    const imports = {};
    imports.wbg = {};
    imports.wbg.__wbg_getTime_cab825bc49cad8b6 = function(arg0) {
        const ret = arg0.getTime();
        return ret;
    };
    imports.wbg.__wbg_new0_fc71fa616199ed4c = function() {
        const ret = new Date();
        return ret;
    };
    imports.wbg.__wbg_new_8e8bc408f9c499ad = function() {
        const ret = new Object();
        return ret;
    };
    imports.wbg.__wbg_set_3f1d0b984ed272ed = function(arg0, arg1, arg2) {
        arg0[arg1] = arg2;
    };
    imports.wbg.__wbg_updateenginepick_9a5ecf7e4a8dbe26 = function(arg0, arg1) {
        update_engine_pick(getStringFromWasm0(arg0, arg1));
    };
    imports.wbg.__wbg_updateperftdata_0fa1afa275d07539 = function(arg0) {
        update_perft_data(PerftOutput.__wrap(arg0));
    };
    imports.wbg.__wbg_updatesearchdata_1261c5555cbbeaa1 = function(arg0) {
        update_search_data(SearchOutput.__wrap(arg0));
    };
    imports.wbg.__wbindgen_bigint_from_u64 = function(arg0) {
        const ret = BigInt.asUintN(64, arg0);
        return ret;
    };
    imports.wbg.__wbindgen_error_new = function(arg0, arg1) {
        const ret = new Error(getStringFromWasm0(arg0, arg1));
        return ret;
    };
    imports.wbg.__wbindgen_init_externref_table = function() {
        const table = wasm.__wbindgen_export_0;
        const offset = table.grow(4);
        table.set(0, undefined);
        table.set(offset + 0, undefined);
        table.set(offset + 1, null);
        table.set(offset + 2, true);
        table.set(offset + 3, false);
        ;
    };
    imports.wbg.__wbindgen_number_new = function(arg0) {
        const ret = arg0;
        return ret;
    };
    imports.wbg.__wbindgen_string_new = function(arg0, arg1) {
        const ret = getStringFromWasm0(arg0, arg1);
        return ret;
    };
    imports.wbg.__wbindgen_throw = function(arg0, arg1) {
        throw new Error(getStringFromWasm0(arg0, arg1));
    };

    return imports;
}

function __wbg_init_memory(imports, memory) {

}

function __wbg_finalize_init(instance, module) {
    wasm = instance.exports;
    __wbg_init.__wbindgen_wasm_module = module;
    cachedUint8ArrayMemory0 = null;


    wasm.__wbindgen_start();
    return wasm;
}

function initSync(module) {
    if (wasm !== undefined) return wasm;


    if (typeof module !== 'undefined') {
        if (Object.getPrototypeOf(module) === Object.prototype) {
            ({module} = module)
        } else {
            console.warn('using deprecated parameters for `initSync()`; pass a single object instead')
        }
    }

    const imports = __wbg_get_imports();

    __wbg_init_memory(imports);

    if (!(module instanceof WebAssembly.Module)) {
        module = new WebAssembly.Module(module);
    }

    const instance = new WebAssembly.Instance(module, imports);

    return __wbg_finalize_init(instance, module);
}

async function __wbg_init(module_or_path) {
    if (wasm !== undefined) return wasm;


    if (typeof module_or_path !== 'undefined') {
        if (Object.getPrototypeOf(module_or_path) === Object.prototype) {
            ({module_or_path} = module_or_path)
        } else {
            console.warn('using deprecated parameters for the initialization function; pass a single object instead')
        }
    }

    if (typeof module_or_path === 'undefined') {
        module_or_path = new URL('carp_wasm_bg.wasm', import.meta.url);
    }
    const imports = __wbg_get_imports();

    if (typeof module_or_path === 'string' || (typeof Request === 'function' && module_or_path instanceof Request) || (typeof URL === 'function' && module_or_path instanceof URL)) {
        module_or_path = fetch(module_or_path);
    }

    __wbg_init_memory(imports);

    const { instance, module } = await __wbg_load(await module_or_path, imports);

    return __wbg_finalize_init(instance, module);
}

export { initSync };
export default __wbg_init;
