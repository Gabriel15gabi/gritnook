# El backend de GritNook

Aquí está lo que convierte GritNook en una aplicación full stack: cuentas de
usuario, base de datos PostgreSQL y almacenamiento de archivos.

- [esquema.sql](esquema.sql) — las tablas, los índices y las reglas de seguridad.
- Proveedor: **Supabase**. Capa gratuita, PostgreSQL de verdad.

Hasta que esto esté montado, la app sigue funcionando como hasta ahora: cada
navegador guarda lo suyo y, dentro de Claude, se sincroniza por ahí.

## Lo que tienes que hacer tú (10 minutos)

Tiene que ir a tu nombre, así que estos pasos no los puede dar nadie por ti.

1. Entra en **supabase.com** y crea una cuenta.
2. **New project**. Nombre: `gritnook`.
3. **Región: `eu-central-1` (Frankfurt)** o cualquier otra europea. Esto no es
   un detalle: si eliges Estados Unidos, los datos de estudio de menores salen
   de Europa y hay que rehacer la política de privacidad y firmar más papeles.
   Una vez creado el proyecto **la región no se puede cambiar**.
4. Guarda la contraseña de la base de datos que te dé. No la vas a usar desde la
   app, pero es la única forma de entrar por la puerta de atrás.
5. Ve a **SQL Editor → New query**, pega entero [esquema.sql](esquema.sql) y
   pulsa *Run*. Debería decir «Success. No rows returned».
6. **Authentication → Providers**: deja activado *Email*. Dentro, quita
   *Confirm email* solo si quieres probar rápido; para publicar, déjalo puesto.
7. **Project Settings → API**: copia estas dos cosas y pásamelas:
   - **Project URL** (algo como `https://xxxxx.supabase.co`)
   - **anon public** key

La clave `anon` es **pública por diseño**: va dentro de la app y cualquiera
puede verla. No es un secreto y no pasa nada. Lo que protege los datos son las
reglas de seguridad del esquema, que hacen que PostgreSQL solo devuelva las
filas de quien pregunta.

La otra clave, la **`service_role`**, esa sí es secreta: salta todas las reglas.
No me la mandes y no la pongas nunca en el navegador.

## Lo que hago yo después

1. Cambiar la capa de guardado de la app. Ahora mismo `guardar()` escribe en
   `localStorage` y, si hay Claude, sincroniza por ahí. Pasa a haber tres modos:
   sin cuenta (como hoy), dentro de Claude (como hoy) y con cuenta de Supabase.
   **El resto de las 7.400 líneas no se toca.**
2. Una pantalla de entrada con «Entrar con tu correo», sin contraseñas: te llega
   un enlace, pulsas y estás dentro.
3. Subir lo que ya tengas guardado en el navegador a tu cuenta la primera vez,
   sin perder nada.
4. Los archivos del casillero al almacenamiento, con su carpeta por usuario.
5. Sincronización en vivo entre dispositivos.

## Lo que esto cambia, y no es poco

Hoy tú no guardas datos de nadie: todo vive en el dispositivo de cada uno. Con
backend pasas a ser **el que custodia los datos de estudio de gente menor de
edad en un servidor**. Eso trae obligaciones nuevas:

- [ ] Reescribir `PRIVACIDAD.md` y `DATOS.md` enteros: cambia quién guarda qué,
      dónde y con qué contrato.
- [ ] Firmar el contrato de encargado de tratamiento con Supabase (lo tienen
      preparado, se acepta desde el panel).
- [ ] Saber qué hacer si hay una brecha de seguridad: hay **72 horas** para
      avisar a la Agencia Española de Protección de Datos.
- [ ] Un botón de «bórrame la cuenta» que borre de verdad, también del servidor.
- [ ] Copias de seguridad: en el plan gratis no hay copias automáticas.

## Dos avisos del plan gratis

- **El proyecto se pausa a los 7 días sin actividad** y hay que despertarlo a
  mano desde el panel. Para un portfolio es un incordio: el día que lo abra un
  reclutador puede estar dormido. Entrar una vez por semana lo evita.
- Los límites: 500 MB de base de datos, 1 GB de archivos y 50.000 usuarios
  activos al mes. Para empezar sobra de largo.

## Por qué el esquema está así

**Claves primarias de texto, no UUID.** La app ya genera sus identificadores en
el navegador con `uid()`. Manteniéndolos, lo que la gente tenga guardado se
puede subir tal cual, sin renumerar nada.

**Tablas de verdad para lo relacional.** Asignaturas, apartados de nota,
entregas, exámenes, horas y tarjetas son tablas con sus claves ajenas. Borrar
una asignatura se lleva por delante sus apartados y sus horas sin que la app
tenga que acordarse (`on delete cascade`).

**`jsonb` solo donde toca.** Los trazos de un dibujo, el plan de un examen o los
pasos de una entrega son documentos: no se consultan por campos ni se cruzan con
nada. Meterlos en tablas sería complicarse sin ganar nada.

**Los archivos, fuera de la base de datos.** En `documentos` solo está la ficha
—nombre, tipo, tamaño y dónde está—; el archivo va al almacenamiento. Guardar
binarios en PostgreSQL se paga caro en espacio y en velocidad.

**La seguridad, en la base de datos y no en la app.** Row Level Security filtra
por usuario dentro de PostgreSQL. Aunque alguien copie la clave pública y
consulte a mano, solo recibe sus propias filas. Si la seguridad dependiera del
JavaScript, cualquiera con las herramientas de desarrollador se la saltaría.
