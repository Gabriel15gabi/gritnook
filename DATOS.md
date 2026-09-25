# Qué datos guarda GritNook

Este documento es el inventario real de la aplicación, sacado del código. Sirve
de base para la política de privacidad y para el registro de tratamientos que
exige el Reglamento General de Protección de Datos. Se actualiza cada vez que
se añade algo que guarde información.

Última revisión: 24 de septiembre de 2026.

## En una frase

GritNook guarda **lo que el alumno escribe**: su curso, sus asignaturas, sus
notas, su agenda, sus apuntes y sus archivos, en **su cuenta** (correo y
contraseña) y en su navegador. Del uso apunta **qué días entra** y **de dónde llegó**
al crear la cuenta, y cuenta **de forma anónima** cuántas veces se abre la app. **No pide
teléfono ni dirección**, no tiene publicidad, no hay analítica de terceros y no
hay cookies.

## 1. Datos que se guardan

| Qué | Detalle | Lo pone |
|---|---|---|
| Cuenta | Correo electrónico, contraseña (cifrada con un resumen que no se puede deshacer: no la ve nadie) y fecha de alta. La guarda Supabase. Si entra con Google o con GitHub, en vez de contraseña queda lo que manda ese servicio: el correo y, si los tiene, el nombre y la dirección de la foto de perfil de allí (la app no los usa para nada más). Durante la entrada con Google o GitHub, el navegador guarda unos minutos un código de un solo uso (PKCE) que se borra al volver Mientras dura la sesión, el navegador guarda un token para no pedir la contraseña cada vez: en el almacenamiento local o, si se desmarca «Mantener la sesión iniciada», solo mientras el navegador está abierto (`sessionStorage`) | El alumno, al crear la cuenta |
| Actividad | Los días que entra en la app y cuántas veces cada día (como mucho una cada media hora). Nada de lo que hace dentro | La app, al abrirla |
| De dónde llegó | Al crear la cuenta, una vez: de dónde venía el enlace (Instagram, WhatsApp, TikTok, directo…) y si era móvil, tableta u ordenador. Tabla `origenes` | La app, al crear la cuenta |
| Aperturas (anónimas) | Contadores por día y hora: de dónde llega el enlace, móvil, tableta u ordenador y si está instalada. **Sin cuenta, sin IP, sin identificador** y sin guardar nada en el dispositivo. Tabla `visitas`. No se cuenta si se apaga en Ajustes → Datos o si el navegador pide «no rastrear» | La app, al abrirse |
| Perfil | Nombre o apodo, **foto de perfil** (opcional: se recorta en el navegador a 256 × 256 px y se guarda como imagen dentro del perfil; solo entra webp, jpeg o png), etapa (ESO, Bachillerato, FP, universidad, oposición, idiomas), curso, ciclo o grado, modalidad, centro (opcional), si trabaja, horas de estudio a la semana, nota a la que apunta, qué le cuesta más y para qué estudia | El alumno, en la bienvenida |
| Asignaturas | Nombre, código, horas del curso, nota objetivo, meta semanal, color, apartados de evaluación con sus pesos y **sus notas**, y **faltas de asistencia** | El alumno |
| Agenda | Entregas y exámenes (título, asignatura, fecha, hora, estado, pasos y notas) y el horario de clases | El alumno o el tutor, si se le autoriza |
| Apuntes | Título, texto, formato, **dibujos**, etiquetas, asignatura, tipo de papel y de letra, fechas | El alumno |
| Casillero | Archivos subidos (fotos, PDF, textos y código), enlaces guardados, nombre, tamaño, tipo, fecha y una miniatura | El alumno |
| Repaso | Tarjetas de estudio (pregunta y respuesta), su caja y cuándo tocan | El alumno o el tutor |
| Progreso | Minutos estudiados por asignatura y día, racha de días y cómo han ido cambiando las notas | La app, al usar el cronómetro |
| Inglés | Vocabulario propio: palabra, traducción y cuándo toca repasarla | El alumno |
| Objetivos del día | Los objetivos y si están cumplidos | El alumno y la app |
| Tutor | **La conversación entera** con el profe, los archivos y capturas que se le pasen, los temas trabajados y los repasos que pone | El alumno |
| Ajustes | Tema claro u oscuro, preferencias de la libreta, minutos del cronómetro, cómo debe tratarle el tutor y, si lo has cambiado, cómo tienes colocado el Inicio (dónde va cada panel, su tamaño, cuáles se ven y en qué orden en el móvil) | El alumno |
| El tiempo (opcional) | La ciudad que eliges o tu ubicación redondeada a un decimal (unos 10 km), y la última previsión, guardada media hora. **Solo en el navegador** (`desk-daw:tiempo`), nunca en la cuenta; se borra al cerrar sesión o con «Quitar mi ciudad» | El alumno |
| De la propia app | La fecha de la última copia de seguridad, qué avisos ya se han visto y los últimos 20 fallos que haya dado la app (con su mensaje y dónde pasó) | La app |
| Oposición (solo si opositas) | El temario (número, título y bloque de cada tema, sus vueltas con fecha, si está dominado, su dificultad, los minutos estudiados, tus notas y un enlace a la ley), las reglas del examen (fecha, preguntas, opciones, penalización, corte, minutos, preguntas de reserva y bolas si hay tema a desarrollar), el plan de vueltas, los simulacros (fecha, de qué, preguntas, aciertos, fallos, minutos y, si lo apuntas, de qué temas eran los fallos), el simulacro con reloj que esté en marcha (hora de inicio y de entrega) y la convocatoria (plazas, aspirantes, enlace a las bases, cortes de otros años, fin del plazo de solicitud y si ya la has presentado). Las tarjetas de repaso que crees desde un tema llevan apuntado de qué tema son | El opositor |

**No se guarda:** teléfono, dirección, fecha de nacimiento, datos de pago,
ubicación ni ningún identificador publicitario.

## 2. Dónde se guardan

| Sitio | Qué hay | Quién puede verlo |
|---|---|---|
| La cuenta del alumno (Supabase, en Irlanda, UE) | Todo lo de arriba, en la tabla `documentos`: una fila por trozo (`escritorio/agenda`, `apuntes/<id>`, `casillero/<id>`…), con su dueño. La actividad, en `actividad` | El alumno, desde cualquier dispositivo. Nadie más: lo impide la base de datos (Row Level Security). Supabase es el encargado de tratamiento |
| El panel del creador | **Solo** el correo, la fecha de alta, la última vez que entró, los días que ha entrado en 7 y 30 días, qué estudia (etapa), de dónde llegó y cuánto ocupa; y las cifras de conjunto de las aperturas, la vuelta de la gente (retención) y qué estudian. **Nunca el contenido ni la foto** | El creador de la app (la tabla `administradores`, que nadie puede tocar desde la app) |
| El navegador del alumno | Todo, en el almacenamiento local (claves `desk-daw:*`), para que funcione sin conexión, y la lista de cambios por subir. La app le pide al navegador que no lo borre cuando ande justo de espacio. Al cerrar sesión se borra | Solo quien use ese dispositivo |
| El almacén de Claude (solo si se abre desde ahí, en lugar de la cuenta) | Los mismos datos, para sincronizar entre dispositivos, y los archivos del casillero | La cuenta de Claude del alumno; el proveedor es Anthropic (Estados Unidos) |
| GitHub Pages | **Nada.** Es una página estática: no hay servidor ni base de datos | Nadie |

## 3. Qué sale de la aplicación

- **A su cuenta** (Supabase, Irlanda) va todo lo que guarda, cifrado por el
  camino, y al abrir la app un «he entrado hoy», como mucho una vez cada media
  hora. Es lo que cuenta el panel del creador.
- **Al abrir la app**, con cuenta o sin ella, un «+1» anónimo (día, hora, de dónde
  llega el enlace, tipo de dispositivo e instalada o no) a Supabase. Si el enlace
  lleva `?ref=`, se lee y se quita de la barra de direcciones.
- **El profe con IA está apagado por ahora** (un interruptor en el código,
  `PROFE_ACTIVO`). Mientras lo esté, **no se envía nada a ninguna IA**, tampoco
  abriendo la app desde Claude, y no aparece en ninguna pantalla. Lo que sigue
  describe lo que se enviaría el día que se encienda.
- **Al usar el tutor** se envía a Anthropic, para poder responder: el nombre o
  apodo, el curso y las asignaturas, las notas y el riesgo de cada una, las
  entregas pendientes, los títulos de los apuntes, los últimos mensajes de la
  conversación y los archivos o capturas que se adjunten. Si opositas, además,
  el nombre de la oposición, las reglas y la fecha del examen (con las bolas y la
  probabilidad de que salga un tema preparado, si hay tema a desarrollar), cómo
  vas con las vueltas, los títulos de los temas que tocan hoy, se enfrían o
  llevas flojos, los resultados de los simulacros y, si lo has puesto, el plazo
  de la solicitud y si está presentada. **Las notas de cada tema, los enlaces que
  guardes, las horas por tema, de qué temas eran los fallos y la foto de perfil
  no se envían.**
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
- **Si pones tu ciudad para ver el tiempo**, se le pide la previsión a Open-Meteo
  (Suiza) con la zona redondeada a unos 10 km; al buscar la ciudad, se le manda
  el nombre que escribes. Dentro de Claude no se pide nada: allí no hay tiempo.
- **TutorIA y ChatClase** salen «Próximamente»: no envían ni guardan nada. El
  chat está hecho por dentro (`backend/chatclase.sql`); el día que se encienda,
  este inventario suma sus datos: apodo, mensajes, reacciones, archivos
  adjuntos, tareas compartidas y reportes.
- **Nada más.** Las letras y los iconos viajan dentro de la propia aplicación,
  así que usarla no envía la dirección IP a Google ni a nadie.

## 4. Cuánto tiempo y cómo se borra

- Los datos se quedan mientras el alumno los quiera.
- **Descargar una copia**: Ajustes → Datos → Descargar copia (un archivo JSON con todo).
- **Borrar un apunte o un documento**: desde su propia pantalla, con confirmación.
- **Borrar todo**: Ajustes → Datos → Borrar todo. Borra lo del dispositivo, lo
  de la cuenta y los archivos subidos. La cuenta sigue, vacía.
- **Borrar mi cuenta**: Ajustes → Datos → Borrar mi cuenta. Borra del servidor
  el usuario, su correo, su contraseña, todos sus documentos y su actividad
  (`on delete cascade`), y lo del navegador.
- **Cerrar sesión**: borra lo de ese navegador; lo suyo sigue en la cuenta.
- **Sin «Mantener la sesión iniciada»** (ordenadores compartidos): la sesión va en
  `sessionStorage` y se va al cerrar el navegador; al cerrar la pestaña se borra
  la copia local (salvo cambios sin subir, que se suben al volver) y, al abrir la
  app otra vez sin sesión, se borra todo lo de la persona anterior.

## 5. Pendiente para cuando se venda

- [x] Edad mínima de 14 años y aviso a menores de 18, al entrar.
- [x] Interruptor para apagar el tutor (no enviar nada a la IA), en Ajustes → El profe.
- [x] Cuentas propias (Supabase, Irlanda), con borrado de la cuenta de verdad.
- [ ] Contrato de encargado de tratamiento con el proveedor de IA y con Supabase (su DPA).
- [ ] Registro de actividades de tratamiento y evaluación de impacto (hay datos de menores).
- [x] Canal para ejercer derechos: casi todos desde la app (descargar copia,
      editar, borrar la cuenta) y el resto por el correo de contacto.
