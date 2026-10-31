# GYM

App de gimnasio para PC y móvil.

## Archivos

- `index.html`: estructura de la aplicación.
- `styles.css`: estilos y diseño.
- `app.js`: interfaz, almacenamiento y flujo de la aplicación.
- `engine.js`: motor independiente de progresión.
- `backup.js`: migración y serialización de respaldos.
- `sw.js` y los iconos PNG: instalación offline como PWA.
- `engine.test.js`: pruebas ejecutables con `node --test`.

Los archivos deben permanecer en la misma carpeta. Para probar la app,
abre esta carpeta en VS Code, instala la extensión Live Server y elige
**Open with Live Server** sobre `index.html`.

Antes de guardar cambios en el motor, ejecuta `node --test` para comprobar sus
reglas de progresión.

La pestaña **Hoy** muestra el resumen de la semana y el entreno más reciente,
con accesos a tus rutinas y a los ejercicios que puedes retomar.

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
puedas corregir la conexión y volver a intentarlo.

Durante un entreno puedes copiar una serie ya completada a la siguiente serie
vacía y avanzar entre todos los campos de los ejercicios con **Enter**; al
terminar el último campo, se cierra el teclado. En móvil, el teclado muestra la
opción **Siguiente**. El borrador se recupera al volver a abrir la app y el
estado de guardado aparece debajo del título. En **Historial** puedes buscar
por ejercicio, rutina o fecha y filtrar por 7, 30 o 90 días. El resumen del
periodo muestra entrenos, duración, volumen y series efectivas, comparados con
el intervalo anterior equivalente; la búsqueda se aplica a ambos intervalos.
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

La **Biblioteca** organiza el contenido en **Programas**, **Rutinas** y
**Ejercicios**. Un programa agrupa rutinas; al crear o editar una rutina puedes
asignarla a un programa. Las rutinas que ya existían permanecen disponibles y
pueden seguir sin programa. Desde el detalle de una rutina puedes duplicarla,
editar la copia y guardarla como una nueva versión.

En **Hoy**, el resumen semanal también muestra las series efectivas por grupo
muscular. Asigna un músculo principal a cada ejercicio desde **Biblioteca →
Ejercicios**; los registros anteriores quedan como «Sin asignar» hasta que lo
clasifiques. Una serie de trabajo cuenta como efectiva si se hizo a 4 RIR o
menos, o si no se registró el RIR; las aproximaciones no cuentan. En ejercicios
unilaterales se cuenta una ronda cuando están completos ambos lados. Los
secundarios aportan 0,5 serie estimada y las porciones de un mismo grupo no se
duplican en el total.

En **Yo → Resumen** puedes consultar la carga reciente por músculo y registrar
opcionalmente cómo lo sientes hoy: recuperado, algo cansado o muy fatigado. La
carga estimada suma series efectivas de los últimos 7 días, pondera las
contribuciones indirectas al 50 %, ajusta suavemente por esfuerzo registrado y
da menos peso a sesiones más antiguas. La carga y la autoevaluación se muestran
por separado; son referencias personales, no una medición fisiológica, consejo
médico ni una indicación para evitar entrenar. La app conserva la última
autoevaluación por grupo muscular en el perfil y la sincroniza con los demás
datos.

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

Durante un entreno, las series normales muestran como referencia el peso y las
repeticiones de la serie correspondiente de la última sesión. Si quitas una
serie o un ejercicio por error, usa **Deshacer** en el aviso que aparece.
También puedes mover ejercicios arriba o abajo durante el entreno; el nuevo
orden se guarda en el borrador actual. Si empezaste desde una rutina, al
terminar podrás elegir si guardas el orden y los ajustes en ella o si la dejas
sin cambios.

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
registradas, volumen (kg × reps, sin aproximaciones), el detalle de cada
ejercicio y las sugerencias para la próxima sesión. El volumen sí incluye las
series normales, back-off, drop set y rest-pause.

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

Los músculos secundarios se estiman automáticamente según el músculo principal
permitiendo usar la app sin configuraciones adicionales. La participación
ponderada es de 0,5 series frente a 1 serie completa del músculo principal.
El volumen efectivo sigue usando peso corporal más carga añadida y no cuenta
aproximaciones como volumen progresivo.

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

## Sincronización con Firebase

La app puede sincronizar perfil, entrenamientos, rutinas, mediciones y el
entreno en curso mediante Firebase Authentication y Firestore. La
configuración pública ya está en `firebase-config.js`.

1. En Firebase Console abre **Authentication → Sign-in method** y habilita
   **Google**.
2. En **Authentication → Settings → Authorized domains** añade `localhost` y
   el dominio de GitHub Pages (por ejemplo, `usuario.github.io`).
3. Crea Firestore Database en modo producción.
4. Publica `firestore.rules` desde Firebase CLI con `firebase deploy --rules
   firestore.rules`, o pega su contenido en Reglas de Firestore.
5. Abre Ajustes, pulsa **Continuar con Google** y autoriza la cuenta. Los datos
   locales se migran una sola vez cuando la cuenta remota está vacía. Los datos
   locales antiguos no se vuelven a mezclar automáticamente en una cuenta que
   ya tiene información; para agregar un respaldo, usa la restauración aditiva
   desde Ajustes.

Las reglas restringen cada documento bajo `/users/{uid}` al usuario autenticado
con ese UID. Firebase Hosting no es obligatorio; GitHub Pages puede usar los
SDK web compatibles con la app estática. La configuración Firebase es pública;
no se deben incluir claves privadas ni credenciales de cuenta de servicio.

En un dispositivo nuevo, espera a que la cuenta termine de cargar el perfil,
los entrenamientos y el entreno en curso antes de sincronizar. Si la nube no
pudo cargarse, **Reintentar conexión** vuelve a comprobar la cuenta y no sube
el estado local mientras no se verifique. Al restaurar un respaldo, los datos
se combinan: no se eliminan entrenamientos existentes y, si un ID ya existe,
se conserva la versión actual. Los elementos de perfil nuevos se agregan sin
reemplazar los que ya existen.
