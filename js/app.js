/* ================================================================
   app.js — Workout · Addem Capital
   Vistas: Tareas (con resumen integrado) · Timeline
   ================================================================ */

let state = null;                 // { tareas, actividad, catalogos, asana }
let session = { auth: false, user: null };
let filtros = { acreditada: "", responsable: "", estatus: "", prioridad: "", fecha: "", kpi: "" };
let editandoId = null;
let detalleId = null;

/* ---------------- Utilidades ---------------- */
const $ = (s) => document.querySelector(s);
const $$ = (s) => Array.from(document.querySelectorAll(s));
const icon = (n) => `<svg class="ic"><use href="#i-${n}"/></svg>`;
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, c => ({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;" }[c]));
const hoyISO = () => new Date().toISOString().slice(0, 10);

function fmtFecha(iso) {
  if (!iso) return "Sin fecha";
  const [y, m, d] = iso.split("-").map(Number);
  const meses = ["ene","feb","mar","abr","may","jun","jul","ago","sep","oct","nov","dic"];
  return `${d} ${meses[m - 1]} ${y}`;
}
function fmtHora(ts) {
  const d = new Date(ts);
  return `${fmtFecha(d.toISOString().slice(0,10))} · ${String(d.getHours()).padStart(2,"0")}:${String(d.getMinutes()).padStart(2,"0")}`;
}
function colorDe(nombre) {
  const lista = state?.catalogos?.usuarios || CONFIG.usuarios;
  const i = lista.indexOf(nombre);
  return CONFIG.avatarColores[(i >= 0 ? i : Math.abs(hash(nombre))) % CONFIG.avatarColores.length];
}
function hash(s) { let h = 0; for (const c of String(s)) h = (h * 31 + c.charCodeAt(0)) | 0; return h; }
function iniciales(n) { return String(n || "?").split(" ").map(p => p[0]).join("").slice(0, 2).toUpperCase(); }
function avatar(nombre, sm) {
  return `<span class="avatar ${sm ? "sm" : ""}" title="${esc(nombre)}" style="background:${colorDe(nombre)}">${iniciales(nombre)}</span>`;
}
function toast(msg) {
  const t = $("#toast");
  t.textContent = msg;
  t.classList.add("show");
  clearTimeout(t._h);
  t._h = setTimeout(() => t.classList.remove("show"), 2600);
}
function claseEstatus(st) { return "st-" + st.toLowerCase().replace(/\s|ó|é/g, m => ({ " ":"", "ó":"o", "é":"e" }[m])); }

/* ---------------- Persistencia ---------------- */
async function guardar() { await Store.save(state); }
function registrar(accion, texto) {
  state.actividad.unshift({ ts: new Date().toISOString(), user: session.user || "Sistema", accion, texto });
  if (state.actividad.length > 400) state.actividad.length = 400;
}

/* ---------------- Arranque ---------------- */
async function init() {
  const guardado = await Store.load();
  state = guardado || seedState();
  if (!state.asana) state.asana = { token: "", project: "" };   // migración
  if (!guardado) await guardar();
  poblarSelects();
  $("#loginForm").addEventListener("submit", onLogin);
  document.addEventListener("click", (e) => {
    const menu = $("#userMenu");
    if (menu.classList.contains("open") && !e.target.closest(".user-wrap")) menu.classList.remove("open");
  });
  render();
}

function onLogin(e) {
  e.preventDefault();
  const u = $("#loginUser").value.trim();
  const p = $("#loginPass").value.trim();
  if (u.toLowerCase() === CONFIG.login.user.toLowerCase() && p === CONFIG.login.pass) {
    session.auth = true;
    $("#loginError").style.display = "none";
    render();
  } else {
    $("#loginError").style.display = "block";
  }
}

function elegirUsuario(nombre) {
  session.user = nombre;
  registrar("sesion", `<b>${esc(nombre)}</b> inició sesión en el sistema`);
  guardar();
  render();
  irA("tareas");
}

/* ---------------- Menú de usuario ---------------- */
function toggleMenu(e) {
  e.stopPropagation();
  const menu = $("#userMenu");
  const abrir = !menu.classList.contains("open");
  menu.classList.toggle("open", abrir);
  if (abrir) $("#umHead").innerHTML = `${avatar(session.user, true)}<div><div class="n">${esc(session.user)}</div><div class="r">Workout · Addem Capital</div></div>`;
}
function cerrarMenu() { $("#userMenu").classList.remove("open"); }

function cambiarUsuario() { cerrarMenu(); session.user = null; render(); }

function cerrarSesion() {
  cerrarMenu();
  registrar("sesion", `<b>${esc(session.user)}</b> cerró sesión`);
  guardar();
  session = { auth: false, user: null };
  $("#loginUser").value = ""; $("#loginPass").value = "";
  render();
  toast("Sesión cerrada");
}

/* ---------------- Render raíz ---------------- */
function render() {
  $("#loginView").style.display = session.auth && session.user ? "none" : "flex";
  $("#app").style.display = session.auth && session.user ? "block" : "none";
  if (!session.auth) { $("#loginStep1").style.display = "block"; $("#loginStep2").style.display = "none"; return; }
  if (!session.user) {
    $("#loginStep1").style.display = "none";
    $("#loginStep2").style.display = "block";
    $("#peopleGrid").innerHTML = state.catalogos.usuarios.map(n =>
      `<button class="person-btn" onclick="elegirUsuario('${esc(n)}')">${avatar(n)}<span>${esc(n)}</span></button>`).join("");
    return;
  }
  $("#topUser").innerHTML = `${avatar(session.user, true)} ${esc(session.user)}`;
  renderResumen();
  renderChips();
  renderTareas();
  renderTimeline();
}

function irA(vista) {
  $$(".view").forEach(v => v.classList.remove("active"));
  $("#view-" + vista).classList.add("active");
  $$(".nav-btn").forEach(b => b.classList.toggle("on", b.dataset.v === vista));
  window.scrollTo({ top: 0 });
}

/* ---------------- Resumen (KPIs interactivos) ---------------- */
function metricas() {
  const ts = state.tareas;
  const hoy = hoyISO();
  const abiertas = ts.filter(t => t.estatus !== "Completada");
  const vencidas = abiertas.filter(t => t.fechaCompromiso && t.fechaCompromiso < hoy);
  const d = new Date(); const dia = (d.getDay() + 6) % 7;
  const lunes = new Date(d); lunes.setDate(d.getDate() - dia);
  const lunesISO = lunes.toISOString().slice(0, 10);
  const semana = ts.filter(t => t.estatus === "Completada" && t.fechaConclusion && t.fechaConclusion >= lunesISO);
  return { abiertas, vencidas, semana, total: ts };
}

function renderResumen() {
  const m = metricas();
  const kpi = (id, num, lbl, cls) => `
    <div class="kpi ${cls || ""} ${filtros.kpi === id ? "sel" : ""}" onclick="filtrarKpi('${id}')" title="Filtrar la lista">
      <div class="num">${num}</div><div class="lbl">${lbl}</div>
    </div>`;
  $("#kpis").innerHTML =
    kpi("abiertas", m.abiertas.length, "Tareas abiertas") +
    kpi("vencidas", m.vencidas.length, "Vencidas", "warn") +
    kpi("semana", m.semana.length, "Completadas esta semana", "mint") +
    kpi("", m.total.length, "Total en seguimiento");
  $("#navBadge").textContent = m.abiertas.length;
}

function filtrarKpi(id) {
  filtros.kpi = (filtros.kpi === id) ? "" : id;
  renderResumen();
  renderTareas();
}

/* ---------------- Chips de acreditadas ---------------- */
function renderChips() {
  const abiertasPor = (a) => state.tareas.filter(t => t.acreditada === a && t.estatus !== "Completada").length;
  const chip = (a) => `
    <button class="chip ${filtros.acreditada === a ? "on" : ""}" onclick="filtrarAcreditada('${esc(a)}')">
      ${esc(a)}<span class="n">${abiertasPor(a)}</span>
    </button>`;
  $("#chipsAcred").innerHTML =
    `<button class="chip ${!filtros.acreditada ? "on" : ""}" onclick="filtrarAcreditada('')">Todas</button>` +
    state.catalogos.acreditadas.map(chip).join("") +
    `<button class="chip add" onclick="abrirNuevaAcreditada()">${icon("plus")}Acreditada</button>`;
}

function filtrarAcreditada(a) {
  filtros.acreditada = (filtros.acreditada === a) ? "" : a;
  renderChips();
  renderTareas();
}

/* ---------------- Catálogo de acreditadas ---------------- */
function abrirNuevaAcreditada() {
  cerrarMenu();
  $("#nAcreditada").value = "";
  $("#acredOverlay").classList.add("open");
  setTimeout(() => $("#nAcreditada").focus(), 60);
}
function cerrarNuevaAcreditada() { $("#acredOverlay").classList.remove("open"); }

async function guardarAcreditada(e) {
  e.preventDefault();
  const nombre = $("#nAcreditada").value.trim();
  if (!nombre) return;
  const existe = state.catalogos.acreditadas.find(a => a.toLowerCase() === nombre.toLowerCase());
  if (existe) { toast(`“${existe}” ya está en el catálogo`); return; }
  state.catalogos.acreditadas.push(nombre);
  registrar("creo", `<b>${esc(session.user)}</b> agregó la acreditada <b>${esc(nombre)}</b> al catálogo`);
  await guardar();
  poblarSelects();
  cerrarNuevaAcreditada();
  render();
  toast(`Acreditada “${nombre}” agregada`);
  // Si venía del formulario de tarea, seleccionarla
  if ($("#formOverlay").classList.contains("open")) $("#tAcreditada").value = nombre;
}

function siNuevaAcreditada(sel) {
  if (sel.value === "__nueva__") {
    sel.value = state.catalogos.acreditadas[0] || "";
    abrirNuevaAcreditada();
  }
}

/* ---------------- Selects y filtros ---------------- */
function poblarSelects() {
  const op = (arr, todos) => (todos ? `<option value="">${todos}</option>` : "") + arr.map(v => `<option>${esc(v)}</option>`).join("");
  $("#fResponsable").innerHTML = op(state.catalogos.usuarios, "Responsable: todos");
  $("#fEstatus").innerHTML = op(state.catalogos.estatus, "Estatus: todos");
  $("#fPrioridad").innerHTML = op(state.catalogos.prioridades, "Prioridad: todas");
  $("#tAcreditada").innerHTML = op(state.catalogos.acreditadas) + `<option value="__nueva__">+ Nueva acreditada…</option>`;
  $("#tResponsable").innerHTML = `<option value="">Sin asignar</option>` + op(state.catalogos.usuarios);
  $("#tPrioridad").innerHTML = op(state.catalogos.prioridades);
  $("#tEstatus").innerHTML = op(state.catalogos.estatus);
}

function toggleFiltros() {
  $("#filtersWrap").classList.toggle("open");
  $("#filtersToggle").classList.toggle("open");
}

function leerFiltros() {
  filtros.responsable = $("#fResponsable").value;
  filtros.estatus = $("#fEstatus").value;
  filtros.prioridad = $("#fPrioridad").value;
  filtros.fecha = $("#fFecha").value;
  actualizarContadorFiltros();
  renderTareas();
}
function actualizarContadorFiltros() {
  const n = ["responsable","estatus","prioridad","fecha"].filter(k => filtros[k]).length;
  const el = $("#fCount");
  el.style.display = n ? "grid" : "none";
  el.textContent = n;
}
function limpiarFiltros() {
  ["fResponsable","fEstatus","fPrioridad","fFecha"].forEach(id => $("#" + id).value = "");
  filtros = { acreditada: "", responsable: "", estatus: "", prioridad: "", fecha: "", kpi: "" };
  actualizarContadorFiltros();
  renderChips();
  renderResumen();
  renderTareas();
}

function tareasFiltradas() {
  const hoy = hoyISO();
  return state.tareas.filter(t => {
    if (filtros.acreditada && t.acreditada !== filtros.acreditada) return false;
    if (filtros.responsable && t.responsable !== filtros.responsable) return false;
    if (filtros.estatus && t.estatus !== filtros.estatus) return false;
    if (filtros.prioridad && t.prioridad !== filtros.prioridad) return false;
    if (filtros.fecha && t.fechaCompromiso !== filtros.fecha) return false;
    if (filtros.kpi === "abiertas" && t.estatus === "Completada") return false;
    if (filtros.kpi === "vencidas" && !(t.estatus !== "Completada" && t.fechaCompromiso && t.fechaCompromiso < hoy)) return false;
    if (filtros.kpi === "semana" && !(t.estatus === "Completada")) return false;
    return true;
  });
}

/* ---------------- Lista de tareas ---------------- */
function renderTareas() {
  const cont = $("#taskList");
  const lista = tareasFiltradas();
  if (!lista.length) {
    cont.innerHTML = `<div class="empty">No hay tareas con estos filtros.<br>Crea una nueva con el botón de abajo.</div>`;
    return;
  }
  const hoy = hoyISO();
  const peso = { "Alta": 0, "Media": 1, "Baja": 2 };
  const orden = (a, b) =>
    (a.fechaCompromiso || "9999").localeCompare(b.fechaCompromiso || "9999") || (peso[a.prioridad] - peso[b.prioridad]);

  const grupos = state.catalogos.acreditadas
    .map(a => [a, lista.filter(t => t.acreditada === a).sort(orden)])
    .filter(g => g[1].length);
  const extra = lista.filter(t => !state.catalogos.acreditadas.includes(t.acreditada));
  if (extra.length) grupos.push(["Otras", extra.sort(orden)]);

  cont.innerHTML = grupos.map(([acred, ts]) => `
    <div class="group-label">${esc(acred)} <span class="count">${ts.length}</span></div>
    ${ts.map(cardTarea).join("")}`).join("");

  function cardTarea(t) {
    const done = t.estatus === "Completada";
    const vencida = !done && t.fechaCompromiso && t.fechaCompromiso < hoy;
    return `
    <div class="task-card p-${t.prioridad.toLowerCase()} ${done ? "is-done" : ""}" onclick="abrirDetalle('${t.id}')">
      <div class="task-top">
        <button class="check ${done ? "on" : ""}" title="${done ? "Reabrir" : "Completar"}"
          onclick="event.stopPropagation();toggleCompletar('${t.id}')">${done ? icon("check") : ""}</button>
        <div style="flex:1">
          <div class="task-title">${esc(t.titulo)}</div>
          <div class="task-meta">
            <span class="tag acred">${esc(t.acreditada)}</span>
            <span class="tag ${claseEstatus(t.estatus)}"><span class="dot"></span>${esc(t.estatus)}</span>
            <span class="tag due ${vencida ? "overdue" : ""}">${icon("calendar")}${fmtFecha(t.fechaCompromiso)}${vencida ? " · vencida" : ""}</span>
            ${t.comentarios.length ? `<span class="tag">${icon("message")}${t.comentarios.length}</span>` : ""}
            ${t.adjuntos.length ? `<span class="tag">${icon("clip")}${t.adjuntos.length}</span>` : ""}
            ${t.responsable ? avatar(t.responsable, true) : ""}
          </div>
        </div>
      </div>
    </div>`;
  }
}

/* ---------------- Completar / reabrir ---------------- */
async function toggleCompletar(id) {
  const t = state.tareas.find(x => x.id === id);
  if (!t) return;
  if (t.estatus !== "Completada") {
    t.estatus = "Completada";
    t.fechaConclusion = hoyISO();
    t.completadoPor = session.user;
    registrar("completo", `<b>${esc(session.user)}</b> completó la tarea “${esc(t.titulo)}” (${esc(t.acreditada)})`);
    toast("Tarea completada");
  } else {
    t.estatus = "Pendiente";
    t.fechaConclusion = null;
    t.completadoPor = null;
    registrar("edito", `<b>${esc(session.user)}</b> reabrió la tarea “${esc(t.titulo)}”`);
    toast("Tarea reabierta");
  }
  await guardar();
  render();
  if ($("#detailOverlay").classList.contains("open")) abrirDetalle(id);
}

/* ---------------- Crear / editar ---------------- */
function abrirFormulario(id) {
  editandoId = id || null;
  const t = id ? state.tareas.find(x => x.id === id) : null;
  $("#formTitle").textContent = t ? "Editar tarea" : "Nueva tarea";
  $("#tTitulo").value = t?.titulo || "";
  $("#tDescripcion").value = t?.descripcion || "";
  $("#tAcreditada").value = t?.acreditada || filtros.acreditada || state.catalogos.acreditadas[0];
  $("#tResponsable").value = t?.responsable || "";
  $("#tFecha").value = t?.fechaCompromiso || "";
  $("#tPrioridad").value = t?.prioridad || "Media";
  $("#tEstatus").value = t?.estatus || "Pendiente";
  $("#btnEliminar").style.display = t ? "inline-flex" : "none";
  $("#btnDuplicar").style.display = t ? "inline-flex" : "none";
  cerrarDetalle();
  $("#formOverlay").classList.add("open");
}
function cerrarFormulario() { $("#formOverlay").classList.remove("open"); }

async function guardarTarea(e) {
  e.preventDefault();
  const datos = {
    titulo: $("#tTitulo").value.trim(),
    descripcion: $("#tDescripcion").value.trim(),
    acreditada: $("#tAcreditada").value,
    responsable: $("#tResponsable").value,
    fechaCompromiso: $("#tFecha").value || null,
    prioridad: $("#tPrioridad").value,
    estatus: $("#tEstatus").value
  };
  if (!datos.titulo || datos.acreditada === "__nueva__") return;

  if (editandoId) {
    const t = state.tareas.find(x => x.id === editandoId);
    const antes = t.estatus;
    Object.assign(t, datos);
    if (datos.estatus === "Completada" && antes !== "Completada") {
      t.fechaConclusion = hoyISO(); t.completadoPor = session.user;
    } else if (datos.estatus !== "Completada") {
      t.fechaConclusion = null; t.completadoPor = null;
    }
    registrar("edito", `<b>${esc(session.user)}</b> editó la tarea “${esc(t.titulo)}” (${esc(t.acreditada)})`);
    toast("Cambios guardados");
  } else {
    const nueva = Object.assign({
      id: "t" + Date.now().toString(36),
      fechaCreacion: hoyISO(),
      fechaConclusion: null,
      creadoPor: session.user,
      completadoPor: null,
      comentarios: [], adjuntos: []
    }, datos);
    if (nueva.estatus === "Completada") { nueva.fechaConclusion = hoyISO(); nueva.completadoPor = session.user; }
    state.tareas.push(nueva);
    registrar("creo", `<b>${esc(session.user)}</b> creó la tarea “${esc(nueva.titulo)}” (${esc(nueva.acreditada)})`);
    toast("Tarea creada");
  }
  await guardar();
  cerrarFormulario();
  render();
}

async function eliminarTarea() {
  const t = state.tareas.find(x => x.id === editandoId);
  if (!t || !confirm(`¿Eliminar la tarea “${t.titulo}”? Esta acción no se puede deshacer.`)) return;
  state.tareas = state.tareas.filter(x => x.id !== editandoId);
  registrar("elimino", `<b>${esc(session.user)}</b> eliminó la tarea “${esc(t.titulo)}” (${esc(t.acreditada)})`);
  await guardar();
  cerrarFormulario();
  render();
  toast("Tarea eliminada");
}

async function duplicarTarea() {
  const t = state.tareas.find(x => x.id === editandoId);
  if (!t) return;
  const copia = JSON.parse(JSON.stringify(t));
  copia.id = "t" + Date.now().toString(36);
  copia.titulo = t.titulo + " (copia)";
  copia.estatus = "Pendiente";
  copia.fechaCreacion = hoyISO();
  copia.fechaConclusion = null; copia.completadoPor = null;
  copia.creadoPor = session.user;
  copia.comentarios = []; copia.adjuntos = [];
  delete copia.asanaGid;
  state.tareas.push(copia);
  registrar("creo", `<b>${esc(session.user)}</b> duplicó la tarea “${esc(t.titulo)}”`);
  await guardar();
  cerrarFormulario();
  render();
  toast("Tarea duplicada");
}

/* ---------------- Detalle ---------------- */
function abrirDetalle(id) {
  detalleId = id;
  const t = state.tareas.find(x => x.id === id);
  if (!t) return;
  $("#dTitulo").textContent = t.titulo;
  $("#dDescripcion").textContent = t.descripcion || "Sin descripción.";
  $("#dPills").innerHTML = state.catalogos.estatus.map(st =>
    `<button class="status-pill ${t.estatus === st ? "on" : ""}" onclick="cambiarEstatus('${id}','${esc(st)}')">${esc(st)}</button>`).join("");
  $("#dMeta").innerHTML = `
    <div class="item"><div class="k">Acreditada</div><div class="v">${esc(t.acreditada)}</div></div>
    <div class="item"><div class="k">Responsable</div><div class="v">${t.responsable ? avatar(t.responsable, true) + " " + esc(t.responsable) : "Sin asignar"}</div></div>
    <div class="item"><div class="k">Prioridad</div><div class="v">${esc(t.prioridad)}</div></div>
    <div class="item"><div class="k">Fecha compromiso</div><div class="v">${fmtFecha(t.fechaCompromiso)}</div></div>
    <div class="item"><div class="k">Creada</div><div class="v">${fmtFecha(t.fechaCreacion)} · ${esc(t.creadoPor)}</div></div>
    <div class="item"><div class="k">Concluida</div><div class="v">${t.fechaConclusion ? fmtFecha(t.fechaConclusion) + " · " + esc(t.completadoPor) : "—"}</div></div>
    ${t.asanaGid ? `<div class="item"><div class="k">Asana</div><div class="v"><a href="https://app.asana.com/0/0/${esc(t.asanaGid)}/f" target="_blank" rel="noopener">Ver en Asana</a></div></div>` : ""}`;
  $("#dComentarios").innerHTML = t.comentarios.map(c => `
    <div class="comment">${avatar(c.user, true)}
      <div class="bubble"><span class="who">${esc(c.user)}</span><span class="when">${fmtHora(c.ts)}</span>
      <div class="txt">${esc(c.texto)}</div></div>
    </div>`).join("") || `<div style="font-size:13px;color:var(--text-muted)">Aún no hay comentarios.</div>`;
  $("#dAdjuntos").innerHTML = t.adjuntos.map((a, i) => `
    <div class="attach"><span class="ico">${icon("file")}</span><span class="nm">${esc(a.nombre)}</span>
      <a href="${esc(a.url)}" target="_blank" rel="noopener">Abrir</a>
      <button class="close-x" style="width:26px;height:26px" title="Quitar" onclick="quitarAdjunto(${i})">${icon("x")}</button>
    </div>`).join("");
  $("#dComentario").value = "";
  $("#detailOverlay").classList.add("open");
}
function cerrarDetalle() { $("#detailOverlay").classList.remove("open"); }
function editarDesdeDetalle() { abrirFormulario(detalleId); }

async function cambiarEstatus(id, st) {
  const t = state.tareas.find(x => x.id === id);
  if (!t || t.estatus === st) return;
  t.estatus = st;
  if (st === "Completada") { t.fechaConclusion = hoyISO(); t.completadoPor = session.user; }
  else { t.fechaConclusion = null; t.completadoPor = null; }
  registrar(st === "Completada" ? "completo" : "edito",
    `<b>${esc(session.user)}</b> cambió “${esc(t.titulo)}” a <b>${esc(st)}</b>`);
  await guardar();
  render();
  abrirDetalle(id);
}

async function agregarComentario() {
  const t = state.tareas.find(x => x.id === detalleId);
  const txt = $("#dComentario").value.trim();
  if (!t || !txt) return;
  t.comentarios.push({ user: session.user, texto: txt, ts: new Date().toISOString() });
  registrar("comento", `<b>${esc(session.user)}</b> comentó en “${esc(t.titulo)}”: “${esc(txt.slice(0, 80))}${txt.length > 80 ? "…" : ""}”`);
  await guardar();
  abrirDetalle(detalleId);
  renderTimeline();
  renderTareas();
}

/* ---------------- Adjuntos (Google Drive) ---------------- */
function abrirDrive() { window.open(CONFIG.driveFolder, "_blank", "noopener"); }

async function registrarAdjunto() {
  const t = state.tareas.find(x => x.id === detalleId);
  const nombre = $("#aNombre").value.trim();
  const url = $("#aUrl").value.trim();
  if (!t || !nombre || !url) { toast("Indica nombre y enlace del archivo"); return; }
  t.adjuntos.push({ nombre, url, user: session.user, ts: new Date().toISOString() });
  registrar("adjunto", `<b>${esc(session.user)}</b> adjuntó “${esc(nombre)}” a “${esc(t.titulo)}”`);
  $("#aNombre").value = ""; $("#aUrl").value = "";
  await guardar();
  abrirDetalle(detalleId);
  renderTareas();
  toast("Archivo vinculado");
}

async function quitarAdjunto(i) {
  const t = state.tareas.find(x => x.id === detalleId);
  if (!t) return;
  const a = t.adjuntos.splice(i, 1)[0];
  registrar("edito", `<b>${esc(session.user)}</b> quitó el adjunto “${esc(a.nombre)}” de “${esc(t.titulo)}”`);
  await guardar();
  abrirDetalle(detalleId);
  renderTareas();
}

/* ---------------- Timeline ---------------- */
function renderTimeline() {
  $("#tlList").innerHTML = state.actividad.map(a => `
    <div class="tl-item a-${a.accion}">
      <div class="tl-when">${fmtHora(a.ts)}</div>
      <div class="tl-text">${a.texto}</div>
    </div>`).join("") || `<div class="empty">Sin actividad todavía.</div>`;
}

/* ================================================================
   Integración con Asana (API REST v1.0, soporta CORS)
   Mapea: titulo→name, descripcion+metadatos→notes,
   fechaCompromiso→due_on, estatus Completada→completed.
   Guarda el gid de Asana en cada tarea para actualizarla después.
   ================================================================ */
const ASANA_API = "https://app.asana.com/api/1.0";

function abrirAsana() {
  cerrarMenu();
  $("#asToken").value = state.asana.token || "";
  $("#asProject").value = state.asana.project || "";
  pintarEstadoAsana(state.asana.token && state.asana.project ? "cfg" : "off");
  $("#asanaOverlay").classList.add("open");
}
function cerrarAsana() { $("#asanaOverlay").classList.remove("open"); }

function pintarEstadoAsana(modo, txt) {
  const el = $("#asanaStatus");
  el.className = "asana-status" + (modo === "ok" ? " ok" : modo === "err" ? " err" : "");
  $("#asanaStatusTxt").textContent = txt || (
    modo === "cfg" ? "Credenciales guardadas — prueba la conexión" : "Sin conexión configurada");
}

async function leerCredencialesAsana() {
  const token = $("#asToken").value.trim();
  const project = $("#asProject").value.trim().replace(/\D/g, "");
  if (!token || !project) { pintarEstadoAsana("err", "Faltan el token o el ID del proyecto"); return null; }
  if (token !== state.asana.token || project !== state.asana.project) {
    state.asana.token = token; state.asana.project = project;
    await guardar();
  }
  return { token, project };
}

async function asanaFetch(ruta, opciones = {}) {
  const r = await fetch(ASANA_API + ruta, Object.assign({}, opciones, {
    headers: {
      "Authorization": "Bearer " + state.asana.token,
      "Content-Type": "application/json",
      "Accept": "application/json"
    }
  }));
  const cuerpo = await r.json().catch(() => ({}));
  if (!r.ok) {
    const msg = cuerpo?.errors?.[0]?.message || `Error HTTP ${r.status}`;
    throw new Error(msg);
  }
  return cuerpo.data;
}

async function probarAsana() {
  const cred = await leerCredencialesAsana();
  if (!cred) return;
  pintarEstadoAsana("cfg", "Probando conexión…");
  try {
    const yo = await asanaFetch("/users/me");
    const proyecto = await asanaFetch(`/projects/${cred.project}?opt_fields=name`);
    pintarEstadoAsana("ok", `Conectado como ${yo.name} · Proyecto “${proyecto.name}”`);
  } catch (e) {
    const pista = (e instanceof TypeError)
      ? "No se pudo llegar a Asana. Si estás en la vista previa del chat, usa la versión desplegada."
      : e.message;
    pintarEstadoAsana("err", pista);
  }
}

function notasAsana(t) {
  const lineas = [
    t.descripcion || "",
    "",
    "— Workout · Addem Capital —",
    `Acreditada: ${t.acreditada}`,
    `Responsable: ${t.responsable || "Sin asignar"}`,
    `Prioridad: ${t.prioridad}`,
    `Estatus: ${t.estatus}`,
    `Creada: ${t.fechaCreacion} por ${t.creadoPor}`
  ];
  if (t.fechaConclusion) lineas.push(`Concluida: ${t.fechaConclusion} por ${t.completadoPor}`);
  if (t.adjuntos.length) {
    lineas.push("", "Adjuntos:");
    t.adjuntos.forEach(a => lineas.push(`· ${a.nombre}: ${a.url}`));
  }
  return lineas.join("\n").trim();
}

async function sincronizarAsana() {
  const cred = await leerCredencialesAsana();
  if (!cred) return;
  pintarEstadoAsana("cfg", "Sincronizando…");
  let creadas = 0, actualizadas = 0, fallas = 0;
  for (const t of state.tareas) {
    const cuerpo = {
      data: {
        name: `[${t.acreditada}] ${t.titulo}`,
        notes: notasAsana(t),
        completed: t.estatus === "Completada",
        due_on: t.fechaCompromiso || null
      }
    };
    try {
      if (t.asanaGid) {
        await asanaFetch(`/tasks/${t.asanaGid}`, { method: "PUT", body: JSON.stringify(cuerpo) });
        actualizadas++;
      } else {
        cuerpo.data.projects = [cred.project];
        const creada = await asanaFetch("/tasks", { method: "POST", body: JSON.stringify(cuerpo) });
        t.asanaGid = creada.gid;
        creadas++;
      }
    } catch (e) {
      fallas++;
      if (e instanceof TypeError) {
        pintarEstadoAsana("err", "No se pudo llegar a Asana. Si estás en la vista previa del chat, usa la versión desplegada.");
        return;
      }
      pintarEstadoAsana("err", `Error de Asana: ${e.message}`);
    }
  }
  await guardar();
  if (!fallas) {
    pintarEstadoAsana("ok", `Sincronizado: ${creadas} creadas, ${actualizadas} actualizadas`);
    registrar("edito", `<b>${esc(session.user)}</b> sincronizó con Asana (${creadas} creadas, ${actualizadas} actualizadas)`);
    renderTimeline();
    toast("Tareas enviadas a Asana");
  }
}

/* ---------------- Otros ---------------- */
document.addEventListener("keydown", e => {
  if (e.key === "Escape") { cerrarFormulario(); cerrarDetalle(); cerrarNuevaAcreditada(); cerrarAsana(); cerrarMenu(); }
});

init();
