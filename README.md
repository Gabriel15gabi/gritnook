# El Escritorio

App de estudio que se acomoda a lo que estudies: le dices si vas a la ESO, a Bachillerato, a un ciclo de FP, a la universidad, a una oposición o a un idioma, y monta tus asignaturas, tus horas y un tutor que sabe de lo tuyo. Con apuntes en libreta de cuadrícula donde se escribe **y se dibuja**, notas de cada asignatura con lo que falta para aprobar, control de horas, entregas, documentos e inglés.

**[Probarla en vivo →](https://gabriel15gabi.github.io/escritorio-daw/)**

![El escritorio](capturas/escritorio.png)

## Por qué

Llevar un curso es llevar la cuenta de seis o siete asignaturas a la vez: qué has sacado, cuánto necesitas en lo que queda, qué entregas se te echan encima, cuántas faltas te puedes permitir y dónde apuntaste aquello. Eso acaba repartido entre una libreta, el móvil y la memoria. Aquí está todo en un sitio, y los números los hace la app.

## Se acomoda a ti

La primera vez no hay una app vacía esperando que la rellenes: hay siete pasos.

1. **Quién eres y qué estudias** — ESO, Bachillerato, grado medio, grado superior, universidad, oposiciones, idiomas u otra cosa.
2. **Tu curso** — el curso y la modalidad, el ciclo, el grado o la plaza.
3. **Tus asignaturas** — propuestas del catálogo (ESO y Bachillerato por modalidad, DAW, DAM, ASIR, Administración y Finanzas, Educación Infantil, SMR, Gestión Administrativa, Cuidados Auxiliares de Enfermería…) y, si abres la app desde Claude, la lista real de tu curso con un resumen del temario de cada una. Todo editable: quita, añade, renombra.
4. **Si trabajas** — y cuántas horas puedes estudiar de verdad a la semana. Las horas se reparten entre las asignaturas según su peso.
5. **Cómo te evalúan** — plantilla por etapa (colegio, FP, universidad, oposición, idiomas) y ajustable asignatura por asignatura.
6. **Cómo quieres que te trate el tutor** — tono, cuánta caña, cuántos mensajes al día y si puede ponerte cosas por su cuenta.
7. **Listo.**

Quien ya tenía datos no pasa por ahí: el perfil se rellena con lo que había y no se toca nada.

## Qué hace

**Asignaturas y notas.** Cada una con sus apartados y su peso. Calcula la media ponderada y, sobre todo, **qué nota necesitas en lo que queda** para llegar a tu objetivo. Avisa cuando ya no salen los números y lleva la cuenta de las faltas contra el máximo permitido. Cada asignatura tiene su color, y se cambia en Ajustes.

**Apuntes en libreta de verdad.** Papel de cuadrícula con su margen rojo. Escribes con negrita y dibujas encima con bolígrafo, rotulador, subrayador y formas (línea, flecha, rectángulo, círculo), con imán a la cuadrícula. La goma **corta el trazo por donde pasa** en vez de borrarlo entero, como una goma de verdad. Deshacer y rehacer sin límite.

![La libreta](capturas/libreta.png)

**Horas y cronómetro.** Pomodoro por asignatura que se queda a mano debajo del menú, en cualquier sección, para pararlo o seguir sin moverte. Al acabar la concentración te para con un «bien hecho» y el descanso lo empiezas tú. Con el reparto de la semana y la meta semanal de cada una.

**Entregas.** Fecha límite, cuánto pesa en la nota y aviso de las que vencen en tres días o menos.

**Casillero.** PDFs, imágenes y apuntes de clase guardados dentro de la propia app.

**Inglés.** Traductor a mano, vocabulario propio y repaso espaciado de las palabras que te tocan.

**Objetivos del día.** Se cumplen solos con lo que ya haces: estudiar con el cronómetro, tachar una entrega, escribir un apunte, repasar vocabulario. Con su racha de la semana.

**El tutor.** Un profesor particular de lo que estudies: no suelta la respuesta a la primera —pista, pregunta, ejemplo parecido y, si hace falta, la explicación entera—, conoce el temario de tus asignaturas, tus notas, tus entregas y de qué tienes apuntes, te escribe él cuando algo se acerca y puede ponerte repasos, entregas y objetivos. Se le pueden pasar capturas (pegadas con Ctrl+V o arrastradas) y archivos de código o texto para que los revise.

![El profe](capturas/profe.png)

**Ajustes.** Perfil, asignaturas con su color, plantilla de evaluación, cronómetro, el tutor, tema y copia de seguridad en JSON.

## Cómo está hecho

Un solo archivo HTML. **Sin frameworks, sin dependencias, sin proceso de compilación**: HTML, CSS y JavaScript a pelo. Lo único que se descarga de fuera es la tipografía.

- **Dibujo vectorial sobre canvas.** Los trazos se guardan como puntos, no como imagen: se redibujan nítidos a cualquier escala y ocupan poco. Suavizado con curvas cuadráticas, simplificación Ramer–Douglas–Peucker al soltar el trazo, dos capas de canvas con `mix-blend-mode: multiply` para que los rotuladores se superpongan como la tinta, y eventos de puntero con `getCoalescedEvents` para no perder resolución al dibujar rápido.
- **La goma que corta.** Cada trazo se remuestrea, se quitan los puntos que caen bajo la goma y cada tramo que sobrevive pasa a ser un trazo nuevo, conservando sus vértices originales. Las formas se convierten a su contorno para poder cortarlas igual.
- **Texto con formato mínimo.** El apunte se guarda dos veces: en HTML reducido (solo negrita y saltos) para mostrarlo y en texto plano para buscar y para la IA. Lo que se pega entra limpio, sin estilos de la web de origen.
- **Sistema de diseño en tokens.** Rampas de neutros y de acento, el acento siempre como línea o borde, elevación de 1 px más oscuridad ambiental, y un color por asignatura validado: contraste mínimo de 3:1 contra la superficie y separación suficiente entre tonos vecinos también para quien no distingue rojos y verdes.
- **Accesible.** Contraste AA comprobado en los dos temas, navegación por teclado, roles ARIA y respeto a `prefers-reduced-motion`.

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
| Apuntes, libreta, notas, horas, entregas, ajustes | Sí | Sí |
| Dónde se guarda | En ese navegador | En tu cuenta, sincronizado entre dispositivos |
| Tutor, lista de asignaturas por IA, traductor | No | Sí |

La versión pública es para verla y probarla. La de Claude usa sus capacidades de sincronización e IA, que solo existen cuando la página se abre desde allí; el código detecta si están disponibles y, si no, esconde o explica lo que no puede funcionar en vez de fallar.

## Licencia

MIT — ver [LICENSE](LICENSE).
