# GYM

App de gimnasio para PC y móvil.

## Archivos

- `index.html`: estructura de la aplicación.
- `styles.css`: estilos y diseño.
- `app.js`: interfaz, almacenamiento y flujo de la aplicación.
- `engine.js`: motor independiente de progresión.
- `engine.test.js`: pruebas del motor, ejecutables con `node --test`.

Los archivos deben permanecer en la misma carpeta. Para probar la app,
abre esta carpeta en VS Code, instala la extensión Live Server y elige
**Open with Live Server** sobre `index.html`.

Antes de guardar cambios en el motor, ejecuta `node --test` para comprobar sus
reglas de progresión.

La pestaña **Hoy** muestra el resumen de la semana y el entreno más reciente,
con accesos a tus rutinas y a los ejercicios que puedes retomar.

En **Historial**, usa **Editar fecha y duración** para corregir el día exacto
del entrenamiento y ajustar el tiempo registrado. Desde el mismo editor puedes
corregir el peso, las repeticiones, el esfuerzo y el tipo de las series. La
fecha corregida también actualiza el resumen de la semana.

La **Biblioteca** organiza el contenido en **Programas**, **Rutinas** y
**Ejercicios**. Un programa agrupa rutinas; al crear o editar una rutina puedes
asignarla a un programa. Las rutinas que ya existían permanecen disponibles y
pueden seguir sin programa. Desde el detalle de una rutina puedes duplicarla,
editar la copia y guardarla como una nueva versión.

En **Hoy**, el resumen semanal también muestra las series efectivas por grupo
muscular. Asigna un músculo principal a cada ejercicio desde **Biblioteca →
Ejercicios**; los registros anteriores quedan como «Sin asignar» hasta que lo
clasifiques. Se cuentan solo las series normales completas, una vez por ronda
en los ejercicios unilaterales; las aproximaciones y técnicas especiales no
se incluyen en este conteo.

En las reglas del ejercicio o de cada elemento de una rutina puedes ajustar
**Peso disponible cada (kg)**. La app redondea las recomendaciones de subida
hacia el siguiente peso disponible y las de bajada hacia uno disponible menor
o igual. Por ejemplo, un salto progresivo de 2 kg desde 26 kg con mancuernas
disponibles cada 2 kg propone 28 kg. Los datos y reglas existentes se
conservan; si no configuras este valor, se usa el salto de progresión actual.

Durante un entreno, las series normales muestran como referencia el peso y las
repeticiones de la serie correspondiente de la última sesión. Si quitas una
serie o un ejercicio por error, usa **Deshacer** en el aviso que aparece.

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
Durante un entreno, el contador se inicia al completar una serie normal,
back-off o aproximación; en ejercicios unilaterales, al completar ambos lados.
Drop sets y rest-pause no lo inician automáticamente. También puedes iniciarlo,
sumar 30 segundos o detenerlo manualmente. El contador sigue activo al recargar
la página y se cancela al descartar o terminar el entreno.

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
