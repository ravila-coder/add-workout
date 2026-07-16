/* ================================================================
   report.js — "Agenda de la semana"
   Genera un documento imprimible (→ PDF desde el diálogo del
   navegador) con las tareas pendientes, ordenadas por:
   1) Fecha compromiso  2) Prioridad  3) Acreditada
   ================================================================ */

function agendaDeLaSemana(tareas) {
  const pesoPrioridad = { "Alta": 0, "Media": 1, "Baja": 2 };
  const pendientes = tareas
    .filter(t => t.estatus !== "Completada")
    .sort((a, b) =>
      (a.fechaCompromiso || "9999").localeCompare(b.fechaCompromiso || "9999") ||
      (pesoPrioridad[a.prioridad] - pesoPrioridad[b.prioridad]) ||
      a.acreditada.localeCompare(b.acreditada)
    );

  const hoyISO = new Date().toISOString().slice(0, 10);
  const filas = pendientes.map(t => {
    const ult = t.comentarios.length ? t.comentarios[t.comentarios.length - 1] : null;
    const vencida = t.fechaCompromiso && t.fechaCompromiso < hoyISO;
    return `<tr>
      <td><b>${esc(t.titulo)}</b><div class="mini">${esc(t.acreditada)}</div></td>
      <td>${esc(t.responsable || "—")}</td>
      <td><span class="pill ${vencida ? "rojo" : ""}">${fmtFecha(t.fechaCompromiso)}</span></td>
      <td>${esc(t.prioridad)}</td>
      <td>${esc(t.estatus)}</td>
      <td class="coment">${ult ? `<b>${esc(ult.user)}:</b> ${esc(ult.texto)}` : "<span class='mini'>Sin comentarios</span>"}</td>
    </tr>`;
  }).join("");

  const html = `<!DOCTYPE html><html lang="es"><head><meta charset="utf-8">
  <title>Agenda de la semana — Workout Addem</title>
  <link href="https://fonts.googleapis.com/css2?family=Inter+Tight:wght@300;600&display=swap" rel="stylesheet">
  <style>
    body{font-family:'Inter Tight',Helvetica,Arial,sans-serif;color:#1f1f1f;margin:32px;font-size:12px;font-weight:300}
    h1{font-size:19px;color:#0d473d;margin:0;font-weight:600;letter-spacing:-.01em}
    .sub{font-family:ui-monospace,'SF Mono',Menlo,Consolas,monospace;color:#6b6b6b;margin:6px 0 18px;font-size:10px;text-transform:uppercase;letter-spacing:.08em}
    table{width:100%;border-collapse:collapse}
    th{background:#0d473d;color:#fff;text-align:left;padding:7px 9px;font-size:10.5px;text-transform:uppercase;letter-spacing:.06em}
    td{padding:8px 9px;border-bottom:1px solid #e3e3e3;vertical-align:top}
    tr:nth-child(even) td{background:#f7f7f7}
    .mini{color:#6b6b6b;font-size:10.5px;margin-top:2px}
    .pill{white-space:nowrap}
    .pill.rojo{color:#a8443a;font-weight:700}
    .coment{max-width:220px}
    .foot{font-family:ui-monospace,Menlo,monospace;margin-top:22px;color:#8c8c8c;font-size:9px;text-transform:uppercase;letter-spacing:.08em}
    @page{margin:14mm}
  </style></head><body>
  <h1>Agenda de la semana · Workout</h1>
  <div class="sub">Addem Capital · Generada el ${fmtFecha(hoyISO)} · ${pendientes.length} tareas pendientes · Orden: fecha compromiso → prioridad → acreditada</div>
  <table>
    <thead><tr><th>Tarea / Acreditada</th><th>Responsable</th><th>Compromiso</th><th>Prioridad</th><th>Estatus</th><th>Comentario más reciente</th></tr></thead>
    <tbody>${filas || `<tr><td colspan="6">No hay tareas pendientes.</td></tr>`}</tbody>
  </table>
  <div class="foot">// Documento de uso interno — Addem Capital</div>
  <script>window.onload = () => setTimeout(() => window.print(), 300);<\/script>
  </body></html>`;

  const w = window.open("", "_blank");
  if (!w) { alert("Permite las ventanas emergentes para descargar la agenda."); return; }
  w.document.write(html);
  w.document.close();
}

/* Exportación alternativa en Excel (CSV compatible) */
function agendaExcel(tareas) {
  const pesoPrioridad = { "Alta": 0, "Media": 1, "Baja": 2 };
  const pendientes = tareas
    .filter(t => t.estatus !== "Completada")
    .sort((a, b) =>
      (a.fechaCompromiso || "9999").localeCompare(b.fechaCompromiso || "9999") ||
      (pesoPrioridad[a.prioridad] - pesoPrioridad[b.prioridad]) ||
      a.acreditada.localeCompare(b.acreditada)
    );
  const cab = ["Tarea","Acreditada","Responsable","Fecha compromiso","Prioridad","Estatus","Comentario más reciente"];
  const q = (s) => `"${String(s ?? "").replace(/"/g, '""')}"`;
  const filas = pendientes.map(t => {
    const ult = t.comentarios.length ? t.comentarios[t.comentarios.length - 1] : null;
    return [t.titulo, t.acreditada, t.responsable, t.fechaCompromiso, t.prioridad, t.estatus,
      ult ? `${ult.user}: ${ult.texto}` : ""].map(q).join(",");
  });
  const csv = "\uFEFF" + [cab.map(q).join(",")].concat(filas).join("\r\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `Agenda_Workout_${new Date().toISOString().slice(0,10)}.csv`;
  a.click();
  URL.revokeObjectURL(a.href);
}
