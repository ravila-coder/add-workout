/* ================================================================
   storage.js — Capa de persistencia
   Prioridad: window.storage (artefactos Claude) → localStorage
   (despliegue web) → memoria (último recurso).
   Todo el estado vive bajo una sola llave para minimizar llamadas.
   ================================================================ */
const STORAGE_KEY = "addem-workout-v1";
const _mem = {};

const Store = {
  async load() {
    // 1) window.storage (entorno de artefactos)
    if (typeof window !== "undefined" && window.storage && window.storage.get) {
      try {
        const r = await window.storage.get(STORAGE_KEY);
        return r && r.value ? JSON.parse(r.value) : null;
      } catch (e) { return null; } // llave inexistente
    }
    // 2) localStorage (navegador normal / Vercel)
    try {
      const v = localStorage.getItem(STORAGE_KEY);
      return v ? JSON.parse(v) : null;
    } catch (e) {
      return _mem[STORAGE_KEY] || null;
    }
  },

  async save(state) {
    const payload = JSON.stringify(state);
    if (typeof window !== "undefined" && window.storage && window.storage.set) {
      try { await window.storage.set(STORAGE_KEY, payload); return true; }
      catch (e) { console.error("storage.set falló", e); return false; }
    }
    try { localStorage.setItem(STORAGE_KEY, payload); return true; }
    catch (e) { _mem[STORAGE_KEY] = payload; return false; }
  },

  async reset() {
    if (typeof window !== "undefined" && window.storage && window.storage.delete) {
      try { await window.storage.delete(STORAGE_KEY); } catch (e) {}
    }
    try { localStorage.removeItem(STORAGE_KEY); } catch (e) {}
    delete _mem[STORAGE_KEY];
  }
};
