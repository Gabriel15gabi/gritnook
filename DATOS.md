# Qué datos guarda GritNook

Este documento es el inventario real de la aplicación, sacado del código. Sirve
de base para la política de privacidad y para el registro de tratamientos que
exige el Reglamento General de Protección de Datos. Se actualiza cada vez que
se añade algo que guarde información.

Última revisión: 20 de septiembre de 2026.

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

**No se guarda:** correo electrónico, contraseña, teléfono, dirección, fecha de
nacimiento, datos de pago, ubicación ni ningún identificador publicitario.

## 2. Dónde se guardan

| Sitio | Qué hay | Quién puede verlo |
|---|---|---|
| El navegador del alumno | Todo, en el almacenamiento local (claves `desk-daw:*`) | Solo quien use ese dispositivo |
| El almacén de Claude (solo si se abre desde ahí) | Los mismos datos, para sincronizar entre dispositivos, y los archivos del casillero | La cuenta de Claude del alumno; el proveedor es Anthropic (Estados Unidos) |
| GitHub Pages | **Nada.** Es una página estática: no hay servidor ni base de datos | Nadie |

## 3. Qué sale de la aplicación

- **Al usar el tutor** se envía a Anthropic, para poder responder: el nombre o
  apodo, el curso y las asignaturas, las notas y el riesgo de cada una, las
  entregas pendientes, los títulos de los apuntes, los últimos mensajes de la
  conversación y los archivos o capturas que se adjunten.
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

- [ ] Edad mínima de 14 años y permiso de padre o tutor para menores de 18.
- [ ] Interruptor para apagar el tutor (no enviar nada a la IA).
- [ ] Cuentas propias: al cambiar el almacén de Claude por uno propio, este
      documento cambia entero (proveedor, país, contratos y seguridad).
- [ ] Contrato de encargado de tratamiento con el proveedor de IA y con el del servidor.
- [ ] Registro de actividades de tratamiento y evaluación de impacto (hay datos de menores).
- [ ] Canal para ejercer derechos (acceso, rectificación, supresión, portabilidad y oposición).
