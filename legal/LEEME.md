# Los papeles de GritNook

Aquí están los cuatro documentos que necesita cualquier aplicación que se
publique en España. Están escritos a partir de lo que la app hace de verdad
([inventario de datos](../DATOS.md)), pero **no son un dictamen de abogado**:
antes de cobrar por la app conviene que un abogado los lea, sobre todo por ser
usuarios menores de edad.

| Documento | Para qué sirve | Lo exige |
|---|---|---|
| [AVISO-LEGAL.md](AVISO-LEGAL.md) | Decir quién está detrás de la web | Ley 34/2002 (LSSI), art. 10 |
| [PRIVACIDAD.md](PRIVACIDAD.md) | Decir qué se hace con los datos | RGPD, art. 13 |
| [TERMINOS.md](TERMINOS.md) | Las reglas del juego entre tú y quien la usa | Contrato y ley de consumidores |
| [IA.md](IA.md) | Avisar de que el profe es una máquina | Reglamento de IA (UE) 2024/1689, art. 50 |

Los `.md` de esta carpeta mandan. `generar.js` los convierte a HTML y los mete
dentro de la app, en Ajustes → Legal:

```
node legal/generar.js ruta/a/escritorio-daw.html
```

Después hay que volver a construir `index.html`. Lo que aún esté por decidir se
marca con `[RELLENAR: ...]` y se ve en amarillo dentro de la app, para que no se
publique sin querer.

## Titular

- **Nombre:** Gabriel Rodríguez Blanco
- **NIF:** 09215128V
- **Correo:** gabriel_gabiz@hotmail.com
- **En vigor desde:** 20 de septiembre de 2026

Ese correo es **público** y es el canal oficial: por ahí entran las peticiones
del RGPD y hay un mes para responderlas.

## El domicilio: por qué no está y cuándo hace falta

**Mientras la app sea gratis no hace falta publicar ninguna dirección postal.**

- El **RGPD** (art. 13) pide la identidad del responsable y un medio de contacto.
  Con nombre, NIF y correo está cubierto.
- La **LSSI** (art. 10) sí obliga a publicar el domicilio, pero se aplica a quien
  presta el servicio *con actividad económica*: cobrando, con publicidad o con
  patrocinio. Gratis y sin anuncios, no aplica.

**El día que se cobre, hace falta una dirección real.** No tiene por qué ser la
de casa:

| Opción | Precio aproximado | Sirve para |
|---|---|---|
| Oficina virtual o coworking con domiciliación | 20-50 €/mes | Lo normal para un autónomo. Dirección de calle, recogen el correo y vale también para Hacienda |
| Apartado de correos (Correos) | 50-80 €/año | Barato, pero es un apartado, no un domicilio: para la LSSI se queda corto |
| La dirección de la gestoría | Suele ir incluida | Si contratas una para las declaraciones, muchas la dan |

Cuando la tengas, se añade la línea `- **Domicilio:** …` al bloque de
`AVISO-LEGAL.md` y al punto 1 de `PRIVACIDAD.md`, se quita el párrafo que explica
por qué no está, y se vuelve a pasar `generar.js`.

## Lo que queda por rellenar

- **La dirección de la web**, en cuanto esté publicada (`AVISO-LEGAL.md`).
- **El domicilio**, el día que la app deje de ser gratis.
- **Las condiciones de pago** el día que se cobre: precio, renovación,
  cancelación y el desistimiento de 14 días (`TERMINOS.md`, punto 4).
- **El mecanismo exacto de transferencia de datos a Estados Unidos** y los plazos
  de conservación del proveedor de IA, al firmar el contrato de encargado de
  tratamiento (`PRIVACIDAD.md` punto 6 e `IA.md`).

## Lo que falta en la app para que esto sea verdad

- [x] Edad mínima de 14 años al entrar, y aviso a menores de 18.
- [x] Un interruptor para apagar el profe (no enviar nada a la IA).
- [x] Enlace a estos cuatro documentos desde Ajustes.
- [ ] Leer de verdad el correo de contacto: ahí llegan las peticiones del RGPD, y
      hay un mes para responderlas.

Quien ya tuviera la app antes del 20 de septiembre de 2026 no pasa por la puerta
de edad, porque no vuelve a ver la pantalla de entrada. Hoy no hay usuarios, así
que da igual; pero el día que se cambien los términos de verdad habrá que pedir la
aceptación otra vez dentro de la app.

## Cuándo hay que revisarlos otra vez

- Cuando se cobre por la app.
- Cuando los datos dejen de estar en Claude y pasen a un servidor propio.
- Cuando se añada cualquier cosa que guarde o envíe datos nuevos.
- Cuando cambie el proveedor de IA.
