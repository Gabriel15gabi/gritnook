# El backend de GritNook

Las cuentas: cada persona entra con su correo y su contraseña, lo suyo se
guarda en su cuenta y lo ve igual desde el móvil y desde el ordenador. Y tú,
como creador, tienes un **Panel** en el menú con cuántos están probando la
app, sus correos y cuánto la usan.

- [supabase.sql](supabase.sql) — la base de datos entera: tablas, reglas de
  seguridad y las funciones del panel. Es lo único que se pega en Supabase.
- [probar-sql.js](probar-sql.js) — lo prueba contra un Postgres de verdad (22
  comprobaciones: que nadie ve lo de otro, que el panel solo es tuyo, que
  borrar la cuenta lo borra todo…).
- [chatclase.sql](chatclase.sql) — **ChatClase**, para cuando se encienda (no hace
  falta para lanzar). Se pasa después de `supabase.sql`. Probado contra Postgres
  con [probar-chat.js](probar-chat.js) (22 comprobaciones).
- [borrador/](borrador/) — un diseño antiguo con una tabla por cosa. **No lo
  ejecutes**: choca con `supabase.sql`.
- Proveedor: **Supabase**, plan gratis. PostgreSQL de verdad.

Mientras la app no tenga puestos la dirección y la clave del proyecto, funciona
como siempre: sin cuentas, cada navegador con lo suyo, y dentro de Claude
sincronizada por Claude.

## Lo que tienes que hacer tú (15 minutos)

Va a tu nombre, así que estos pasos no los puede dar nadie por ti.

1. Entra en **supabase.com** y crea una cuenta.
2. **New project**. Nombre: `gritnook`.
3. **Región: una de la Unión Europea** (el de GritNook está en West EU, Irlanda).
   No es un detalle: fuera de Europa hay que rehacer la política de privacidad.
   **Luego no se puede cambiar.**
4. Guarda la contraseña de la base de datos que te pide. La app no la usa.
5. **SQL Editor → New query**: pega entero [supabase.sql](supabase.sql) y pulsa
   **Run**. Tiene que decir *Success*.
   - La última línea te hace administrador con `gabriel_gabiz@hotmail.com`. Si
     vas a entrar con otro correo, cámbialo ahí antes de darle a Run.
6. **Authentication → Sign In / Providers → Email**: activado, y **quita
   «Confirm email»**. Con el correo de serie Supabase solo manda unos pocos
   correos por hora, y si cada alta tuviera que confirmar, a la tercera
   persona ya no le llegaría.
7. **Authentication → URL Configuration**:
   - **Site URL**: `https://gritnook.com/`
   - **Redirect URLs**: añade esa misma, `https://www.gritnook.com/` y `http://localhost:4174/`
   Es adonde vuelve quien pide cambiar la contraseña.
8. **Project Settings → API Keys**: pásame estas dos cosas:
   - **Project URL** (algo como `https://xxxxx.supabase.co`)
   - la **Publishable key** (`sb_publishable_…`). En **Legacy API Keys**,
     **Disable JWT-based API keys**: así las claves antiguas (anon y
     service_role) dejan de servir y no hay ninguna secreta de más por ahí.
9. Cuando esté puesto, **crea tu cuenta en la app con el correo del paso 5**.
   En el menú te aparece **Panel**. A los demás no.
10. **Organization Settings → Legal Documents**: firma el acuerdo de
    tratamiento de datos (DPA) de Supabase. La política de privacidad lo da
    por hecho.

La clave **publishable** es **pública por diseño**: va dentro de la app y cualquiera
puede verla. Sola no abre nada: la base de datos solo le devuelve a cada uno
sus propias filas, y el panel solo al correo que está en `administradores`.

La otra, la **secreta** (`sb_secret_…`, o la antigua `service_role`), se salta
todas las reglas. **No se manda a nadie ni se pone nunca en la app.** Si alguna
vez se escapa, en **API Keys** se borra y se crea otra.

**Estado (24 de septiembre de 2026):** proyecto creado en West EU (Irlanda), SQL
pasado, sin confirmar el correo, dirección puesta y la app conectada con la clave
publishable. Probado de verdad con una cuenta de usar y tirar: alta, guardar,
leer, que sin cuenta no se ve nada, el panel cerrado a los demás y borrar la
cuenta.

## Recomendado antes de compartirla con mucha gente: tu propio correo

El correo de serie de Supabase **solo manda a direcciones de tu equipo** y
unos pocos por hora. Para lo del día a día da igual (sin confirmación, el alta
no manda nada), pero el correo de «he olvidado la contraseña» **no les
llegaría a los demás**. Se arregla con un servicio de correo gratis:

1. Crea una cuenta en **Resend** o **Brevo** (los dos tienen plan gratis).
2. Te dan unos datos SMTP (servidor, puerto, usuario y contraseña).
3. En Supabase: **Authentication → Emails → SMTP Settings** → actívalo y
   pégalos. Remitente: `GritNook`.

Mientras no lo hagas, si alguien olvida la contraseña: en **Authentication →
Users** puedes borrar su usuario y que se haga otra cuenta (perdería lo suyo,
salvo que tenga una copia de Ajustes → Datos).

## Lo que ves en el Panel, y lo que no

**Arriba:** quién está usando la app **ahora** (la última hora), las veces que
se abre hoy, en 7 y en 30 días (con cuenta o sin ella) y las cuentas.
**Debajo:** de visita a quedarse (aperturas → cuentas nuevas → activos), cuánta
gente **vuelve** otro día y a la semana, la gráfica de cada día, **de dónde
vienen** (Instagram, WhatsApp, TikTok, directo…), **con qué** entran (móvil u
ordenador, y cuántos la tienen instalada), **qué estudian** y **a qué hora** la
abren. Y la tabla de cuentas: correo, cuándo se apuntó, la última vez, días en 7 y
30, qué estudia, **por dónde llegó** y cuánto ocupa. Se puede bajar para Excel.
Mientras lo tienes abierto se pone al día solo cada minuto.

**Tus enlaces.** Para saber de dónde viene cada uno, comparte el enlace con su
etiqueta: en la bio de Instagram `…/gritnook/?ref=instagram`, por WhatsApp
`?ref=whatsapp`, en TikTok `?ref=tiktok`. El panel te los da listos para copiar.

Las aperturas son anónimas: contadores por día y hora, sin cuenta, sin IP y sin
guardar nada en el móvil de nadie. Quien quiera, lo apaga en Ajustes → Datos.

**No** ves sus apuntes, notas, horarios ni nada de lo que escriben. La función
del panel no lo lee, y así lo dice la política de privacidad. Si algún día lo
necesitas para arreglar un fallo, se le pide a esa persona que te mande una
copia desde Ajustes → Datos.

## Lo que cambia para ti

Hasta ahora no guardabas datos de nadie. Con cuentas, **custodias los datos de
estudio de otras personas, algunas menores**. Eso trae obligaciones:

- [x] Política de privacidad y ficha de datos, reescritas para las cuentas.
- [x] Botón de «Borrar mi cuenta» que borra de verdad, también del servidor
      (Ajustes → Datos).
- [ ] Firmar el DPA de Supabase (paso 10).
- [ ] Si un día hay una brecha de seguridad: **72 horas** para avisar a la
      Agencia Española de Protección de Datos.
- [ ] El plan gratis **no hace copias automáticas**. De vez en cuando, en
      *SQL Editor*: `select * from documentos` → *Export → CSV*, y guárdalo en
      un sitio seguro (lleva los datos de todos: no lo compartas).

## Dos avisos del plan gratis

- **El proyecto se pausa a los 7 días sin que nadie entre.** Mientras haya
  gente probando no pasa; si un día se para, se despierta desde el panel de
  Supabase con un botón.
- Límites: 500 MB de base de datos y 50.000 usuarios al mes. El Panel te
  enseña cuánto llevas gastado de los 500 MB.

## Cómo funciona por dentro

**Una tabla, `documentos`.** La app ya guardaba sus datos en trozos con nombre
(`escritorio/agenda`, `apuntes/<id>`, `casillero/<id>`…) para la nube de
Claude. Con cuentas, cada trozo es una fila con su dueño. Así la app no ha
cambiado por dentro: habla con la cuenta igual que hablaba con Claude.

**La seguridad, en Postgres y no en la app.** Row Level Security: cada fila
solo la ven y la tocan su dueño. Aunque alguien copie la clave pública y
consulte a mano, no recibe nada de otro. Si dependiera del JavaScript,
cualquiera con las herramientas de desarrollador se la saltaría.

**El panel, con una función que decide quién eres.** `panel_admin()` mira tu
correo en la tabla `administradores`, que nadie puede leer ni escribir desde
la app. Si no estás, contesta «Solo el creador puede ver el panel».

**La actividad, sin espiar.** Al abrir la app se apunta «hoy he entrado»
(`latido()`, como mucho una vez cada media hora). Eso es todo lo que se mide.

**Sin conexión, sigue funcionando.** Lo que haces se guarda en el navegador y
se sube al volver la conexión; arriba lo pone («Sin conexión · se sube al
volver»).

**La hora la pone el servidor**, no el reloj del móvil, para que dos
dispositivos no se pisen por tener la hora mal.
