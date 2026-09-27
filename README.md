# Del texto al género — Schaeffer

Presentación interactiva sobre «Del texto al género. Notas sobre la problemática genérica»,
de Jean-Marie Schaeffer. **21 estaciones** con desplazamiento horizontal, pensada para
proyectar en clase. Sin dependencias externas y utilizable sin conexión.

Cada estación es una **diapositiva completa de 1280 × 720** —la medida panorámica habitual—
que se escala en bloque para llenar la ventana: nada se desplaza ni se corta, y lo que se ve
en el portátil es exactamente lo que se proyecta.

## Abrir

En línea: **https://cifuac.github.io/schaeffer-del-texto-al-genero/**

Sin conexión: doble clic en **`index.html`**. Pulsa `f` para pantalla completa antes de empezar.

## Controles

| Tecla | Acción |
|---|---|
| `→` · `espacio` · `Av Pág` | Estación siguiente |
| `←` · `Re Pág` | Estación anterior |
| `Inicio` · `Fin` | Primera / última estación |
| `i` | Abrir el índice de estaciones |
| `f` | Pantalla completa |
| `t` | Tema claro / oscuro |
| `esc` | Cerrar el índice |

También se avanza con la rueda del ratón, deslizando el dedo en pantalla táctil, y con los
puntos y flechas de la barra inferior. La rueda siempre cambia de estación: ninguna necesita
desplazamiento interno.

Cada estación tiene su propia dirección: `index.html#p11` abre directamente la máquina del
tiempo. Sirve para enlazar una estación concreta.

## Las estaciones

**Portada** *(00)*

**§ 1 · El planteamiento** *(01)* — Cómo la pregunta «¿qué es un género?» se desdobla y acaba
descarrilando hacia una pregunta ontológica.

**§ 2 · La falsa disputa** *(02–03)* — Realismo, nominalismo y constructivismo, y los dos
postulados que los tres comparten.

**§ 3 · La demostración** *(04–06)* — El caso de la epopeya heroica germánica: un género que
la crítica del siglo XIX construyó y que textualmente no existe.

**§ 4 · Qué es un texto** *(07–08)* — Texto-organismo frente a cadena abierta; el circuito
comunicativo sin retroalimentación.

**§ 5 · La grieta de Genette** *(09–10)* — La rosa transtextual y el zócalo vacío de la
architextualidad; pertenencia frente a genericidad.

**§ 6 · El error de lógica temporal** *(11)* — El modelo genérico disponible para cada texto
frente al género fijado retrospectivamente.

**§ 7 · La distinción** *(12–13)* — Género y genericidad, con clasificador de diez
afirmaciones.

**§ 8 · Cómo funciona** *(14–15)* — Reduplicación y transformación; mesa de trabajo del
*Quijote*.

**§ 9 · El criterio** *(16)* — La copresencia de similitudes en niveles diferentes.

**§ 10 · El nivel de abstracción** *(17–18)* — Géneros frente a relaciones textuales posibles.

**Cierre** *(19–20)* — Mapa del argumento y glosario.

## Los aparatos

No son ilustraciones: ejecutan el argumento y, en varios casos, lo hacen fallar.

- **El desvío de la pregunta** *(01)* — cuatro pasos: la pregunta se reformula, se desdobla en
  (2a) y (2b), y se desvía hacia la pregunta ontológica (3).
- **La fábrica del género** *(05)* — el interruptor central de la presentación. Estado 1:
  rayos desde la cosmovisión postulada hasta cada obra, con la jerarquía por cantidad de
  espíritu germánico. Estado 2: apagado el postulado, se intenta trazar la red de similitudes
  entre los textos y no aparece. Estado 3: el género se traslada al siglo XIX, a su metatexto.
- **Objeto o cadena** *(07)* — el texto sellado con su lupa inmanente frente al eslabón con
  hilos transtextuales.
- **El circuito** *(08)* — la retroalimentación tachada en el texto, restituida en la
  conversación.
- **La rosa transtextual** *(09)* — las cuatro relaciones muestran su pareja; la
  architextualidad deja el zócalo vacío.
- **Las dos máquinas** *(10)* — el molde del modo de enunciación no se altera; el del género se
  deforma un poco más con cada texto que entra.
- **La máquina del tiempo** *(11)* — el cursor recorre la serie {a…g}; la casilla «proyectar G
  hacia atrás» marca en rojo el error de lógica temporal.
- **El clasificador** *(13)* — diez afirmaciones con corrección razonada.
- **El dial de los regímenes** *(14)* — de seis textos superpuestos a seis textos dispersos y
  deformados.
- **La mesa del *Quijote*** *(15)* — se eligen los niveles retomados; el veredicto distingue
  reduplicación, alusión y transformación.
- **La aguja de pertinencia** *(16)* — solo marca «pertinente» con copresencia de niveles.
- **El inventario** *(17)* — dos estantes: relaciones textuales posibles frente a géneros.

## Notas técnicas

- **Autónomo.** `index.html` carga únicamente archivos locales de `assets/`. No hay CDN,
  fuentes remotas ni peticiones de red.
- **Lienzo fijo.** Todo vive dentro de un marco de 1280 × 720 al que `lab.js` aplica
  `min(ancho/1280, alto/720)`. En una pantalla 16:9 la diapositiva llena el espacio; en otras
  proporciones se centra con bandas, como un proyector. En móvil vertical queda pequeña: se
  sugiere girar el dispositivo. La escala la vigila un `ResizeObserver`, porque el evento
  `resize` no siempre llega y una escala obsoleta recortaría la diapositiva.
- **Ninguna estación puede sobresalir.** El contenido está calculado para caber, pero el texto
  no siempre se pinta al tamaño pedido: un tamaño mínimo de fuente configurado en el navegador,
  una fuente ausente —fuera de macOS no hay Iowan Old Style ni Palatino— o un zoom de solo
  texto lo agrandan. Si una estación se pasa de su caja, `lab.js` la reduce lo justo para
  caber. En condiciones normales no interviene.
- **Color por estación.** Cada tramo del argumento tiene su acento cromático, que tiñe también
  las capas de fondo y la navegación. Los aparatos heredan ese color.
- **Tipografía.** Fuentes del sistema: Iowan Old Style o Palatino para el texto, SF Mono o
  Menlo para las etiquetas. En un Mac se ve como fue diseñada; en un PC cae a Georgia y a una
  monoespaciada genérica.
- **Temas.** Respeta la preferencia del sistema y permite alternar con `t`; la elección se
  recuerda.
- **Accesibilidad.** Las estaciones inactivas quedan fuera del árbol accesible, los aparatos
  funcionan con teclado y `prefers-reduced-motion` elimina las animaciones de fondo y de
  transición.
- **Impresión.** `⌘P` despliega las estaciones en vertical, una por página, con el fondo en
  blanco. Sirve para repartir el material en papel.

## Fuente

Schaeffer, Jean-Marie. «Del texto al género. Notas sobre la problemática genérica». En
Miguel Á. Garrido Gallardo (ed.), *Teoría de los géneros literarios*, Madrid, Arco/Libros,
1988, pp. 155–179. Traducción de Antonio Fernández Ferrer.
Original: «Du texte au genre. Notes sur la problématique générique», en *Poétique*, 53
(1983), pp. 3–18.

Las citas breves llevan su número de página, comprobado contra esa edición. Los diagramas, la
gradación visual y la notación de los aparatos son de esta presentación, no de Schaeffer:
sirven para hacer manipulable el argumento.

La gradación de «espíritu germánico» de la estación 05 reproduce cualitativamente lo que
Schaeffer atribuye a la crítica decimonónica —hegemónico en la *Canción de los nibelungos*,
debilitado en el *Poema de Kudrun*, casi sin huellas en *La muerte de Alphart*—. Las alturas
de las barras son un esquema visual, no un dato medido.

Los términos alemanes del original se conservan en cursiva con su equivalencia española al
lado, porque son terminología del argumento: buena parte de la demostración consiste,
precisamente, en que *das deutsche Heldenepos* es una acuñación de la *Germanistik*
decimonónica y no un género del siglo XIII.

### Sobre las citas y los PDF

Las estaciones citan pasajes breves con su número de página, como corresponde a un material
docente. **El PDF del artículo no debe añadirse a esta carpeta**: es una traducción bajo
copyright de Arco/Libros.
