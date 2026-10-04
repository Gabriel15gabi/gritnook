/* Las secciones sencillas: «Hoy» (el Inicio cuando ya tienes asignaturas),
   Módulos, Agenda y Repaso. Apuntes no cambia. Se pinta la sección de verdad
   con un curso de mentira y se deja todo como estaba. */

const csCurso = () => [
  moduloDe([[50, 8], [50, null]], { id: "pro", cod: "PRO", nombre: "Programación", objetivo: 5 }),
  moduloDe([[90, 4], [10, null]], { id: "bd", cod: "BD", nombre: "Bases de Datos", objetivo: 7, color: 1 }),
  moduloDe([[100, null]], { id: "ing", cod: "ING", nombre: "Inglés Técnico", color: 6 })
];
const csTarea = (id, dias, extra = {}) => Object.assign({ id, titulo: "Tarea " + id, modId: "pro", fecha: dias === null ? "" : sumaDias(hoyISO(), dias), hecha: false, estado: "pendiente", sub: [] }, extra);
const csExamen = (id, dias, extra = {}) => Object.assign({ id, titulo: "Examen " + id, modId: "pro", fecha: sumaDias(hoyISO(), dias), hora: "", estado: "pendiente", plan: [] }, extra);
async function enSeccion(sec, fn, prepara) {
  const antes = JSON.parse(JSON.stringify(S)), s0 = seccion, ag0 = agTab, mod0 = modAbierto, pk0 = agPeek, sim = [mxSimId, mxSimX];
  try {
    S.modulos = csCurso(); S.tareas = []; S.examenes = [];
    if (prepara) prepara();
    seccion = sec; modAbierto = null; agPeek = null; pinta(); await dormir(20);
    return await fn();
  } finally {
    S = JSON.parse(JSON.stringify(antes)); seccion = s0; agTab = ag0; modAbierto = mod0; agPeek = pk0; [mxSimId, mxSimX] = sim;
    const d = $("#dlg"); if (d.open) d.close();
    pinta();
  }
}

grupo("Hoy: el Inicio cuando ya tienes asignaturas", () => {
  prueba("la sección se llama «Hoy»", () => {
    esperar(SECCIONES.find(s => s.id === "escritorio").txt).igualA("Hoy");
  });
  prueba("saluda, y enseña los tres anillos, la sesión con su reloj y tu semana", () => enSeccion("escritorio", () => {
    esperar(/Buenos días|Buenas tardes|Buenas noches/.test($("#contenido").textContent)).cierto();
    esperar(!!$(".hy-anillos")).cierto();
    ["#reloj", "#btnTimer", "#btnReset", "#selTimer"].forEach(s => esperar(!!$(s)).cierto());
    esperar(document.querySelectorAll(".hy-dias .hy-d").length).igualA(7);
  }));
  prueba("lo próximo dice cuándo, en castellano", () => enSeccion("escritorio", () => {
    esperar($(".hy-proximo").textContent).contiene("Tarea t1");
    esperar($(".hy-proximo").textContent).contiene("en 2 días");
  }, () => { S.tareas = [csTarea("t1", 2)]; }));
  prueba("repasar una tarjeta o una palabra cuenta en el anillo de hoy", () => conEstado(() => {
    S.tarjetas = [{ id: "c1", modId: "", frente: "a", dorso: "b", caja: 1, proximo: hoyISO() }];
    S.vocab = [{ id: "v1", palabra: "dog", caja: 1, proximo: hoyISO() }];
    esperar(anilloRepaso().hechas).igualA(0);
    responderTarjeta(S.tarjetas[0], "si");
    responderPalabra(S.vocab[0], true);
    esperar(S.tarjetas[0].vistoEn).igualA(hoyISO());
    esperar(anilloRepaso().hechas).igualA(2);
  }));
});

grupo("Módulos: tu media y una tarjeta de color por asignatura", () => {
  prueba("una tarjeta por asignatura con su código, su nota y lo que te hace falta", () => enSeccion("modulos", () => {
    const t = [...document.querySelectorAll(".mx-tesela:not(.mx-nueva)")];
    esperar(t.length).igualA(3);
    esperar(t[0].textContent).contiene("PRO");
    esperar(t[0].querySelector(".mx-t-nota").textContent).igualA("8");
    esperar(t[0].textContent).contiene("Te basta un 2");
    esperar(t[1].textContent).contiene("Solo con recuperación");
    esperar(t[2].querySelector(".mx-t-nota").textContent).igualA("—");
    esperar(t[2].textContent).contiene("Sin notas todavía");
  }));
  prueba("tu media es la de las que ya tienen nota", () => enSeccion("modulos", () => {
    esperar($(".mx-media-n").textContent).igualA("6");
    esperar($(".mx-cuentas").textContent).contiene("1 sin notas");
  }));
  prueba("pulsar una tarjeta abre su ficha", () => enSeccion("modulos", () => {
    $('.mx-tesela[data-editar-mod="bd"]').click();
    esperar(modAbierto).igualA("bd");
  }));
  prueba("la tarjeta «Añadir» crea la asignatura y abre su ficha", () => enSeccion("modulos", () => {
    $("[data-nuevo-mod]").click();
    esperar(S.modulos.length).igualA(4);
    esperar(modAbierto).igualA(S.modulos[3].id);
  }));
  prueba("«¿Y si saco un…?»: cómo acabarías con esa nota en lo que queda, y tu media", () => enSeccion("modulos", () => {
    mxSimId = "bd"; mxSimX = 10;
    const bd = sinEtiquetas(mxSimTexto());
    esperar(bd).contiene("4,6");
    esperar(bd).contiene("No llegarías al 5");
    esperar(bd).contiene("6 → 6,3");
    mxSimId = "pro"; mxSimX = 2;
    esperar(sinEtiquetas(mxSimTexto())).contiene("Llegas a tu 5");
  }));
  prueba("mover la barra cambia la cuenta sin repintar la página", () => enSeccion("modulos", () => {
    const x = $("#mxSimX"), sel = $("#mxSimMod");
    sel.value = "pro"; sel.dispatchEvent(new Event("change", { bubbles: true }));
    x.value = "2"; x.dispatchEvent(new Event("input", { bubbles: true }));
    esperar($("#mxSimN").textContent).igualA("2");
    esperar($("#mxSimRes").textContent).contiene("Llegas a tu 5");
    esperar($("#mxSimX")).igualA(x);
  }));
  prueba("los exámenes a la vista dicen la nota que te hace falta", () => enSeccion("modulos", () => {
    const t = sinEtiquetas($("#contenido").innerHTML);
    esperar(t).contiene("Examen e1");
    esperar(t).contiene("en 3 días");
    esperar(t).contiene("Te hace falta un 2");
  }, () => { S.examenes = [csExamen("e1", 3)]; }));
});

grupo("Agenda: ¿te da tiempo?, lo próximo por días y el mes", () => {
  prueba("Próximo: lo pendiente día a día, con el nombre del día", () => enSeccion("entregas", () => {
    const cab = [...document.querySelectorAll(".ax-dia h3")].map(h => h.firstChild.textContent);
    const dia3 = new Date(sumaDias(hoyISO(), 3) + "T00:00").toLocaleDateString("es-ES", { weekday: "long", day: "numeric" }).replace(",", "");
    esperar(cab.slice(0, 7)).igualA(["Atrasado", "Hoy", "Mañana", dia3.charAt(0).toUpperCase() + dia3.slice(1), "Semana que viene", "Más adelante", "Sin fecha"]);
  }, () => { agTab = "lista"; S.tareas = [csTarea("a", -1), csTarea("b", 0), csTarea("c", 1), csTarea("d", 3), csTarea("e", 9), csTarea("f", 20), csTarea("g", null)]; }));
  prueba("lo que pide cada cosa: lo que pongas tú o, si no, 2 h una entrega y 4 h un examen", () => {
    esperar(agMinutos({ tipo: "entrega", ref: {} })).igualA(120);
    esperar(agMinutos({ tipo: "examen", ref: {} })).igualA(240);
    esperar(agMinutos({ tipo: "entrega", ref: { horas: 3 } })).igualA(180);
  });
  prueba("¿te da tiempo?: si sobra lo dice, y si no llegas, cuánto te falta", () => conEstado(() => {
    normalizarPerfil().horasSemana = 10;
    S.modulos = csCurso(); S.tareas = [csTarea("t1", 2)]; S.examenes = [];
    esperar(sinEtiquetas(agTiempoHTML())).contiene("Te da tiempo y te sobran 8 h para ti.");
    S.examenes = [1, 2, 3, 4, 5, 6].map(i => csExamen("e" + i, i));
    esperar(sinEtiquetas(agTiempoHTML())).contiene("Vas justo: te faltan unas 16 h");
    S.tareas = []; S.examenes = [csExamen("lejos", 30)];
    esperar(sinEtiquetas(agTiempoHTML())).contiene("Tu tiempo es tuyo");
  }));
  prueba("el círculo lo marca como hecho, y otra vez lo recupera", () => enSeccion("entregas", () => {
    $('.ax-fila[data-el="entrega|t1"] .ax-check').click();
    esperar(S.tareas[0].estado).igualA("hecha");
    esperar(!!$('.ax-fila.hecha[data-el="entrega|t1"]')).cierto();
    $('.ax-fila[data-el="entrega|t1"] .ax-check').click();
    esperar(S.tareas[0].estado).igualA("pendiente");
  }, () => { agTab = "lista"; S.tareas = [csTarea("t1", 1)]; }));
  prueba("pulsar una fila la abre para editarla", () => enSeccion("entregas", () => {
    $('.ax-fila[data-el="entrega|t1"] .ax-t').click();
    esperar(agPeek && agPeek.id).igualA("t1");
  }, () => { agTab = "lista"; S.tareas = [csTarea("t1", 1)]; }));
  prueba("en Próximo también está el mes entero (en el ordenador, al lado)", () => enSeccion("entregas", () => {
    esperar(!!$(".ax-cal .cal-dia")).cierto();
    esperar($("#contenido").innerHTML).contiene("data-solo-movil");
  }, () => { agTab = "lista"; }));
  prueba("no queda un filtro escondido por asignatura", () => enSeccion("entregas", () => {
    esperar(agFiltro.modId).igualA("");
    esperar(document.querySelectorAll(".ax-dias .ax-fila").length).igualA(2);
  }, () => { agTab = "lista"; agFiltro.modId = "bd"; S.tareas = [csTarea("t1", 1), csTarea("t2", 2, { modId: "bd" })]; }));
});

grupo("Repaso: lo de hoy de un vistazo", () => {
  prueba("con tarjetas para hoy, «Repasar ahora»; al día, sin botón", () => enSeccion("repaso", () => {
    esperar(!!$("#rpEmpezar")).cierto();
    S.tarjetas[0].proximo = sumaDias(hoyISO(), 3); pinta();
    esperar(!!$("#rpEmpezar")).falso();
    esperar($(".sx-rp-hoy").textContent).contiene("Al día");
  }, () => { S.tarjetas = [{ id: "c1", modId: "pro", frente: "¿Qué es una clase?", dorso: "Un molde", caja: 1, proximo: hoyISO() }]; }));
});
