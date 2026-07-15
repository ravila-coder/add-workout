/* ================================================================
   app.js — Workout Tracker · Addem Capital
   Vistas: Dashboard · Tareas · Timeline
   ================================================================ */

let state = null;                 // { tareas, actividad, catalogos }
let session = { auth: false, user: null };
let filtros = { acreditada: "", responsable: "", estatus: "", prioridad: "", fecha: "" };
let editandoId = null;            // id de tarea en edición (null = nueva)

/* ---------------- Utilidades ---------------- */
const icon = (n) => `<svg class="ic"><use href="#i-${n}"/></svg>`;
const $ = (s) => document.querySelector(s);
const $$ = (s) => Array.from(document.querySelectorAll(s));
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
  t._h = setTimeout(() => t.classList.remove("show"), 2400);
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
  if (!guardado) await guardar();
  poblarSelects();
  $("#loginForm").addEventListener("submit", onLogin);
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
  irA("dashboard");
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
  renderDashboard();
  renderTareas();
  renderTimeline();
}

function irA(vista) {
  $$(".view").forEach(v => v.classList.remove("active"));
  $("#view-" + vista).classList.add("active");
  $$(".nav-btn").forEach(b => b.classList.toggle("on", b.dataset.v === vista));
  window.scrollTo({ top: 0 });
}

/* ---------------- Dashboard ---------------- */
function renderDashboard() {
  const ts = state.tareas;
  const hoy = hoyISO();
  const abiertas = ts.filter(t => t.estatus !== "Completada");
  const vencidas = abiertas.filter(t => t.fechaCompromiso && t.fechaCompromiso < hoy);

  // Semana actual (lunes → domingo)
  const d = new Date(); const dia = (d.getDay() + 6) % 7;
  const lunes = new Date(d); lunes.setDate(d.getDate() - dia);
  const lunesISO = lunes.toISOString().slice(0, 10);
  const completadasSemana = ts.filter(t => t.estatus === "Completada" && t.fechaConclusion && t.fechaConclusion >= lunesISO);

  $("#kpis").innerHTML = `
    <div class="kpi"><div class="num">${abiertas.length}</div><div class="lbl">Tareas abiertas</div></div>
    <div class="kpi warn"><div class="num">${vencidas.length}</div><div class="lbl">Vencidas</div></div>
    <div class="kpi done"><div class="num">${completadasSemana.length}</div><div class="lbl">Completadas esta semana</div></div>
    <div class="kpi"><div class="num">${ts.length}</div><div class="lbl">Total en seguimiento</div></div>`;

  const porGrupo = (campo, lista) => {
    const cuentas = lista.map(k => [k, abiertas.filter(t => t[campo] === k).length]).filter(x => x[1] > 0)
      .sort((a, b) => b[1] - a[1]);
    const max = Math.max(1, ...cuentas.map(x => x[1]));
    return cuentas.map(([k, n]) => `
      <div class="bar-row">
        <span class="name">${esc(k)}</span>
        <div class="bar-track"><div class="bar-fill" style="width:${(n / max) * 100}%"></div></div>
        <span class="cnt">${n}</span>
      </div>`).join("") || `<div class="hint">Sin tareas abiertas.</div>`;
  };
  $("#porResponsable").innerHTML = porGrupo("responsable", state.catalogos.usuarios);
  $("#porAcreditada").innerHTML = porGrupo("acreditada", state.catalogos.acreditadas);
}

/* ---------------- Tareas ---------------- */
function poblarSelects() {
  const op = (arr, todos) => (todos ? `<option value="">${todos}</option>` : "") + arr.map(v => `<option>${esc(v)}</option>`).join("");
  $("#fAcreditada").innerHTML = op(state.catalogos.acreditadas, "Todas las acreditadas");
  $("#fResponsable").innerHTML = op(state.catalogos.usuarios, "Todos los responsables");
  $("#fEstatus").innerHTML = op(state.catalogos.estatus, "Todos los estatus");
  $("#fPrioridad").innerHTML = op(state.catalogos.prioridades, "Todas las prioridades");
  $("#tAcreditada").innerHTML = op(state.catalogos.acreditadas);
  $("#tResponsable").innerHTML = `<option value="">Sin asignar</option>` + op(state.catalogos.usuarios);
  $("#tPrioridad").innerHTML = op(state.catalogos.prioridades);
  $("#tEstatus").innerHTML = op(state.catalogos.estatus);
}

function leerFiltros() {
  filtros = {
    acreditada: $("#fAcreditada").value,
    responsable: $("#fResponsable").value,
    estatus: $("#fEstatus").value,
    prioridad: $("#fPrioridad").value,
    fecha: $("#fFecha").value
  };
  renderTareas();
}
function limpiarFiltros() {
  ["fAcreditada","fResponsable","fEstatus","fPrioridad","fFecha"].forEach(id => $("#" + id).value = "");
  leerFiltros();
}

function tareasFiltradas() {
  return state.tareas.filter(t =>
    (!filtros.acreditada || t.acreditada === filtros.acreditada) &&
    (!filtros.responsable || t.responsable === filtros.responsable) &&
    (!filtros.estatus || t.estatus === filtros.estatus) &&
    (!filtros.prioridad || t.prioridad === filtros.prioridad) &&
    (!filtros.fecha || t.fechaCompromiso === filtros.fecha)
  );
}

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
  // acreditadas fuera de catálogo (por si se crean nuevas)
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
  $("#tAcreditada").value = t?.acreditada || state.catalogos.acreditadas[0];
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
  if (!datos.titulo) return;

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
  state.tareas.push(copia);
  registrar("creo", `<b>${esc(session.user)}</b> duplicó la tarea “${esc(t.titulo)}”`);
  await guardar();
  cerrarFormulario();
  render();
  toast("Tarea duplicada");
}

/* ---------------- Detalle ---------------- */
let detalleId = null;
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
    <div class="item"><div class="k">Concluida</div><div class="v">${t.fechaConclusion ? fmtFecha(t.fechaConclusion) + " · " + esc(t.completadoPor) : "—"}</div></div>`;
  $("#dComentarios").innerHTML = t.comentarios.map(c => `
    <div class="comment">${avatar(c.user, true)}
      <div class="bubble"><span class="who">${esc(c.user)}</span><span class="when">${fmtHora(c.ts)}</span>
      <div class="txt">${esc(c.texto)}</div></div>
    </div>`).join("") || `<div class="hint" style="font-size:13px;color:var(--tinta-60)">Aún no hay comentarios.</div>`;
  $("#dAdjuntos").innerHTML = t.adjuntos.map((a, i) => `
    <div class="attach"><span class="ico">${icon("file")}</span><span class="nm">${esc(a.nombre)}</span>
      <a href="${esc(a.url)}" target="_blank" rel="noopener">Abrir</a>
      <button class="close-x" style="width:26px;height:26px" title="Quitar" onclick="quitarAdjunto(${i})">${icon("x")}</button>
    </div>`).join("");
  $("#dComentario").value = "";
  $("#detailOverlay").classList.add("open");
}
function cerrarDetalle() { $("#detailOverlay").classList.remove("open"); }

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

/* ---------------- Otros ---------------- */
function cambiarUsuario() { session.user = null; render(); }
function editarDesdeDetalle() { abrirFormulario(detalleId); }

document.addEventListener("keydown", e => {
  if (e.key === "Escape") { cerrarFormulario(); cerrarDetalle(); }
});

init();
