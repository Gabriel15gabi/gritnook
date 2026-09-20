# Las pruebas

```bash
node pruebas/correr.js
```

Eso levanta un servidor, abre un navegador sin ventana y escribe el resultado en
la consola. Devuelve 1 si algo falla, que es lo que mira un servidor de
integración continua.

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

## Lo que han encontrado

Tres fallos de verdad, el primer día:

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

Y un test estaba mal, no la app: daba por aprobado un 8 en el 60 % cuando todavía
hace falta medio punto más en lo que queda.

## Lo que falta por probar

- [ ] La libreta: dibujar, deshacer, rehacer, la goma que corta el trazo.
- [ ] El casillero: subir archivos, las vistas previas, borrar.
- [ ] El cronómetro y el registro de horas.
- [ ] El repaso espaciado: que las tarjetas vuelvan cuando toca.
- [ ] La sincronización, cuando haya backend.
