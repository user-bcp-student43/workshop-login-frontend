# Endpoints externos consumidos

Contrato observado del frontend refactorizado al 2026-10-19. Describe lo que este cliente envia, consume y muestra hoy; no sustituye una especificacion del backend. Los tipos TypeScript expresan expectativas, no validacion automatica de respuestas en ejecucion.

Las URLs actuales se configuran en [src/environments/environment.ts](../src/environments/environment.ts). Los dos servicios externos son autenticacion en localhost:8080 y tareas en localhost:8000. No se inspeccionaron otros componentes del workspace ni se capturo trafico de sus servidores.

Los ejemplos reproducen los valores del [fixture XHR del repositorio](../src/app/services/http-contract.spec.ts): son ejemplos reales de pruebas del cliente, no credenciales utilizables ni respuestas confirmadas de los backends. Se muestran las URLs de configuracion actual; el fixture usa un puerto efimero. Los ejemplos HTTP son extractos funcionales: headers de transporte como Host, Origin o Content-Length dependen del navegador y no se fijan en la aplicacion.

## Login: POST http://localhost:8080/auth/login

### 1. Quien lo llama

LoginComponent llama AuthService.login(username, password) al pulsar Ingresar. AuthService construye el objeto de solicitud, ejecuta axios.post y devuelve response.data, no la respuesta HTTP completa. Los componentes no llaman HTTP directamente.

Antes de enviar, el componente rechaza usuario o password null, undefined, vacio o formado solo por espacios; el usuario se valida primero. Esta comprobacion no transforma los valores: espacios alrededor de credenciales validas se envian intactos. No hay parametro de URL ni token de sesion en esta llamada. El timeout configurado es 5000 ms.

Evidencia: [AuthService](../src/app/services/auth.service.ts), [LoginComponent](../src/app/login/login.component.ts), [isBlankCredential](../src/app/utils/credential-validation.ts) y [pruebas del contrato POST](../src/app/services/auth.service.spec.ts).

### 2. Que envia

**Headers funcionales:**

| Header | Valor | Origen y alcance |
|---|---|---|
| Content-Type | application/json | Axios lo establece al serializar el objeto enviado; el servicio no agrega un override. |
| Accept | application/json, text/plain, */* | Default de Axios; no significa que cualquier forma de respuesta permita completar el login. |
| Authorization | No agregado por esta llamada | No se envia el token persistido ni un Bearer para autenticar las credenciales. |

**Body JSON:**

| Campo | Tipo esperado | Valor/regla del cliente |
|---|---|---|
| username | string | Valor original del input de usuario, sin trim antes de enviar. No vacio segun la validacion local. |
| password | string | Valor original del input de password, sin trim antes de enviar. No vacio segun la validacion local. |
| client | string | Constante angular-workshop definida en AuthService. |

No se envia owner, user, preferences, token, roles ni otro campo. Tampoco se configura withCredentials ni un flujo de autenticacion por cookies.

**Ejemplo real del fixture:**

```http
POST /auth/login HTTP/1.1
Host: localhost:8080
Content-Type: application/json
Accept: application/json, text/plain, */*

{"username":"student","password":"fixture-only","client":"angular-workshop"}
```

Los valores de este body aparecen en el fixture XHR; la prueba de AuthService comprueba tambien que valores como " student " y " password " no se normalizan. Headers JSON/Accept y serializacion: defaults y transformRequest de Axios instalado en [node_modules/axios/lib/defaults/index.js](../node_modules/axios/lib/defaults/index.js). Headers agregados por el servicio y timeout: [AuthService](../src/app/services/auth.service.ts).

### 3. Que espera recibir en exito

**Codigo de estado:** Axios acepta 200 a 299 por defecto. El servicio no comprueba un codigo de exito concreto. Ademas de un estado aceptado, la UI exige un response.data con propiedad token de valor truthy. Por eso un 204 sin body o un 200 sin token no completa el login. El fixture retorna 200 con JSON; el codigo exacto usado por el backend real es una pregunta abierta.

Se espera un objeto JSON directo, no un envoltorio como {data: {token: ...}}. AuthService ya devuelve el data de Axios.

| Campo de respuesta | Tipo esperado por el cliente | Uso y requisito efectivo |
|---|---|---|
| token | string; opcional en LoginResponse | Necesario con valor no vacio para avanzar. La comprobacion real solo es !response?.token: no valida tipo, firma, expiracion ni formato JWT. |
| user | objeto SessionUser; opcional | Se serializa en workshop_user; si falta o es null se persiste {}. Su ausencia no impide navegar cuando hay token. |
| user.username | string; opcional | Al recuperar sesion solo se conserva si es string. Se usa para owner al consultar tareas y como alternativa en el saludo. |
| user.displayName | string; opcional | Al recuperar sesion solo se conserva si es string. Se prefiere a username en el saludo. |

No se consumen expiresIn, refreshToken, id, roles ni permisos. No se exige que el objeto user tenga mas propiedades; getUser expone solo username/displayName comprobados como string.

**Ejemplo real de exito del fixture:**

```http
HTTP/1.1 200 OK
Content-Type: application/json

{"token":"fixture-token","user":{"username":"student"}}
```

El fixture no incluye displayName; ese campo es opcional y su consumo se verifica en el modelo, SessionService y el saludo del dashboard, no se inventa en el ejemplo.

**Reaccion de la UI en exito:** SessionService escribe workshop_token, workshop_user y workshop_preferences, en ese orden; despues LoginComponent espera la navegacion a /dashboard. El dashboard recupera token/usuario y consulta tareas. En finally, busy vuelve a false y markForCheck notifica el cambio de vista. Las preferencias no se envian a /auth/login: son datos locales.

Evidencia: [LoginResponse/SessionUser](../src/app/models/auth.models.ts), [SessionService](../src/app/services/session.service.ts), [LoginComponent](../src/app/login/login.component.ts), [saludo de dashboard](../src/app/dashboard/dashboard.component.html) y [fixture de exito](../src/app/services/http-contract.spec.ts). Estados aceptados: validateStatus de [Axios](../node_modules/axios/lib/defaults/index.js).

### 4. Como reacciona ante errores

Mientras el POST esta pendiente, busy es true y el boton muestra el estado de ingreso y queda deshabilitado. Las excepciones que llegan al try/catch del login comparten el mensaje local de autenticacion; no se clasifican por codigo HTTP o codigo Axios.

| Caso | Reaccion actual de la UI y sesion |
|---|---|
| Usuario invalido localmente | No hay POST; muestra Ingrese un usuario. y termina sin navegar. |
| Password invalido localmente, con usuario valido | No hay POST; muestra el mensaje que pide una contrasena y termina sin navegar. |
| HTTP 400/401/403, por ejemplo credenciales rechazadas | Muestra `No se pudo autenticar a <usuario>. Verifique sus credenciales o intente nuevamente.` como texto. No navega a dashboard; finally restablece busy y notifica la vista. No revela message/detail del servidor. |
| HTTP 404, 429, 5xx u otro estado final fuera de 200-299 | Mismo mensaje y restablecimiento de busy. No hay tratamiento de rate limit, reintentos automaticos ni rama especial por codigo. |
| Timeout del POST, despues de 5000 ms | El rechazo llega al mismo catch: mensaje local, busy false, permanece en login. No hay texto especial de timeout ni reintento automatico. |
| Error de red, conexion rechazada, CORS o rechazo del transporte | Misma reaccion que un error HTTP. Los detalles internos no se interpolan. |
| 2xx sin token, token vacio/falsy, body vacio, null o forma sin propiedad token | Muestra el mensaje de backend sin token, no guarda una nueva sesion y no navega. finally restablece busy. Esto incluye 204 sin body y un envoltorio inesperado. |
| JSON invalido o texto/HTML no parseable como objeto con token | No se establece responseType: json estricto. Si Axios entrega una cadena sin token, aplica el caso anterior; si el transporte lanza, aplica el catch generico. No hay validador de schema que garantice otro mensaje. |
| Token recibido truthy pero invalido, expirado o de tipo no esperado | El login no lo detecta: guarda la sesion y navega. Si /api/tasks lo rechaza, el dashboard muestra el error de tareas indicado en su apartado. No se promete una validacion criptografica local. |
| user ausente o null | No es un error que impida el login: se guarda {} y se avanza con token. El owner posterior sera vacio si no hay username string. Otros tipos/campos no se validan antes de persistirlos. |
| Falla al persistir, por ejemplo localStorage no disponible | La excepcion dentro de save llega al mismo catch de login. busy vuelve a false; no se llega a navegar si save lanza. Las escrituras no son transaccionales: pueden quedar token o usuario parcialmente guardados. |
| La navegacion a dashboard rechaza su promesa o Router devuelve false | El rechazo llega al catch; si devuelve false, LoginComponent genera un error local dentro del try y reutiliza ese mismo catch. Muestra el mensaje seguro de login, restablece busy y notifica la vista. La sesion ya guardada se conserva; no se reintenta el POST ni la navegacion. Con true se mantiene el camino exitoso. |

Un login fallido o sin token no borra automaticamente una sesion previa. Los mensajes locales describen el resultado visible, no prueban la causa exacta del error del servidor.

Evidencia: [control de flujo y finally](../src/app/login/login.component.ts), [mensajes locales](../src/app/utils/user-facing-error.ts), [persistencia](../src/app/services/session.service.ts), [casos de login y DOM](../src/app/login/login.component.spec.ts) y transformResponse de [Axios](../node_modules/axios/lib/defaults/index.js).

### 5. Notas de seguridad relevantes

- La plantilla de login usa interpolacion {{ message }}, no innerHTML ni bypassSecurityTrustHtml. Usuario y mensajes se muestran como texto; los detalles crudos del backend no se exponen. Evidencia: [plantilla](../src/app/login/login.component.html) y [politica comun de errores](../src/app/utils/user-facing-error.ts).
- SessionService es el unico propietario del almacenamiento. El token sigue en localStorage bajo workshop_token y el usuario en workshop_user; centralizar no vuelve inaccesible el token al JavaScript del origen. La alternativa en memoria de H-03 no esta implementada. Las preferencias se recuperan mediante merge con defaults y permanecen al cerrar sesion. Evidencia: [SessionService](../src/app/services/session.service.ts).
- El cliente no comprueba firma, caducidad ni permisos. Un token truthy no prueba autenticidad. La URL HTTP de loopback se conserva como configuracion actual del laboratorio, no como recomendacion de transporte productivo.
- El servicio no agrega Authorization ni configura autenticacion por cookies en el login. No hay interceptor de renovacion ni solicitud a un endpoint refresh en este flujo.

**Preguntas abiertas de login:**

- Que codigo exacto de exito devuelve el backend real y que schema valida para token/user? El cliente solo expresa los tipos anteriores y comprueba presencia del token.
- El token es JWT u opaco, cuanto dura y como se revoca? No existe consumo de metadatos de expiracion ni refresh en este cliente.
- Que codigos/cuerpos distingue el backend para credenciales incorrectas, rate limit y errores internos? La UI los trata igual, por lo que no se pueden inferir del frontend.
- Que politica CORS permite el origen y puerto del frontend? Los headers permisivos del fixture no son evidencia de la configuracion del backend real.

## Tareas: GET http://localhost:8000/api/tasks

### 1. Quien lo llama

DashboardComponent llama TasksService.getTasks(token, username) durante ngOnInit, despues de recuperar token y usuario mediante SessionService. TasksService ejecuta axios.get y devuelve response.data como el arreglo esperado de Task.

El componente comprueba solo presencia del token. Si falta y la sesion es legible, navega a /login y no realiza el GET. La lectura de token y el parseo del usuario estan dentro del try/catch de inicializacion: si fallan, se muestra el error local y termina loading, sin GET ni redireccion. No se configura polling, refresco automatico o reintento; una recarga o nueva inicializacion del dashboard vuelve a consultar.

Evidencia: [DashboardComponent](../src/app/dashboard/dashboard.component.ts), [TasksService](../src/app/services/tasks.service.ts) y [SessionService](../src/app/services/session.service.ts).

### 2. Que envia

**Headers funcionales:**

| Header | Valor | Origen y alcance |
|---|---|---|
| Authorization | `Bearer <token>` | TasksService concatena Bearer y el token leido de workshop_token. No verifica su validez. |
| Accept | application/json, text/plain, */* | Default de Axios, sin override del servicio. |
| Content-Type | No configurado para este GET sin body | No se envia JSON de solicitud ni se agrega un header de contenido desde TasksService. |

**Query params:**

| Parametro | Tipo/valor | Regla del cliente |
|---|---|---|
| owner | string | user.username si es string truthy; en otro caso cadena vacia. La URL se construye como tasksUrl + ?owner= + username. |

No hay body, paginacion, filtro de status, orden, limite ni otros parametros agregados por el cliente. El servicio no usa params de Axios ni encodeURIComponent para owner: la concatenacion se mantiene incluso cuando contiene caracteres reservados; la serializacion de la URL por el navegador no debe confundirse con una codificacion explicita y segura del valor.

No se configura timeout en el GET: se hereda el default Axios de 0 ms, que no establece limite de espera. Tampoco se configura withCredentials o una estrategia de cookies.

**Ejemplo real del fixture, con token de prueba y usuario student:**

```http
GET /api/tasks?owner=student HTTP/1.1
Host: localhost:8000
Authorization: Bearer fixture-token
Accept: application/json, text/plain, */*
```

Cuando user no aporta username, el cliente construye /api/tasks?owner=. No debe asumirse que el servidor interprete ese owner como usuario autenticado o acceso a todas las tareas.

Evidencia: [TasksService](../src/app/services/tasks.service.ts), [seleccion de username](../src/app/dashboard/dashboard.component.ts), [tests de owner y header](../src/app/services/tasks.service.spec.ts), [fixture XHR](../src/app/services/http-contract.spec.ts) y defaults de [Axios](../node_modules/axios/lib/defaults/index.js).

### 3. Que espera recibir en exito

**Codigo de estado:** Axios acepta 200 a 299 por defecto; TasksService no comprueba un codigo concreto. El fixture devuelve 200 con un array JSON. La forma del body tambien importa: un 204 vacio no equivale a una lista vacia y provoca el tratamiento de respuesta inesperada descrito abajo. El codigo exacto del backend real es una pregunta abierta.

**Body:** arreglo JSON directo de tareas. No se espera {tasks: [...]} ni {data: [...]}. Un [] valido termina la carga y presenta el estado de lista vacia.

| Campo por tarea | Tipo esperado por Task | Uso en el cliente |
|---|---|---|
| title | string; opcional | Encabezado de la tarea, por interpolacion. Si falta no se inventa un titulo. |
| description | string; opcional | Descripcion por interpolacion; puede faltar. |
| status | string; opcional | Excluye solo el valor exacto ARCHIVED. Se traduce para el texto del estado y se usa en minusculas para la clase CSS. |
| priority | string o number; opcional | Ordena por el operador > de JavaScript, no por una escala low/medium/high definida. Para label se convierte a mayusculas si es truthy, o usa NORMAL. |
| owner | unknown; opcional en TaskLabelInput | Solo se usa para label: String(owner).toUpperCase() si es truthy; de lo contrario SIN-ASIGNAR. No se usa como prueba de autorizacion. |
| label | string; opcional en Task | No se requiere del backend. El cliente recalcula y sustituye este campo en las copias de tareas visibles; no confia en un label remoto. |

Los tipos son expectativas estaticas, no un validador de schema en runtime. No se consumen id, fecha, total, cursor, pagina o permisos.

**Ejemplo real de exito del fixture:**

```http
HTTP/1.1 200 OK
Content-Type: application/json

[{"title":"Task","status":"TODO"}]
```

El ejemplo omite campos opcionales que el fixture tampoco aporta. Para esta tarea el cliente calcula label NORMAL seguido del separador de punto medio y SIN-ASIGNAR, muestra Task como titulo y Por hacer como estado.

**Reaccion de la UI en exito:** selectVisibleTasks filtra solo ARCHIVED y crea copias etiquetadas, sin mutar el array recibido. Ordena descendente con >; ante prioridad undefined o comparacion no mayor devuelve 1, sin una escala explicita ni una rama de igualdad que devuelva 0. El componente conserva el array completo en tasks, asigna las copias filtradas a visibleTasks, pone loading en false y actualiza la vista dentro de NgZone mediante detectChanges.

| Status recibido | Texto mostrado |
|---|---|
| TODO | Por hacer |
| IN_PROGRESS | En progreso |
| DONE | Completado |
| RESUELTO | Resuelto |
| COMPLETED | Completado |
| Otro string | El valor original |

La traduccion convierte primero el status a mayusculas; el filtrado ARCHIVED, en cambio, es sensible a mayusculas. Por eso archived en minusculas no se elimina. Sin status se usa texto vacio. Si no quedan tareas visibles, la UI muestra su mensaje de lista vacia.

Evidencia: [Task/TaskLabelInput](../src/app/models/task.models.ts), [seleccion y orden](../src/app/utils/task-selection.ts), [formato de etiquetas](../src/app/utils/legacy-format.ts), [estados y carga](../src/app/dashboard/dashboard.component.ts), [plantilla](../src/app/dashboard/dashboard.component.html) y [fixture](../src/app/services/http-contract.spec.ts).

### 4. Como reacciona ante errores

Mientras el GET sigue pendiente, loading es true y se muestran placeholders de carga. Las excepciones de HTTP o transformacion que llegan al try/catch del dashboard producen el mismo mensaje local No se pudo cargar el dashboard, loading false y actualizacion de vista. La grilla queda oculta cuando error no esta vacio.

| Caso | Reaccion actual de la UI y sesion |
|---|---|
| Token local ausente, con usuario parseable | No se realiza GET; navega a /login. No renueva token ni solicita credenciales mediante la API de tareas. |
| Token invalido/expirado rechazado con 401, o acceso rechazado con 403 | Muestra No se pudo cargar el dashboard y deja loading false. No elimina token/usuario, no navega automaticamente a login y no diferencia estos codigos del resto de errores. |
| HTTP 400, 404, 429, 5xx u otro estado final fuera de 200-299 | Mismo mensaje local, grilla oculta y loading false; no hay reintento automatico ni accion especial por codigo. |
| Error de red, conexion rechazada, CORS o rechazo del transporte | Misma reaccion del catch; no muestra detail/message externos ni borra la sesion. |
| El servidor no responde y la conexion sigue pendiente | No existe timeout finito del cliente para este GET. La UI puede permanecer con loading true hasta que termine o falle el transporte o se abandone la vista. No existe una notificacion de timeout propia. |
| Un timeout/rechazo llega desde el transporte | Si la promesa rechaza, aplica el mensaje generico y loading false; no hay rama diferenciada de timeout. No se afirma que el GET tenga el timeout de 5000 ms del login. |
| 2xx con objeto envoltorio, null, string, HTML o body vacio/204 en vez del array | Al no existir el metodo filter del arreglo esperado, la seleccion lanza y entra al catch: mensaje local, loading false y grilla oculta. No se convierte el body a lista vacia. |
| Array con elementos null o undefined | El acceso a task.status durante el filtrado puede lanzar y terminar en el mismo catch. No se omiten automaticamente registros invalidos. |
| Array con campos ausentes | Muchos campos son opcionales: puede renderizar tareas incompletas y usar defaults de label/status, en lugar de tratarlo como error. No existe un rechazo de schema antes del renderizado. |
| Tipos inesperados en campos, por ejemplo status truthy que no es string | No hay validacion general. Pueden fallar funciones de etiqueta/estado o el renderizado; si la excepcion ocurre dentro del procesamiento y detectChanges protegidos por try, aplica el catch generico. No se garantiza una reaccion unica para cualquier estructura invalida. |
| JSON de workshop_user sintacticamente invalido o lectura de almacenamiento que lanza | Se captura durante la inicializacion: mensaje No se pudo cargar el dashboard, loading false y actualizacion de vista. No se consulta HTTP ni se navega a login por ese error. No se borra ni repara automaticamente la sesion persistida. |
| Usuario persistido no objeto, o username/displayName de tipo no string | SessionService devuelve usuario vacio o campos undefined. No produce por si solo el error de tareas; si hay token el owner se envia vacio. La respuesta depende del backend. |

Evidencia: [DashboardComponent](../src/app/dashboard/dashboard.component.ts), [SessionService](../src/app/services/session.service.ts), [selectVisibleTasks](../src/app/utils/task-selection.ts), [mensaje local](../src/app/utils/user-facing-error.ts), [tests de dashboard](../src/app/dashboard/dashboard.component.spec.ts), [tests de sesion](../src/app/services/session.service.spec.ts) y [defaults de timeout/JSON de Axios](../node_modules/axios/lib/defaults/index.js).

### 5. Notas de seguridad relevantes

- SessionService lee el token de localStorage y TasksService lo agrega a Authorization. Ningun componente accede directamente a almacenamiento o HTTP; esto separa responsabilidades, pero no elimina el riesgo de token accesible al JavaScript del mismo origen.
- El filtro owner no es una comprobacion de autorizacion; el frontend no demuestra que el backend contraste owner con el token. Ademas, su concatenacion sin codificar explicitamente puede alterar parametros ante caracteres reservados.
- Los campos title, description, label y error se muestran mediante interpolacion. El dashboard no renderiza esos valores con innerHTML. El error visible es local y no expone detail/message del servidor. Evidencia: [plantilla](../src/app/dashboard/dashboard.component.html) y [mapper](../src/app/utils/user-facing-error.ts).
- Cerrar sesion ejecuta SessionService.clear y navega a /login: elimina workshop_token y workshop_user, conserva workshop_preferences. No consume un tercer endpoint de logout, no revoca el token en el servidor ni cancela un GET en vuelo. Una respuesta tardia no tiene una comprobacion adicional de cierre de sesion en el codigo actual.
- Logout no tiene catch propio: si clear o la navegacion lanzan/rechazan, no se muestra un mensaje de logout especifico ni se garantiza completar la redireccion. Las preferencias, al no borrarse, seguiran disponibles al construir el login.

**Preguntas abiertas de tareas:**

- Que codigo de exito y schema exacto devuelve la API real? Hay campos obligatorios, ids, paginacion o tipos de priority/owner que el frontend no expresa?
- Como autoriza el backend el owner, especialmente owner vacio o diferente del usuario del token? El cliente no permite inferir si retorna lista vacia, 400, 403 u otra respuesta.
- Que status y escala de prioridades reconoce el backend? El frontend traduce los cinco status enumerados y compara priority directamente; no contiene una taxonomia contractual completa.
- Que politica CORS y headers admite el servidor real para Authorization? Los headers del fixture no establecen esa politica.
- Hay timeout/revocacion/cancelacion en el servidor o requisitos ante logout durante una consulta? El cliente no configura esas garantias.

## Documentos consultados

- [docs/ENDPOINTS.md](ENDPOINTS.md): version legacy previa, sustituida por este contrato observado actual.
- [docs/GOOD_PRACTICES.md](GOOD_PRACTICES.md): referencia de servicios, tipos, sesion y mensajes seguros.
- [REGLAS.md](../REGLAS.md): conservacion de endpoints y limites del laboratorio.

Tambien se consultaron los servicios, componentes, modelos, utilidades, plantilla de dashboard, configuracion environment, tests de contrato XHR/AuthService y defaults de Axios enlazados en cada apartado. Los enlaces a otros specs senalan comprobaciones existentes de esos comportamientos; esta solicitud no ejecuta esas pruebas ni modifica codigo, configuracion o estados de HALLAZGOS.md.