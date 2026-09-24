# Créditos

GritNook es código propio, con todos los derechos reservados (ver [LICENSE](LICENSE)). Usa estas piezas de terceros, todas con licencias libres que permiten el uso comercial:

| Qué | Dónde se usa | Licencia |
|---|---|---|
| [Phosphor Icons](https://phosphoricons.com) 2.1, estilo duotono | Iconos del menú (riel, barra del móvil y «Más») y símbolos de las libretas del casillero. Los dibujos van copiados dentro de `index.html`. | MIT |
| [Inter](https://rsms.me/inter/), de Rasmus Andersson | Tipografía de toda la app y trazos del logotipo. El archivo va dentro de la app, en `fuentes/`. | SIL Open Font License 1.1 |
| Caveat, Kalam, Patrick Hand y Shadows Into Light | Letras manuscritas de la hoja de apuntes. Van dentro de la app, en `fuentes/`, y el navegador solo descarga la que elijas. | SIL Open Font License 1.1 |
| [PDF.js](https://mozilla.github.io/pdf.js/), de Mozilla, 3.11 | Miniaturas y visor de los PDF del casillero. Se carga de cdnjs solo al ver un PDF. | Apache 2.0 |
| [Open-Meteo](https://open-meteo.com) | El tiempo del Inicio, si pones tu ciudad. Los dibujos del tiempo son propios. La app enlaza a Open-Meteo en la propia tarjeta, como pide su licencia. Gratis mientras la app no sea de pago (ver [CUENTAS.md](CUENTAS.md)). | Datos: CC BY 4.0 |
| [opentype.js](https://opentype.js.org) | Solo para regenerar el logotipo (`marca/generar.js`). No va dentro de la app. | MIT |

El logotipo de GritNook (las anillas y el marcapáginas) es un diseño propio: no sale de ninguna librería de iconos.

## Phosphor Icons

```
MIT License

Copyright (c) 2023 Phosphor Icons

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

## Inter

Copyright 2016 The Inter Project Authors (https://github.com/rsms/inter).
This Font Software is licensed under the SIL Open Font License, Version 1.1 (https://openfontlicense.org).

## Nada sale fuera

Mientras usas GritNook no se pide nada a servidores ajenos: las letras y los iconos viajan dentro de la app. Lo único que se descarga de fuera es PDF.js, y solo al abrir un PDF del casillero.
