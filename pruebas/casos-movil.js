/* El móvil, sin textos que se pisen ni cosas que se salgan: con el marco de
   la app estrechado a 390 px (enElMovil, de casos-hoja.js), se miden las
   posiciones de verdad de lo que se ve. */

/* las líneas del texto que se VEN: lo recortado con «…» (o a partir de la segunda línea) no cuenta */
const cajasTexto = el => {
  const r = document.createRange(), v = el.getBoundingClientRect(); r.selectNodeContents(el);
  return [...r.getClientRects()].map(c => ({ left: Math.max(c.left, v.left), right: Math.min(c.right, v.right), top: Math.max(c.top, v.top), bottom: Math.min(c.bottom, v.bottom) }))
    .filter(c => c.right - c.left > 1 && c.bottom - c.top > 1);
};
const sePisan = (a, b) => Math.min(a.right, b.right) - Math.max(a.left, b.left) > 2 && Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top) > 3;
/* un curso con entregas de nombre largo, para forzar las filas */
async function conCursoLargo(fn) {
  const antes = JSON.parse(JSON.stringify(S)), antesSec = seccion, antesAg = agTab;
  try {
    const m = S.modulos[0], hoy = new Date();
    const dia = n => { const d = new Date(hoy); d.setDate(d.getDate() + n); return d.toISOString().slice(0, 10); };
    S.tareas = [
      { id: uid(), titulo: "Práctica de herencia y polimorfismo en Java con interfaces", modId: m.id, fecha: dia(2), peso: 15, hecha: false, creado: dia(-3) },
      { id: uid(), titulo: "Consultas con JOIN, ejercicios del 12 al 20 del tema cuatro", modId: m.id, fecha: dia(4), peso: 10, hecha: false, creado: dia(-2) }
    ];
    S.horas = S.horas || {}; S.horas[m.id] = Object.assign({}, S.horas[m.id], { [dia(-1)]: 50, [dia(-8)]: 75, [dia(-15)]: 25 });
    guardaLS("instalar-luego", hoyISO());
    return await fn();
  } finally { S = JSON.parse(JSON.stringify(antes)); seccion = antesSec; agTab = antesAg; pinta(); }
}

grupo("El móvil: nada se pisa ni se sale", () => {
  prueba("en el Inicio, el nombre de lo que vence no se monta encima de su fecha ni de su estado", () => enElMovil(() => conCursoLargo(async () => {
    seccion = "escritorio"; pinta(); await new Promise(r => setTimeout(r, 150));
    const filas = [...document.querySelectorAll('.panel[aria-labelledby="tProx"] .fila')];
    esperar(filas.length >= 2).cierto();
    for (const f of filas) {
      const t = f.querySelector(".t"), otros = [...f.querySelectorAll(".fecha, .estado")].filter(x => getComputedStyle(x).display !== "none");
      for (const c of cajasTexto(t)) for (const o of otros) esperar(sePisan(c, o.getBoundingClientRect())).falso();
    }
  })));

  prueba("en el Inicio, el estado de cada asignatura tampoco pisa su nombre", () => enElMovil(() => conCursoLargo(async () => {
    seccion = "escritorio"; pinta(); await new Promise(r => setTimeout(r, 150));
    for (const f of document.querySelectorAll('.panel[aria-labelledby="tMods"] .fila')) {
      const t = f.querySelector(".t"), otros = [...f.querySelectorAll(".num, .estado")];
      for (const c of cajasTexto(t)) for (const o of otros) esperar(sePisan(c, o.getBoundingClientRect())).falso();
    }
  })));

  prueba("ninguna sección se sale por los lados", () => enElMovil(() => conCursoLargo(async () => {
    for (const s of ["escritorio", "modulos", "entregas", "apuntes", "repaso", "progreso", "casillero", "ingles", "ajustes", "tutoria", "chat"]) {
      seccion = s; pinta(); await new Promise(r => setTimeout(r, 60));
      esperar(document.documentElement.scrollWidth <= innerWidth + 1).cierto();
    }
  })));

  prueba("la Lista de la Agenda lleva el título arriba y la fecha debajo, sin pisarse", () => enElMovil(() => conCursoLargo(async () => {
    agTab = "lista"; seccion = "entregas"; pinta(); await new Promise(r => setTimeout(r, 150));
    const f = document.querySelector(".ls-fila"), t = f.querySelector(".ls-tit"), p = f.querySelector(".ls-props");
    esperar(p.getBoundingClientRect().top >= t.getBoundingClientRect().bottom - 1).cierto();
  })));

  prueba("la tabla de horas de Progreso se desliza dentro de su tarjeta", () => enElMovil(() => conCursoLargo(async () => {
    seccion = "progreso"; pinta(); await new Promise(r => setTimeout(r, 100));
    const d = document.querySelector(".pg-tabla"); if (!d) saltar("sin tabla de horas");
    d.open = true;
    esperar(["auto", "scroll"]).contiene(getComputedStyle(d).overflowX);
    esperar(document.documentElement.scrollWidth <= innerWidth + 1).cierto();
  })));

  prueba("los avisos ámbar no se convierten en la pastilla de «Próximamente»", () => {
    const b = document.createElement("div"); b.className = "banda pronto"; b.innerHTML = "<span>Un aviso largo</span>";
    $("#contenido").appendChild(b);
    try { esperar(getComputedStyle(b).display).igualA("flex"); esperar(getComputedStyle(b).whiteSpace).distintoDe("nowrap"); }
    finally { b.remove(); }
  });

  prueba("un ciclo con nombre largo va en siglas en la etiqueta de arriba", () => {
    esperar(siglasCiclo("Desarrollo de Aplicaciones Web")).igualA("DAW");
    esperar(siglasCiclo("Administración de Sistemas Informáticos en Red")).igualA("ASIR");
    esperar(siglasCiclo("Sistemas Microinformáticos y Redes")).igualA("SMR");
    esperar(siglasCiclo("DAW")).igualA("DAW");
    esperar(siglasCiclo("Enfermería")).igualA("Enfermería");
  });
});
