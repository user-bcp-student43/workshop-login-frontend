# Plan de correccion

## Aprobacion humana

El 2026-10-19 el usuario respondio "1" a la solicitud de confirmar la aprobacion del plan H-01 a H-10. Se registra esa aprobacion general. La segunda decision solicitada, permitir que recargar o abrir otra pestana exija login para H-03, no fue respondida: no implementar el cambio de persistencia de H-03 hasta contar con aprobacion explicita. Los demas incrementos pueden ejecutarse conservando la persistencia actual.

## Seleccion y alcance

El usuario confirmo la seleccion de H-01 a H-10, todos con estado Pendiente en [HALLAZGOS.md](HALLAZGOS.md). Se incluyen por los motivos propuestos en la seleccion: alertas de dependencias, riesgo de persistencia del token, alcance acotado del HTML dinamico, separacion de responsabilidades, configuracion centralizada, tipado, cobertura, anidamiento y duplicacion.

Este documento contiene propuestas, no cambios implementados ni resultados de pruebas. Solo se crea PLAN.md. No se modifica codigo, configuracion, dependencias, contratos ni estados de la matriz. [HALLAZGOS.md](HALLAZGOS.md) sigue siendo el unico registro de seguimiento.

Las convenciones proceden de [docs/GOOD_PRACTICES.md](docs/GOOD_PRACTICES.md) y las reglas y metas de [REGLAS.md](REGLAS.md). Los nombres de archivos nuevos que se enumeran abajo son propuestas, no convenciones ya presentes en el repositorio.

## Contrato que no cambia

Preservar [docs/ENDPOINTS.md](docs/ENDPOINTS.md):

- POST `http://localhost:8080/auth/login`, cuerpo con `username`, `password` y `client: angular-workshop`, timeout de 5000 ms y sin agregar Authorization. La validacion de espacios no debe normalizar las credenciales enviadas.
- Consumir `response.data.token` y `response.data.user`; no introducir un envoltorio ni suponer campos obligatorios adicionales. Sin token no se guarda una sesion ni se navega a dashboard.
- GET `http://localhost:8000/api/tasks?owner=<username>`, con el owner actual o cadena vacia y `Authorization: Bearer <token>`. Preservar la construccion actual del parametro, sin introducir silenciosamente nueva codificacion, timeout, reintentos o cookies.
- Consumir el arreglo directo de tareas y los campos actualmente leidos. Conservar exclusion exacta de ARCHIVED, etiquetas, traducciones de estados y orden descendente mediante el comparador actual; no inventar una escala de prioridades.
- Conservar login -> guardar sesion -> navegar -> recuperar sesion -> consultar tareas -> cierre local -> login. Sin token no debe salir la peticion de tareas. No agregar endpoints de logout, refresh ni revocacion.
- Conservar estados busy/loading, rutas y preferencias al cerrar sesion. No introducir redireccion o borrado automatico de sesion por 401/403 como parte de este trabajo.

Dos cambios de comportamiento estan explicitados, no escondidos como refactor: mensajes de texto seguros en H-04 y menor persistencia de sesion en H-03. El segundo necesita aprobacion del efecto de recarga antes de implementarse. Ninguno modifica el contrato HTTP.

## Pruebas y estructura compartidas

Antes de cualquier cambio productivo, escribir y ejecutar las pruebas de caracterizacion descritas en cada apartado contra el comportamiento actual. No dar por verde una prueba solo porque esta propuesta. Las expectativas de seguridad nuevas se agregan aparte y deben fallar antes de su correccion; no convertir conductas inseguras actuales en requisitos permanentes.

Reutilizar Vitest, `src/**/*.spec.ts` y el archivo existente de la utilidad. Proponer un spec junto a cada componente y, al extraerlos, junto a cada servicio. Un solo helper de pruebas compartido basta para almacenamiento, respuestas HTTP, Router y deteccion de cambios; no copiar estos dobles por hallazgo. Aislar y restaurar mocks entre pruebas; no usar backends reales ni secretos.

El runner actual usa entorno node y no hay dependencia DOM declarada. Para probar la plantilla real de H-04, proponer `jsdom` exclusivamente como devDependency si el toolchain existente no proporciona un entorno DOM utilizable. Justificacion: verificar texto, elementos renderizados y eventos no es posible con pruebas de cadena solamente. Elegir una version compatible con Node >=22.12 y Vitest 3.2.4, comprobar su auditoria y documentar la decision antes de instalar. No agregar dependencias de runtime. Configurar solo los specs de componente para DOM, conservando las pruebas de utilidad en Node. Reutilizar Angular TestBed y el compilador ya declarado; si hay que resolver recursos externos, cargar la plantilla real del componente, no sustituirla por una plantilla simplificada.

La estructura final propuesta es pequena y compartida entre hallazgos:

- `AuthService`: llamada de login y normalizacion de su resultado; `TasksService`: llamada de tareas. Ningun componente conoce Axios ni realiza HTTP directo.
- `SessionService`: fuente unica de token/usuario y acceso a preferencias. Una sola instancia a nivel de aplicacion; ningun componente toca localStorage.
- Interfaces propias de autenticacion, tareas y preferencias; `unknown` en fronteras no confiables con estrechamiento antes de acceder a campos. No usar `any` ni casts como sustituto de validacion.
- `environment.ts`: URLs actuales por ambiente. Constantes de rutas, client, timeout y claves de almacenamiento en sus propietarios, sin repetir literales entre componentes.
- Utilidades pequenas de validacion y mensajes seguros solo cuando hay reutilizacion real; componentes dedicados a estado de presentacion, eventos y navegacion de la vista. Retornos anticipados, sin anidamiento profundo.

## H-01: Axios con alertas de seguridad

**Hallazgo y motivo.** H-01, Vulnerabilidad, severidad alta; seleccionado por las alertas reportadas sobre Axios 0.31.0. Evidencia: [package.json:19](package.json#L19) y llamadas en [login.component.ts](src/app/login/login.component.ts#L41) y [dashboard.component.ts](src/app/dashboard/dashboard.component.ts#L43).

**Problema.** La version afectada esta confirmada por la auditoria registrada, no una explotacion del adaptador de navegador. Los ejemplos citados en la matriz afectan funcionalidades de Node.js; no atribuirlos automaticamente al flujo Angular.

**Cambio propuesto.** Actualizar Axios a una version estable compatible cuya auditoria ya no reporte los avisos aplicables. Consultar avisos, versiones corregidas y cambios de API en la implementacion; no inventar ahora una version objetivo ni usar `npm audit fix --force`. Conservar Axios durante esta correccion para no mezclar sustitucion de cliente con extraccion de servicios. H-05 movera las mismas llamadas a servicios; si esos servicios ya existen, ajustar alli solo incompatibilidades demostradas por las pruebas. Mantener cuerpo, header, timeout, response.data y comportamiento de rechazo HTTP. Actualizar el lockfile con npm, revisando cambios transitivos y sin sobrescribir cambios previos del usuario.

**Archivos a tocar.** `package.json`, `package-lock.json`; specs de login y dashboard propuestos en H-08. Solo si la nueva API lo exige: `src/app/services/auth.service.ts` y `src/app/services/tasks.service.ts` despues de H-05, o los componentes actuales si aun no se extrajeron. Registrar posteriormente evidencia y estado solo en HALLAZGOS.md.

**Prueba de caracterizacion antes de tocar esos archivos.** Capturar las llamadas actuales con Axios simulado: URL exacta, cuerpo y timeout del POST; URL, header y ausencia de timeout explicito del GET. Cubrir token presente/ausente, error con response.data.message/detail, error.message y fallback, y restablecimiento de busy/loading. Despues de actualizar, repetir esas pruebas y realizar una comprobacion del adaptador de navegador contra un servidor HTTP local simulado dentro del ambito; esta ultima detecta diferencias que un mock de Axios no puede detectar. Guardar cualquier fixture o informe dentro del repositorio.

**Verificacion de correccion.** `npm test`, `npm run build` y auditoria antes/despues. Revisar especificamente Axios y dependencias transitivas sin silenciar otras alertas; no declarar el hallazgo corregido solo por subir el numero de version.

## H-02: Lodash con alertas de seguridad

**Hallazgo y motivo.** H-02, Vulnerabilidad, severidad alta; seleccionado por las alertas y el uso localizado en preferencias. Evidencia: [package.json:20](package.json#L20) y [login.component.ts:24](src/app/login/login.component.ts#L24).

**Problema.** Lodash 4.17.21 se importa para merge. Los avisos de template y unset/omit registrados no demuestran una vulnerabilidad de esa llamada a merge. Reemplazar una mezcla profunda por spread sin comprobar entradas puede cambiar la recuperacion de preferencias.

**Cambio propuesto.** La primera correccion conservadora sera actualizar Lodash a una version estable sin los avisos reportados, manteniendo la semantica de merge y sin nuevas dependencias. Determinar la version corregida mediante avisos y auditoria al implementar; no fijar un numero sin evidencia. Llevar la lectura y mezcla de preferencias a SessionService como parte de H-05. Una eliminacion posterior en favor de operaciones nativas solo procede si las caracterizaciones demuestran equivalencia para los datos admitidos y se decide que hacer con propiedades adicionales, objetos anidados y tipos incorrectos; no combinar ese cambio de politica con la actualizacion de seguridad.

**Archivos a tocar.** `package.json`, `package-lock.json`; `src/app/login/login.component.spec.ts` para la caracterizacion inicial, y `src/app/services/session.service.spec.ts` cuando exista. `src/app/services/session.service.ts` y `src/app/login/login.component.ts` solo en la extraccion coordinada de H-05. `@types/lodash` se conserva mientras exista el import; no eliminarlo por una actualizacion de version.

**Prueba de caracterizacion antes de tocar esos archivos.** Construir LoginComponent con almacenamiento simulado: ausencia de preferencias produce los tres defaults; preferencias parciales conservan defaults faltantes y valores false; preferencias completas restauran los valores actuales; JSON invalido no impide construir el login. Incluir propiedades adicionales y una entrada anidada para describir la semantica actual de merge antes de decidir si reemplazarlo. Verificar que autenticar persiste las preferencias y logout no las borra. Ejecutar estas mismas expectativas despues de actualizar y mover la logica.

**Verificacion de correccion.** Pruebas, compilacion y auditoria de la version efectivamente resuelta. Separar ausencia de avisos de una afirmacion no demostrada sobre explotabilidad de merge.

## H-03: Token persistente en localStorage

**Hallazgo y motivo.** H-03, Vulnerabilidad, severidad alta; seleccionado por el impacto potencial sobre la sesion. Evidencia: [login.component.ts:47](src/app/login/login.component.ts#L47) y [dashboard.component.ts:36](src/app/dashboard/dashboard.component.ts#L36).

**Problema.** El token es legible por JavaScript del origen y persiste en el navegador. Cambiar solamente localStorage por sessionStorage no evita lectura por scripts; centralizar el almacenamiento tampoco elimina por si mismo el riesgo.

**Cambio propuesto.** Usar token y usuario en memoria en la instancia unica de SessionService. AuthService devuelve el resultado y SessionService lo establece antes de navegar; dashboard obtiene la misma sesion para enviar Bearer; logout borra ambos y vuelve a login. Las preferencias no sensibles permanecen en localStorage, con su clave centralizada. Limpiar workshop_token/workshop_user legados al activar la nueva politica y al salir, sin importarlos como sesion ni registrar sus valores. No persistir token en otra API de almacenamiento. Evitar retener una copia en el componente.

**Decision funcional previa.** En memoria, recargar, abrir otra pestana o reiniciar la app exige login; el comportamiento actual permite recuperar la sesion de localStorage. Obtener aprobacion explicita de este cambio antes de implementar H-03; haber elegido el ID no equivale a aprobar todos los efectos de su solucion. Si conservar la sesion tras recarga es obligatorio, esta alternativa no cumple ese requisito y debe replantearse antes de tocar codigo. Una cookie HttpOnly requeriria cambios externos de contrato, CORS y proteccion CSRF: queda fuera de este plan y no se sustituye Bearer por cookies.

**Limite de seguridad.** Memoria reduce persistencia y exposicion en almacenamiento, pero no inmuniza contra scripts maliciosos en el origen ni revoca el token del servidor. No declarar proteccion completa frente a XSS ni logout remoto.

**Archivos a tocar.** `src/app/services/session.service.ts`, su spec, `src/app/login/login.component.ts`, `src/app/dashboard/dashboard.component.ts` y sus specs; interfaces de sesion propuestas en H-07. Reutilizar servicios de H-05; no crear un segundo almacen ni modificar endpoints o guards.

**Prueba de caracterizacion antes de tocar esos archivos.** Mostrar con almacenamiento simulado que el login actual guarda token/usuario antes de navegar, dashboard recupera ambos y construye Bearer/owner, sin token redirige sin GET, y logout elimina token/usuario pero conserva preferencias. Caracterizar tambien recuperacion tras una nueva instancia de dashboard. Tras aprobar la politica nueva, conservar el contrato HTTP y reemplazar solo la expectativa de persistencia: compartir sesion entre componentes de la misma aplicacion, exigir login al reiniciar su contenedor, no escribir tokens en almacenamiento, limpiar claves legadas y no permitir nuevas consultas despues de logout. Simular logout durante una consulta para evitar que una respuesta tardia vuelva a exponer tareas.

**Verificacion de correccion.** Pruebas unitarias y flujo manual local de login, dashboard, recarga y logout. Confirmar que no quedan lecturas/escrituras productivas del token persistente salvo su eliminacion de migracion. La aprobacion de la recarga es un requisito, no un resultado ya obtenido.

## H-04: Mensajes dinamicos mediante innerHTML

**Hallazgo y motivo.** H-04, Sugerencia, severidad media; seleccionado por el alcance acotado en login. Evidencia: [login.component.ts:55](src/app/login/login.component.ts#L55) y [login.component.html:39](src/app/login/login.component.html#L39).

**Problema.** El mensaje combina usuario y error externo como HTML. Angular sanitiza el binding actual; no se ha demostrado XSS ni uso de bypassSecurityTrustHtml. El formato HTML es innecesario y los detalles crudos del backend pueden exponerse al usuario.

**Cambio propuesto.** Sustituir `[innerHTML]` por interpolacion de texto y eliminar etiquetas HTML de los mensajes. Conservar la validacion y los estados, no la representacion como markup. Usar mensajes locales seguros segun el contexto; no mostrar error.response.data.message/detail ni error.message sin una politica explicita. Compartir la politica de errores entre AuthService y TasksService mediante una funcion pequena con entrada unknown y salida tipada; evitar diccionarios o bloques duplicados en los componentes. No usar DomSanitizer ni bypassSecurityTrustHtml porque no se necesita HTML. No alterar respuestas HTTP ni agregar reglas por codigo de estado que cambien sesion/navegacion.

**Archivos a tocar.** `src/app/login/login.component.html`, `src/app/login/login.component.ts`, su spec, `src/app/utils/user-facing-error.ts` y su spec propuestos. En coordinacion con H-05, `src/app/services/auth.service.ts`, `src/app/services/tasks.service.ts` y `src/app/dashboard/dashboard.component.ts` para aplicar la misma politica; la plantilla de dashboard ya interpola texto. No modificar CSS salvo que las pruebas demuestren que el texto seguro no cabe en el contenedor.

**Prueba de caracterizacion antes de tocar esos archivos.** Verificar mensajes de usuario/password vacios, backend sin token, error con message externo y fallback, busy y ausencia de navegacion tras error. Renderizar la plantilla actual para observar el contenido textual, el formato y que el boton mantiene su estado. Agregar antes de corregir una prueba de seguridad que falla con el comportamiento actual: un usuario con etiquetas inocuas se debe mostrar literalmente, no crear elementos HTML. Para mensajes externos, la nueva expectativa es un mensaje local sin detalles internos, no conservar el texto del backend. Asegurar que dashboard aplica la misma politica sin cambiar loading ni disparar logout.

**Verificacion de correccion.** Specs de DOM reales y de mensajes; no debe existir innerHTML ni confianza explicita en HTML en el flujo. Caracterizar primero el contenido previo y documentar la expectativa de texto nueva, sin afirmar que se encontro una explotacion.

## H-05: Componentes con multiples responsabilidades

**Hallazgo y motivo.** H-05, Refactor, severidad media; seleccionado para separar HTTP, sesion y vista. Evidencia: [login.component.ts:31](src/app/login/login.component.ts#L31) y [dashboard.component.ts:35](src/app/dashboard/dashboard.component.ts#L35).

**Problema.** Los componentes deciden validacion, transporte, persistencia, transformacion, errores y navegacion. Mover todo a un unico servicio enorme solo trasladaria el problema.

**Cambio propuesto.** Extraer AuthService, TasksService y SessionService con las responsabilidades delimitadas arriba. Mantener SessionService inicialmente con la politica actual para que la extraccion sea comprobable; H-03 cambia luego esa politica en un incremento separado y aprobado. La vista conserva eventos, busy/loading y navegacion. Las transformaciones reutilizan formatTaskLabel y una funcion pura de seleccion/orden de tareas, sin mezclarla con HTTP. H-06 aporta configuracion, H-07 tipos, H-09/H-10 simplifican validacion. La adaptacion de errores se comparte con H-04. Mantener NgZone/detectChanges mientras se caracterice el mismo cliente Axios; no eliminarlos sin una prueba que demuestre actualizacion de la vista.

**Archivos a tocar.** Los dos componentes y sus specs; nuevos `src/app/services/auth.service.ts`, `tasks.service.ts`, `session.service.ts` y sus specs; `src/app/utils/task-selection.ts` y su spec. Reutilizar `src/app/utils/legacy-format.ts`, modelos y configuracion definidos por los demas apartados. No cambiar `src/app/app.routes.ts` ni introducir guards como parte de la extraccion.

**Prueba de caracterizacion antes de tocar esos archivos.** Con dependencias simuladas, verificar el orden POST -> guardar token/usuario/preferencias -> navegar y lectura de sesion -> GET -> presentacion. Cubrir dashboard sin token, tareas vacias, ARCHIVED, etiquetas, prioridades distintas e iguales segun el comparador actual, respuesta rechazada y logout. Comprobar que carga y mensajes llegan a la vista. Despues de extraer, trasladar las aserciones HTTP/almacenamiento al spec del servicio correspondiente y conservar al menos un test integrado de componentes con servicios reales y transporte simulado; no reemplazar toda la cobertura del flujo por mocks de servicios.

**Verificacion de correccion.** Ningun componente importa Axios, contiene URLs HTTP ni accede a localStorage; los contratos, el orden del flujo y el renderizado se conservan. Pruebas y compilacion antes de modificar la politica de sesion.

## H-06: URLs hardcodeadas

**Hallazgo y motivo.** H-06, Refactor, severidad media; seleccionado para centralizar configuracion sin alterar destinos. Evidencia: [login.component.ts:42](src/app/login/login.component.ts#L42) y [dashboard.component.ts:43](src/app/dashboard/dashboard.component.ts#L43).

**Problema.** Cada componente conoce su host y puerto; cambiar uno independientemente puede dejar un entorno incoherente.

**Cambio propuesto.** Crear `src/environments/environment.ts` con las URLs actuales. AuthService y TasksService consumen esa configuracion y conservan exactamente los paths y parametro documentados. Centralizar client, timeout y rutas de navegacion en sus propietarios, y claves de almacenamiento en SessionService. No agregar entornos remotos ficticios ni reemplazos de build innecesarios; si despues se pide otro entorno, configurar el reemplazo en angular.json en una propuesta aparte.

**Archivos a tocar.** `src/environments/environment.ts`, `src/app/services/auth.service.ts`, `src/app/services/tasks.service.ts`, sus specs y los componentes para retirar literales durante H-05; `src/app/services/session.service.ts` para claves compartidas. No es necesario tocar angular.json solo para introducir el archivo de configuracion actual.

**Prueba de caracterizacion antes de tocar esos archivos.** Capturar URL y opciones exactas de ambas llamadas, incluido owner vacio y credenciales originales con espacios. Tras centralizar, ejecutar las mismas aserciones; comprobar que la configuracion por defecto contiene los mismos hosts, puertos y paths y que no se duplica un slash ni el parametro owner.

**Verificacion de correccion.** Compilacion y specs de contrato; no quedan URLs ni claves repetidas en componentes. No interpretar centralizar como autorizacion para cambiar HTTP por HTTPS o alterar puertos.

## H-07: Uso extensivo de any

**Hallazgo y motivo.** H-07, Refactor, severidad media; seleccionado para comprobar estado y contratos estaticamente. Evidencia: [login.component.ts:16](src/app/login/login.component.ts#L16), [dashboard.component.ts:23](src/app/dashboard/dashboard.component.ts#L23) y [legacy-format.ts:1](src/app/utils/legacy-format.ts#L1).

**Problema.** any permite respuestas o tareas incompatibles y no documenta que propiedades se necesitan. Un cambio de tipos no debe inventar un contrato mas estricto que el backend observado.

**Cambio propuesto.** Introducir interfaces propias LoginRequest, LoginResponse, SessionUser, Task y Preferences, separando respuestas de transporte y estado de vista. Los campos no garantizados por el frontend quedan opcionales o unknown hasta estrecharlos; no inferir ids, roles, JWT ni enumeraciones cerradas. Declarar username/password/message/error como string y busy/loading como boolean; el validador compartido acepta unknown para cubrir entradas invalidas. Tipar priority/owner de acuerdo con los casos caracterizados y conservar los defaults de formatTaskLabel. Recibir errores como unknown y usar el mapper seguro compartido. Si validar datos en ejecucion cambia como se responde a datos malformados, especificar la nueva salida y su prueba de regresion antes de hacerlo; no esconder rechazos nuevos en casts ni non-null assertions.

**Archivos a tocar.** `src/app/models/auth.models.ts`, `src/app/models/task.models.ts`, `src/app/models/preferences.models.ts` propuestos; ambos componentes y servicios compartidos; `src/app/utils/legacy-format.ts`, su spec y las utilidades de tareas, validacion y errores. No ampliar la configuracion global de TypeScript sin demostrar que es necesario para este alcance.

**Prueba de caracterizacion antes de tocar esos archivos.** Cubrir los campos realmente leidos, usuario sin username/displayName, token ausente, tareas vacias, estados desconocidos, prioridad/owner ausentes y valores que actualmente convierten a String. Ampliar el spec existente con formatTaskLabel sin datos y defaults. Las expectativas sobre respuestas malformadas se registran como comportamiento observado; si se propone rechazo seguro, agregar un caso de regresion separado con loading/busy restablecido. Verificar interfaces mediante `npm run build` y, para los specs que no incluya el build Angular, una comprobacion TypeScript de pruebas configurada expresamente sin suponer que Vitest hace typecheck.

**Verificacion de correccion.** Sin any en la superficie modificada, ni aserciones inseguras para ocultar errores. Compilacion y pruebas verdes sin exigir campos nuevos al backend.

## H-08: Pruebas limitadas a una utilidad

**Hallazgo y motivo.** H-08, Refactor, severidad media; seleccionado como requisito previo a los cambios del flujo. Evidencia: [legacy-format.spec.ts:4](src/app/utils/legacy-format.spec.ts#L4) y [vitest.config.ts:6](vitest.config.ts#L6).

**Problema.** Solo se prueba un caso de formateo, sin caracterizacion del flujo ni porcentaje de cobertura medido. El entorno node no comprueba por si solo el binding HTML y los eventos.

**Cambio propuesto.** Implementar primero la infraestructura minima y la suite de caracterizacion de los dos componentes, ampliar la utilidad existente y luego agregar specs a servicios conforme se extraigan. Mantener un test integrado de login -> sesion -> tareas -> logout con HTTP simulado. Compartir fixtures sin datos sensibles y helper de mocks. Usar la estrategia DOM y justificacion de jsdom indicadas arriba; no cambiar el test runner ni agregar una segunda libreria de aserciones. Incluir todos los archivos productivos modificados en el denominador de cobertura aunque no se importen; no inflar cobertura excluyendo ramas de error. Comprobar umbrales de 85% o superior en lineas, sentencias, funciones y ramas de ese conjunto y preservar cualquier gate existente mas exigente.

**Archivos a tocar.** `src/app/login/login.component.spec.ts`, `src/app/dashboard/dashboard.component.spec.ts`, `src/app/utils/legacy-format.spec.ts`, specs de servicios/utilidades enumerados por hallazgo, `src/testing/setup.ts`, `src/testing/workshop-test-helpers.ts` propuestos y `vitest.config.ts`. `package.json` y `package-lock.json` solo para la devDependency DOM justificada o un comando de typecheck de specs si hace falta. Configuracion TypeScript de tests dedicada solo si el toolchain no comprueba esos archivos. Revisar la CI existente antes de conectar `test:coverage`; si se agrega ese gate, el unico archivo CI previsto es `.github/workflows/ci.yml` y no se relajan build, test ni alertas.

**Prueba de caracterizacion antes de tocar codigo productivo.** Ejecutar la prueba existente como baseline; luego probar credenciales vacias, login correcto/sin token/rechazado, orden de almacenamiento/navegacion, dashboard sin token, Bearer/owner, lista vacia/filtrada/ordenada, etiquetas, errores y logout con preferencias conservadas. Demostrar que el helper restaura mocks y almacenamiento entre casos. Antes de ajustar la infraestructura, registrar la inclusion actual de specs y que el unico spec de utilidad pasa; despues confirmar que sigue ejecutandose junto con los nuevos. Pruebas de seguridad nuevas de H-03/H-04 deben distinguirse de las expectativas de caracterizacion.

**Verificacion de correccion.** `npm test`, `npm run test:coverage`, `npm run build` y typecheck de specs cuando se configure. Informes dentro de `coverage/` en este repositorio. La meta no es un porcentaje global supuesto: medir y comprobar el conjunto realmente modificado, sin excluir componentes o errores para alcanzar el umbral.

## H-09: Condicionales anidados en login

**Hallazgo y motivo.** H-09, Refactor, severidad baja; seleccionado para simplificar el control de flujo. Evidencia: [login.component.ts:33](src/app/login/login.component.ts#L33) y [login.component.ts:36](src/app/login/login.component.ts#L36).

**Problema.** La validacion de usuario envuelve la de password y esta envuelve el transporte y la comprobacion del token. Cambiar esta estructura puede alterar prioridades de mensaje o dejar busy activado.

**Cambio propuesto.** Usar retornos anticipados para usuario y password invalidos, una sola region try/finally para la operacion asincrona y una salida explicita cuando no hay token. Reutilizar el validador de H-10 y el servicio tipado de H-05. Validar sin mutar las credenciales; usuario invalido mantiene precedencia cuando ambos campos son invalidos. Mantener busy false en todas las salidas y esperar el guardado de sesion antes de navegar. Aplicar mensajes de texto de H-04, no conservar etiquetas HTML para preservar el refactor.

**Archivos a tocar.** `src/app/login/login.component.ts`, su spec y `src/app/utils/credential-validation.ts` propuesto y compartido con H-10; AuthService solo si se necesita ajustar su resultado tipado. No introducir una jerarquia de validadores.

**Prueba de caracterizacion antes de tocar esos archivos.** Tabla de casos con null, undefined, cadena vacia, espacios y credenciales validas; verificar precedencia de usuario, cero llamadas HTTP/navegacion al fallar y envio de los valores originales al pasar. Cubrir token ausente, rechazo HTTP y rechazo de navegacion para comprobar finally/busy. Al adaptar mensajes con H-04, mantener la razon del error, no el markup anterior.

**Verificacion de correccion.** Specs del login y build; sin cascada de if dentro de if, sin llamadas adicionales ni diferencias en el contrato POST.

## H-10: Validaciones y claves duplicadas

**Hallazgo y motivo.** H-10, Refactor, severidad baja; seleccionado para evitar cambios parciales de validacion/sesion. Evidencia: [login.component.ts:33](src/app/login/login.component.ts#L33), [login.component.ts:48](src/app/login/login.component.ts#L48) y [dashboard.component.ts:75](src/app/dashboard/dashboard.component.ts#L75).

**Problema.** La expresion de campo vacio se repite y las claves de token/usuario aparecen al escribir, leer y borrar en componentes distintos. No se afirma que existan bloques completos identicos en ambos componentes.

**Cambio propuesto.** Extraer una funcion pequena que detecte credencial vacia con la semantica actual de null/undefined/String(...).trim(), sin limpiar el valor enviado. Centralizar claves en SessionService, que sera el unico propietario de lectura/escritura/eliminacion; login y dashboard no conocen esas claves. Compartir rutas y datos de configuracion con H-06, no crear otro archivo de constantes para repetirlos. H-03 reutiliza las mismas claves solamente para limpieza legada cuando se apruebe la politica en memoria. No agregar genericidad innecesaria ni helpers por cada campo.

**Archivos a tocar.** `src/app/utils/credential-validation.ts`, su spec, `src/app/login/login.component.ts` y su spec; `src/app/services/session.service.ts`, su spec, `src/app/dashboard/dashboard.component.ts` y su spec. Son los mismos archivos propuestos en H-05/H-09, no implementaciones alternativas.

**Prueba de caracterizacion antes de tocar esos archivos.** Reutilizar la tabla de validacion de H-09 y verificar que ambos campos aplican la misma regla pero mantienen mensajes distintos. Con un solo almacenamiento simulado, demostrar que login escribe exactamente las claves que dashboard lee y logout borra; preferencias sobreviven. Tras extraer, probar directamente SessionService y mantener el test integrado. Al cambiar a memoria, conservar la comprobacion de limpieza legada y sustituir explicitamente la expectativa de persistencia como indica H-03.

**Verificacion de correccion.** Una sola implementacion de la regla y un propietario de las claves; sin acceso directo a almacenamiento desde componentes, sin duplicar helpers de tests.

## Orden incremental y gates

1. H-08: escribir baseline, infraestructura minima y caracterizacion del comportamiento actual. H-01/H-02: actualizaciones de dependencias en incrementos separados con los contratos capturados; volver a ejecutar pruebas, build y auditoria despues de cada una.
2. H-07/H-06/H-10: introducir tipos, configuracion y funciones pequenas en incrementos revisables, comprobando primero sus casos caracterizados. No modificar la politica de sesion aun.
3. H-05: extraer transporte y sesion conservando su comportamiento, reutilizar la infraestructura ya creada y mantener la prueba integrada. H-09: simplificar login con los mismos contratos.
4. H-04: aplicar texto y mensajes seguros, agregando primero los tests de la nueva expectativa y ajustando las caracterizaciones de presentacion de forma explicita.
5. H-03: obtener aprobacion sobre recarga/pestanas; agregar tests de memoria y limpieza legada antes de cambiar almacenamiento. Si la decision no se aprueba, no ejecutar esa correccion ni declararla resuelta.
6. Por incremento: test focalizado del archivo/servicio afectado, despues suite, build y cobertura requerida. Ejecutar auditoria cuando cambien dependencias. No reducir gates ni esconder alertas ajenas al incremento.

Todos los comandos Git y npm se ejecutaran desde workshop-login-frontend, y los informes/fixtures se guardaran dentro de ella. No leer ni modificar otros componentes; coordinar contratos externos sin cambiarlos ni asumir su implementacion. Antes de cualquier instalacion futura, revisar los cambios existentes del lockfile. No crear commits ni ramas sin solicitud.

Tras implementar y verificar cada correccion en una fase posterior, actualizar evidencia y estado en HALLAZGOS.md, no llevar una segunda matriz aqui. Si un archivo citado cambia de lineas, corregir sus referencias de evidencia en esa matriz en el mismo incremento. Este plan no certifica que ninguna prueba, auditoria futura o meta de cobertura ya se haya cumplido.