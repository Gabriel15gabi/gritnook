/* El lanzamiento: el Inicio con «tu día» en vez de «Buenos días», el tiempo
   de tu zona (con la privacidad por delante), las libretas nuevas del
   casillero con su color, la pantalla de entrar y el movimiento. */

/* una prueba en el Inicio, sin dejar rastro */
function conInicio(fn) {
  const antes = { S: JSON.stringify(S), seccion, BV, f: tiempoFetch, geo: pedirPosicion, datos: TIEMPO.datos, error: TIEMPO.error, falloEn: TIEMPO.falloEn };
  const ls = ["tiempo", "tiempo-datos"].map(k => [k, localStorage.getItem("desk-daw:" + k)]);
  BV = null; $("#entrada").hidden = true; document.body.classList.remove("en-entrada");
  ls.forEach(([k]) => localStorage.removeItem("desk-daw:" + k));
  TIEMPO.datos = null; TIEMPO.error = ""; TIEMPO.falloEn = 0; TIEMPO.cargando = false;
  const fin = () => {
    S = JSON.parse(antes.S); seccion = antes.seccion; BV = antes.BV; $("#entrada").hidden = !BV;
    tiempoFetch = antes.f; pedirPosicion = antes.geo; TIEMPO.datos = antes.datos; TIEMPO.error = antes.error; TIEMPO.falloEn = antes.falloEn; TIEMPO.cargando = false;
    ls.forEach(([k, v]) => v === null ? localStorage.removeItem("desk-daw:" + k) : localStorage.setItem("desk-daw:" + k, v));
    const d = $("#dlg"); if (d.open) d.close();
    pinta();
  };
  let r;
  try { r = fn(); } catch (e) { fin(); throw e; }
  if (r && typeof r.then === "function") return r.finally(fin);
  fin(); return r;
}
/* un Open-Meteo de mentira: apunta qué se le pide */
function tiempoFalso({ codigo = 61, temp = 17.6, falla = false } = {}) {
  const pedidos = [];
  tiempoFetch = async url => {
    pedidos.push(url);
    if (falla) throw new TypeError("Failed to fetch");
    if (url.includes("geocoding")) return { ok: true, json: async () => ({ results: [{ name: "Bilbao", admin1: "País Vasco", country: "España", latitude: 43.26271, longitude: -2.92528 }, { name: "Bilbao", admin1: "Cantabria", country: "España", latitude: 43.3, longitude: -3.8 }] }) };
    return { ok: true, json: async () => ({ current: { temperature_2m: temp, apparent_temperature: temp - 1, weather_code: codigo, is_day: 1 }, daily: { temperature_2m_max: [19.4], temperature_2m_min: [11.6], precipitation_probability_max: [80] } }) };
  };
  return pedidos;
}
const modHoy = (extra = {}) => moduloDe([[100, null]], Object.assign({ id: "bd", cod: "BD", nombre: "Bases de Datos", metaSemanal: 3 }, extra));

grupo("Inicio: tu día en vez de «Buenos días»", () => {
  prueba("ya no saluda: dice cuánto te toca hoy y por dónde empezar", () => conInicio(() => {
    S.modulos = [modHoy()]; normalizarPerfil().diasFuertes = ["lun", "mar", "mie", "jue", "vie", "sab", "dom"]; normalizarPerfil().horasSemana = 7;
    seccion = "escritorio"; pinta();
    const t = $("#contenido").textContent;
    ["Buenos días", "Buenas tardes", "Buenas noches", "Aún despierto"].forEach(s => esperar(t).noContiene(s));
    esperar($("#hdTit").textContent).contiene("de estudio");
    esperar($(".hd-sub").textContent).contiene("Empieza por");
    esperar(!!$('.hd-acc [data-plan-empezar="bd"]')).cierto();
    esperar(!!$("#ilEditar")).cierto();
  }));
  prueba("si trabajas, lo dice: el estudio va repartido en tu tiempo libre", () => conInicio(() => {
    S.modulos = [modHoy()]; const p = normalizarPerfil(); p.trabaja = "completa"; p.diasFuertes = ["lun", "mar", "mie", "jue", "vie", "sab", "dom"];
    seccion = "escritorio"; pinta();
    esperar($(".hd-sub").textContent).contiene("repartido en tu tiempo libre");
  }));
  prueba("un día que no es de estudio: si trabajas, que es para el trabajo; si no, día libre", () => conInicio(() => {
    S.modulos = [modHoy()]; const p = normalizarPerfil();
    const otro = DIAS_ORDEN.find(d => d !== diaDe(hoyISO())); p.diasFuertes = [otro];
    p.trabaja = "completa"; seccion = "escritorio"; pinta();
    esperar($("#hdTit").textContent).contiene("tu día es para el trabajo");
    p.trabaja = "no"; pinta();
    esperar($("#hdTit").textContent).contiene("día libre");
  }));
  prueba("sin asignaturas, te lleva a ponerlas", () => conInicio(() => {
    S.modulos = []; seccion = "escritorio"; pinta();
    esperar($("#hdTit").textContent).contiene("Empieza por");
    esperar(!!$('.hd-acc [data-ir="modulos"]')).cierto();
  }));
  prueba("lo que vence en dos días sale también arriba", () => conInicio(() => {
    S.modulos = [modHoy()]; S.tareas = [{ id: "t1", titulo: "Práctica 3", modId: "bd", fecha: sumaDias(hoyISO(), 1), hecha: false, estado: "pendiente", sub: [] }];
    seccion = "escritorio"; pinta();
    esperar($(".hd-vence").textContent).contiene("Práctica 3");
  }));
  prueba("la hora de arriba es la de ahora, a la manera de aquí", () => conInicio(() => {
    seccion = "escritorio"; pinta();
    esperar(/^\d{2}:\d{2}$/.test($("#hdReloj").textContent)).cierto();
  }));
  prueba("las tres cifras cuentan desde cero al entrar, y acaban en su valor", () => conInicio(async () => {
    S.modulos = [modHoy()]; S.tareas = [1, 2, 3].map(i => ({ id: "t" + i, titulo: "T" + i, modId: "bd", fecha: "", hecha: false, estado: "pendiente", sub: [] }));
    irASeccion("escritorio");
    const c = [...document.querySelectorAll(".hd-dato .cifra")][1];
    esperar(c.dataset.contar).igualA("3");
    await hasta(() => c.textContent === "3", 2000);
  }));
});

grupo("Inicio: el tiempo en tu zona", () => {
  prueba("sin ciudad: invita a ponerla y no pregunta nada a nadie", () => conInicio(() => {
    const pedidos = tiempoFalso();
    seccion = "escritorio"; pinta();
    esperar($("#hdTiempo").textContent).contiene("Poner mi ciudad");
    esperar(pedidos.length).igualA(0);
  }));
  prueba("con ciudad: el tiempo, con su dibujo y un consejo para estudiar", () => conInicio(async () => {
    const pedidos = tiempoFalso({ codigo: 61 });
    ponerZona({ nombre: "Bilbao", lat: 43.26271, lon: -2.92528 });
    seccion = "escritorio"; pinta();
    await hasta(() => $("#hdTiempo") && $("#hdTiempo").textContent.includes("18°"));
    const t = $("#hdTiempo").textContent;
    esperar(t).contiene("Lluvia");
    esperar(t).contiene("Bilbao");
    esperar(t).contiene("Máx 19°");
    esperar(t).contiene("perfecto para un par de bloques");
    esperar(!!$("#hdTiempo .t-lluvia")).cierto();
    esperar(!!$('#hdTiempo a[href="https://open-meteo.com/"]')).cierto();
    esperar(pedidos[0]).contiene("latitude=43.3&longitude=-2.9");
  }));
  prueba("la ubicación se redondea a unos 10 km y se guarda solo en este dispositivo", () => conInicio(async () => {
    tiempoFalso();
    pedirPosicion = async () => ({ latitude: 40.4167754, longitude: -3.7037902 });
    dlgZona();
    $("#tzAqui").click();
    await hasta(() => !!miZona());
    esperar([miZona().lat, miZona().lon]).igualA([40.4, -3.7]);
    esperar(JSON.stringify(S)).noContiene("40.4");
    esperar(Object.keys(DOCS).some(nd => JSON.stringify(empaqueta(nd)).includes("40.4"))).falso();
  }));
  prueba("buscar tu ciudad por su nombre, y elegirla", () => conInicio(async () => {
    const pedidos = tiempoFalso();
    dlgZona();
    const b = $("#tzBuscar"); b.value = "Bilbao"; b.dispatchEvent(new Event("input", { bubbles: true }));
    await hasta(() => document.querySelectorAll("#tzLista [data-tz]").length === 2, 2000);
    esperar($("#tzLista").textContent).contiene("País Vasco");
    esperar(pedidos[0]).contiene("name=Bilbao");
    esperar(pedidos[0]).contiene("language=es");
    document.querySelector('#tzLista [data-tz="0"]').click();
    esperar(miZona().nombre).igualA("Bilbao");
    esperar($("#dlg").open).falso();
  }));
  prueba("sin permiso para la ubicación, lo dice y deja escribir la ciudad", () => conInicio(async () => {
    tiempoFalso();
    pedirPosicion = async () => { const e = new Error("denegado"); e.code = 1; throw e; };
    dlgZona(); $("#tzAqui").click();
    await hasta(() => $("#avisos").lastElementChild && $("#avisos").lastElementChild.textContent.includes("Sin permiso"));
    esperar(miZona()).nulo();
    esperar($("#dlg").open).cierto();
  }));
  prueba("se guarda media hora: volver al Inicio no vuelve a preguntar", () => conInicio(async () => {
    const pedidos = tiempoFalso();
    ponerZona({ nombre: "Vigo", lat: 42.24, lon: -8.72 });
    seccion = "escritorio"; pinta();
    await hasta(() => pedidos.length === 1 && !TIEMPO.cargando);
    TIEMPO.datos = null; pinta(); pinta(); await dormir(30);
    esperar(pedidos.length).igualA(1);
    esperar($("#hdTiempo").textContent).contiene("Vigo");
  }));
  prueba("si falla, lo dice, no insiste en cada pintado y se puede reintentar", () => conInicio(async () => {
    let pedidos = tiempoFalso({ falla: true });
    ponerZona({ nombre: "Vigo", lat: 42.24, lon: -8.72 });
    seccion = "escritorio"; pinta();
    await hasta(() => !!TIEMPO.error);
    esperar($("#hdTiempo").textContent).contiene("No se ha podido saber el tiempo");
    pinta(); pinta(); await dormir(30);
    esperar(pedidos.length).igualA(1);
    pedidos = tiempoFalso({ codigo: 0, temp: 24 });
    $("#tzReintentar").click();
    await hasta(() => $("#hdTiempo") && $("#hdTiempo").textContent.includes("24°"));
  }));
  prueba("los códigos del tiempo, en castellano y de día o de noche", () => {
    esperar(tiempoDe(0, true)).igualA({ txt: "Despejado", ico: "sol" });
    esperar(tiempoDe(0, false).ico).igualA("luna");
    esperar(tiempoDe(3, true).txt).igualA("Nublado");
    esperar(tiempoDe(45, true).ico).igualA("niebla");
    esperar(tiempoDe(73, true).ico).igualA("nieve");
    esperar(tiempoDe(95, true).txt).igualA("Tormenta");
    esperar(consejoTiempo({ codigo: 0, dia: true, max: 35 })).contiene("calor");
  });
  prueba("una zona guardada con números raros no se usa", () => conInicio(() => {
    guardaLS("tiempo", { nombre: "x", lat: 999, lon: "a" });
    esperar(miZona()).nulo();
    guardaLS("tiempo", { nombre: "<b>x</b>", lat: 40, lon: -3 });
    tiempoFalso(); TIEMPO.datos = { temp: 20, codigo: 0, dia: true, max: 22, min: 12, lluvia: 0 };
    guardaLS("tiempo-datos", { t: Date.now(), lat: 40, lon: -3, d: TIEMPO.datos });
    seccion = "escritorio"; pinta();
    esperar($("#hdTiempo").innerHTML).noContiene("<b>x</b>");
  }));
  prueba("dentro de Claude no hay tiempo (no se puede hablar con webs de fuera)", () => {
    const tenia = "claude" in window, antes = window.claude;
    window.claude = {};
    try { esperar(tiempoPosible()).falso(); esperar(hdTiempoHTML()).igualA(""); }
    finally { if (tenia) window.claude = antes; else delete window.claude; }
  });
});

grupo("Casillero: libretas nuevas y de tu color", () => {
  const conCasillero = fn => conInicio(() => { S.modulos = [modHoy(), moduloDe([[100, null]], { id: "pro", cod: "PRO", nombre: "Programación", color: 2 })]; seccion = "casillero"; LBP = null; libroAbierto = null; casTipo = null; pinta(); try { return fn(); } finally { libroAbierto = null; LBP = null; } });
  prueba("cada libreta lleva sus anillas, su etiqueta y el botón de la paleta", () => conCasillero(() => {
    const l = document.querySelectorAll(".lb-hueco");
    esperar(l.length).igualA(2);
    esperar(l[0].querySelectorAll(".lb-lomo i").length).igualA(4);
    esperar(l[0].querySelector(".lb-nombre").textContent).igualA("Bases de Datos");
    esperar(!!l[0].querySelector('[data-lb-pintar="bd"]')).cierto();
  }));
  prueba("elegir un color de la paleta lo pone en la tapa y se guarda con tus ajustes", () => conCasillero(() => {
    document.querySelector('[data-lb-pintar="bd"]').click();
    esperar(!!$("#lbPaleta")).cierto();
    esperar(document.querySelectorAll("#lbPaleta .lb-color").length).igualA(16);
    document.querySelector('#lbPaleta [data-lb-color="#0F766E"]').click();
    esperar(modPorId("bd").tapa).igualA("#0f766e");
    esperar($("#lbPaleta")).nulo();
    esperar(document.querySelector('[data-libro="bd"]').getAttribute("style")).contiene("#0f766e");
    esperar(JSON.stringify(empaqueta("ajustes"))).contiene("#0f766e");
    /* la asignatura conserva su color en el resto de la app */
    esperar(colorMod(modPorId("bd"))).noContiene("#0f766e");
  }));
  prueba("dentro de la libreta, las hojas van del color de la tapa", () => conCasillero(() => {
    ponerTapa("bd", "#9f1239");
    abrirLibro("bd");
    esperar($(".libro-abierto").getAttribute("style")).contiene("#9f1239");
  }));
  prueba("cualquier color, con el selector; y «Quitar color» vuelve al de siempre", () => conCasillero(() => {
    document.querySelector('[data-lb-pintar="pro"]').click();
    const i = $("#lbPropio"); i.value = "#123456"; i.dispatchEvent(new Event("change", { bubbles: true }));
    esperar(modPorId("pro").tapa).igualA("#123456");
    document.querySelector('[data-lb-pintar="pro"]').click();
    document.querySelector('#lbPaleta [data-lb-color=""]').click();
    esperar(modPorId("pro").tapa).igualA(undefined);
  }));
  prueba("una tapa clara lleva la letra oscura", () => conCasillero(() => {
    ponerTapa("bd", "#fde68a"); pinta();
    esperar(document.querySelector('[data-libro="bd"]').classList.contains("clara")).cierto();
    esperar(tapaClara("#1f2937")).falso();
  }));
  prueba("un color que no es un color no entra (ni para colar estilos)", () => conCasillero(() => {
    modPorId("bd").tapa = "red;background:url(https://malo.es/x)";
    pinta();
    esperar(document.querySelector('[data-libro="bd"]').getAttribute("style")).noContiene("malo.es");
    esperar(ponerTapa("bd", "javascript:alert(1)")).cierto();
    esperar(modPorId("bd").tapa).igualA(undefined);
  }));
  prueba("Escape cierra la paleta; un clic fuera, también", () => conCasillero(() => {
    document.querySelector('[data-lb-pintar="bd"]').click();
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
    esperar($("#lbPaleta")).nulo();
    document.querySelector('[data-lb-pintar="bd"]').click();
    $(".cab").click();
    esperar($("#lbPaleta")).nulo();
  }));
  prueba("la libreta de sueltos también se pinta, y se guarda en los ajustes", () => conCasillero(() => {
    ponerTapa(SUELTOS, "#4338ca");
    esperar(S.config.tapaSueltos).igualA("#4338ca");
    esperar(colorLibro(SUELTOS, null)).igualA("--c:#4338ca");
  }));
});

grupo("Entrar: la pantalla nueva", () => {
  const conAcceso = fn => { try { abrirAcceso("entrar"); return fn(); } finally { cerrarAcceso(); const a = $("#acceso"); if (a) a.hidden = true; document.body.classList.remove("en-entrada"); } };
  prueba("a un lado, qué es GritNook: el estudio que se adapta a tu vida", () => conAcceso(() => {
    esperar($(".acc-marca").textContent).contiene("se adapta");
    esperar($(".acc-marca").textContent).contiene("tu trabajo");
    esperar($(".acc-lema-movil").textContent).contiene("a tu vida");
  }));
  prueba("cambiar de pestaña solo repinta el formulario y la pestaña se desliza", () => conAcceso(async () => {
    const marca = $(".acc-marca");
    document.querySelector('[data-acc="crear"]').click();
    esperar($(".acc-marca")).igualA(marca);
    esperar($(".acc-tabs").dataset.modo).igualA("crear");
    esperar($("#accPanel").classList.contains("cambia")).cierto();
    esperar(!!$("#accLegal")).cierto();
  }));
  prueba("el ojo enseña y oculta la contraseña", () => conAcceso(() => {
    const c = $("#accClave"), ojo = $("[data-acc-ver]");
    ojo.click(); esperar(c.type).igualA("text"); esperar(ojo.getAttribute("aria-pressed")).igualA("true");
    ojo.click(); esperar(c.type).igualA("password");
  }));
  prueba("al crear la cuenta, dice lo fuerte que es la contraseña", () => conAcceso(() => {
    document.querySelector('[data-acc="crear"]').click();
    const c = $("#accClave"), f = () => $("#accFuerza");
    const pon = v => { c.value = v; c.dispatchEvent(new Event("input", { bubbles: true })); };
    pon("abc"); esperar(f().textContent).contiene("Faltan 5");
    pon("12345678"); esperar(f().dataset.n).igualA("1");
    pon("Estudio2026"); esperar(f().dataset.n).igualA("2");
    pon("Mi-clave.de.Estudio!"); esperar(f().dataset.n).igualA("3");
    esperar(fuerzaClave("")).igualA(0);
  }));
  prueba("y dice dónde van los datos, sin prometer de más", () => conAcceso(() => {
    esperar($(".acc-seguro").textContent).contiene("Unión Europea");
  }));
});
