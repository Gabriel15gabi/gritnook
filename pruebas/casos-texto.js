/* limpiarHtml() es lo que decide qué HTML entra en un apunte. Es la
   pieza con más riesgo de toda la app: por ahí pasa todo lo que se pega
   desde una web, y si deja colar un <script> o un onclick, quien abra
   ese apunte se come el código de otro. Por eso hay tantos tests. */

const soloTexto = h => limpiarHtml(h).replace(/<[^>]+>/g, "");

grupo("Apuntes: qué formato sobrevive", () => {
  prueba("negrita, cursiva, subrayado y tachado se quedan", () => {
    esperar(limpiarHtml("<b>negrita</b>")).contiene("<b>negrita</b>");
    esperar(limpiarHtml("<i>cursiva</i>")).contiene("<i>cursiva</i>");
    esperar(limpiarHtml("<u>subrayado</u>")).contiene("<u>subrayado</u>");
    esperar(limpiarHtml("<s>tachado</s>")).contiene("<s>tachado</s>");
  });

  prueba("las etiquetas viejas se traducen a las nuevas", () => {
    esperar(limpiarHtml("<strong>fuerte</strong>")).contiene("<b>fuerte</b>");
    esperar(limpiarHtml("<em>énfasis</em>")).contiene("<i>énfasis</i>");
  });

  prueba("el subrayador se queda solo si el color existe", () => {
    esperar(limpiarHtml('<mark data-m="amarillo">ojo</mark>')).contiene('data-m="amarillo"');
    esperar(limpiarHtml('<mark data-m="inventado">ojo</mark>')).noContiene("inventado");
  });

  prueba("el texto nunca se pierde, aunque se caiga su etiqueta", () => {
    esperar(soloTexto('<mark data-m="inventado">esto se lee igual</mark>')).contiene("esto se lee igual");
    esperar(soloTexto("<table><tr><td>de una tabla</td></tr></table>")).contiene("de una tabla");
  });
});

grupo("Apuntes: lo que hay que echar fuera", () => {
  prueba("un script no entra", () => {
    const r = limpiarHtml('<script>alert(1)<\/script>hola');
    esperar(r).noContiene("<script");
    esperar(r).noContiene("alert");
  });

  prueba("los manejadores de eventos tampoco", () => {
    const r = limpiarHtml('<b onclick="robar()">texto</b>');
    esperar(r).noContiene("onclick");
    esperar(r).noContiene("robar");
    esperar(r).contiene("texto");
  });

  prueba("una imagen con onerror es el truco más viejo del mundo", () => {
    const r = limpiarHtml('<img src=x onerror="alert(1)">');
    esperar(r).noContiene("onerror");
    esperar(r).noContiene("<img");
  });

  prueba("nada de iframes ni de objetos incrustados", () => {
    esperar(limpiarHtml('<iframe src="https://ejemplo.com"></iframe>')).noContiene("<iframe");
    esperar(limpiarHtml('<object data="x.swf"></object>')).noContiene("<object");
    esperar(limpiarHtml('<embed src="x">')).noContiene("<embed");
  });

  prueba("un enlace con javascript: dentro no entra", () => {
    const r = limpiarHtml('<a href="javascript:robar()">pincha</a>');
    esperar(r).noContiene("javascript:");
  });

  prueba("los estilos con expresiones raras se quedan fuera", () => {
    const r = limpiarHtml('<b style="background:url(javascript:alert(1))">x</b>');
    esperar(r).noContiene("javascript");
  });

  prueba("un svg con script dentro tampoco cuela", () => {
    /* dentro de un <svg> el nombre de la etiqueta llega en minúscula, así
       que la comprobación por tagName no lo veía y lo de dentro se colaba
       como texto en la hoja */
    const r = limpiarHtml('<svg><script>alert(1)<\/script></svg>');
    esperar(r).noContiene("alert");
  });

  prueba("ni un style dentro de un svg", () => {
    esperar(limpiarHtml('<svg><style>body{display:none}</style></svg>')).noContiene("display:none");
  });

  prueba("ni fórmulas de MathML ni trozos de formulario", () => {
    esperar(limpiarHtml('<math><mi>x</mi></math>')).noContiene("<math");
    esperar(limpiarHtml('<form><input value="x"><button>Enviar</button></form>')).noContiene("Enviar");
  });

  prueba("etiquetas mal cerradas no rompen el sanitizador", () => {
    esperar(() => limpiarHtml('<b><i>sin cerrar')).distintoDe(undefined);
    esperar(limpiarHtml("<b><i>sin cerrar")).contiene("sin cerrar");
  });

  prueba("aguanta HTML muy anidado sin quedarse colgado", () => {
    const hondo = "<b>".repeat(400) + "fondo" + "</b>".repeat(400);
    esperar(limpiarHtml(hondo)).contiene("fondo");
  });

  prueba("null y undefined no revientan", () => {
    esperar(limpiarHtml(null)).igualA("");
    esperar(limpiarHtml(undefined)).igualA("");
    esperar(limpiarHtml("")).igualA("");
  });
});

grupo("Apuntes: pasar la hoja a texto plano", () => {
  prueba("quita las etiquetas y deja lo que se lee", () => {
    esperar(htmlATexto("<b>Hola</b> mundo")).contiene("Hola");
    esperar(htmlATexto("<b>Hola</b> mundo")).noContiene("<b>");
  });

  prueba("cada bloque acaba en una línea nueva", () => {
    esperar(htmlATexto("<div>uno</div><div>dos</div>")).contiene("\n");
  });

  prueba("una hoja vacía da texto vacío", () => {
    esperar(htmlATexto("").trim()).igualA("");
  });
});

grupo("Escapar lo que se pinta", () => {
  prueba("esc() tapa los cinco caracteres peligrosos", () => {
    esperar(esc("<b>")).igualA("&lt;b&gt;");
    esperar(esc('"comillas"')).igualA("&quot;comillas&quot;");
    esperar(esc("O'Brien")).igualA("O&#39;Brien");
    esperar(esc("a & b")).igualA("a &amp; b");
  });

  prueba("esc() de null o undefined no escribe «null» en la pantalla", () => {
    esperar(esc(null)).igualA("");
    esperar(esc(undefined)).igualA("");
  });

  prueba("un nombre con script dentro se queda en texto", () => {
    /* alguien puede llamarse así en su perfil: tiene que verse, no ejecutarse */
    esperar(esc('<script>alert(1)<\/script>')).noContiene("<script>");
  });
});

grupo("Identificadores", () => {
  prueba("uid() no repite ni pidiendo cincuenta mil de golpe", () => {
    /* con cinco caracteres de azar esto fallaba: 60 millones de
       combinaciones no dan para tantas en el mismo milisegundo */
    const vistos = new Set();
    for (let i = 0; i < 50000; i++) vistos.add(uid());
    esperar(vistos.size).igualA(50000);
  });

  prueba("uid() no mete caracteres raros", () => {
    esperar(/^[a-z0-9]+$/.test(uid())).cierto();
  });

  prueba("el trozo de azar mide siempre lo mismo", () => {
    const largos = new Set();
    for (let i = 0; i < 2000; i++) largos.add(azar().length);
    esperar(largos.size).igualA(1);
    esperar(azar().length).igualA(8);
  });

  prueba("azar() usa las 36 letras y números, no cuatro", () => {
    const vistos = new Set();
    for (let i = 0; i < 400; i++) for (const c of azar()) vistos.add(c);
    esperar(vistos.size).entre(30, 36);
  });
});

grupo("Escribir horas", () => {
  prueba("minutos sueltos", () => { esperar(horasTxt(45)).igualA("45 min"); });
  prueba("horas justas", () => { esperar(horasTxt(120)).igualA("2 h"); });
  prueba("horas y minutos", () => { esperar(horasTxt(125)).igualA("2 h 5 min"); });
  prueba("cero", () => { esperar(horasTxt(0)).igualA("0 min"); });
});
