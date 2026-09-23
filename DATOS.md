# Qué datos guarda GritNook

Este documento es el inventario real de la aplicación, sacado del código. Sirve
de base para la política de privacidad y para el registro de tratamientos que
exige el Reglamento General de Protección de Datos. Se actualiza cada vez que
se añade algo que guarde información.

Última revisión: 23 de septiembre de 2026.

## En una frase

GritNook guarda **lo que el alumno escribe**: su curso, sus asignaturas, sus
notas, su agenda, sus apuntes y sus archivos. **No pide correo, ni teléfono, ni
dirección**, no tiene publicidad, no hay analítica y no hay cookies de terceros.

## 1. Datos que se guardan

| Qué | Detalle | Lo pone |
|---|---|---|
| Perfil | Nombre o apodo, etapa (ESO, Bachillerato, FP, universidad, oposición, idiomas), curso, ciclo o grado, modalidad, centro (opcional), si trabaja, horas de estudio a la semana, nota a la que apunta, qué le cuesta más y para qué estudia | El alumno, en la bienvenida |
| Asignaturas | Nombre, código, horas del curso, nota objetivo, meta semanal, color, apartados de evaluación con sus pesos y **sus notas**, y **faltas de asistencia** | El alumno |
| Agenda | Entregas y exámenes (título, asignatura, fecha, hora, estado, pasos y notas) y el horario de clases | El alumno o el tutor, si se le autoriza |
| Apuntes | Título, texto, formato, **dibujos**, etiquetas, asignatura, tipo de papel y de letra, fechas | El alumno |
| Casillero | Archivos subidos (fotos, PDF, textos y código), enlaces guardados, nombre, tamaño, tipo, fecha y una miniatura | El alumno |
| Repaso | Tarjetas de estudio (pregunta y respuesta), su caja y cuándo tocan | El alumno o el tutor |
| Progreso | Minutos estudiados por asignatura y día, racha de días y cómo han ido cambiando las notas | La app, al usar el cronómetro |
| Inglés | Vocabulario propio: palabra, traducción y cuándo toca repasarla | El alumno |
| Objetivos del día | Los objetivos y si están cumplidos | El alumno y la app |
| Tutor | **La conversación entera** con el profe, los archivos y capturas que se le pasen, los temas trabajados y los repasos que pone | El alumno |
| Ajustes | Tema claro u oscuro, preferencias de la libreta, minutos del cronómetro y cómo debe tratarle el tutor | El alumno |
| De la propia app | La fecha de la última copia de seguridad, qué avisos ya se han visto y los últimos 20 fallos que haya dado la app (con su mensaje y dónde pasó) | La app |
| Oposición (solo si opositas) | El temario (número, título y bloque de cada tema, sus vueltas con fecha, si está dominado, su dificultad, los minutos estudiados, tus notas y un enlace a la ley), las reglas del examen (fecha, preguntas, opciones, penalización, corte, minutos, preguntas de reserva y bolas si hay tema a desarrollar), el plan de vueltas, los simulacros (fecha, de qué, preguntas, aciertos, fallos, minutos y, si lo apuntas, de qué temas eran los fallos), el simulacro con reloj que esté en marcha (hora de inicio y de entrega) y la convocatoria (plazas, aspirantes, enlace a las bases, cortes de otros años, fin del plazo de solicitud y si ya la has presentado). Las tarjetas de repaso que crees desde un tema llevan apuntado de qué tema son | El opositor |

**No se guarda:** correo electrónico, contraseña, teléfono, dirección, fecha de
nacimiento, datos de pago, ubicación ni ningún identificador publicitario.

## 2. Dónde se guardan

| Sitio | Qué hay | Quién puede verlo |
|---|---|---|
| El navegador del alumno | Todo, en el almacenamiento local (claves `desk-daw:*`). La app le pide al navegador que no lo borre cuando ande justo de espacio | Solo quien use ese dispositivo |
| El almacén de Claude (solo si se abre desde ahí) | Los mismos datos, para sincronizar entre dispositivos, y los archivos del casillero | La cuenta de Claude del alumno; el proveedor es Anthropic (Estados Unidos) |
| GitHub Pages | **Nada.** Es una página estática: no hay servidor ni base de datos | Nadie |

## 3. Qué sale de la aplicación

- **Al usar el tutor** se envía a Anthropic, para poder responder: el nombre o
  apodo, el curso y las asignaturas, las notas y el riesgo de cada una, las
  entregas pendientes, los títulos de los apuntes, los últimos mensajes de la
  conversación y los archivos o capturas que se adjunten. Si opositas, además,
  el nombre de la oposición, las reglas y la fecha del examen (con las bolas y la
  probabilidad de que salga un tema preparado, si hay tema a desarrollar), cómo
  vas con las vueltas, los títulos de los temas que tocan hoy, se enfrían o
  llevas flojos, los resultados de los simulacros y, si lo has puesto, el plazo
  de la solicitud y si está presentada. **Las notas de cada tema, los enlaces que
  guardes, las horas por tema y de qué temas eran los fallos no se envían.**
- **Al descargar el temario, una copia o tus fechas para el calendario** se
  genera un archivo en tu dispositivo. No sale a ningún servidor.
- **Al contar un fallo** (Ajustes → Datos), si le das a enviar, se abre tu
  programa de correo con un mensaje ya escrito para el responsable: lo que tú
  cuentes más la versión, el navegador, el tamaño de pantalla, el idioma,
  cuántos apuntes y documentos tienes y los últimos fallos apuntados. **Ni tu
  nombre, ni tus notas, ni tus apuntes.** Lo ves entero antes de mandarlo.
- **Al pedirle a Claude** que resuma un apunte, saque tarjetas o prepare el plan
  de un examen se envía ese apunte o esos datos concretos.
- **Al abrir un PDF del casillero** se descarga la librería PDF.js desde cdnjs.
- **Nada más.** Las letras y los iconos viajan dentro de la propia aplicación,
  así que usarla no envía la dirección IP a Google ni a nadie.

## 4. Cuánto tiempo y cómo se borra

- Los datos se quedan mientras el alumno los quiera.
- **Descargar una copia**: Ajustes → Datos → Descargar copia (un archivo JSON con todo).
- **Borrar un apunte o un documento**: desde su propia pantalla, con confirmación.
- **Borrar todo**: Ajustes → Datos → Borrar todo. Borra lo del dispositivo, lo
  sincronizado y los archivos subidos.

## 5. Pendiente para cuando se venda

- [x] Edad mínima de 14 años y aviso a menores de 18, al entrar.
- [x] Interruptor para apagar el tutor (no enviar nada a la IA), en Ajustes → El profe.
- [ ] Cuentas propias: al cambiar el almacén de Claude por uno propio, este
      documento cambia entero (proveedor, país, contratos y seguridad).
- [ ] Contrato de encargado de tratamiento con el proveedor de IA y con el del servidor.
- [ ] Registro de actividades de tratamiento y evaluación de impacto (hay datos de menores).
- [ ] Canal para ejercer derechos (acceso, rectificación, supresión, portabilidad y oposición).
