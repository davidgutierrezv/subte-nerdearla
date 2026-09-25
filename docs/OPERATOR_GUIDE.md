# Guía para operadores de sala

Esta guía es para las personas voluntarias que operan una sala el día del evento.

> **Estado actual:** hoy podés usar `/admin` para crear salas y sesiones. La **estación de sala** (captar el audio desde el celular) está en desarrollo; los pasos marcados _(planificado)_ describen cómo va a funcionar.

## Antes del evento

- **Clave de operador:** pedile la `OPERATOR_KEY` a la organización. No la compartas ni la escribas en lugares públicos.
- **Revisá tus sesiones:** entrá a `/admin` en la URL publicada (`https://…`) y confirmá que tu sala y tus charlas estén cargadas con el slug y el idioma correctos.
- **Celular:** llevalo cargado y con el cargador. Mejor si queda enchufado toda la jornada.
- **Conexión:** usá una red estable (Wi-Fi del evento o datos móviles con buena señal).
- **Abrí la URL publicada, no una vista previa.** El navegador solo da acceso al micrófono en páginas HTTPS abiertas directamente. _(planificado)_
- **Permiso de micrófono:** aceptalo cuando el navegador lo pida. _(planificado)_
- **Probá el vúmetro:** hablá cerca del parlante de la sala y confirmá que la barra se mueve. _(planificado)_

## Durante la charla _(planificado)_

- **No bloquees la pantalla ni cambies de app.** Si el navegador pasa a segundo plano, puede cortar el micrófono.
- **Estados:**
  - **Conectado:** el audio llega y se transcribe.
  - **Reconectando:** se cortó la conexión; la estación reintenta sola con un token nuevo. No hace falta tocar nada.
- **Pausar en recesos:** usá **Pausar**. Se cierra la conexión y no se gasta transcripción. Al volver, **Reanudar**.
- **Finalizar:** al terminar la charla, tocá **Finalizar**. La sesión pasa a `ended`.

## Después de la charla _(planificado)_

- Abrí la vista de la charla y revisá que el recap (resumen, ideas principales y capítulos) se haya generado.
- Avisale a la organización si algo falló, con la hora aproximada.

## Checklist imprimible

1. [ ] Tengo la `OPERATOR_KEY` y puedo entrar a `/admin`.
2. [ ] Mi sala y mis sesiones están cargadas con el slug e idioma correctos.
3. [ ] El celular está cargado y enchufado.
4. [ ] Tengo conexión estable (probé abrir la agenda).
5. [ ] Abrí la URL publicada con `https://`, no una vista previa.
6. [ ] Acepté el permiso de micrófono. _(planificado)_
7. [ ] El vúmetro se mueve cuando hay sonido. _(planificado)_
8. [ ] Configuré la pantalla para que no se bloquee. _(planificado)_
9. [ ] Sé cómo pausar en los recesos y finalizar al terminar. _(planificado)_
10. [ ] Al terminar, revisé el recap y avisé si hubo problemas. _(planificado)_
