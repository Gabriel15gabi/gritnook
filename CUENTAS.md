# Cuentas de usuario: qué falta para poder vender

Hoy la app guarda los datos de dos formas:

- **Dentro de Claude**, en la base de datos del propio enlace. Es cómoda y sincroniza entre dispositivos, pero es *una* base de datos por enlace: si dos personas abren el mismo enlace, comparten los datos. La plataforma todavía no deja identificar a cada persona que lo abre.
- **Fuera de Claude** (GitHub Pages, el archivo suelto), en el navegador. Cada navegador tiene lo suyo y no se sincroniza.

Para vender hace falta que cada usuario tenga su cuenta y sus datos, y eso pide un servicio de cuentas.

## La opción recomendada: Supabase

Tiene capa gratuita, cuentas con correo (enlace mágico, sin contraseñas) o con Google, y una base de datos con reglas por usuario.

**Lo que tienes que hacer tú** (unos 10 minutos, y tiene que ir a tu nombre):

1. Crear una cuenta en supabase.com y un proyecto nuevo (región: Europa).
2. En *Authentication → Providers*, dejar activado *Email* y, si quieres, *Google*.
3. En *Project Settings → API*, copiar la **Project URL** y la **anon public key**. La anon key es pública por diseño, no es un secreto; lo que protege los datos son las reglas del paso siguiente.

**Lo que hago yo después:**

1. Una tabla `documentos` (usuario, nombre del documento, datos en JSON, fecha) con una regla que solo deja leer y escribir a su dueño.
2. Una pantalla de entrada con «Entrar con tu correo».
3. Sustituir las llamadas a la base de datos de Claude por un adaptador que habla con Supabase, con sincronización en tiempo real. La app ya guarda todo por documentos (`ajustes`, `agenda`, `horas`, `perfil`…), así que el cambio es acotado.
4. Mover la IA del tutor a una función de servidor con tu clave de la API de Anthropic, para que funcione fuera de Claude. La clave se queda en el servidor y nunca llega al navegador.

## Lo que viene después de las cuentas

- **Cobrar**: Stripe, con un plan gratis limitado y uno de pago. Un webhook marca en Supabase quién ha pagado.
- **Costes**: Supabase es gratis hasta decenas de miles de usuarios activos; el coste real es la IA del tutor, que se paga por uso, y hay que meterlo en el precio.
- **Legal**: política de privacidad y aviso de cookies. Guardas notas y datos de estudiantes, algunos menores (ESO), así que hace falta el consentimiento de los padres para menores de 14 años.
