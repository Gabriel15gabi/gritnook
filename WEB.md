# La web pública y Google

La app está en la raíz (`index.html`) y no cambia. Alrededor hay unas páginas
sueltas, rápidas y sin JavaScript de más, que son las que Google puede leer y
posicionar:

| Página | Para qué búsquedas |
|---|---|
| [/oposiciones/](https://gritnook.com/oposiciones/) | app para opositores, organizar el temario, vueltas, simulacros |
| [/estudiar-y-trabajar/](https://gritnook.com/estudiar-y-trabajar/) | estudiar y trabajar a la vez, plan de estudio con poco tiempo |
| [/privacidad/](https://gritnook.com/privacidad/), [/terminos/](https://gritnook.com/terminos/), [/ia/](https://gritnook.com/ia/) | los papeles (Google los pide para el login con Google) |
| [/aviso-legal/](https://gritnook.com/aviso-legal/) | público porque lo pide la ley, pero **fuera de Google** (`noindex`): lleva el NIF |

Además: `sitemap.xml` (el mapa que se le da a Google), `robots.txt`, `404.html`
y `web/og.png` (la foto que sale al compartir el enlace en WhatsApp, Instagram
o X). La cabecera de `index.html` lleva título, descripción, dirección canónica
y los datos estructurados (una app web gratis, de educación).

**Todo sale de [web/generar.js](web/generar.js)**: los textos de las páginas
están ahí y los papeles se leen de `legal/*.md`. Si cambias algo:

```
node web/generar.js
```

Las notas internas `[RELLENAR: …]` de los papeles no salen en la web pública.

## Lo que tienes que hacer tú: Google Search Console (10 minutos)

Sin esto Google acaba encontrando la web, pero tarda más y no ves nada.

1. Entra en **search.google.com/search-console** con tu cuenta de Google.
2. **Añadir propiedad → Dominio** → escribe `gritnook.com`.
3. Te da un registro **TXT**. Ve a donde compraste el dominio (la zona **DNS**),
   añade un registro TXT con ese valor en `@` y guarda. Vuelve y pulsa
   **Verificar** (a veces tarda unos minutos).
   - Si no te aclaras con el DNS: elige **Prefijo de URL** con
     `https://gritnook.com/` y el método **Etiqueta HTML**. Pásame esa etiqueta
     (es pública, no es una contraseña) y la pongo en la web.
4. **Sitemaps** → escribe `sitemap.xml` → **Enviar**.
5. **Inspección de URLs** → pega `https://gritnook.com/oposiciones/` →
   **Solicitar indexación**. Lo mismo con la raíz y con `/estudiar-y-trabajar/`.

Después, **Bing Webmaster Tools** (bing.com/webmasters): entra con la misma
cuenta y elige **Importar desde Google Search Console**. Bing alimenta también
a DuckDuckGo y a las búsquedas de algunos asistentes de IA.

**Qué esperar:** buscando «gritnook», en días o un par de semanas. Para
«app para opositores» o «estudiar y trabajar», meses: depende de que
la web tenga contenido útil y de que otras webs la enlacen (lo de abajo).
En Search Console verás qué buscan quienes llegan y en qué posición sales.

## Backlinks: que otras webs te enlacen

Un backlink es un enlace desde otra web hacia la tuya. Google los cuenta como
votos de confianza: pesan más si la web es buena y del mismo tema. **Nunca los
compres**: Google lo detecta y te hunde.

Por orden, lo que más rinde para empezar:

1. **GitHub.** En el repositorio: *About → Website* `https://gritnook.com` y
   *Topics* `study-planner`, `oposiciones`, `pwa`, `education`.
2. **Directorios de apps** (una ficha cada uno, 10 minutos): Product Hunt,
   AlternativeTo (como alternativa a Notion, StudySmarter o Todoist),
   SaaSHub, BetaList, Uneed.
3. **Comunidades de opositores y de FP** (Reddit, Telegram, foros): no pegar
   el enlace y salir corriendo. Contestar dudas de verdad y, cuando venga a
   cuento («¿cómo me organizo si trabajo?»), enlazar la página que toca.
4. **Academias y blogs de oposiciones.** Escríbeles ofreciendo GritNook gratis
   para sus alumnos: si les sirve, lo enlazan en sus recursos.
5. **Instagram y TikTok** no cuentan para Google (sus enlaces van marcados para
   que no), pero traen gente que luego te busca por el nombre, y eso sí cuenta.

### Textos para las fichas

- **Nombre:** GritNook
- **Frase:** El estudio que se adapta a tu vida.
- **Corta (160):** Organiza tu estudio alrededor de tu trabajo y tu tiempo
  libre: plan diario, notas, simulacros de oposición, apuntes y repaso. Gratis
  y sin anuncios.
- **Larga:** GritNook es una app de estudio gratis para opositores, estudiantes
  de FP, bachillerato y universidad. Le dices qué días puedes y cuántas horas
  tienes, y te reparte el estudio en esos huecos, aunque trabajes. Para
  opositores: el temario por vueltas, los temas que se enfrían, simulacros con
  aciertos netos y la nota de corte. Para el resto: notas, faltas, entregas,
  apuntes y tarjetas de repaso. Funciona en el móvil y en el ordenador, se
  instala sin tienda y guarda los datos en la Unión Europea.
- **Categorías:** Educación, Productividad.
- **Etiquetas:** oposiciones, estudiar, planificador de estudio, FP, pomodoro,
  flashcards, PWA.
- **Imagen:** `https://gritnook.com/web/og.png` (1200 × 630).
