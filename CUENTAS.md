# El plan: gratis primero

Decidido el 20 de septiembre de 2026.

GritNook se publica **gratis** en GitHub Pages. Sin cobrar, sin cuentas, sin
servidores y sin papeleo. Se mide cuánta gente la usa de verdad y, solo si sale
el número, se monta lo de cobrar.

## Por qué gratis

Las cuentas salen así, con la idea de venderla a 3-5 € de pago único:

| | |
|---|---|
| 200 ventas a 4 € | 800 € brutos |
| Comisión de la plataforma (5-10 %, más la parte fija) | −100 € |
| IVA | −140 € |
| IRPF | según tramo |
| **Neto** | **500-600 €** |

Y para cobrar esos 800 € hace falta: alta censal en Hacienda (036), **IVA
trimestral** (modelo 303) y su resumen anual, alta en el **ROI** y modelo 349 si
el dinero viene de Google Irlanda o de una pasarela extranjera, y la declaración
anual con esa actividad sumada a la nómina de la fábrica. Eso son unas 300-600 €
al año de gestoría, o hacerlo uno mismo cada trimestre para siempre.

**800 € brutos no pagan el follón de cobrarlos.**

## La pega que decide el modelo

Vender una vez y pagar la IA para siempre no cuadra. Cada mensaje del profe
cuesta unos 2 céntimos; un alumno que le eche 200 mensajes en un curso —que es
poco— se ha comido los 4 € que pagó. **El que más usa la app es el que más
dinero hace perder.**

Por eso la versión pública **no lleva profe**: las capacidades de IA y de
sincronización solo existen dentro de Claude, así que fuera de allí la app se
queda con lo que no cuesta nada de mantener. Y lo que queda es casi todo: notas,
qué falta para aprobar, faltas, agenda, apuntes, casillero, repaso y cronómetro,
guardado en el propio navegador. Hosting: 0 €. Mantenimiento: 0 €.

La app ya lo detecta sola y, cuando no hay Claude, se lo explica a quien entre
en vez de mandarle a un enlace que no tiene.

## La regla para cambiar de idea

Montar el papeleo cuando se vea que se pueden sacar **más de 2.000-3.000 € al
año**. Por debajo de eso, la gestoría se come la ganancia.

La forma de saberlo sin arriesgar nada es justo esta: publicarla gratis, ver
cuánta gente la usa y si alguien pregunta por pagar. Si en seis meses la usan 500
personas, hay respuesta. Si la usan 12, se ha ahorrado el lío.

## Antes de cobrar, mirar esto

- **El contrato de la fábrica.** Buscar «plena dedicación» o «exclusividad». Si
  está firmado (a veces va con un plus en la nómina), cobrar por otra actividad
  puede costar el plus. Compatibilizar es legal; esa cláusula es la excepción.
- **El domicilio.** En cuanto haya actividad económica hay que publicarlo, y
  Google Play además enseña la dirección del desarrollador en las apps de pago.
  Ahí hace falta una oficina virtual (20-30 €/mes), no la de casa. Las opciones
  están en [legal/LEEME.md](legal/LEEME.md).
- **Los cuatro documentos legales**, revisados por un abogado. 200-400 €, y con
  usuarios menores de edad merece la pena.

## Si algún día se cobra: por dónde

| Vía | Coste de entrada | Qué implica |
|---|---|---|
| Gumroad / Lemon Squeezy | 0 €, 5-10 % por venta | Se vende el archivo. Ellos facturan y liquidan el IVA de cada país. Se monta en una tarde |
| Google Play | 25 € una vez | Envolviendo la app para Android. Google cobra y liquida el IVA |
| Apple App Store | 99 €/año | Para más adelante, si alguna vez compensa |

Las tres son *merchant of record*: facturan ellas al cliente final, lo que quita
de encima el IVA europeo. El ingreso sigue habiendo que declararlo en España.

## El backend

Decidido el 20 de septiembre de 2026: GritNook pasa a ser full stack con
**Supabase** (PostgreSQL, cuentas y almacenamiento), manteniendo el frontend tal
como está. El esquema y los pasos están en [backend/](backend/LEEME.md).

Esto no cambia el plan de publicarla gratis: la capa gratuita de Supabase cuesta
0 €. Lo que sí cambia es la responsabilidad, porque pasas a guardar tú los datos
de otra gente. Está todo apuntado en [backend/LEEME.md](backend/LEEME.md).

## Y si hiciera falta el profe fuera de Claude

Solo tendría sentido con suscripción, nunca con pago único. Haría falta:

1. **Cuentas propias.** Supabase tiene capa gratuita, entrada con correo (enlace
   mágico, sin contraseñas) o con Google, y reglas por usuario. Una tabla
   `documentos` (usuario, nombre, datos en JSON, fecha) con una regla que solo
   deje leer y escribir a su dueño. La app ya guarda todo por documentos
   (`ajustes`, `agenda`, `horas`, `perfil`…), así que el cambio está acotado.
2. **La IA en el servidor**, con la clave de la API de Anthropic guardada allí y
   nunca en el navegador, más un límite de uso por alumno.
3. **Stripe** o la pasarela que sea, con un webhook que marque quién ha pagado.

Eso cambia entera la política de privacidad: cambia quién guarda los datos, en
qué país y con qué contrato. Habría que rehacer `legal/` y `DATOS.md`.

## Lo que hay que hacer ahora

- [x] Capturas nuevas para el README.
- [ ] `gh auth login` y subir el repositorio como `gritnook` (lo hace Gabriel).
- [ ] Activar GitHub Pages en *Settings → Pages*, rama `main`, carpeta raíz.
- [ ] Poner la dirección publicada en `legal/AVISO-LEGAL.md`, donde pone
      «dirección web», y volver a pasar `legal/generar.js`.
- [ ] Crear el proyecto de Supabase en región europea y pasar la URL y la clave
      `anon`: los pasos están en [backend/LEEME.md](backend/LEEME.md).
- [ ] La tarjeta de la app en el portfolio.
