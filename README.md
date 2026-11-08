# GYM

App de gimnasio para PC y móvil.

## Archivos

- `index.html`: estructura de la aplicación.
- `styles.css`: estilos y diseño.
- `app.js`: interfaz, almacenamiento y flujo de la aplicación.
- `demo.js`: datos de ejemplo para probar el flujo de entrenamiento.
- `history.js`: cálculos de periodos, métricas y tendencias del historial.
- `profile.js`: vistas de Perfil, ejercicios usados y medidas corporales.
- `settings.js`: vista y acciones de configuración, cuenta y datos.
- `library.js`: navegación y tarjetas de rutinas y programas.
- `routine-views.js`: editores de programas y rutinas, y detalle de rutina.
- `exercise-list.js`: lista de ejercicios con estado de progresión y acceso a sus detalles.
- `catalog.js`: catálogo sugerido y etiquetas de ejercicios, músculos, equipo y medidas.
- `engine.js`: reglas de progresión, músculos y secuencia de programas.
- `backup.js`: migración y serialización de respaldos.
- `store.js`: operaciones de persistencia y reconciliación de datos de Firebase.
- `sw.js` y los iconos PNG: instalación offline como PWA.
- `engine.test.js`, `demo.test.js`, `history.test.js`, `profile.test.js`, `settings.test.js`, `library.test.js`, `routine-views.test.js` y `exercise-list.test.js`: pruebas del motor y módulos de interfaz.
- `firestore.rules.test.js` y `e2e/`: pruebas de reglas y del flujo en navegador.

Los archivos deben permanecer en la misma carpeta. Para probar la app,
abre esta carpeta en VS Code, instala la extensión Live Server y elige
**Open with Live Server** sobre `index.html`.

Antes de guardar cambios en el motor, ejecuta `node --test` para comprobar sus
reglas de progresión.

Para ejecutar también las pruebas de Firebase y navegador, instala Node.js 20 o
posterior y Java 21, ejecuta `npm ci` y después `npm test`. Las pruebas de
Firestore usan el Emulator en un proyecto de prueba aislado y no acceden a
cuentas ni datos reales. Las pruebas de navegador abren la app en Chromium con
sincronización remota desactivada e incluyen completar un entreno, recuperar un
borrador tras recargar, verificar la recomendación y crear/abrir una rutina. En
la primera ejecución, Playwright puede instalar Chromium con
`npx playwright install chromium`.

El catálogo sugerido incluye 100 ejercicios con equipo y músculos principales y
secundarios asignados. Los ejercicios personalizados y sus asignaciones se
conservan de forma independiente; ampliar el catálogo no modifica entrenamientos
ni ejercicios ya guardados.

La pestaña **Hoy** muestra el resumen de la semana y el entreno más reciente,
con accesos a tus rutinas y a los ejercicios que puedes retomar. La semana del
resumen va del lunes al día actual e ignora sesiones fechadas en el futuro.
La tarjeta del último entreno conserva un resumen breve de ejercicios, series y
repeticiones; al desplegarla muestra peso, reps, RIR/RPE y el objetivo de
progresión por ejercicio. La recomendación se mantiene breve; **Ver motivo**
despliega el último resultado y la razón del objetivo. Durante el entrenamiento,
el mismo detalle muestra las series registradas hoy y cómo influyen en la
siguiente sugerencia. En **Biblioteca → Programas**, puedes definir la secuencia
con las flechas y activar un programa; **Hoy** sugiere la primera
rutina o la que sigue al último entreno registrado dentro de ese programa.
También puedes elegir una rutina individual como activa desde su detalle; al
hacerlo, se desactiva el programa anterior. Los entrenos nuevos conservan el
programa y la rutina con que se iniciaron, y los registros antiguos no se
reasignan automáticamente. Desde **Hoy → Cambiar plan o elegir otro día**
puedes cambiar o desactivar el plan y empezar cualquier rutina de la secuencia;
el siguiente objetivo seguirá el último día que realmente completaste.

En **Yo → Resumen → Objetivos**, las metas de peso en un ejercicio, entrenos
totales y entrenos de los últimos 7 días se actualizan con tus datos. Los
objetivos personalizados requieren una unidad y permiten actualizar el
progreso manualmente; cada tarjeta muestra cuánto falta o si ya alcanzaste la
meta. «Últimos 7 días» incluye hoy y los seis días anteriores.

Si Firebase no responde al iniciar, la app conserva los datos locales y cambia
al guardado en este navegador en vez de habilitar una sincronización que no está
lista. Cuando vuelva la conexión, usa **Sincronizar ahora** en Ajustes; espera
el aviso de confirmación antes de cerrar o recargar la app. La sincronización
manual usa long-polling y deja de esperar cada escritura tras 15 segundos sin
respuesta; muestra qué parte no respondió y conserva los datos locales para que
puedas corregir la conexión y volver a intentarlo. Los entrenos nuevos se
escriben primero en el almacenamiento local; si la escritura remota falla, la
app avisa que quedaron guardados en este dispositivo. Al reconectar, compara
los IDs locales con los de la nube y sube los pendientes. Si el mismo entreno
existe en ambos lados, conserva la versión con `updatedAt` más reciente; una
copia local antigua no reemplaza una edición remota posterior. No restaura
entrenos antiguos que ya se habían sincronizado y luego borrado.
El perfil, los entrenos, el borrador y los respaldos locales están separados
por cuenta en este navegador. Los datos locales anteriores al inicio de sesión
se conservan en el espacio sin cuenta y no se suben automáticamente, para
evitar mezclar cuentas: cierra sesión, exporta un respaldo desde ese espacio y
luego impórtalo en la cuenta si quieres trasladarlos. Una duración CSV explícita
de `0` minutos se conserva; los 60 minutos se asignan solo cuando falta ese dato.

En **Ajustes → Recordatorio de entrenamiento** puedes activar un aviso dentro
de **Descanso y recordatorios** después de 2, 3, 5 o 7 días sin registrar un
entreno. Está apagado por defecto y se muestra al abrir **Hoy**; no es una
notificación del sistema y no llega mientras la app está cerrada. Puedes
posponerlo por el día.

**Ajustes** está organizado por categorías para encontrar cada control sin
mostrar todas las opciones a la vez: Entrenamiento, Descanso y recordatorios,
Calculadora de discos, Progresión, Objetivos, Cuenta y sincronización (cuando
Firebase está configurado) y Datos y respaldos. Dentro de cada categoría, usa
**‹ Ajustes** para volver al menú.

Durante un entreno puedes copiar una serie ya completada a la siguiente serie
vacía y avanzar entre todos los campos de los ejercicios con **Enter**; al
terminar el último campo, se cierra el teclado. En móvil, el teclado muestra la
opción **Siguiente**. El borrador se recupera al volver a abrir la app y el
estado de guardado aparece debajo del título. En **Historial** puedes buscar
por ejercicio, rutina o fecha y filtrar por 7, 30 o 90 días. El resumen del
periodo muestra entrenos, duración, volumen y series efectivas, comparados con
el intervalo anterior equivalente; la búsqueda se aplica a ambos intervalos.
La serie pendiente se resalta y, al terminarla, la app lleva el foco a la
siguiente; al completar todas las series de un ejercicio, lo pliega. Durante
la sesión puedes usar **Siguiente serie** para volver al bloque pendiente y
activar **Mantener pantalla activa** si el navegador y el dispositivo lo
permiten. La Biblioteca permite buscar rutinas y ejercicios por nombre, equipo
o grupo muscular. El Historial agrupa los entrenos por mes y permite desplegar
cada sesión para consultar sus series y acciones.
Desde un entrenamiento guardado puedes elegir **Guardar como rutina** para
crear una plantilla reutilizable con sus ejercicios, series normales,
aproximaciones y ajustes de progresión. Las series especiales no se convierten
en series de trabajo de la plantilla.

Para evitar registros accidentales extremos, las series aceptan hasta 1000 kg
(o su equivalente en lb) y 500 repeticiones. Los gráficos descartan valores no
finitos y limitan la cantidad de marcas del eje.

En **Historial**, usa **Editar fecha y duración** para corregir el día exacto
del entrenamiento y ajustar el tiempo registrado. Desde el mismo editor puedes
corregir el peso, las repeticiones, el esfuerzo y el tipo de las series. La
fecha corregida también actualiza el resumen de la semana. En el mismo editor puedes mover ejercicios arriba o abajo, añadirlos o reemplazarlos, quitar ejercicios y administrar las series individuales. En ejercicios con carga corporal, como dominadas sin peso añadido, usa `0` en el campo de peso; la serie se considera válida.
También puedes asignar manualmente un entrenamiento anterior a una rutina; si
esta pertenece a un programa, el entrenamiento quedará asociado a ambos y se
considerará para sugerir el siguiente día. Los entrenos antiguos permanecen sin
asociación hasta que los vincules explícitamente.

La **Biblioteca** organiza el contenido en **Programas**, **Rutinas** y
**Ejercicios**. Un programa agrupa rutinas; al crear o editar una rutina puedes
asignarla a un programa. Las rutinas que ya existían permanecen disponibles y
pueden seguir sin programa. Desde el detalle de una rutina puedes duplicarla,
editar la copia y guardarla como una nueva versión.

En **Hoy**, el resumen semanal también muestra las series efectivas equivalentes
por grupo muscular para la semana actual (lunes a hoy). La tendencia compara
esa ventana parcial con las mismas fechas de cada una de las cuatro semanas
anteriores; las semanas sin carga para un grupo cuentan como cero. Asigna un
músculo principal a cada ejercicio desde
**Biblioteca → Ejercicios**; los registros anteriores quedan como «Sin asignar»
hasta que lo clasifiques. Los ejercicios sugeridos tienen asignaciones iniciales
curadas; en ejercicios propios la app solo sugiere músculos secundarios cuando
reconoce el nombre y el músculo principal. Revisa y edita estas asignaciones en
cualquier momento; una configuración manual se conserva. Si no hay una
coincidencia clara, no se inventan músculos secundarios. Una serie de trabajo
cuenta como efectiva si se hizo a 4 RIR o menos, o si no se registró el RIR; las
aproximaciones no cuentan. En ejercicios unilaterales se cuenta una ronda cuando
están completos ambos lados. Las series directas cuentan completas y las
secundarias aportan 0,5 serie equivalente estimada; las porciones de un mismo
grupo no se duplican. Esta estimación no es el volumen de carga: carga × reps se
muestra por separado.

En **Yo → Resumen** puedes consultar la carga reciente por músculo y registrar
opcionalmente cómo lo sientes hoy: recuperado, algo cansado o muy fatigado. La
carga estimada suma series efectivas de los últimos 7 días, pondera las
contribuciones indirectas al 50 %, ajusta suavemente por esfuerzo registrado y
reduce progresivamente el peso de sesiones más antiguas. La carga y la autoevaluación se muestran
por separado; son referencias personales, no una medición fisiológica, consejo
médico ni una indicación para evitar entrenar. La app conserva la última
autoevaluación por grupo muscular en el perfil y la sincroniza con los demás
datos. La carga se presenta como baja (menos de 1,5 series equivalentes),
moderada (desde 1,5 y menos de 4) o alta (4 o más). Si no hay series efectivas
recientes asignadas al músculo, se indica que no hay carga reciente o datos
suficientes; esto no significa que el músculo esté recuperado.

En las reglas del ejercicio o de cada elemento de una rutina puedes ajustar
**Peso disponible cada** en la unidad elegida. La app redondea las recomendaciones de subida
hacia el siguiente peso disponible y las de bajada hacia uno disponible menor
o igual. Por ejemplo, un salto progresivo de 2 kg desde 26 kg con mancuernas
disponibles cada 2 kg propone 28 kg. Los datos y reglas existentes se
conservan; si no configuras este valor, se usa el salto de progresión actual.

En **Ajustes** puedes elegir si la app muestra y acepta cargas en kg o lb.
Los pesos se siguen guardando internamente en kg para conservar la
compatibilidad con entrenamientos, respaldos, rutinas y sincronización; cambiar
la unidad solo modifica la presentación y la conversión de las nuevas entradas.
El CSV exportado conserva la columna `peso_kg`; al importar, se aceptan también
las columnas explícitas `peso_lb` y `weight_lb`, que se convierten a kg.

En **Ajustes → Perfiles de discos reutilizables** puedes crear hasta veinte
listas de discos compartibles y asignarlas a varios equipos. Si editas el perfil,
el cambio se refleja en todos los equipos vinculados. También puedes conservar
una lista propia para cada equipo o convertir una lista existente en un perfil.
No se registran cantidades de discos físicos. En **Barras y máquinas cargables**
puedes crear hasta diez equipos para la calculadora. Durante el entrenamiento,
cada ejercicio tiene un acceso directo que abre la calculadora en un panel
inferior sin salir de la sesión; toma como objetivo el peso escrito para la
siguiente serie o, si aún no lo hay, el recomendado para el ejercicio. El panel
muestra el reparto visual de discos, queda por encima de la navegación y
desplaza el resultado a la vista al calcular. Puedes elegir una serie, preparar
una combinación exacta o aproximada y confirmar antes de aplicar el peso; si la
serie es unilateral, lo aplica a ambos lados. Los atajos suman el peso del par
de discos para una barra y el peso de un disco por brazo en una máquina
independiente. La vista del entreno también resume duración, carga × reps y
avance de series, con un tema oscuro de alto contraste.
En cada equipo puedes escribir una categoría propia —por ejemplo, prensa,
polea o máquina de hip thrust— para identificarlo en los ajustes y en la
calculadora. Esa categoría es descriptiva; no cambia el cálculo. Configura
también la mecánica de carga, el peso base y cada disco disponible por lado,
en la unidad elegida; repite un valor si hay más discos iguales por lado.
Para una barra, el objetivo es el peso total e incluye la
barra sin discos. Para una máquina de brazos independientes, el objetivo es
por brazo y la app también muestra el total de ambos; no divide el peso entre
los brazos. No se suponen pesos estándar: para habilitar el cálculo debes
indicar el peso base y al menos un disco por lado o brazo. El cálculo usa los
discos configurados, se guarda en kg y solo es una referencia: confirma la
carga real de la barra o máquina. En Ajustes puedes duplicar una configuración
como punto de partida; al duplicar un equipo vinculado, ambos siguen usando el
mismo perfil, mientras que los equipos con listas propias reciben una copia
independiente. Los
perfiles compartidos se guardan en los respaldos y se sincronizan con el perfil
de usuario. Al eliminar un perfil, sus discos se copian a los equipos que lo
usaban para conservar su configuración.

Las tarjetas de **Rutinas** resumen sus series planificadas, grupos musculares
asignados y fecha del último entreno con esa rutina. El detalle muestra además
la última fecha registrada y las series efectivas de cada ejercicio.

En **Ajustes → Valores anteriores al entrenar** puedes definir el alcance de
búsqueda: la última vez que hiciste el ejercicio en cualquier rutina
(predeterminado) o la última vez que lo hiciste dentro de la rutina actual.
Al añadir el ejercicio, sus series normales precargan peso, repeticiones y
esfuerzo de esa sesión; los valores siguen siendo editables y se muestra la
fecha de referencia. El cambio de preferencia no sobrescribe las series que ya
están en curso. En la tarjeta de Hoy también aparece un resumen de lo que
hiciste en la última sesión y del objetivo actual. Si ajustas el peso de la
primera serie, puedes copiarlo a las series posteriores cuyo peso no hayas
editado; las reps y el esfuerzo no cambian. En ejercicios unilaterales la copia
respeta cada lado por separado.

En **Biblioteca → Ejercicios**, configura para cada movimiento el **Equipo** y
el **Grupo muscular principal**, y marca sus **Ejercicios alternativos**.
Puedes filtrar esa lista por equipo y grupo muscular; los elementos ocultos
por el filtro se mantienen seleccionados. Durante el entrenamiento puedes
aplicar una alternativa filtrando de nuevo por esos criterios. Cada opción
muestra equipo, grupo y ejecución bilateral/unilateral. Si cambia el formato,
o ya hay valores precargados/anotados, la app pide confirmación antes de
limpiar ese bloque. El sustituto queda registrado con su propio nombre y no
cambia la rutina, salvo que al terminar elijas actualizarla.

Al completar una serie normal, la app compara peso, repeticiones y esfuerzo
con la serie equivalente anterior. La referencia incluye su fecha y rutina de
origen; el resumen indica si sumaste reps, cambió el peso o hiciste la serie
con más o menos esfuerzo. Si no se registró esfuerzo en alguna de las sesiones,
la comparación no inventa ese dato.

En **Hoy**, activa **Modo simple** para ampliar los campos y ocultar la ayuda y
los paneles secundarios durante el entrenamiento; **Vista completa** los
restaura. La app conserva esta preferencia en el navegador. Si quitas una serie
o un ejercicio por error, usa **Deshacer** en el aviso que aparece. También
puedes mover ejercicios arriba o abajo durante el entreno; el nuevo orden se
guarda en el borrador actual. El temporizador de descanso y los controles para
añadir o copiar series siguen disponibles en ambos modos.

## Tipos de serie

Durante un entrenamiento puedes elegir el tipo de cada serie:

- **Normal**: cuenta para las sugerencias de sobrecarga progresiva.
- **Aproximación**: queda guardada, pero no cuenta para progresar.
- **Back-off**, **Drop set** y **Rest-pause**: quedan guardadas y no cuentan
  para progresar. Registra cada bajada de peso o bloque de rest-pause como una
  fila aparte con su propio peso y repeticiones.

Al evaluar una subida, la app considera solo las series normales requeridas
por la configuración del ejercicio. Las series normales adicionales también
se guardan, pero no bloquean la progresión ni cambian el objetivo.

El volumen efectivo muscular puede incluir series normales, back-off, drop set
y rest-pause cuando se realizan a 4 RIR o menos (o no se anotó el RIR). Esto es
independiente de la progresión, que sigue considerando solo series normales.

Los entrenamientos anteriores siguen siendo compatibles: las series que se
guardaron como calentamiento se muestran como aproximaciones.

## Ejercicios unilaterales

En **Ejercicios** abre el ejercicio y cambia **Ejecución** a **Unilateral ·
ambos lados**. También puedes elegirlo al configurar un ejercicio de una
rutina. Cada ronda registra peso, repeticiones y esfuerzo por separado para el
lado derecho y el izquierdo; por ejemplo, 3 rondas son 3 series por lado, no 6
series objetivo.

La app cuenta una ronda efectiva cuando ambos lados tienen una serie normal
completa y recomienda aumentar el peso solo cuando los dos lados cumplen el
objetivo. En el historial cada ronda muestra ambos lados juntos.

## Temporizador y resumen

El temporizador comienza al añadir el primer ejercicio o al iniciar una rutina.
Sigue corriendo si recargas la página y se guarda la duración al terminar el
entreno. El resumen muestra duración, ejercicios, series efectivas, repeticiones
registradas, carga acumulada (kg·reps o lb·reps, sin aproximaciones), el detalle
de cada ejercicio y las sugerencias para la próxima sesión. La carga × reps sí
incluye las series normales, back-off, drop set y rest-pause.

## Descansos, récords y respaldos

En **Ajustes** puedes configurar el descanso de las series efectivas/back-off
(1 a 5 minutos) y el de aproximación (sin temporizador o 15 a 120 segundos).
Durante el entreno, completa el peso y las repeticiones y pulsa **Terminar
serie** para iniciar el descanso; en ejercicios unilaterales, el botón se activa
al completar ambos lados. Drop sets y rest-pause no inician descanso desde ese
botón. También puedes iniciarlo manualmente, sumar 30 segundos o detenerlo. El
contador sigue activo al recargar la página y se cancela al descartar o terminar
el entreno.

Al terminar una serie, la fila queda marcada con una verificación discreta. El
encabezado de cada ejercicio muestra el avance de series normales completadas
(por ejemplo, `2/3 series`); púlsalo para plegar o desplegar el ejercicio.
El estado plegado se conserva al recargar el entreno. Corregir los datos de una
serie durante el entreno no quita la marca de realizada. Si la marcaste por
error, pulsa **Hecha · deshacer**; esto cancela también el descanso activo si
pertenece a esa serie. Si quitas por error una serie o ejercicio durante el
descanso, **Deshacer** restaura la fila y el tiempo restante mientras ese
descanso siga vigente.

Al **editar un entrenamiento del historial**, las series guardadas aparecen
marcadas como hechas y el encabezado muestra el avance. Puedes plegar cada
ejercicio desde su encabezado. Si corriges una serie marcada, vuelve a quedar
pendiente hasta que pulses **Terminar serie**; esto solo actualiza el indicador
del editor y no inicia un descanso ni muestra un aviso flotante.

En **Ejercicios**, abre un ejercicio para ver sus récords de peso, repeticiones
por serie y mejor serie estimada, con la fecha de cada marca. Solo cuentan las
series normales.

En **Ajustes → Tus datos**, descarga un respaldo JSON e impórtalo cuando lo
necesites. La restauración reemplaza los datos existentes y pide confirmación
antes de hacerlo; usa un respaldo generado por Sobrecarga.

## Ajustes de rutina y aproximación

Al editar una rutina o los ajustes de un ejercicio durante el entreno puedes
definir por separado las series de trabajo y las de aproximación. Las
aproximaciones se agregan al principio y no cuentan para la progresión. Si
cambias la configuración de una rutina mientras entrenas con ella, al terminar
puedes guardar esos cambios en la rutina o terminar conservando la configuración
original.

Las aproximaciones pueden calcularse automáticamente desde el peso de la
primera serie de trabajo o anotarse manualmente. El modo automático propone
50 % para la primera serie y 80 % para la segunda; las siguientes usan 90 %,
95 % y aumentos graduales. Puedes ajustar el porcentaje de cada serie y el
incremento de redondeo por separado del salto de progresión. Los pesos se
redondean hacia abajo al múltiplo de ese incremento (por ejemplo, 80 % de
26 kg con incrementos de 2 kg resulta en 20 kg). Si todavía no registraste un
peso de trabajo, la aproximación queda vacía hasta que lo indiques.

## Fatiga, anomalías y accesibilidad

En la pantalla principal se muestra la carga semanal por músculo y se compara
con semanas anteriores; el RIR/RPE resume el esfuerzo registrado, no mide por
sí solo la fatiga. En **Yo → Resumen**, la carga reciente por músculo y la
autoevaluación opcional se presentan por separado.

La entrada de series verifica valores imposibles o saltos superiores al 50 %
del máximo histórico del ejercicio. Los avisos indican ejercicio, serie y
motivo para facilitar la corrección.

La interfaz incluye navegación por pestañas con teclado, enlace para saltar al
contenido, foco visible, estados de pestaña accesibles y movimiento del foco
al cambiar de sección.

## Perfil personal «Yo»

La sección **Yo** separa la información personal en tres áreas:

- **Resumen:** entrenamientos, volumen, duración, peso corporal, carga muscular reciente y autoevaluación de recuperación.
- **Ejercicios:** ejercicios realizados, ordenables por nombre, uso reciente, frecuencia o volumen histórico. Al abrir uno se muestra su detalle completo.
- **Medidas:** historial corporal de peso, altura, perímetros, fuerza de peso corporal opcional y porcentaje de grasa. Cada medición conserva fecha, valores y notas.

Las medidas se incluyen en perfiles, respaldos JSON y copias automáticas. Se
mantienen separadas de los entrenamientos para no mezclarlas con el historial de series.

## Carga corporal y músculos secundarios

En un ejercicio configurado como **Peso corporal + carga añadida**, el peso
registrado en cada serie se interpreta como carga extra. La carga efectiva usa
la medición corporal más cercana anterior a ese entreno; un valor de `0 kg`
representa peso corporal sin carga añadida.

El selector incluye un catálogo de ejercicios con equipo y músculos principales
y secundarios ya asignados. Puedes buscarlos por nombre o alias; al crear un
ejercicio con un alias reconocido, la app propone esos datos sin cambiar el
nombre que escribiste; la sugerencia aparece antes de confirmar la creación.
Para nombres reconocibles fuera del catálogo, también propone un músculo
principal y secundarios por palabras clave, sinónimos y variantes del nombre.
Estas asignaciones son sugerencias, no una clasificación infalible: revísalas
en **Biblioteca → Ejercicios**. Los nombres sin una coincidencia fiable quedan
sin asignar. El selector empieza por un grupo muscular y permite escoger una
porción específica en el apartado avanzado. En Hoy, el nombre de cada ejercicio
también muestra sus músculos asignados. Los ejercicios que ya estaban guardados
no se modifican: sus IDs, entrenos y ajustes personales se conservan. Puedes
editar las asignaciones cuando quieras y los cambios manuales se conservan.
Cada serie efectiva directa cuenta como 1 serie equivalente y cada
secundaria sugerida o elegida aporta 0,5; si dos porciones del mismo grupo
participan, no se duplica su aporte. Es una estimación orientativa, no una
medición fisiológica. La carga acumulada de peso × repeticiones se calcula aparte
y no usa estas equivalencias. El volumen efectivo sigue usando peso corporal
más carga añadida y no cuenta aproximaciones como volumen progresivo.

## Instalación y publicación móvil

La aplicación incluye un Service Worker y un manifiesto PWA. Para instalarla,
la publicación debe servirla por HTTPS; una dirección HTTP por IP local permite
probarla, pero normalmente no habilita la instalación completa.

Desde el repositorio se puede publicar en GitHub Pages mediante el flujo
`.github/workflows/pages.yml`. Activa **Settings → Pages → Build and deployment
→ GitHub Actions**. Cada actualización de la rama `main` desplegará una nueva
versión y, cuando haya una actualización offline disponible, la app mostrará
un aviso para instalarla.

Los datos locales siguen vinculados al navegador y origen usados. Antes de
cambiar de dirección, navegador o teléfono, descarga un respaldo JSON desde
**Ajustes → Tus datos**.

En **Ajustes → Tus datos** se muestran la fecha y cantidad de entrenos de la
copia automática local, además de cuándo se solicitó la última descarga JSON.
La copia automática solo existe en ese navegador. La app no puede confirmar que
el navegador haya guardado el archivo descargado; comprueba que esté en tu
dispositivo. Al restaurar una copia válida, se informa cuántos entrenos nuevos
se agregaron y se actualiza la copia automática.

## Sincronización con Firebase

La app puede sincronizar perfil, entrenamientos, rutinas, mediciones y el
entreno en curso mediante Firebase Authentication y Firestore. La
configuración pública ya está en `firebase-config.js`.

1. En Firebase Console abre **Authentication → Sign-in method** y habilita
   **Google**.
2. En **Authentication → Settings → Authorized domains** añade `localhost` y
   el dominio de GitHub Pages (por ejemplo, `usuario.github.io`).
3. Crea Firestore Database en modo producción.
4. Publica `firestore.rules` desde Firebase CLI con
   `firebase deploy --only firestore:rules`, o pega su contenido en Reglas de
   Firestore.
5. Abre Ajustes, pulsa **Continuar con Google** y autoriza la cuenta. Los datos
   locales se migran una sola vez cuando la cuenta remota está vacía. Los datos
   locales antiguos no se vuelven a mezclar automáticamente en una cuenta que
   ya tiene información; para agregar un respaldo, usa la restauración aditiva
   desde Ajustes.

Las reglas restringen el acceso al usuario autenticado dueño del UID y validan
los tipos de documento usados por la app (perfil, borrador y entrenamientos),
con límites para mapas y listas principales. Las pruebas automatizadas corren
contra el Emulator antes de desplegar; si cambias la estructura persistida,
actualiza las reglas y sus pruebas antes de publicar. Firebase Hosting no es
obligatorio; GitHub Pages puede usar los SDK web compatibles con la app estática.
La configuración Firebase es pública; no se deben incluir claves privadas ni
credenciales de cuenta de servicio.

En un dispositivo nuevo, espera a que la cuenta termine de cargar el perfil,
los entrenamientos y el entreno en curso antes de sincronizar. Si la nube no
pudo cargarse, **Reintentar conexión** vuelve a comprobar la cuenta y no sube
el estado local mientras no se verifique. Al restaurar un respaldo, los datos
se combinan: no se eliminan entrenamientos existentes y, si un ID ya existe,
se conserva la versión actual. Los elementos de perfil nuevos se agregan sin
reemplazar los que ya existen.
