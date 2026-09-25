/* La calculadora de aciertos netos de gritnook.com/calculadora-aciertos-netos/.
   Las mismas cuentas que la sección de oposición de la app (penalizacionDe,
   netaDe, nota10De, aciertosParaCorte y valorDeArriesgar), sin guardar nada. */
(() => {
  const $ = id => document.getElementById(id);
  const num = (v, d = 0) => { const n = parseFloat(String(v).trim().replace(",", ".")); return isFinite(n) ? n : d; };
  const clamp = (x, a, b) => Math.min(b, Math.max(a, x));
  const nota = n => (Math.round(n * 100) / 100).toLocaleString("es-ES", { maximumFractionDigits: 2 });
  const penDeOpciones = o => o >= 2 ? 1 / (o - 1) : 0;
  function textoPen(p) {
    if (!p) return "0";
    for (let k = 2; k <= 10; k++) if (Math.abs(p - 1 / k) < 1e-6) return "1/" + k;
    return nota(p);
  }
  /* «1/3», «0,33» o «0.25» */
  function leerPen(v) {
    const t = String(v).trim();
    const f = t.match(/^(\d+(?:[.,]\d+)?)\s*\/\s*(\d+(?:[.,]\d+)?)$/);
    if (f) { const b = num(f[2]); return b > 0 ? clamp(num(f[1]) / b, 0, 5) : 0; }
    return t === "" ? penDeOpciones(num($("cOpc").value, 4)) : clamp(num(t), 0, 5);
  }
  let penTocada = false;

  function aciertosParaCorte(preguntas, blancos, corte, pen) {
    const n = Math.round(preguntas), b = Math.round(blancos), p = Math.max(0, pen);
    if (!(n > 0) || b < 0 || b >= n) return { valido: false };
    const resp = n - b, a = Math.max(0, Math.ceil((corte + p * resp) / (1 + p) - 1e-9));
    if (a > resp) return { valido: true, imposible: true, respondidas: resp };
    return { valido: true, imposible: false, respondidas: resp, aciertos: a, fallos: resp - a, neta: a - (resp - a) * p };
  }
  const valorDeArriesgar = (opciones, descartadas, pen) => { const q = opciones - descartadas; if (q < 1) return 0; const p = 1 / q; return p - (1 - p) * Math.max(0, pen); };

  function calcular() {
    const n = clamp(Math.round(num($("cPreg").value, 0)), 0, 1000), o = Math.round(num($("cOpc").value, 4)), pen = leerPen($("cPen").value);
    /* tu nota */
    const a = Math.max(0, Math.round(num($("cAc").value))), f = Math.max(0, Math.round(num($("cFa").value)));
    const cuenta = $("rCuenta");
    if (!n) { cuenta.textContent = "Pon cuántas preguntas tiene el examen."; cuenta.className = "frase mal"; }
    else if (a + f > n) { cuenta.textContent = "Aciertos y fallos suman más que las preguntas."; cuenta.className = "frase mal"; }
    else {
      const neta = a - f * pen, n10 = clamp(neta / n * 10, 0, 10);
      $("rNeta").textContent = nota(neta); $("rNota").textContent = nota(n10); $("rBlanco").textContent = n - a - f;
      cuenta.className = "frase";
      cuenta.textContent = pen ? `${a} − ${f} × ${textoPen(pen)} = ${nota(neta)} aciertos netos.` : `Los fallos no restan: tus aciertos netos son tus ${a} aciertos.`;
    }
    /* el corte */
    const r = aciertosParaCorte(n, num($("cBlanco").value), num($("cCorte").value), pen), sal = $("rCorte");
    sal.className = "frase" + (!r.valido || r.imposible ? " mal" : "");
    sal.innerHTML = !r.valido ? "Las que dejas en blanco tienen que ser menos que el total de preguntas."
      : r.imposible ? `Dejando ${Math.round(num($("cBlanco").value))} en blanco <b>no llegas</b> ni acertando todas las ${r.respondidas}. Te toca arriesgar alguna más.`
      : `Necesitas <b>${r.aciertos} aciertos</b> de ${r.respondidas} contestadas (${r.fallos} fallos como mucho). Te quedarían ${nota(r.neta)} aciertos netos.`;
    /* arriesgar */
    const filas = [0, 1, 2].filter(k => k < o - 1).map(k => {
      const v = valorDeArriesgar(o, k, pen), cls = v > 0.001 ? "si" : v < -0.001 ? "no" : "";
      return `<div class="${cls}"><b>${k === 0 ? "Sin descartar ninguna" : "Descartando " + k}</b><span>${v > 0.001 ? "+" : ""}${nota(v)}</span><em>${v > 0.001 ? "Compensa contestar" : v < -0.001 ? "Mejor en blanco" : "Da igual: a la larga, cero"}</em></div>`;
    });
    $("rRiesgo").innerHTML = filas.join("");
  }

  $("cOpc").addEventListener("change", () => { if (!penTocada) $("cPen").value = textoPen(penDeOpciones(num($("cOpc").value, 4))); calcular(); });
  $("cPen").addEventListener("input", () => { penTocada = $("cPen").value.trim() !== ""; calcular(); });
  ["cPreg", "cAc", "cFa", "cCorte", "cBlanco"].forEach(id => $(id).addEventListener("input", calcular));
  calcular();
})();
