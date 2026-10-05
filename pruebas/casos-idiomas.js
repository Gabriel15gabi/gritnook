/* Idiomas: cualquier idioma, el traductor (el del navegador y los enlaces),
   la voz, el dictado, las palabras de un texto, el examen oficial con sus
   reglas, el writing, el speaking y la inmersión. */

/* la app como estaba, al acabar: estado, sección, pestaña y lo guardado */
async function conIdiomas(fn, { tab = "vocab", modulos = null, perfil = null } = {}) {
  const antes = JSON.parse(JSON.stringify(S)), sec = seccion, t = idiTab, d = idiDir, ls = localStorage.getItem("desk-daw:estado");
  const w = Object.assign({}, idiW), hb = Object.assign({}, idiH);
  try {
    S.vocab = []; S.idioma = null;
    if (modulos) S.modulos = modulos;
    if (perfil) S.perfil = Object.assign(perfilDef(), perfil);
    seccion = "ingles"; idiTab = tab; idiDir = "a"; pinta(); await dormir(10);
    return await fn();
  } finally {
    const dl = $("#dlg"); if (dl.open) dl.close();
    clearInterval(idiW.tick); clearInterval(idiH.tick);
    Object.assign(idiW, w, { tick: null }); Object.assign(idiH, hb, { tick: null, rec: null });
    S = JSON.parse(JSON.stringify(antes)); seccion = sec; idiTab = t; idiDir = d;
    if (ls === null) localStorage.removeItem("desk-daw:estado"); else localStorage.setItem("desk-daw:estado", ls);
    pinta();
  }
}
const escribe = (sel, v, ev = "input") => { const c = $(sel); c.value = v; c.dispatchEvent(new Event(ev, { bubbles: true })); return c; };
/* las destrezas de un idioma como asignaturas, como las crea la bienvenida */
const destrezas = () => CAT_IDIOMA.map(([cod, nombre, h], i) => ({ id: "d" + cod, cod, nombre, color: i, horas: 60, faltas: 0, objetivo: 5, metaSemanal: h, pesos: PESOS_DEF() }));
/* la voz, de mentira: lo que importa es qué se dice, en qué idioma y a qué velocidad */
async function conVoz(fn) {
  const dichos = [], tenia = "speechSynthesis" in window, real = window.speechSynthesis, utt = window.SpeechSynthesisUtterance, voces = vocesTTS;
  const falso = { speak: u => dichos.push({ texto: u.text, lang: u.lang, rate: u.rate }), cancel() {}, getVoices: () => [] };
  Object.defineProperty(window, "speechSynthesis", { value: falso, configurable: true, writable: true });
  window.SpeechSynthesisUtterance = function (t) { this.text = t; this.lang = ""; this.rate = 1; this.voice = null; };
  vocesTTS = [];
  try { return await fn(dichos); }
  finally {
    if (tenia) Object.defineProperty(window, "speechSynthesis", { value: real, configurable: true, writable: true }); else delete window.speechSynthesis;
    window.SpeechSynthesisUtterance = utt; vocesTTS = voces;
  }
}

grupo("Idiomas: cualquier idioma, no solo inglés", () => {
  prueba("la sección se llama Idiomas", () => {
    esperar(SECCIONES.find(s => s.id === "ingles").txt).igualA("Idiomas");
  });
  prueba("lo que había: las palabras sin idioma son de inglés y el resto se crea vacío", () => conEstado(() => {
    S.vocab = [{ id: "v1", en: "query", es: "consulta", caja: 2 }]; S.idioma = "basura";
    const I = normalizarIdioma();
    esperar(S.vocab[0].lang).igualA("en");
    esperar(I.actual).igualA("");
    esperar(I.examen).nulo();
    esperar(I.simulacros.length).igualA(0);
    esperar(idiomaActual()).igualA("en");
  }));
  prueba("si estudias un idioma en la bienvenida, la sección empieza en ese", () => conEstado(() => {
    S.perfil = Object.assign(perfilDef(), { etapa: "idioma", ciclo: "Francés B1" });
    esperar(idiomaActual()).igualA("fr");
    normalizarIdioma().actual = "de";
    esperar(idiomaActual()).igualA("de");
  }));
  prueba("cada idioma tiene su vocabulario: la misma palabra puede estar en dos", () => conEstado(() => {
    S.vocab = []; S.idioma = null;
    esperar(!!nuevaPalabra("chat", "gato", "", "fr")).cierto();
    esperar(nuevaPalabra("Chat", "gato", "", "fr")).nulo();     /* repetida, sin mirar mayúsculas */
    esperar(!!nuevaPalabra("chat", "charla", "", "en")).cierto();
    esperar(vocabDe("fr").length).igualA(1);
    esperar(vocabDe("en").length).igualA(1);
  }));
  prueba("al cambiar de idioma cambian el título y la lista", () => conIdiomas(async () => {
    nuevaPalabra("deploy", "desplegar", "", "en"); nuevaPalabra("bonjour", "hola", "", "fr"); pinta();
    esperar($(".sx-tit").textContent).igualA("Inglés");
    esperar($(".ix-palabras").textContent).contiene("deploy");
    escribe("#idiSel", "fr", "change");
    esperar($(".sx-tit").textContent).igualA("Francés");
    esperar($(".ix-palabras").textContent).contiene("bonjour");
    esperar($(".ix-palabras").textContent).noContiene("deploy");
  }));
  prueba("añadir una palabra con su frase de ejemplo; repetida, avisa y no se duplica", () => conIdiomas(async () => {
    $("#idiPal").value = "rollback"; $("#idiTrad").value = "volver atrás"; $("#idiEj").value = "We did a rollback.";
    $("#idiAdd").click();
    esperar(S.vocab.length).igualA(1);
    esperar(S.vocab[0].ejemplo).igualA("We did a rollback.");
    esperar(S.vocab[0].lang).igualA("en");
    esperar($(".ix-palabras").textContent).contiene("We did a rollback.");
    $("#idiPal").value = "Rollback"; $("#idiAdd").click();
    esperar(S.vocab.length).igualA(1);
  }));
  prueba("la chuleta de informática sale a quien estudia informática y en inglés", () => conIdiomas(async () => {
    S.perfil = Object.assign(perfilDef(), { etapa: "ciclo-sup", ciclo: "Desarrollo de Aplicaciones Web" }); pinta();
    esperar($("#contenido").textContent).contiene("Chuleta de informática");
    escribe("#idiSel", "fr", "change");
    esperar($("#contenido").textContent).noContiene("Chuleta de informática");
    S.perfil = Object.assign(perfilDef(), { etapa: "idioma", ciclo: "Inglés" }); S.idioma.actual = ""; pinta();
    esperar($("#contenido").textContent).noContiene("Chuleta de informática");
  }));
  prueba("lo nuevo viaja con el vocabulario a la cuenta", () => conEstado(() => {
    esperar(DOCS.ingles.includes("idioma")).cierto();
    S.idioma = null; normalizarIdioma().actual = "it";
    esperar(empaqueta("ingles").idioma.actual).igualA("it");
  }));
});

grupo("Idiomas: traducir", () => {
  prueba("enlaces de inglés a español con el texto puesto", () => {
    const L = Object.fromEntries(enlacesTraduccion("hello world", "en", "es"));
    esperar(L["Google Traductor"]).igualA("https://translate.google.com/?sl=en&tl=es&text=hello%20world&op=translate");
    esperar(L.DeepL).igualA("https://www.deepl.com/translator#en/es/hello%20world");
    esperar(L.WordReference).igualA("https://www.wordreference.com/enes/hello%20world");
    esperar(L["Reverso (frases)"]).contiene("/traduccion/ingles-espanol/");
    esperar(L.Cambridge).contiene("ingles-espanol");
    esperar(L.RAE === undefined).cierto();            /* la RAE, solo para palabras en español */
    esperar(L["Forvo (pronunciación)"] === undefined).cierto();   /* Forvo, solo palabras sueltas */
  });
  prueba("del español a otro idioma, con la RAE para la palabra suelta", () => {
    const L = Object.fromEntries(enlacesTraduccion("mesa", "es", "fr"));
    esperar(L.RAE).igualA("https://dle.rae.es/mesa");
    esperar(L.WordReference).igualA("https://www.wordreference.com/esfr/mesa");
    esperar(L["Reverso (frases)"]).contiene("/traduccion/espanol-frances/");
  });
  prueba("cada servicio solo sale con los idiomas que tiene", () => {
    const n = enlacesTraduccion("kaixo", "eu", "es").map(x => x[0]);
    esperar(n).contiene("Google Traductor");
    esperar(n.includes("DeepL")).falso();
    esperar(n.includes("Reverso (frases)")).falso();
    esperar(enlacesTraduccion("   ", "en", "es").length).igualA(0);
  });
  prueba("al escribir se rellenan los enlaces; al cambiar de sentido, el texto se queda", () => conIdiomas(async () => {
    escribe("#idiTexto", "ordenador");
    esperar($("#idiLinks").innerHTML).contiene("sl=es&amp;tl=en&amp;text=ordenador");
    esperar($("#idiLinks a").getAttribute("rel")).igualA("noopener noreferrer");
    $("#idiDir").click();
    esperar($("#idiTexto").value).igualA("ordenador");
    esperar($("#idiLinks").innerHTML).contiene("sl=en&amp;tl=es");
  }));
  prueba("con el traductor del navegador traduce aquí y deja guardar la palabra", () => conIdiomas(async () => {
    const tenia = "Translator" in self, antes = self.Translator;
    self.Translator = { availability: async () => "available", create: async o => ({ translate: async t => o.targetLanguage === "en" ? "computer" : "?" }) };
    traductores = {};
    try {
      pinta();
      esperar(!!$("#idiTraducir")).cierto();
      escribe("#idiTexto", "ordenador");
      $("#idiTraducir").click(); await hasta(() => $("#idiGuardarTrad"));
      esperar($("#idiSalida").textContent).contiene("computer");
      $("#idiGuardarTrad").click();
      esperar(S.vocab[0].en).igualA("computer");
      esperar(S.vocab[0].es).igualA("ordenador");
    } finally { if (tenia) self.Translator = antes; else delete self.Translator; traductores = {}; }
  }));
  prueba("sin traductor en el navegador no hay botón y lo dice; los enlaces siguen", () => conIdiomas(async () => {
    const tenia = "Translator" in self, antes = self.Translator;
    delete self.Translator;
    try {
      pinta();
      esperar(!!$("#idiTraducir")).falso();
      esperar($("#idiEnlaces").textContent).contiene("no hay traductor integrado");
      esperar(await traducirAqui("hola", "es", "en")).nulo();
    } finally { if (tenia) self.Translator = antes; }
  }));
});

grupo("Idiomas: oír, dictado y palabras de un texto", () => {
  prueba("el altavoz lo dice con la voz del idioma; «Despacio», más lento", () => conVoz(dichos => conIdiomas(async () => {
    escribe("#idiSel", "fr", "change");
    nuevaPalabra("bonjour", "hola"); idiTab = "practicar"; pinta();
    $("#idiFrase").value = "Je suis étudiant.";
    $('[data-oir-de="#idiFrase"]:not([data-oir-lento])').click();
    $('[data-oir-de="#idiFrase"][data-oir-lento]').click();
    esperar(dichos[0]).igualA({ texto: "Je suis étudiant.", lang: "fr-FR", rate: 1 });
    esperar(dichos[1].rate).igualA(0.7);
    idiTab = "vocab"; pinta();
    $(".ix-palabras .idi-oir").click();
    esperar(dichos[2].texto).igualA("bonjour");
  })));
  prueba("sin texto no dice nada", () => conVoz(dichos => {
    esperar(pronunciar("   ", "en")).falso();
    esperar(dichos.length).igualA(0);
  }));
  prueba("el dictado admite tildes y signos de menos, y lo dice", () => {
    esperar(compararDictado("Café", "café")).igualA({ ok: true, casi: false });
    esperar(compararDictado("Où est la gare ?", "ou est la gare")).igualA({ ok: true, casi: true });
    esperar(compararDictado("though", "through").ok).falso();
  });
  prueba("un dictado entero: escuchas, escribes, corrige, sube de caja y cuenta como repaso", () => conVoz(dichos => conIdiomas(async () => {
    const v = nuevaPalabra("schedule", "horario"); diaObj().repaso = false;
    dlgDictado(); await dormir(250);
    esperar(dichos[0].texto).igualA("schedule");
    $("#dcTexto").value = "schedule";
    $("#dlgPie .primario").click();
    esperar($(".idi-corr").textContent).contiene("¡Bien!");
    esperar(v.caja).igualA(2);
    esperar($("#dlgPie .primario").textContent).igualA("Terminar");
    $("#dlgPie .primario").click();
    esperar($("#dlg").open).falso();
    esperar(diaObj().repaso).cierto();
  })));
  prueba("de un texto salen las palabras nuevas, sin repetir ni las muy cortas", () => conEstado(() => {
    S.vocab = [{ id: "v", en: "mat", es: "alfombrilla", lang: "en" }];
    esperar(palabrasDeTexto("The cat sat on the mat. The cat is happy!", "en")).igualA(["The", "cat", "sat", "happy"]);
    esperar(fraseCon("I like it. The cat is happy! Bye.", "happy")).igualA("The cat is happy!");
  }));
  prueba("eliges cuáles y se guardan con su frase", () => conIdiomas(async () => {
    $(".idi-texto").open = true;
    $("#idiPegado").value = "Deploy the app tonight. Then monitor the logs.";
    $("#idiSacar").click();
    esperar(!!$('[data-idi-pal="Deploy"]')).cierto();
    $('[data-idi-pal="monitor"]').click(); $('[data-idi-pal="logs"]').click();
    esperar($("#idiSacarAdd").textContent).igualA("Añadir 2 palabras");
    $("#idiSacarAdd").click(); await hasta(() => S.vocab.length === 2);
    const m = S.vocab.find(v => v.en === "monitor");
    esperar(m.ejemplo).igualA("Then monitor the logs.");
    esperar(m.lang).igualA("en");
  }));
  prueba("el repaso es del idioma que estudias", () => conIdiomas(async () => {
    nuevaPalabra("bonjour", "hola", "", "fr"); nuevaPalabra("hello", "hola", "", "en");
    escribe("#idiSel", "fr", "change");
    dlgRepaso(); await dormir(20);
    esperar($(".tarjeta-repaso .cara").textContent).contiene("bonjour");
    esperar($("#dlgCuerpo").textContent).contiene("1 de 1");
  }));
});

grupo("Idiomas: el examen oficial y «¿apruebo?»", () => {
  const notas = (ex, arr) => Object.fromEntries(ex.partes.map((p, i) => [p.id, arr[i]]));
  prueba("EOI: 50 % en cada parte y 65 % de media", () => {
    const ex = examenIdioma("eoi");
    esperar(ex.partes.length).igualA(5);
    esperar(evaluarExamen(ex, notas(ex, [70, 60, 55, 80, 75])).aprueba).cierto();
    const r = evaluarExamen(ex, notas(ex, [90, 90, 45, 90, 90]));
    esperar(r.global).igualA(81);
    esperar(r.aprueba).falso();                    /* media de sobra, pero una parte por debajo del 50 */
    esperar(r.floja.nombre).igualA("Producción y coproducción escrita");
    esperar(evaluarExamen(ex, notas(ex, [60, 60, 60, 60, 60])).aprueba).falso();
  });
  prueba("Cambridge B2 First: la media de la escala, 160 para el B2", () => {
    const ex = examenIdioma("cam-b2"), r = evaluarExamen(ex, notas(ex, [165, 158, 170, 160, 155]));
    esperar(r.global).cerca(161.6);
    esperar(r.aprueba).cierto();
    esperar(evaluarExamen(ex, notas(ex, [150, 158, 170, 160, 155])).aprueba).falso();
  });
  prueba("IELTS: la banda es la media redondeada al medio punto", () => {
    esperar(redondeoIelts(6.25)).igualA(6.5);
    esperar(redondeoIelts(6.75)).igualA(7);
    esperar(redondeoIelts(6.125)).igualA(6);
    const ex = examenIdioma("ielts");
    esperar(evaluarExamen(ex, notas(ex, [6.5, 6.5, 5.5, 6])).aprueba).falso();    /* 6,125 → 6 */
    esperar(evaluarExamen(ex, notas(ex, [7, 6.5, 6, 6])).aprueba).cierto();       /* 6,375 → 6,5 */
  });
  prueba("DELF: 50 de 100 y al menos 5 en cada parte", () => {
    const ex = examenIdioma("delf");
    esperar(evaluarExamen(ex, notas(ex, [12, 13, 12, 13])).aprueba).cierto();
    esperar(evaluarExamen(ex, notas(ex, [20, 20, 4, 20])).aprueba).falso();
  });
  prueba("Goethe: cada módulo por separado, con 60", () => {
    const ex = examenIdioma("goethe");
    esperar(evaluarExamen(ex, notas(ex, [60, 75, 80, 90])).aprueba).cierto();
    esperar(evaluarExamen(ex, notas(ex, [59, 100, 100, 100])).aprueba).falso();
  });
  prueba("con partes sin nota todavía no dice ni sí ni no", () => {
    const ex = examenIdioma("eoi");
    esperar(evaluarExamen(ex, { p1: 80 }).aprueba).nulo();
  });
  prueba("eliges el examen, apuntas un simulacro y te dice si apruebas y qué te frena", () => conIdiomas(async () => {
    $('[data-idi-ex="eoi"]').click();
    esperar(S.idioma.examen.nombre).contiene("Escuela Oficial");
    const v = [70, 60, 55, 80, 75];
    document.querySelectorAll("[data-idi-parte]").forEach((c, i) => { c.value = v[i]; });
    $("#idiSimAdd").click();
    esperar(S.idioma.simulacros.length).igualA(1);
    esperar($(".idi-veredicto").textContent).contiene("Con estas notas, apruebas.");
    esperar($(".idi-veredicto").textContent).contiene("68%");
    esperar($("#contenido").textContent).contiene("Lo que más te frena: Producción y coproducción escrita");
  }, { tab: "examen" }));
  prueba("si llevas las destrezas como asignaturas, un botón le da 1 h más a la que te frena", () => conIdiomas(async () => {
    $('[data-idi-ex="cam-b2"]').click();
    const v = [170, 175, 150, 172, 180];                /* Writing, la floja */
    document.querySelectorAll("[data-idi-parte]").forEach((c, i) => { c.value = v[i]; });
    $("#idiSimAdd").click();
    const wri = S.modulos.find(m => m.cod === "WRI"), antes = wri.metaSemanal;
    $("[data-idi-mas]").click();
    esperar(S.modulos.find(m => m.cod === "WRI").metaSemanal).igualA(antes + 1);
  }, { tab: "examen", modulos: destrezas() }));
  prueba("cambiar de examen lo pregunta y se lleva los simulacros", () => conIdiomas(async () => {
    $('[data-idi-ex="aptis"]').click();
    S.idioma.simulacros.push({ id: "s1", fecha: hoyISO(), notas: { p1: 40 } }); pinta();
    $("#idiExCambiar").click(); await dormir(20);
    esperar($("#cfTit").textContent).igualA("¿Cambiar de examen?");
    $('#dlgConfirmar [data-cf="si"]').click(); await dormir(20);
    esperar(S.idioma.examen).nulo();
    esperar(S.idioma.simulacros.length).igualA(0);
  }, { tab: "examen" }));
});

grupo("Idiomas: writing, speaking e inmersión", () => {
  prueba("cuenta las palabras y avisa si te faltan o te pasas", () => conIdiomas(async () => {
    esperar(palabrasEn("Hello  world\nagain")).igualA(3);
    escribe("#wTexto", "word ".repeat(100));
    esperar($("#wCuenta").textContent).igualA("100 palabras");
    esperar($("#wCuenta").className).contiene("poco");               /* B2: 140 a 190 */
    escribe("#wTexto", "word ".repeat(150));
    esperar($("#wCuenta").className).contiene("bien");
    escribe("#wTexto", "word ".repeat(200));
    esperar($("#wCuenta").className).contiene("mucho");
  }, { tab: "escribir" }));
  prueba("al terminar te puntúas con la rúbrica y se guarda en tus apuntes", () => conIdiomas(async () => {
    escribe("#wTexto", "Dear Sir or Madam,\nI am writing to complain about the course.");
    $("#wGuardar").click(); await dormir(20);
    document.querySelectorAll("[data-rub]").forEach(s => { s.value = "4"; });
    $("#dlgPie .primario").click();
    const w = S.idioma.writings[0];
    esperar(w.nota).igualA(16);
    esperar(w.palabras).igualA(12);
    const ap = Object.values(S.apuntes).find(a => (a.tags || []).includes("writing"));
    esperar(ap.titulo).contiene("Email o carta formal · B2");
    esperar(ap.cuerpo).contiene("I am writing to complain");
    esperar(idiW.texto).igualA("");
  }, { tab: "escribir" }));
  prueba("el speaking te graba en el dispositivo y lo puedes escuchar; no se sube nada", () => conIdiomas(async () => {
    const antes = { md: Object.getOwnPropertyDescriptor(navigator, "mediaDevices"), mr: window.MediaRecorder };
    let paradas = 0;
    Object.defineProperty(navigator, "mediaDevices", { value: { getUserMedia: async () => ({ getTracks: () => [{ stop: () => paradas++ }] }) }, configurable: true });
    window.MediaRecorder = class { constructor() { this.state = "inactive"; this.mimeType = "audio/webm"; } start() { this.state = "recording"; }
      stop() { this.state = "inactive"; this.ondataavailable({ data: new Blob(["x"]) }); this.onstop(); } };
    const fetchAntes = window.fetch; let subidas = 0; window.fetch = (...a) => { subidas++; return fetchAntes(...a); };
    try {
      pinta();
      esperar($("#contenido").textContent).contiene("no se sube a ningún sitio");
      $("#hbGrabar").click(); await hasta(() => idiH.grabando);
      esperar(!!$("#hbParar")).cierto();
      $("#hbParar").click(); await hasta(() => !!$(".idi-escucha audio"));
      esperar($(".idi-escucha audio").getAttribute("src")).contiene("blob:");
      esperar(paradas).igualA(1);                       /* el micrófono se apaga */
      esperar(subidas).igualA(0);
      const spe = S.modulos.find(m => m.cod === "SPE");
      esperar((S.horas[spe.id] || {})[hoyISO()]).igualA(1);   /* un minuto de speaking */
    } finally {
      window.fetch = fetchAntes;
      if (antes.md) Object.defineProperty(navigator, "mediaDevices", antes.md); else delete navigator.mediaDevices;
      window.MediaRecorder = antes.mr;
    }
  }, { tab: "hablar", modulos: destrezas() }));
  prueba("otro tema cambia el tema", () => conIdiomas(async () => {
    const t = $(".idi-tema").textContent;
    $("#hbOtro").click();
    esperar($(".idi-tema").textContent).distintoDe(t);
  }, { tab: "hablar" }));
  prueba("la inmersión cuenta para tus horas en la destreza que trabaja", () => conIdiomas(async () => {
    $("#inTipo").value = "serie"; $("#inMin").value = "45"; $("#inTit").value = "Friends";
    $("#inAdd").click();
    const lis = S.modulos.find(m => m.cod === "LIS");
    esperar(S.horas[lis.id][hoyISO()]).igualA(45);
    esperar(minutosInmersion(7)).igualA(45);
    esperar($(".idi-cuenta").textContent).contiene("45 min");
    esperar($("#contenido").textContent).contiene("Friends");
    esperar(apuntarInmersion("nada", 10)).nulo();
    esperar(apuntarInmersion("lectura", 9999).minutos).igualA(600);
  }, { tab: "inmersion", modulos: destrezas() }));
  prueba("el panel lateral dice el idioma, lo de hoy, la inmersión y los días al examen", () => conIdiomas(async () => {
    S.idioma = null; const I = normalizarIdioma(); I.actual = "de";
    I.examen = examenIdioma("goethe"); I.examen.fecha = sumaDias(hoyISO(), 30);
    apuntarInmersion("podcast", 20); pinta();
    const p = panelHTML(cuentasNav());
    esperar(p).contiene("Alemán");
    esperar(p).contiene("20 min");
    esperar(p).contiene("30 días");
  }));
});

/* Idiomas sencillo: lo de hoy arriba, cuántas sabes y su fuerza, y tres pestañas */
grupo("Idiomas: sencillo", () => {
  prueba("sin palabras, lo de hoy invita a añadir la primera", () => conIdiomas(async () => {
    esperar($(".ix-hoy").textContent).contiene("Empieza por tus palabras");
    esperar(!!$("#btnRepasar")).falso();
  }));
  prueba("lo de hoy cuenta las nuevas y las de repasar, con su botón", () => conIdiomas(async () => {
    nuevaPalabra("deploy", "desplegar", "", "en"); nuevaPalabra("merge", "fusionar", "", "en");
    const v = S.vocab.find(x => x.en === "merge"); v.caja = 3; v.vistoEn = sumaDias(hoyISO(), -3); v.proximo = hoyISO();
    pinta();
    esperar($(".ix-hoy .ix-grande").textContent).contiene("2 palabras para hoy");
    esperar($(".ix-hoy").textContent).contiene("1 nueva");
    esperar($(".ix-hoy").textContent).contiene("1 para repasar");
    esperar(!!$("#btnRepasar")).cierto();
  }));
  prueba("al día, lo dice; y cuenta cuántas sabes (las fuertes) y su fuerza", () => conIdiomas(async () => {
    nuevaPalabra("deploy", "desplegar", "", "en"); nuevaPalabra("merge", "fusionar", "", "en"); nuevaPalabra("query", "consulta", "", "en");
    S.vocab.forEach((v, i) => { v.caja = [1, 3, 5][i]; v.proximo = sumaDias(hoyISO(), 4); });
    pinta();
    esperar($(".ix-hoy .ix-grande").textContent).contiene("Al día");
    esperar($(".ix-sabes b").textContent).igualA("1");
    esperar($(".ix-ley").textContent).contiene("1 débil");
    esperar($(".ix-ley").textContent).contiene("1 media");
    esperar($(".ix-ley").textContent).contiene("1 fuerte");
  }));
  prueba("filtrar tus palabras por su fuerza", () => conIdiomas(async () => {
    nuevaPalabra("deploy", "desplegar", "", "en"); nuevaPalabra("query", "consulta", "", "en");
    S.vocab.find(x => x.en === "query").caja = 5; pinta();
    $('[data-ix-filtro="fuerte"]').click();
    esperar([...document.querySelectorAll(".ix-palabras b")].map(b => b.textContent)).igualA(["query"]);
    $('[data-ix-filtro="debil"]').click();
    esperar([...document.querySelectorAll(".ix-palabras b")].map(b => b.textContent)).igualA(["deploy"]);
    $('[data-ix-filtro="todas"]').click();
  }));
  prueba("tres pestañas: Writing, Speaking e Inmersión están dentro de Practicar, con su vuelta", () => conIdiomas(async () => {
    esperar([...document.querySelectorAll(".ix-tabs [data-idi-tab]")].map(b => b.textContent)).igualA(["Palabras", "Practicar", "Examen"]);
    $('.ix-tabs [data-idi-tab="practicar"]').click();
    esperar(document.querySelectorAll(".ix-act").length).igualA(6);
    $('.ix-act [data-idi-tab="hablar"]').click();
    esperar(idiTab).igualA("hablar");
    esperar($('.ix-tabs [data-idi-tab="practicar"]').getAttribute("aria-selected")).igualA("true");
    esperar($(".mc-migas b").textContent).igualA("Speaking");
    $('.mc-migas [data-idi-tab="practicar"]').click();
    esperar(idiTab).igualA("practicar");
  }));
  prueba("una pestaña que ya no existe vuelve a Palabras", () => conIdiomas(async () => {
    esperar(!!$("#idiPal")).cierto();
  }, { tab: "vocabulario-viejo" }));
});

grupo("Iconos del menú: duotono suave", () => {
  prueba("Inicio es el círculo de la «O», en morado; de Módulos a Mochila y la Oposición, el mismo trazo; en el menú y dentro de la app", () => {
    esperar(ICON_RIEL.escritorio).contiene("<circle");
    esperar(ICON_RIEL.escritorio).contiene("var(--acento)");
    esperar(ICON_PH.escritorio).igualA(ICON_RIEL.escritorio);
    ["modulos", "entregas", "apuntes", "repaso", "progreso", "casillero", "oposicion"].forEach(id => {
      esperar(ICON_RIEL[id]).contiene('stroke-width="1.75"');
      esperar(ICON_RIEL[id]).contiene('fill-opacity=".2"');
      esperar(ICON_PH[id]).igualA(ICON_RIEL[id]);
    });
  });
  prueba("el riel y la barra del móvil los pintan", () => {
    const antes = seccion;
    try {
      seccion = "progreso"; pinta();
      esperar($('#riel [data-sec="progreso"]').innerHTML).contiene("M3.4 17.6l5.2-5.2");
    } finally { seccion = antes; pinta(); }
  });
});
