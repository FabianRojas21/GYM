# GYM

App de gimnasio para PC y móvil.

## Archivos

- `index.html`: estructura de la aplicación.
- `styles.css`: estilos y diseño.
- `app.js`: lógica de la aplicación.

Los tres archivos deben permanecer en la misma carpeta. Para probar la app,
abre esta carpeta en VS Code, instala la extensión Live Server y elige
**Open with Live Server** sobre `index.html`.

La pestaña **Hoy** muestra el resumen de la semana y el entreno más reciente,
con accesos a tus rutinas y a los ejercicios que puedes retomar.

La **Biblioteca** organiza el contenido en **Programas**, **Rutinas** y
**Ejercicios**. Un programa agrupa rutinas; al crear o editar una rutina puedes
asignarla a un programa. Las rutinas que ya existían permanecen disponibles y
pueden seguir sin programa.

## Tipos de serie

Durante un entrenamiento puedes elegir el tipo de cada serie:

- **Normal**: cuenta para las sugerencias de sobrecarga progresiva.
- **Aproximación**: queda guardada, pero no cuenta para progresar.
- **Back-off**, **Drop set** y **Rest-pause**: quedan guardadas y no cuentan
  para progresar. Registra cada bajada de peso o bloque de rest-pause como una
  fila aparte con su propio peso y repeticiones.

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
registradas, volumen (kg × reps), el detalle de cada ejercicio y las sugerencias
para la próxima sesión.

## Descansos, récords y respaldos

En **Ajustes** puedes elegir el descanso predeterminado (1 a 5 minutos). Durante
un entreno el contador se inicia al completar las repeticiones de una serie; en
ejercicios unilaterales, al completar ambos lados. También puedes iniciarlo,
sumar 30 segundos o detenerlo manualmente. El contador sigue activo al recargar
la página.

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
