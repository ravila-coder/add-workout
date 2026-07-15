/* ================================================================
   data.js — Configuración y datos semilla
   Semilla generada a partir de la Minuta de Workout / Cobranza
   del 15 de julio de 2026 (Torre del Ángel, Addem Capital).
   Nada de esto está "hardcodeado" en la UI: la app lee catálogos
   y tareas desde el estado persistido; esta semilla solo se usa
   la primera vez.
   ================================================================ */

const CONFIG = {
  appName: "Workout Tracker",
  org: "Addem Capital",
  login: { user: "Addem", pass: "Workout!" },
  driveFolder: "https://drive.google.com/drive/folders/12lOfUlbnS5xfP-8hlJtVxR7j7L2yKH5g?usp=drive_link",
  usuarios: ["Montse","Juan","Habid","Mauro","Oscar","Eduardo","Pablo","Alex","Daniela","Mónica","Pedro","Luis"],
  acreditadas: ["TGT","Verqor","Mattilda","Ozon","Aviva"],
  estatus: ["Pendiente","En curso","En revisión","Completada"],
  prioridades: ["Alta","Media","Baja"],
  avatarColores: ["#0D473D","#1A6F5F","#115A4D","#B8842B","#A8443A","#3A3A3A","#0A382F","#6B6B6B","#2E5E52","#8C6D2B","#4E7A6C","#1F1F1F"]
};

function seedState() {
  const hoy = "2026-07-15";
  const t = (n) => `t${String(n).padStart(3, "0")}`;
  let i = 0;
  const mk = (o) => Object.assign({
    id: t(++i),
    descripcion: "",
    responsable: "",
    prioridad: "Media",
    estatus: "Pendiente",
    fechaCreacion: hoy,
    fechaConclusion: null,
    creadoPor: "Minuta 15-jul-2026",
    completadoPor: null,
    comentarios: [],
    adjuntos: []
  }, o);

  const tareas = [
    // ---- TGT ----
    mk({ titulo: "Enviar correo de seguimiento a TGT",
      descripcion: "El equipo de Inversiones enviará el correo una vez concluida la comunicación de Juan con ellos. Queda pendiente el pago de los $25 mil acordados para el periodo de febrero.",
      acreditada: "TGT", responsable: "Juan", prioridad: "Alta", fechaCompromiso: "2026-07-17" }),
    mk({ titulo: "Revisar la conversación con Pimex",
      acreditada: "TGT", responsable: "Juan", prioridad: "Media", fechaCompromiso: "2026-07-21" }),
    mk({ titulo: "Confirmar fecha y monto del pago de buena fe",
      descripcion: "Se acordó realizar un pago de buena fe; únicamente falta confirmar fecha y monto. Pedro estima un importe aproximado de $700 mil.",
      acreditada: "TGT", responsable: "Pedro", prioridad: "Alta", fechaCompromiso: "2026-07-22" }),

    // ---- Verqor ----
    mk({ titulo: "Firmar el convenio de cesión de cartera",
      descripcion: "El convenio contempla la cesión del remanente de la cartera activa y una cascada de pagos con amortización aproximada de $1 millón.",
      acreditada: "Verqor", responsable: "Pablo", prioridad: "Alta", fechaCompromiso: "2026-07-24" }),
    mk({ titulo: "Definir estructura del fideicomiso: GZ o Kapital",
      descripcion: "Se propone que las garantías se transfieran a un fideicomiso administrado por GZ en lugar de Kapital, para facilitar la instrucción de una nueva cartera.",
      acreditada: "Verqor", responsable: "Mauro", prioridad: "Alta", fechaCompromiso: "2026-07-24" }),
    mk({ titulo: "Establecer reserva de dos meses de operación mínima",
      descripcion: "La estructura requerirá mantener una reserva equivalente a dos meses de operación mínima.",
      acreditada: "Verqor", responsable: "Mauro", prioridad: "Media", fechaCompromiso: "2026-07-31" }),
    mk({ titulo: "Llamada semanal de seguimiento (viernes)",
      descripcion: "Llamadas todos los viernes con Verqor e Hilco para revisar el estatus de los créditos y la administración de la cartera.",
      acreditada: "Verqor", responsable: "Habid", prioridad: "Media", estatus: "En curso", fechaCompromiso: "2026-07-17" }),
    mk({ titulo: "Solicitar a Legal revisión de pagarés y vigencia",
      descripcion: "Apoyo del área Legal para revisar los pagarés y confirmar su vigencia, junto con contratos y garantías (propuesta de servicios de Hilco).",
      acreditada: "Verqor", responsable: "Daniela", prioridad: "Media", fechaCompromiso: "2026-07-28" }),

    // ---- Mattilda ----
    mk({ titulo: "Concluir análisis de cosechas de factoraje",
      descripcion: "Análisis de la cartera por mes de cosecha y por escuela.",
      acreditada: "Mattilda", responsable: "Oscar", prioridad: "Media", estatus: "Completada",
      fechaCompromiso: "2026-07-15", fechaConclusion: hoy, completadoPor: "Oscar" }),
    mk({ titulo: "Revisar impacto del incremento de nómina (COL/ECU)",
      descripcion: "Los estados financieros reflejan un incremento de nómina de aproximadamente el doble, derivado de las operaciones en Colombia y Ecuador. El crecimiento de ingresos permanece estancado.",
      acreditada: "Mattilda", responsable: "Oscar", prioridad: "Media", fechaCompromiso: "2026-07-24" }),
    mk({ titulo: "Confirmar el write-off de seis meses",
      descripcion: "Verificar que el total de la cartera sea consistente tras el write-off registrado.",
      acreditada: "Mattilda", responsable: "Eduardo", prioridad: "Alta", fechaCompromiso: "2026-07-22" }),
    mk({ titulo: "Enviar correo con análisis de cartera de factoraje",
      descripcion: "Preparar y enviar el correo con el análisis por parte del equipo de Inversiones.",
      acreditada: "Mattilda", responsable: "Oscar", prioridad: "Media", fechaCompromiso: "2026-07-24" }),

    // ---- Ozon ----
    mk({ titulo: "Resolver rechazo de dispersiones Conekta → STP",
      descripcion: "Investigación concluida. Se mantiene monitoreo con PayJoy para agilizar la recuperación de cartera sin depender del seguimiento con Daniel.",
      acreditada: "Ozon", responsable: "Alex", prioridad: "Alta", estatus: "Completada",
      fechaCompromiso: "2026-07-15", fechaConclusion: hoy, completadoPor: "Alex" }),
    mk({ titulo: "Monitoreo de recuperación de cartera con PayJoy",
      descripcion: "Persisten incumplimientos contractuales que mantienen exposición a riesgos operativos, legales y de cumplimiento. Dar seguimiento directo con PayJoy.",
      acreditada: "Ozon", responsable: "Alex", prioridad: "Alta", estatus: "En curso", fechaCompromiso: "2026-07-24" }),

    // ---- Aviva ----
    mk({ titulo: "Firmar reversión y nueva cesión para cubrir el DR",
      descripcion: "Se revertirá cartera y se realizará una nueva cesión para aforar y cubrir el DR, con el fin de estar en cumplimiento.",
      acreditada: "Aviva", responsable: "Pablo", prioridad: "Alta", fechaCompromiso: "2026-07-23" }),
    mk({ titulo: "Iniciar proceso para llamar la línea de crédito",
      descripcion: "Pedro llevará la conversación con la acreditada.",
      acreditada: "Aviva", responsable: "Pedro", prioridad: "Alta", fechaCompromiso: "2026-07-27" })
  ];

  const actividad = [{
    ts: new Date("2026-07-15T12:00:00").toISOString(),
    user: "Sistema",
    accion: "creo",
    texto: `Se importaron ${tareas.length} tareas desde la Minuta de Workout / Cobranza del 15-jul-2026`
  }];

  return { version: 1, tareas, actividad, catalogos: {
    usuarios: CONFIG.usuarios.slice(),
    acreditadas: CONFIG.acreditadas.slice(),
    estatus: CONFIG.estatus.slice(),
    prioridades: CONFIG.prioridades.slice()
  }};
}
