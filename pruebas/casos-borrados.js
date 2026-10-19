/* Lo borrado no vuelve. Antes, al arrancar, la app subía a la cuenta todo
   apunte (o archivo de la Mochila) que tuviera este dispositivo y no la nube,
   así que la copia vieja de un móvil resucitaba lo que se había borrado en
   el ordenador. Ahora lo que este dispositivo ya había visto en la nube y ya
   no está se da por borrado; solo se sube lo que nunca llegó a subirse. */

const apunteDe = (id, titulo) => ({ id, titulo, cuerpo: titulo, html: "<div>" + titulo + "</div>", modId: "", etiquetas: [], creado: "2026-10-01", editado: "2026-10-01T10:00:00.000Z" });
const docDe = (id, titulo) => ({ id, titulo, tipo: "enlace", url: "https://example.org/" + id, modId: "", carpeta: "", creado: "2026-10-01T10:00:00.000Z" });

grupo("Borrados: lo borrado en otro dispositivo no vuelve", () => {
  prueba("un apunte borrado en el ordenador no lo resucita la copia vieja del móvil; lo nuevo de aquí sí se sube", async () => {
    await conNube(async srv => {
      srv.crear("ana@ejemplo.es");
      srv.escribir("ana@ejemplo.es", "apuntes/sigue", apunteDe("sigue", "Tema 1 inglés"));
      /* este dispositivo había visto «sigue» y «viejo» en la nube; «nuevo» lo escribió sin conexión y nunca se subió */
      S.apuntes = { sigue: apunteDe("sigue", "Tema 1 inglés"), viejo: apunteDe("viejo", "Borrado en el ordenador"), nuevo: apunteDe("nuevo", "Escrito sin red") };
      guardarLocal();
      guardaLS("nube-conocido", { "apuntes/sigue": "2026-10-01T10:00:00Z", "apuntes/viejo": "2026-10-01T10:00:00Z" });
      await entrarComo(srv, "ana@ejemplo.es");
      await hasta(() => srv.doc("ana@ejemplo.es", "apuntes/nuevo") !== undefined);
      esperar(srv.doc("ana@ejemplo.es", "apuntes/viejo")).igualA(undefined);
      esperar(!!S.apuntes.viejo).falso();
      esperar(!!S.apuntes.sigue).cierto();
      esperar(!!S.apuntes.nuevo).cierto();
    });
  });
  prueba("lo mismo con los archivos de la Mochila", async () => {
    await conNube(async srv => {
      srv.crear("ana@ejemplo.es");
      srv.escribir("ana@ejemplo.es", "casillero/d1", docDe("d1", "Sigue"));
      S.casillero = { d1: docDe("d1", "Sigue"), d2: docDe("d2", "Borrado en el ordenador"), d3: docDe("d3", "Guardado sin red") };
      guardarLocal();
      guardaLS("nube-conocido", { "casillero/d1": "2026-10-01T10:00:00Z", "casillero/d2": "2026-10-01T10:00:00Z" });
      await entrarComo(srv, "ana@ejemplo.es");
      await hasta(() => srv.doc("ana@ejemplo.es", "casillero/d3") !== undefined);
      esperar(srv.doc("ana@ejemplo.es", "casillero/d2")).igualA(undefined);
      esperar(!!S.casillero.d2).falso();
      esperar(!!S.casillero.d1).cierto();
    });
  });
  prueba("borrar un apunte lo quita de la cuenta, y al volver a entrar sigue sin estar", async () => {
    await conNube(async srv => {
      await entrarComo(srv, "ana@ejemplo.es");
      const n = apunteDe("tema2", "Tema 2"); S.apuntes.tema2 = n; guardarApunte(n);
      await hasta(() => srv.doc("ana@ejemplo.es", "apuntes/tema2") !== undefined);
      seccion = "apuntes"; pinta();
      const real = confirmar; confirmar = async () => true;
      try {
        const b = document.querySelector('[data-borrar-apunte="tema2"]');
        if (b) b.click(); else { delete S.apuntes.tema2; db.doc("apuntes/tema2").delete(); guardarLocal(); }
        await hasta(() => srv.doc("ana@ejemplo.es", "apuntes/tema2") === undefined);
      } finally { confirmar = real; }
      /* vuelve a entrar: la app arranca otra vez con lo que tenga guardado este dispositivo */
      await conectarNube(); await hasta(() => db.pendientes().length === 0);
      await dormir(200);
      esperar(srv.doc("ana@ejemplo.es", "apuntes/tema2")).igualA(undefined);
      esperar(!!S.apuntes.tema2).falso();
    });
  });
  prueba("un autoguardado que llega tarde no resucita un apunte recién borrado", async () => {
    await conNube(async srv => {
      await entrarComo(srv, "ana@ejemplo.es");
      const n = apunteDe("tarde", "Lo borro enseguida"); S.apuntes.tarde = n; guardarApunte(n);
      await hasta(() => srv.doc("ana@ejemplo.es", "apuntes/tarde") !== undefined);
      delete S.apuntes.tarde; db.doc("apuntes/tarde").delete(); guardarLocal();
      await hasta(() => srv.doc("ana@ejemplo.es", "apuntes/tarde") === undefined);
      guardarApunte(n);                                   /* el temporizador de 700 ms que salta tarde */
      await dormir(400);
      esperar(srv.doc("ana@ejemplo.es", "apuntes/tarde")).igualA(undefined);
    });
  });
});
