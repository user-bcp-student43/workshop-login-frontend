# Resultados de implementacion

Ejecucion local del 2026-10-19, exclusivamente en workshop-login-frontend. Aprobacion general registrada en [PLAN.md](../PLAN.md); la respuesta "1" no aprueba perder la sesion al recargar para H-03. Los estados se mantienen solo en [HALLAZGOS.md](../HALLAZGOS.md).

## Evidencia de ejecucion

| Comprobacion | Resultado real |
|---|---|
| Baseline antes de ampliar pruebas | npm test: 1 test en 1 archivo, aprobado. |
| Caracterizacion antes de cambiar codigo productivo | 38 tests en 3 archivos, aprobados con Axios 0.31.0 y Lodash 4.17.21. |
| Axios actualizado | Los mismos 38 tests aprobados; build aprobado. Prueba adicional XHR real aprobada. |
| Lodash actualizado | 39 tests aprobados, incluidos XHR y preferencias; build aprobado. |
| Tras extraer servicios y tipos | 47 tests aprobados, manteniendo inicialmente mensajes y persistencia. |
| Tras simplificar login | Las 17 caracterizaciones de login aprobadas. |
| H-04 antes de corregir | 18 tests de login aprobados y 1 fallo esperado: el DOM creaba em en lugar de mostrar las etiquetas literalmente. |
| H-04 despues de corregir | Suite de 54 tests aprobados, incluidos DOM y mensajes seguros. |
| Actualizacion asincrona de la vista | Nueva regresion: 19 tests aprobados y 1 fallo antes de markForCheck; 20 aprobados despues, sin deteccion manual en la regresion. |
| npm ci --ignore-scripts estandar, lockfile final | Aprobado, sin legacy-peer-deps; instalacion reproducible comprobada. |
| npm run test:coverage -- --reporter=dot, instalacion limpia | 72 tests aprobados en 10 archivos; 100% lineas, sentencias, funciones y ramas. Gate del 85% por archivo aprobado. |
| npm run test:typecheck | Aprobado con strict: true para produccion y specs. |
| npm run build | Aprobado, budgets existentes conservados; warning CommonJS de lodash/merge visible. |
| npm audit --json --ignore-scripts | Codigo 1 por 25 alertas de otras dependencias: 9 moderate, 10 high, 6 critical. Axios y Lodash no figuran como vulnerables en este informe. |
| npm ls --all --json | Codigo 1: Vitest 3.2.4 se reporta incompatible con el peer opcional de Angular 21. Los peers ausentes de Webpack se repararon; no se cambio el runner para ocultar la alerta. |

La cobertura incluye todos los archivos productivos modificados y nuevos de componentes, servicios, modelos, utilidades y environment, incluso los no importados por tests. Los archivos de solo interfaces no tienen instrucciones ejecutables; no representan codigo omitido del denominador. Informes HTML y JSON disponibles en coverage/, generados por el comando indicado; no se afirma que la CI remota haya sido ejecutada, solo se agregaron sus gates.

## Diferencia y pruebas por hallazgo

### H-01

- **Diff conceptual:** Axios 0.31.0 -> 1.20.0, misma interfaz HTTP y respuesta data, sin migrar de cliente. [AuthService](../src/app/services/auth.service.ts) conserva POST, JSON, client y timeout; [TasksService](../src/app/services/tasks.service.ts) conserva GET y Bearer.
- **Caracterizacion antes/despues:** mismos 38 casos verdes tras actualizar; se conserva el envio de credenciales sin trim y el rechazo de HTTP fallido.
- **Correccion comprobada:** [http-contract.spec.ts](../src/app/services/http-contract.spec.ts) usa el adaptador xhr real contra un servidor efimero de loopback, no un mock de Axios: serializacion JSON, Bearer, array directo y rechazo 401 aprobados. Specs directos de servicios y auditoria final sin aviso de Axios.

### H-02

- **Diff conceptual:** Lodash 4.17.21 -> 4.18.1; se conserva merge y se mueve la recuperacion de preferencias a [SessionService](../src/app/services/session.service.ts). No se sustituyo una mezcla profunda por spread.
- **Caracterizacion antes/despues:** defaults, preferencias parciales/completas, false, JSON invalido y propiedades adicionales/anidadas pasan antes y despues. Logout conserva preferencias.
- **Correccion comprobada:** 39 tests aprobados tras la actualizacion; [session.service.spec.ts](../src/app/services/session.service.spec.ts) comprueba directamente la semantica. Auditoria final sin aviso de Lodash. No se afirma explotacion previa de merge.

### H-03

- **Diff conceptual:** solo centralizacion del almacenamiento como parte de H-05; no cambio a memoria ni a cookies, ni nueva persistencia alternativa.
- **Caracterizacion antes/despues:** login guarda token/usuario antes de navegar; otra instancia de dashboard recupera la sesion; logout borra ambas claves y conserva preferencias. Recarga en navegador sigue recuperando tareas.
- **Limite de la ejecucion:** no se ejecutaron tests de una politica en memoria inexistente ni se declaro mitigado el acceso de scripts al token. Falta aprobar expresamente el efecto sobre recarga/pestanas indicado en el plan.

### H-04

- **Diff conceptual:** innerHTML -> interpolacion; mensajes sin etiquetas y [politica comun de errores locales](../src/app/utils/user-facing-error.ts), sin exponer message/detail del backend ni registrar objetos de error que puedan contener credenciales.
- **Caracterizacion antes/despues:** se preservan motivo de validacion, busy, ausencia de navegacion al fallar y estado de error de tareas. Se cambia intencionalmente el formato HTML y el detalle remoto por texto seguro, como preve el plan.
- **Correccion comprobada:** prueba DOM roja antes y verde despues con usuario que contiene etiquetas em inocuas. El DOM no crea em y conserva su texto literal. Navegador movil verifica ademas que no aparece private-backend-detail y se reactiva Ingresar. No es una demostracion de XSS explotable en el codigo inicial.

### H-05

- **Diff conceptual:** HTTP en AuthService/TasksService; almacenamiento en SessionService; seleccion y etiquetas en [funcion pura](../src/app/utils/task-selection.ts); componentes dedicados a eventos, estado y navegacion. Se conserva NgZone/detectChanges del dashboard.
- **Caracterizacion antes/despues:** 47 tests verdes tras la extraccion. Test integrado usa componentes y servicios reales con transporte simulado y comprueba login -> sesion -> tareas -> logout; no sustituye todo el flujo por mocks de servicios.
- **Correccion comprobada:** specs directos de servicios y DOM/navegador. El navegador descubrio que el login no refrescaba errores asincronos; regresion con clic real y promesa diferida fallo antes y paso despues de markForCheck. No se cambiaron contratos para resolverlo.

### H-06

- **Diff conceptual:** URLs en [environment.ts](../src/environments/environment.ts), client y timeout en AuthService, rutas en AUTH_ROUTES y claves en SessionService. Sin agregar entornos ficticios ni modificar angular.json.
- **Caracterizacion antes/despues:** mismas URLs localhost:8080/auth/login y localhost:8000/api/tasks, owner vacio o presente, construccion original del parametro, timeout solo en POST.
- **Correccion comprobada:** [auth.service.spec.ts](../src/app/services/auth.service.spec.ts) y [tasks.service.spec.ts](../src/app/services/tasks.service.spec.ts) comparan argumentos completos, incluidos espacios originales en credenciales y ausencia de nueva codificacion de owner. Ambos pasan.

### H-07

- **Diff conceptual:** interfaces propias de autenticacion, usuario, tareas y preferencias; estado string/boolean; errores y datos persistidos unknown con estrechamiento. Sin any en la superficie productiva modificada. Los campos adicionales de preferencias se conservan como unknown, no se interpretan como valores confiables.
- **Caracterizacion antes/despues:** defaults y conversiones truthy de formatTaskLabel, estados desconocidos y prioridades iguales/ausentes se conservan. El primer typecheck descubrio prioridades posiblemente undefined; se corrigio la comparacion preservando el resultado previo y se repitio el mismo gate, aprobado.
- **Correccion comprobada:** typecheck estricto de todo src y specs, build Angular y suite de 72 tests aprobados. Caso defensivo explicito: usuario opcional ausente se guarda como {} en vez del JSON invalido "undefined"; tipos de campos invalidos se estrechan a ausentes, sin exigir campos nuevos al backend. JSON de usuario sintacticamente invalido conserva el fallo caracterizado; no se aprovecho el refactor para cambiar esa politica.

### H-08

- **Diff conceptual:** de una prueba de utilidad a 10 specs y 72 tests; helper compartido y setup, Angular TestBed con plantillas reales, XHR real con fixture local y gates de cobertura/typecheck en CI, sin retirar test o build.
- **Caracterizacion antes/despues:** baseline 1 aprobado -> 38 caracterizaciones aprobadas antes de cambios productivos -> 72 pruebas finales aprobadas, con regresiones rojas/verdes registradas arriba.
- **Correccion comprobada:** 100% en las cuatro metricas del conjunto productivo modificado y umbral del 85% por archivo. jsdom 26.1.0 es la unica dependencia directa nueva, solo de desarrollo, justificada para DOM y compatible con el requisito Node; no se cambio el runner. Se corrigio la infraestructura de almacenamiento experimental de Node con un unico doble determinista de Storage, limpiado por caso.

### H-09

- **Diff conceptual:** validaciones y token ausente con retornos anticipados, un try/finally y sin anidamiento profundo en [login](../src/app/login/login.component.ts).
- **Caracterizacion antes/despues:** 17 caracterizaciones verdes inmediatamente despues de simplificar; usuario invalido conserva precedencia cuando ambos campos faltan, HTTP no se ejecuta al fallar validacion y busy se restablece en rechazo HTTP/navegacion.
- **Correccion comprobada:** 20 pruebas finales del login aprobadas y typecheck/build. Los mensajes pasan luego a texto como cambio separado H-04.

### H-10

- **Diff conceptual:** [isBlankCredential](../src/app/utils/credential-validation.ts) compartida, claves con un solo propietario en SessionService y una fuente de rutas/configuracion; sin duplicar dobles de pruebas.
- **Caracterizacion antes/despues:** misma tabla null/undefined/vacio/espacios y valores no vacios; conservar defaults y coherencia entre guardar, recuperar desde otra instancia y borrar sesion.
- **Correccion comprobada:** 8 casos de validacion compartida, specs de sesion y prueba integrada aprobados. Token/usuario solo se almacenan desde el servicio, no desde componentes; preferencias sobreviven al logout.

## Navegador y limites

Frontend servido localmente en puerto 4300. Playwright intercepto exclusivamente los dos endpoints documentados con respuestas de fixture; no se arrancaron ni inspeccionaron otros componentes. Flujo escritorio (1280x900): login, titulo de tarea visible, exclusion de ARCHIVED, recarga con sesion persistida y logout. Flujo movil (390x844): login rechazado, texto literal, sin detalle privado, boton reactivado y sin overflow horizontal. Las aserciones del flujo completo pasaron despues de corregir markForCheck. La respuesta 401 de fixture produce el aviso de red esperado en la consola del navegador; no se presenta como un fallo inesperado de backend real.

Los tests de cliente no verifican autorizacion, caducidad ni revocacion reales de tokens en los servidores. No se usaron secretos reales. HTTP de loopback se conserva por contrato; no se propone como configuracion productiva.

## Incidencias y riesgos residuales

- H-03 no se ejecuta sin la segunda aprobacion. Sigue el riesgo de token persistente accesible a scripts del origen; centralizar no lo resuelve. Una consulta en vuelo al cerrar sesion y el JSON de usuario corrupto conservan los riesgos descritos por el comportamiento previo; no se agregan correcciones fuera del plan.
- npm 11.19.1 sobre Node 26.9.0 fallo internamente al colocar peers sobre el arbol existente; npm 10 tampoco lo resolvio. Un intento puntual con legacy-peer-deps permitio probar actualizaciones, pero dejo peers ausentes y no se adopto como solucion final. Se preservaron temporalmente arbol/lock, se genero la resolucion desde cero con las mismas versiones directas y npm ci estandar paso. La copia temporal masiva se retiro. El lockfile final fue generado por npm, no editado a mano, y cambia tambien resoluciones transitivas/ubicaciones de peers.
- npm ls --all sigue reportando Vitest 3.2.4 frente al peer de Angular 21. El manifiesto ya fijaba ambas versiones antes de este trabajo. Tests, build y npm ci pasan; no afirmar que todo el arbol es compatible ni que la CI remota ha pasado. Cambiar el runner o sus versiones requiere una ampliacion del plan.
- Persisten 25 alertas ajenas a Axios/Lodash en Angular y tooling. No se suprimieron ni se ejecuto audit fix --force. Requieren otro alcance autorizado; no se afirma una auditoria global limpia.
- Se conserva Lodash/merge y su warning CommonJS por compatibilidad de preferencias; eliminarlo requiere decidir la semantica de propiedades adicionales/anidadas. Tampoco se altero la construccion de owner, por preservacion explicita del contrato.

No se implementaron funciones ajenas al plan ni cambios externos. Las adaptaciones de infraestructura, el caso defensivo de usuario opcional y la notificacion de vista estan detallados; H-03 es una ejecucion diferida por falta de aprobacion especifica, no una correccion completada.