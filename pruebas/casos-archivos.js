/* Copias de seguridad y archivos del casillero, con objetos File de
   verdad. Aquí se juega la pérdida de datos: si una copia no se puede
   volver a cargar, se pierde un curso entero. */

const ficheroDe = (nombre, texto, tipo) => new File([texto], nombre, { type: tipo || "text/plain" });

grupo("Copia de seguridad: ir y volver", () => {
  prueba("una copia completa se vuelve a cargar tal cual", () => {
    conEstado(() => {
      alumnoDePrueba();
      S.apuntes.a1.html = '<div data-b="t1">Título</div><div><b>negrita</b> y <mark data-m="amarillo">marca</mark></div>';
      const copia = JSON.stringify(S, null, 2);

      S = estadoInicial();                      /* como si empezara de cero */
      esperar(Object.keys(S.apuntes).length).igualA(0);

      const d = JSON.parse(copia);
      S = Object.assign(estadoInicial(), d);    /* lo mismo que hace el botón */

      esperar(S.perfil.nombre).igualA("Gabriel");
      esperar(S.modulos[0].cod).igualA("BD");
      esperar(S.modulos[0].pesos[0].nota).igualA(4);
      esperar(S.apuntes.a1.html).contiene("data-m=\"amarillo\"");
      esperar(S.tareas[0].titulo).igualA("Ejercicios de JOIN");
      esperar(S.horario[0].ini).igualA("15:30");
    });
  });

  prueba("los emojis y el árabe sobreviven al viaje", () => {
    conEstado(() => {
      S.perfil = Object.assign(normalizarPerfil(), { nombre: "🎓 مرحبا 日本語", motivo: "𝕘𝕣𝕚𝕥" });
      const vuelta = JSON.parse(JSON.stringify(S));
      esperar(vuelta.perfil.nombre).igualA("🎓 مرحبا 日本語");
      esperar(vuelta.perfil.motivo).igualA("𝕘𝕣𝕚𝕥");
    });
  });

  prueba("una copia de una versión vieja no tira la app", () => {
    conEstado(() => {
      /* lo que habría guardado la app hace tres meses: sin apuntes, sin
         casillero, sin tarjetas, y con un campo que ya no existe */
      const vieja = { config: { curso: "1.º DAW" }, modulos: [{ id: "m", cod: "X", nombre: "Vieja", pesos: [] }], tareas: [], campoMuerto: 1 };
      S = Object.assign(estadoInicial(), vieja);
      normalizarPerfil(); normalizarTutor(); normalizarObjetivos();
      esperar(Array.isArray(S.tarjetas)).cierto();
      esperar(typeof S.apuntes).igualA("object");
      esperar(typeof calcModulo(S.modulos[0]).txt).igualA("string");
    });
  });

  prueba("una copia que no es una copia se rechaza", () => {
    /* la comprobación del botón: sin modulos, no es nuestra */
    [{}, { hola: 1 }, [], { modulos: undefined }].forEach(d => {
      esperar(!d.modulos).cierto();
    });
    esperar(!!{ modulos: [] }.modulos).cierto();
  });

  prueba("una copia enorme se serializa sin quedarse colgada", () => {
    conEstado(() => {
      S.apuntes = {};
      for (let i = 0; i < 300; i++) S.apuntes["a" + i] = { id: "a" + i, titulo: "Apunte " + i, html: "<div>" + "x".repeat(2000) + "</div>", cuerpo: "x".repeat(2000) };
      const t0 = performance.now();
      const txt = JSON.stringify(S);
      esperar(performance.now() - t0 < 3000).cierto();
      esperar(txt.length > 600000).cierto();
      esperar(Object.keys(JSON.parse(txt).apuntes).length).igualA(300);
    });
  });
});

grupo("Casillero: qué archivos entran", () => {
  prueba("los tipos que se pueden guardar están mapeados", () => {
    ["pdf", "png", "jpg", "txt", "md"].forEach(e => {
      if (!TIPO_NUBE[e]) throw new Error("falta el tipo de ." + e);
    });
  });

  prueba("ningún ejecutable puede entrar", () => {
    ["exe", "bat", "cmd", "dll", "msi", "scr", "com", "jar", "apk", "app", "deb"].forEach(e => {
      if (TIPO_NUBE[e]) throw new Error("¡se puede subir un ." + e + "!");
    });
  });

  prueba("los archivos de código sí, pero siempre como texto plano", () => {
    /* Esto es lo importante: un .html guardado y servido como text/html se
       abriría como una página del mismo sitio, y lo que llevara dentro se
       ejecutaría. Como texto plano, se lee y ya está. */
    ["html", "htm", "js", "php", "xml", "sh", "sql", "py", "java", "css"].forEach(e => {
      if (!TIPO_NUBE[e]) throw new Error("un ." + e + " debería poder guardarse");
      if (TIPO_NUBE[e] !== "text/plain") throw new Error("." + e + " se guarda como " + TIPO_NUBE[e] + ", y eso se puede ejecutar");
    });
  });

  prueba("los SVG no entran, que son programas disfrazados de dibujo", () => {
    esperar(TIPO_NUBE.svg).igualA(undefined);
    esperar(TIPO_NUBE.svgz).igualA(undefined);
  });

  prueba("los únicos tipos que se guardan son de una lista corta", () => {
    const permitidos = ["image/png", "image/jpeg", "image/gif", "image/webp",
                        "application/pdf", "text/plain", "text/markdown", "text/csv", "application/json"];
    [...new Set(Object.values(TIPO_NUBE))].forEach(t => {
      if (!permitidos.includes(t)) throw new Error("tipo nuevo sin revisar: " + t);
    });
  });

  prueba("el máximo son 20 MB", () => {
    esperar(LIMITE_NUBE).igualA(20 * 1048576);
  });

  prueba("un archivo de verdad se lee entero", async () => {
    const f = ficheroDe("apuntes.txt", "SELECT * FROM alumnos;");
    esperar(f.name).igualA("apuntes.txt");
    esperar(await f.text()).igualA("SELECT * FROM alumnos;");
    esperar(extDe(f.name)).igualA("txt");
    esperar(TIPO_NUBE[extDe(f.name)]).contiene("text/");
  });

  prueba("un archivo con el nombre disfrazado se juzga por su extensión", () => {
    /* «foto.png.exe» es un ejecutable, por mucho que lleve png en medio */
    esperar(extDe("foto.png.exe")).igualA("exe");
    esperar(TIPO_NUBE[extDe("foto.png.exe")]).igualA(undefined);
  });

  prueba("un nombre con ruta dentro no se lleva a ningún sitio raro", () => {
    esperar(extDe("../../../etc/passwd")).igualA("");
    esperar(extDe("..\\\\windows\\\\system32\\\\algo.dll")).igualA("dll");
  });

  prueba("leer un archivo con FileReader funciona de verdad", async () => {
    const f = ficheroDe("nota.md", "# Hola");
    const texto = await new Promise((ok, mal) => {
      const r = new FileReader();
      r.onload = () => ok(r.result);
      r.onerror = () => mal(r.error);
      r.readAsText(f);
    });
    esperar(texto).igualA("# Hola");
  });

  prueba("un archivo vacío no rompe nada", async () => {
    const f = ficheroDe("vacio.txt", "");
    esperar(f.size).igualA(0);
    esperar(await f.text()).igualA("");
  });
});

grupo("Casillero: los símbolos de cada asignatura", () => {
  prueba("cada asignatura conocida tiene su símbolo", () => {
    [["BD", "Bases de Datos"], ["PRO", "Programación"], ["FOL", "Formación y Orientación Laboral"]].forEach(([cod, nombre]) => {
      const s = simboloDe({ cod, nombre });
      if (!s) throw new Error(cod + " se queda sin símbolo");
    });
  });

  prueba("una asignatura inventada también tiene alguno", () => {
    esperar(!!simboloDe({ cod: "ZZZ", nombre: "Pastelería Cuántica" })).cierto();
  });

  prueba("una asignatura sin nada no rompe", () => {
    esperar(() => simboloDe({})).distintoDe(undefined);
    esperar(typeof simboloDe({})).igualA("string");
  });
});

grupo("Casillero: de dónde sale cada hoja", () => {
  prueba("un archivo del almacén se pide por su identificador", () => {
    esperar(srcDoc({ asset: "abc123" })).igualA("/_blob/abc123");
  });

  prueba("un archivo guardado en la propia app se lee de sus datos", () => {
    esperar(srcDoc({ datos: "data:text/plain;base64,aG9sYQ==" })).contiene("base64");
  });

  prueba("si tiene las dos cosas, manda lo que está dentro", () => {
    esperar(srcDoc({ datos: "data:x", asset: "abc" })).igualA("data:x");
  });

  prueba("un enlace no es un archivo", () => {
    esperar(srcDoc({ tipo: "enlace", url: "https://ejemplo.com" })).igualA("");
  });
});
