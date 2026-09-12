# El Escritorio de DAW

App de estudio para 1.º de Desarrollo de Aplicaciones Web: apuntes en una libreta de cuadrícula donde se escribe **y se dibuja**, notas de cada módulo con lo que falta para aprobar, control de horas, entregas, documentos, inglés y un tutor que enseña dando pistas.

**[Probarla en vivo →](https://gabriel15gabi.github.io/escritorio-daw/)**

![El escritorio](capturas/escritorio.png)

## Por qué

Empezar un ciclo es llevar la cuenta de siete módulos a la vez: qué has sacado, cuánto necesitas en lo que queda, qué entregas se te echan encima, cuántas faltas te puedes permitir y dónde apuntaste aquello. Eso acaba repartido entre una libreta, el móvil y la memoria. Aquí está todo en un sitio, y los números los hace la app.

## Qué hace

**Módulos y notas.** Cada módulo con sus partes (exámenes, prácticas, actitud) y su peso. Calcula la media ponderada y, sobre todo, **qué nota necesitas en lo que queda** para llegar a tu objetivo. Avisa cuando ya no salen los números y lleva la cuenta de las faltas contra el máximo permitido.

**Apuntes en libreta de verdad.** Papel de cuadrícula con su margen rojo. Escribes con negrita y dibujas encima con bolígrafo, rotulador, subrayador y formas (línea, flecha, rectángulo, círculo), con imán a la cuadrícula. La goma **corta el trazo por donde pasa** en vez de borrarlo entero, como una goma de verdad. Deshacer y rehacer sin límite.

![La libreta](capturas/libreta.png)

**Horas y cronómetro.** Pomodoro por módulo, con el reparto de la semana y la meta semanal de cada uno.

**Entregas.** Fecha límite, cuánto pesa en la nota y aviso de las que vencen en tres días o menos.

**Casillero.** PDFs, imágenes y apuntes de clase guardados dentro de la propia app.

**Inglés.** Traductor a mano, vocabulario propio y repaso espaciado de las palabras que te tocan.

**Objetivos del día.** Se cumplen solos con lo que ya haces: estudiar con el cronómetro, tachar una entrega, escribir un apunte, repasar vocabulario. Con su racha de la semana.

**El profe.** Un tutor de DAW que no suelta la respuesta a la primera: pista, pregunta, ejemplo parecido y, si hace falta, la explicación entera. Sabe tus notas, tus entregas y de qué tienes apuntes —así distingue lo que ya has visto de lo que es nuevo—, te escribe él cuando algo se acerca y puede ponerte repasos, entregas y objetivos.

![El profe](capturas/profe.png)

## Cómo está hecho

Un solo archivo HTML de ~2.800 líneas. **Sin frameworks, sin dependencias, sin proceso de compilación**: HTML, CSS y JavaScript a pelo. Lo único que se descarga de fuera es la tipografía.

- **Dibujo vectorial sobre canvas.** Los trazos se guardan como puntos en un sistema de coordenadas propio, no como imagen: se redibujan nítidos a cualquier escala y ocupan poco. Suavizado con curvas cuadráticas, simplificación Ramer–Douglas–Peucker al soltar el trazo, dos capas de canvas con `mix-blend-mode: multiply` para que los rotuladores se superpongan como la tinta, y eventos de puntero con `getCoalescedEvents` para no perder resolución al dibujar rápido.
- **La goma que corta.** Cada trazo se remuestrea, se quitan los puntos que caen bajo la goma y cada tramo que sobrevive pasa a ser un trazo nuevo, conservando sus vértices originales. Las formas se convierten a su contorno para poder cortarlas igual.
- **Texto con formato mínimo.** El apunte se guarda dos veces: en HTML reducido (solo negrita y saltos) para mostrarlo y en texto plano para buscar y para la IA. Lo que se pega entra limpio, sin estilos de la web de origen.
- **Diseño monocromo.** Negro, blanco y grises; el estado se codifica con forma y peso, no con color. El verde aparece solo para lo cumplido. Claro y oscuro, siguiendo el sistema o a mano.
- **Accesible.** Contraste AA comprobado en ambos temas, navegación por teclado en todo el menú, roles ARIA y respeto a `prefers-reduced-motion`.

## Probarla en local

Descarga el repositorio y abre `index.html` con doble clic. Funciona sin servidor.

Si prefieres servirla:

```bash
node servidor.js
```

Y abre http://localhost:4173

## Dos versiones, una base

El mismo archivo corre en dos sitios con capacidades distintas:

| | GitHub Pages | Dentro de Claude |
|---|---|---|
| Apuntes, libreta, notas, horas, entregas | Sí | Sí |
| Dónde se guarda | En ese navegador | En tu cuenta, sincronizado entre dispositivos |
| Tutor, traductor, resumen de apuntes | No | Sí |

La versión pública es para verla y probarla. La de Claude usa sus capacidades de sincronización e IA, que solo existen cuando la página se abre desde allí; el código detecta si están disponibles y, si no, esconde lo que no puede funcionar en vez de fallar.

## Licencia

MIT — ver [LICENSE](LICENSE).
