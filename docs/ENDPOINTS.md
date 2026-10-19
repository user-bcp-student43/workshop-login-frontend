# Mapa y flujo funcional observado

Documento generado a partir del frontend porque no existia. Describe el comportamiento actual que debe preservarse; no es una especificacion verificada de los backends. El seguimiento de hallazgos reside exclusivamente en [HALLAZGOS.md](../HALLAZGOS.md).

## Componentes y dependencias

| Elemento | Responsabilidad y dependencias | Evidencia |
|---|---|---|
| Arranque | bootstrapApplication inicia AppComponent con provideRouter(routes). | [src/main.ts:6](../src/main.ts#L6) |
| AppComponent | Aloja RouterOutlet; no contiene logica de autenticacion. | [src/app/app.component.ts:7](../src/app/app.component.ts#L7) |
| Rutas | /login y /dashboard cargan componentes standalone de forma diferida. La raiz y las rutas desconocidas redirigen a /login. No hay guards declarados; la comprobacion de token ocurre en dashboard. | [src/app/app.routes.ts:3](../src/app/app.routes.ts#L3) |
| LoginComponent | CommonModule, FormsModule, Router, axios y lodash/merge. Gestiona credenciales, preferencias, HTTP, mensajes y almacenamiento de sesion. | [src/app/login/login.component.ts:1](../src/app/login/login.component.ts#L1); [src/app/login/login.component.ts:15](../src/app/login/login.component.ts#L15) |
| DashboardComponent | CommonModule, Router, NgZone, ChangeDetectorRef, axios y formatTaskLabel. Lee la sesion, carga y transforma tareas, presenta estados y cierra sesion. | [src/app/dashboard/dashboard.component.ts:1](../src/app/dashboard/dashboard.component.ts#L1); [src/app/dashboard/dashboard.component.ts:22](../src/app/dashboard/dashboard.component.ts#L22) |
| formatTaskLabel | Utilidad sin dependencias externas: prioridad y propietario en mayusculas; usa NORMAL, SIN-ASIGNAR o SIN-DATOS como valores por defecto. | [src/app/utils/legacy-format.ts:1](../src/app/utils/legacy-format.ts#L1) |
| Dependencias declaradas | Angular 21.2.19, Axios 0.31.0, Lodash 4.17.21, RxJS 7.8.2, tslib 2.8.1 y zone.js 0.15.1. Vitest 3.2.4 y coverage-v8 para pruebas; TypeScript 5.9.3 y Angular CLI/build para compilacion. No se observa uso directo de RxJS en los dos componentes. | [package.json:12](../package.json#L12); [package.json:25](../package.json#L25) |

## Endpoints consumidos

| Metodo y URL actual | Solicitud | Respuesta consumida y errores | Evidencia |
|---|---|---|---|
| POST http://localhost:8080/auth/login | JSON con username, password y client: angular-workshop. Timeout de 5000 ms. No se agrega Authorization en esta llamada. | Se comprueba response.data.token; se guarda tambien response.data.user, sin validar su estructura. Si falta token se muestra un error. En excepciones se toma error.response.data.message, luego error.message y luego Error desconocido. No hay manejo distinto por codigo HTTP. | [src/app/login/login.component.ts:41](../src/app/login/login.component.ts#L41); [src/app/login/login.component.ts:46](../src/app/login/login.component.ts#L46); [src/app/login/login.component.ts:55](../src/app/login/login.component.ts#L55) |
| GET http://localhost:8000/api/tasks?owner=<username> | owner se concatena desde workshop_user.username o cadena vacia, sin codificar explicitamente. Header Authorization: Bearer <token>. No se configura timeout en esta llamada. | Se espera un arreglo directamente en response.data, no un objeto con propiedad tasks. Cada tarea se consume por status, priority, owner, title y description. En excepciones se toma error.response.data.detail, luego error.message y luego un mensaje generico; no hay tratamiento especifico de 401/403. | [src/app/dashboard/dashboard.component.ts:43](../src/app/dashboard/dashboard.component.ts#L43); [src/app/dashboard/dashboard.component.ts:46](../src/app/dashboard/dashboard.component.ts#L46); [src/app/dashboard/dashboard.component.ts:65](../src/app/dashboard/dashboard.component.ts#L65); [src/app/dashboard/dashboard.component.html:21](../src/app/dashboard/dashboard.component.html#L21) |

Los puertos 8080 y 8000 identifican servicios externos esperados por este frontend. No se inspeccionaron otros componentes del workspace. No se infieren tipos completos, campos obligatorios del backend, codigos HTTP de exito ni validacion criptografica del token.

## Flujo de autenticacion completo

1. **Entrada y preferencias.** La raiz lleva a /login. Al construir LoginComponent se lee workshop_preferences de localStorage, se parsea JSON y se combina con los valores theme: light, showTips: true y compact: false mediante merge. Un error de lectura se registra en consola. Evidencia: [src/app/login/login.component.ts:20](../src/app/login/login.component.ts#L20).
2. **Validacion y login.** El boton llama login(); mientras busy es verdadero queda deshabilitado. Usuario y password nulos, indefinidos o vacios tras trim se rechazan, pero se envian los valores originales, sin normalizarlos. Con ambos presentes se ejecuta POST /auth/login. Evidencia: [src/app/login/login.component.html:34](../src/app/login/login.component.html#L34); [src/app/login/login.component.ts:31](../src/app/login/login.component.ts#L31).
3. **Guardar sesion.** Si hay token, se escribe workshop_token, se serializa user en workshop_user y se serializan las preferencias en workshop_preferences; despues se navega a /dashboard. Si falta token o hay una excepcion se muestra message mediante innerHTML. finally restaura busy. Evidencia: [src/app/login/login.component.ts:46](../src/app/login/login.component.ts#L46); [src/app/login/login.component.ts:58](../src/app/login/login.component.ts#L58); [src/app/login/login.component.html:39](../src/app/login/login.component.html#L39).
4. **Recuperar sesion.** ngOnInit del dashboard lee token y parsea workshop_user. Si no hay token redirige a /login y no consulta tareas. El parseo del usuario ocurre antes de comprobar el token y fuera del try de HTTP; un JSON invalido puede interrumpir la inicializacion. El frontend solo comprueba presencia del token, no caducidad ni firma. Evidencia: [src/app/dashboard/dashboard.component.ts:35](../src/app/dashboard/dashboard.component.ts#L35).
5. **Consultar y mostrar tareas.** Con token se ejecuta GET /api/tasks con owner y Bearer. Se excluyen de visibleTasks las tareas cuyo status sea exactamente ARCHIVED; se agrega label con formatTaskLabel y se ordena con el comparador de priority existente, descendente segun el operador > de JavaScript, sin una escala explicita de prioridades. tasks conserva la respuesta completa. NgZone y detectChanges actualizan la vista y loading; en error se muestra error y se desactiva loading, sin borrar sesion ni redirigir. statusLabel traduce TODO, IN_PROGRESS, DONE, RESUELTO y COMPLETED. Evidencia: [src/app/dashboard/dashboard.component.ts:7](../src/app/dashboard/dashboard.component.ts#L7); [src/app/dashboard/dashboard.component.ts:43](../src/app/dashboard/dashboard.component.ts#L43); [src/app/dashboard/dashboard.component.ts:59](../src/app/dashboard/dashboard.component.ts#L59); [src/app/dashboard/dashboard.component.ts:65](../src/app/dashboard/dashboard.component.ts#L65).
6. **Cerrar sesion.** El boton ejecuta logout(): elimina workshop_token y workshop_user y navega a /login. workshop_preferences permanece. No se observa llamada a un endpoint de logout, revocacion ni refresco del token; el cierre es local. Evidencia: [src/app/dashboard/dashboard.component.html:9](../src/app/dashboard/dashboard.component.html#L9); [src/app/dashboard/dashboard.component.ts:74](../src/app/dashboard/dashboard.component.ts#L74).

## Riesgos funcionales al cambiar el flujo

- Conservar POST /auth/login, GET /api/tasks, client, el parametro owner y la cabecera Bearer; modificar estos elementos sin coordinar el contrato externo puede romper autenticacion o carga de tareas.
- Conservar el orden guardar sesion -> navegar -> recuperar sesion -> consultar tareas. Si se cambia el almacenamiento, login, dashboard y logout deben usar la misma fuente de sesion.
- Preservar estados de carga/error, filtrado de ARCHIVED, etiquetas y cierre local. La representacion de errores puede pasar a texto sin cambiar la solicitud HTTP.
- No confundir presencia local de token o el filtro owner con autorizacion efectiva: esta debe comprobarla el backend, no inspeccionado aqui.

## Verificacion realizada

Inspeccion estatica del codigo y manifiesto; no se ejecutaron el frontend ni los servicios externos. Las respuestas se describen por los campos leidos en el codigo, no por capturas de trafico. No se modificaron endpoints, codigo, configuracion ni pruebas.