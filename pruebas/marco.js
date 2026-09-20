/* ════════════════════════════════════════════════════════════════════
   El banco de pruebas de GritNook, en 90 líneas y sin dependencias.

   Los tests no corren en Node con un DOM de mentira: corren dentro del
   navegador, en la propia app, cargada en un iframe. Así se prueban las
   funciones de verdad, con el Canvas de verdad y el localStorage de
   verdad, y lo que pasa el test es lo que va a pasar al usarla.

   Se escribe así:

     grupo("Notas", () => {
       prueba("una media ponderada normal", () => {
         esperar(calcModulo(m).media).cerca(7.5);
       });
     });
   ════════════════════════════════════════════════════════════════════ */

const __P = { grupos: [], actual: null };

function grupo(nombre, fn) {
  const g = { nombre, casos: [] };
  __P.grupos.push(g);
  __P.actual = g;
  try { fn(); } finally { __P.actual = null; }
}

function prueba(nombre, fn) {
  if (!__P.actual) throw new Error("prueba() fuera de un grupo(): " + nombre);
  __P.actual.casos.push({ nombre, fn });
}

/* los tests que aún no tocan, sin borrarlos */
prueba.pendiente = (nombre) => { __P.actual.casos.push({ nombre, pendiente: true }); };

/* Para lo que depende de algo de fuera —una librería que se baja de
   internet, una animación que el navegador congela—: si no se puede
   probar, se dice por qué, en vez de fallar y hacer ruido de más. */
class Saltado extends Error {}
function saltar(motivo) { throw new Saltado(motivo); }

class Fallo extends Error {}
const ver = v =>
  typeof v === "string" ? JSON.stringify(v)
  : v === undefined ? "undefined"
  : v === null ? "null"
  : typeof v === "object" ? JSON.stringify(v)
  : String(v);

function esperar(valor) {
  const mal = (qué, otro) => { throw new Fallo("esperaba " + qué + " " + ver(otro) + ", pero es " + ver(valor)); };
  return {
    igualA(otro) {
      const iguales = Object.is(valor, otro) ||
        (typeof valor === "object" && typeof otro === "object" && JSON.stringify(valor) === JSON.stringify(otro));
      if (!iguales) mal("que fuera", otro);
    },
    distintoDe(otro) { if (Object.is(valor, otro)) throw new Fallo("esperaba algo distinto de " + ver(otro)); },
    /* para decimales: 7.499999 y 7.5 son lo mismo */
    cerca(otro, tol = 0.005) {
      if (typeof valor !== "number" || Math.abs(valor - otro) > tol) mal("un número cerca de", otro);
    },
    cierto() { if (valor !== true) mal("que fuera", true); },
    falso() { if (valor !== false) mal("que fuera", false); },
    nulo() { if (valor !== null) mal("que fuera", null); },
    contiene(trozo) {
      const dentro = Array.isArray(valor) ? valor.includes(trozo) : String(valor).includes(trozo);
      if (!dentro) mal("que contuviera", trozo);
    },
    noContiene(trozo) {
      const dentro = Array.isArray(valor) ? valor.includes(trozo) : String(valor).includes(trozo);
      if (dentro) throw new Fallo("esperaba que NO contuviera " + ver(trozo) + ", y sí está en " + ver(valor));
    },
    entre(a, b) { if (!(valor >= a && valor <= b)) mal("un número entre " + a + " y", b); },
    /* esperar(() => algo()).falla() */
    falla() {
      let saltó = false;
      try { valor(); } catch (e) { saltó = true; }
      if (!saltó) throw new Fallo("esperaba que saltara un error, y no saltó");
    }
  };
}

/* Los tests tocan S. Esto lo devuelve como estaba, pase lo que pase,
   para que un test no le estropee el siguiente. */
function conEstado(fn) {
  const antes = JSON.parse(JSON.stringify(S));
  try { return fn(); } finally { S = JSON.parse(JSON.stringify(antes)); }
}

/* una asignatura de mentira, con lo mínimo para calcular */
function moduloDe(pesos, extra = {}) {
  return Object.assign({
    id: "m1", cod: "TEST", nombre: "De prueba", color: 0, horas: 100,
    faltas: 0, objetivo: 5, metaSemanal: 2,
    pesos: pesos.map((p, i) => ({ id: "p" + i, nombre: "Apartado " + i, peso: p[0], nota: p[1] }))
  }, extra);
}

async function __correrPruebas() {
  const res = { total: 0, ok: 0, pendientes: 0, fallos: [], grupos: [] };
  for (const g of __P.grupos) {
    const rg = { nombre: g.nombre, casos: [] };
    for (const c of g.casos) {
      res.total++;
      if (c.pendiente) { res.pendientes++; rg.casos.push({ nombre: c.nombre, estado: "pendiente" }); continue; }
      /* por dónde va, para poder ver dónde se queda colgado si se cuelga */
      window.__ENCURSO = g.nombre + " · " + c.nombre;
      try {
        await c.fn();
        res.ok++;
        rg.casos.push({ nombre: c.nombre, estado: "ok" });
      } catch (e) {
        if (e instanceof Saltado) { res.pendientes++; rg.casos.push({ nombre: c.nombre, estado: "pendiente", error: e.message }); continue; }
        const detalle = e instanceof Fallo ? e.message : (e && e.stack ? String(e.stack).split("\n").slice(0, 3).join(" · ") : String(e));
        res.fallos.push({ grupo: g.nombre, caso: c.nombre, error: detalle, roto: !(e instanceof Fallo) });
        rg.casos.push({ nombre: c.nombre, estado: "mal", error: detalle });
      }
    }
    res.grupos.push(rg);
  }
  return res;
}
