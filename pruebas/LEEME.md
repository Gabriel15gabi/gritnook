# Las pruebas

```bash
node pruebas/correr.js
```

Eso levanta un servidor, abre un navegador sin ventana y escribe el resultado en
la consola. Devuelve 1 si algo falla, que es lo que mira un servidor de
integración continua.

**527 pruebas.** Sin ventana pasan 521 y 6 se quedan en pendiente: son las que
dibujan un PDF, y sin tarjeta gráfica eso tarda demasiado. Abriendo
`pruebas/pruebas.html` en un navegador normal pasan las 527.

Para verlas con colores y poder pinchar en cada una, abre
`pruebas/pruebas.html` con la app servida (`node servidor.js` y luego
`localhost:4173/pruebas/pruebas.html`).

## Cómo están montadas

No usan Node con un DOM de mentira ni hace falta instalar nada. **Corren dentro
de la app de verdad**, cargada en un iframe:

1. `pruebas.html` carga `../index.html` en un iframe del mismo origen.
2. Espera a que la app esté montada.
3. Le pasa al iframe el marco y los casos con `eval` indirecto, que se ejecuta en
   el ámbito global de esa ventana.
4. Por eso un test puede llamar a `calcModulo()` o tocar `S` directamente, **sin
   exportar nada ni cambiar una línea de la app**.

Eso tiene una ventaja que no da ningún DOM simulado: se prueba el Canvas de
verdad, el `contenteditable` de verdad y el `localStorage` de verdad. Lo que pasa
el test es lo que va a pasar al usar la app.

Antes de empezar se guarda lo que haya en `localStorage` y al terminar se
devuelve, así que **probar no te borra tus apuntes**.

## Cómo se escribe una

```js
grupo("Notas: la media", () => {
  prueba("con todo puntuado, la media es la ponderada", () => {
    const c = calcModulo(moduloDe([[60, 8], [40, 5]]));
    esperar(c.media).cerca(6.8);
  });
});
```

Lo que hay:

| | |
|---|---|
| `esperar(x).igualA(y)` | iguales, comparando también objetos |
| `esperar(x).cerca(y)` | para decimales: 7,4999 y 7,5 son lo mismo |
| `esperar(x).cierto()` / `.falso()` / `.nulo()` | |
| `esperar(x).contiene(y)` / `.noContiene(y)` | en textos y en listas |
| `esperar(x).entre(a, b)` | |
| `esperar(() => f()).falla()` | que salte un error |
| `conEstado(fn)` | deja `S` como estaba, pase lo que pase |
| `moduloDe([[peso, nota], …])` | una asignatura de mentira |
| `prueba.pendiente("…")` | apuntada para luego, sin ejecutarse |

Los tests pueden ser `async`, y los de la entrada lo son, porque esperan a que se
repinte la pantalla.

## Qué se prueba

| Archivo | Qué mira |
|---|---|
| `casos-notas.js` | Medias ponderadas, qué nota necesitas en lo que queda, faltas, los estados que se enseñan |
| `casos-agenda.js` | Entender «examen de BD el jueves a las 10»: fechas, horas, tipo y asignatura. Y las cuentas de días, con años bisiestos y cambio de hora |
| `casos-texto.js` | El sanitizador de la libreta: qué formato entra y qué se echa fuera (scripts, `onclick`, iframes). Identificadores y escapado |
| `casos-estado.js` | Que un estado a medias o corrupto no tire la app abajo, las copias de seguridad y el reparto de horas |
| `casos-entrada.js` | La pantalla de bienvenida entera, con sus campos y sus clics |
| `casos-libreta.js` | Simplificar trazos, la goma que corta por donde pasa, el imán a la cuadrícula, deshacer y rehacer |
| `casos-tiempo.js` | Horas de estudio, la racha, los objetivos del día y el repaso espaciado de tarjetas y vocabulario |
| `casos-tutor.js` | **Qué se le manda al profe**: que el aviso de IA diga la verdad, y que lo que no está en la lista no salga |
| `casos-archivos.js` | Copias de seguridad de ida y vuelta, y qué archivos entran en el casillero y con qué tipo |
| `casos-dibujar.js` | Dibujar de verdad: eventos de puntero sobre el lienzo, el color, el grosor, la goma y el guardado |
| `casos-pdf.js` | Vistas previas: la primera página de un PDF de verdad, los extractos de textos y de código, y los dominios de los enlaces |
| `casos-agenda2.js` | El tablero por dentro: mover entre columnas, cambiar de día, convertir una entrega en examen |
| `casos-bola.js` | La bola de papel, con reloj falso: que aparezca, que caiga, que no se salga de la pantalla y que entre en la papelera |
| `casos-oposicion.js` | El modo opositor: penalizaciones, cuántas acertar para el corte, cuándo compensa arriesgar, pegar el índice en cualquier formato, vueltas, temas que se enfrían, el plan, lo que ya llevabas estudiado, el simulacro con reloj, las horas por tema, las bolas del tema a desarrollar, el plazo de la solicitud, el Excel del temario y lo que se le cuenta al profe |
| `casos-listo.js` | Dos pestañas abiertas a la vez, el archivo del calendario (.ics) con sus avisos y sus líneas de 75 octetos, el recordatorio de las copias y qué lleva —y qué no— el informe de fallos |
| `casos-inicio.js` | El Inicio en piezas: mil disposiciones al azar sin que nada quede encima de nada, arrastrar y estirar con eventos de puntero de verdad, el teclado, ocultar y volver a mostrar, el orden propio del móvil, medir el Inicio la primera vez y volver al original |
| `casos-absurdos.js` | **Datos irreales**: notas de 900, faltas negativas, fechas del año 9999, emojis, árabe, textos de diez mil letras, estados de versiones que no existieron |

## Rellenar la app para verla funcionando

```
localhost:4173/pruebas/demo.html
```

Una página con dos botones: **rellenar** la app con un curso de 1.º de DAW
inventado —siete asignaturas con sus notas, once entregas, tres exámenes, el
horario, diez semanas de horas, seis apuntes (uno con dibujos), el casillero,
catorce tarjetas, dieciocho palabras de inglés y una conversación con la profe—
y **devolver** lo que hubiera antes.

Guarda una copia de lo que tengas antes de tocar nada, así que se puede usar sin
miedo. Solo afecta a ese navegador: **abierta desde Claude, los datos falsos se
sincronizarían con la cuenta**, así que ahí mejor no.

Es también lo que genera las capturas del README.

## Datos irreales

`casos-absurdos.js` hace lo contrario que los demás: en vez de comprobar que la
app funciona cuando todo va bien, le mete lo peor que se le puede meter. Hay una
lista de basura —`undefined`, `NaN`, `Infinity`, listas donde van objetos, SQL,
`<script>`, emojis, árabe, japonés, diez mil letras— y se le pasa entera a cada
función que recibe algo de fuera.

No es paranoia: pasa de verdad. Se pega algo sin querer, se restaura una copia
de otra versión, se sincroniza a medias, o una entrega se queda sin fecha. Lo que
no puede pasar es que la pantalla se quede en blanco, y de ahí salió justo eso.

## Lo que han encontrado

Doce fallos de verdad (el último, probando a mano lo que ninguna prueba miraba):

1. **Escribir el ciclo a mano dejaba la app inservible.** Los campos escritos solo
   se leían al cambiar de paso, así que el botón «Seguir» no se encendía nunca y
   no se pasaba de la segunda pantalla. Y quien conseguía pasar se encontraba la
   pantalla de asignaturas vacía, porque el catálogo solo reconocía el nombre
   exacto: «DAW · Desarrollo de Aplicaciones Web» sí, «DAW» no.
2. **Identificadores repetidos.** `uid()` usaba cinco caracteres de azar: pidiendo
   cinco mil seguidos ya se repetía alguno, y dos apuntes con el mismo
   identificador son un apunte perdido.
3. **El sanitizador se saltaba un `<script>` dentro de un `<svg>`**, porque dentro
   de SVG el nombre de la etiqueta llega en minúscula y la comparación era con
   mayúsculas.
4. **Una fecha inválida dejaba la pantalla en blanco.** `hoyISO()` llamaba a
   `toISOString()` sobre una fecha imposible y saltaba un `RangeError`. Como eso
   se llama al pintar, bastaba una entrega sin fecha o una copia de seguridad a
   medias para tirar la sección entera. Ahora devuelve vacío.
5. **La lógica del repaso de inglés estaba dentro de un diálogo**, así que no
   había forma de probarla sin abrir la ventana y pulsar botones. Extraída a
   `responderPalabra()`, con los mismos días de siempre.
6. **El aviso de IA no decía la verdad.** Prometía una lista de lo que se envía
   y terminaba con «no se le manda nada que no esté en esa lista», pero el
   código mandaba además el contenido del apunte abierto, qué te cuesta más,
   para qué estudias, si trabajas, tu horario de clases, tus objetivos del día
   y tus repasos pendientes. Se arreglaron los papeles, no el código: todo eso
   le hace falta al profe. Ahora hay tests que fallan si alguien añade algo
   nuevo sin contarlo.
7. **El profe no se enteraba nunca de las faltas.** `faltasPct` es una
   proporción (0,93) y se comparaba con 70, así que harían falta setenta veces
   el máximo permitido para que se mencionaran. El cálculo del riesgo no se ha
   tocado: solo se leía mal el número ya calculado.
8. **En el plan de vueltas, el ritmo y lo que hacía falta iban en unidades
   distintas**: el ritmo por día natural y lo necesario por día de estudio, y se
   comparaban como si fueran lo mismo. Ahora los dos van por día de estudio.
9. **Quien iba justo a tiempo salía como que no llegaba.** Con 17 temas
   pendientes y 17 vueltas en dos semanas, 17 / (17 / 14) da
   14,000000000000002 días, y redondeando hacia arriba eran 15. Ahora se
   multiplica antes de dividir.
10. **Las ventanas arrastraban el `oninput` de la anterior.** `abrirDlg()`
    limpiaba los clics, los cambios y las teclas, pero no lo que se escribe.
    Después de abrir «Pegar el índice», escribir en cualquier otra ventana
    buscaba un cuadro de texto que ya no existía y saltaba un error.
11. **Cada vez que se leía la oposición, los temas se cambiaban por copias.**
    Con la ficha de un tema abierta, bastaba que algo repintara la pantalla —una
    sincronización desde el móvil— para que lo que apuntaras en la ficha se
    guardara en un objeto que ya no estaba en el estado, y se perdiera. Ahora se
    arregla en el sitio, sin copiar.
12. **Dos pestañas abiertas se pisaban los datos.** Todo se guarda en una sola
    clave, así que la última pestaña en guardar escribía encima de lo que
    hubiera hecho la otra: apuntabas una entrega en una, y desaparecía en
    cuanto la otra guardaba cualquier cosa. Se reprodujo con dos pestañas de
    verdad. Ahora cada pestaña escucha lo que guardan las demás y se pone al
    día, respetando el apunte que estés escribiendo en ese momento.

Y en la página de datos de prueba: si le dabas a rellenar dos veces, la segunda
copia de seguridad guardaba los datos falsos encima de los tuyos y «Devolver» te
devolvía los falsos. Ahora la copia solo se hace la primera vez.

Y cuatro tests estaban mal, no la app: uno daba por aprobado un 8 en el 60 %
cuando todavía hace falta medio punto más; tres se habían escrito contra una
forma inventada de los objetivos del día. Eso también es parte del trabajo:
cuando algo falla, lo primero es decidir quién se equivoca.

## Lo que falta por probar

- [x] La libreta: simplificar, la goma que corta, el imán, deshacer y rehacer.
- [x] El cronómetro y el registro de horas.
- [x] El repaso espaciado, de tarjetas y de vocabulario.
- [x] El casillero: objetos `File` de verdad, tipos permitidos, `FileReader`.
- [x] Dibujar de verdad: `PointerEvent` sobre el lienzo montado.
- [x] El tutor: qué se le manda exactamente en cada pregunta.
- [x] Las copias de seguridad, de ida y vuelta.
- [x] Las vistas previas de PDF, con un PDF escrito a mano en el propio test.
- [x] La agenda por dentro: columnas, fechas y cambiar de tipo.
- [x] La bola de papel, con un reloj falso para la física.
- [ ] La sincronización, cuando haya backend.
- [x] Arrastrar de verdad con el ratón en el tablero: **probado a mano por
  Gabriel el 21 de septiembre de 2026** y funciona, incluido el tachado al
  soltar la tarjeta en «hecho». Los tests cubren las funciones que mueven las
  tarjetas; el gesto en sí sigue sin automatizar, pero ya no es una incógnita.

## Dos cosas que aprendí montando esto

**El reloj del navegador sin ventana va virtual.** Adelanta en cuanto no queda
nada pendiente, así que un `setTimeout` de doce segundos salta al instante
aunque el trabajo esté a medias. Poner topes por caso no solo no protegía: los
hacía fallar. El único tope que sirve es el de la carga de una librería, porque
mientras la petición de red está en el aire el reloj virtual sí se para.

**La primera página de PDF que se dibuja tarda muchísimo** —PDF.js monta su
motor— y las siguientes van finas. En la app eso se nota la primera vez que
abres un PDF del casillero.
