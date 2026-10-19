# Pruebas de login y tareas

Fecha: 2026-10-19. Contrato de referencia: [docs/ENDPOINTS.md](ENDPOINTS.md). La fase inicial amplio pruebas sin cambiar produccion. La implementacion posterior del plan activo corrige los items autorizados y se registra por separado abajo; el seguimiento de estados permanece exclusivamente en [HALLAZGOS.md](../HALLAZGOS.md).

**Resultado historico de la ampliacion inicial: 133 pruebas, 127 aprobadas y 6 fallidas.** No hubo pendientes ni omitidas en esa ejecucion. Las tablas de comandos, resultados y fallos de la fase inicial se conservan como evidencia historica, no como estado actual de los items ya corregidos.

## Implementacion secuencial del plan activo

### H-11: errores al recuperar la sesion

Tuvo aprobacion humana en el mensaje de implementacion. Se incluyeron getToken y getUser dentro del try/catch existente de ngOnInit, conservando servicios, almacenamiento, endpoints y politicas de 401/403. El catch muestra el mensaje seguro, termina loading y actualiza la vista; una lectura fallida no dispara GET, redireccion ni limpieza de datos.

**Diff local propio:** [reports/h11.patch](../reports/h11.patch), limitado al componente de dashboard y sus pruebas. Se reforzaron Router, errores independientes de token/usuario y tres fixtures DOM con plantilla real.

| Comando desde workshop-login-frontend | Salida | Resultado real de H-11 |
|---|---|---|
| npm test -- src/app/dashboard/dashboard.component.spec.ts --testNamePattern="BUG H-11" --reporter=json --outputFile=reports/h11-before.json | 1 | 6 fallidas antes de corregir produccion; 43 no seleccionadas. |
| npm test -- src/app/dashboard/dashboard.component.spec.ts --testNamePattern="BUG H-11" --reporter=json --outputFile=reports/h11-after.json | 0 | Las mismas 6 aprobadas despues; 43 no seleccionadas. |
| npm run test:typecheck | 0 | Tipos estrictos aprobados. |
| npm run build | 0 | Compilacion y budgets aprobados; warning CommonJS de lodash/merge conservado. |
| npm run test:coverage -- --coverage.reportOnFailure --reporter=json --outputFile=reports/h11-full.json | 1 | 137 casos completos, 133 aprobados, 4 fallos de H-12/H-13/H-14; cobertura 100% en las cuatro metricas. |

Evidencia: [rojo H-11](../reports/h11-before.json), [verde H-11](../reports/h11-after.json) y [suite completa tras H-11](../reports/h11-full.json). Las selecciones por item son comprobaciones focalizadas, no exclusiones del gate completo. El estado H-11 se actualizo a Resuelto antes de iniciar el siguiente item; no se ocultaron los cuatro fallos residuales.

### H-12: navegacion que devuelve false

Se empezo solo despues de que H-11 quedara con sus seis tests en verde y su fila actualizada. Se captura el booleano de Router; false genera un error local dentro del try y reutiliza el catch y finally existentes. No se cambian sesion, rutas, POST ni servicios; se conserva token/usuario incluso si la navegacion falla, sin implementar rollback de H-13.

**Diff local propio:** [reports/h12.patch](../reports/h12.patch), limitado al componente de login y sus pruebas. Los tests verifican false, true y rechazo, un solo POST/navegacion, sesion intacta y reactivacion del boton con clic real y respuesta diferida, sin deteccion manual despues del await.

| Comando desde workshop-login-frontend | Salida | Resultado real de H-12 |
|---|---|---|
| npm test -- src/app/login/login.component.spec.ts --testNamePattern="BUG H-12" --reporter=json --outputFile=reports/h12-before.json | 1 | 4 aprobadas y 2 fallidas antes del cambio; fallan solo false en unidad y DOM. 48 no seleccionadas. |
| npm test -- src/app/login/login.component.spec.ts --testNamePattern="BUG H-12" --reporter=json --outputFile=reports/h12-after.json | 0 | Las mismas 6 aprobadas despues; 48 no seleccionadas. |
| npm run test:typecheck | 0 | Tipos estrictos aprobados. |
| npm run build | 0 | Compilacion y budgets aprobados; warning CommonJS de lodash/merge conservado. |
| npm run test:coverage -- --coverage.reportOnFailure --reporter=json --outputFile=reports/h12-full.json | 1 | 142 casos completos, 139 aprobados y 3 fallos de H-13/H-14, sin pendientes ni omitidos; cobertura 100% en las cuatro metricas. |

Evidencia: [rojo H-12](../reports/h12-before.json), [verde H-12](../reports/h12-after.json) y [suite completa final](../reports/h12-full.json). H-11 y H-12 quedan Resueltos con sus pruebas propias verdes. La suite global sigue roja: quedan una regresion de persistencia parcial y dos de logout, fuera del plan. H-03 no se implementa. No se cambiaron gates ni se filtraron esos fallos en la ejecucion completa.

```diff
// H-11: el mismo try/catch de ngOnInit ahora incluye la sesion.
- const token = this.session.getToken();
- this.user = this.session.getUser();
  try {
+   const token = this.session.getToken();
+   this.user = this.session.getUser();

// H-12: mismo guardado previo y mismo catch/finally.
- await this.router.navigate([AUTH_ROUTES.dashboard]);
+ const navigated = await this.router.navigate([AUTH_ROUTES.dashboard]);
+ if (navigated === false) {
+   throw new Error('Dashboard navigation was not completed');
+ }
```

El bloque anterior es un diff conceptual abreviado; los dos archivos patch contienen los diffs locales reales completos de produccion y pruebas, separados por item. HTTP, cabeceras, cuerpos, timeout y parametros permanecen intactos. No se ejecutaron nuevas pruebas manuales contra servidores externos; los casos de XHR y flujo integrado forman parte de la suite automatizada sin filtros.

## Casos y expectativas

La tabla diferencia expectativas de compatibilidad con el contrato actual de expectativas correctivas para defectos que ese documento identifica. Las regresiones BUG no inventan endpoints, redirecciones, politicas JWT ni nuevos tiempos de espera: exigen gestionar errores locales en el flujo existente. Son expectativas de correccion, no afirmaciones de que la UI ya las cumpla.

| flujo | caso | tipo | resultado esperado |
|---|---|---|---|
| Login -> tareas -> logout | Credenciales validas, token y usuario, tareas cargadas | Camino feliz | Guardar sesion antes de navegar; GET con Bearer/owner; mostrar tareas; logout elimina sesion y conserva preferencias. |
| Login | Usuario o password null, undefined, vacio o espacios | Caso borde | Mostrar validacion, no POST ni navegacion; usuario tiene precedencia. |
| Login | Credenciales con espacios alrededor | Caso borde | Validar sin normalizarlas; enviar sus valores originales, client y timeout de 5000 ms. |
| Login | 200 sin token, token vacio/falsy, null, body vacio/204, envoltorio | Caso borde | Mensaje de respuesta sin token, busy false, no nueva sesion ni navegacion. |
| Login | Texto/HTML/JSON invalido entregado como cadena | Error | No avanzar como login correcto; respuesta sin token. Si el transporte rechaza, mensaje local generico. |
| Login | user ausente o null con token | Caso borde | Guardar {} y permitir dashboard; consultar tareas con owner vacio. |
| Login | Preferencias ausentes, parciales, false, adicionales, anidadas o JSON invalido | Caso borde | Defaults/merge documentados; un fallo de parseo no bloquea construir login. |
| Login | HTTP 400, 401, 403 | Error | Mensaje local seguro, busy false, sin nueva sesion/navegacion; sin detalles remotos. |
| Login | HTTP 404, 429, 500, 503 | Error | Mismo tratamiento, sin reintento automatico. Cada estado tiene caso parametrizado. |
| Login | Backend inaccesible, ERR_NETWORK/CORS o ERR_BAD_RESPONSE | Error | Mismo mensaje local y busy false; no navegar ni revelar detalles. |
| Login | Timeout de transporte | Error | Mensaje local y busy false; conservar timeout de 5000 ms en POST. |
| Login XHR | Servidor de fixture no responde | Error | El adaptador real aborta a los 5000 ms y rechaza con ECONNABORTED. |
| Login XHR | Servidor de fixture rompe la conexion | Error | Rechazo real ERR_NETWORK; no convertirlo a exito. |
| Login -> tareas | Token truthy invalido, expirado o numerico y tareas devuelve 401 | Error | El login no valida criptografia; el rechazo de tareas produce error seguro, loading false y Bearer con el valor persistido. |
| Login | Falla la primera escritura de sesion | Error | Mensaje local, busy false y no navegacion. |
| Login | Falla la escritura de preferencias despues de token/usuario, BUG H-13 | Error | No dejar una sesion parcial tras informar login fallido. Regresion activa: hoy falla. |
| Login | Router.navigate rechaza una promesa | Error | Mostrar mensaje local, busy false; la sesion ya guardada se conserva segun contrato actual. |
| Login | Router.navigate devuelve false, BUG H-12 | Error | Mostrar el mensaje local conservando sesion, busy false y notificacion de vista. Seis pruebas de false/true/rechazo y DOM aprobadas tras la correccion. |
| Login DOM | Usuario con etiquetas inocuas y error remoto | Error | Mostrar etiquetas como texto, sin elementos HTML ni detalle privado; reactivar boton despues de respuesta asincrona. |
| Tareas | Token local ausente con usuario parseable | Caso borde | Redirigir a login sin GET. |
| Tareas | [] o ninguna tarea visible | Caso borde | Terminar loading, mostrar estado vacio; no tratarlo como error. |
| Tareas | ARCHIVED y archived, prioridades iguales/ausentes/numericas | Caso borde | Excluir solo ARCHIVED exacto; conservar comparador documentado y etiquetas, sin mutar entradas. |
| Tareas | Campos opcionales omitidos, status desconocido | Caso borde | Defaults de label y traducciones/fallback; no inventar titulo o campos obligatorios. |
| Tareas | Usuario persistido no objeto o campos de tipo no string | Caso borde | Usar usuario vacio/campos ausentes y owner vacio, sin inventar identidad. |
| Tareas | HTTP 401/403 por token/acceso rechazado | Error | Error seguro, loading false, grilla oculta; no borrar sesion ni redirigir automaticamente. |
| Tareas | HTTP 400, 404, 429, 500, 503 | Error | Misma reaccion por estado, sin detalles ni reintento. |
| Tareas | Backend inaccesible, red/CORS | Error | Error seguro, loading false, sesion conservada. |
| Tareas | Timeout que rechaza desde el transporte | Error | Error seguro y loading false; no atribuir al GET el timeout del POST. |
| Tareas | GET sigue pendiente durante 10000 ms virtuales | Caso borde | Seguir en carga: el contrato no configura timeout finito. Es caracterizacion del contrato, no prueba de que esperar indefinidamente sea deseable. |
| Tareas | 2xx con null, string, HTML, body vacio/204 o envoltorio en vez de array | Error | Error seguro y loading false; no convertirlo a [] exitoso. |
| Tareas | Array con elemento null/undefined | Error | Error seguro, no omitir silenciosamente el registro invalido. |
| Tareas DOM | status truthy numerico durante renderizado real | Error | Gestionar el error capturado durante detectChanges, mostrar error local y ocultar grilla. |
| Tareas | JSON de usuario corrupto o storage bloqueado, BUG H-11 | Error | Contener el error de inicializacion, terminar loading y mostrar error local sin GET ni redireccion. Seis regresiones actuales, incluidas DOM, aprobadas tras la correccion. |
| Logout | Fallo de storage o rechazo de navegacion, BUG H-14 | Error | Contener el rechazo y mostrar un error en la vista, sin fingir cierre correcto. Dos regresiones activas: hoy fallan. |

Las ramas comunes de errores se verifican con mocks de Axios sobre componentes y servicios reales. Los casos XHR usan un servidor efimero de loopback creado por el spec, no los otros componentes del workspace. CORS se representa con ERR_NETWORK en pruebas unitarias: no se afirma haber verificado la politica CORS del backend real.

## Codigo de los tests de la fase inicial

Los conteos y fragmentos siguientes documentan la fase inicial de 133 tests; sus archivos enlazados contienen ahora tambien las ampliaciones del plan activo. El diff de cada item muestra los cambios respecto de ese codigo ejecutado originalmente:

- [src/app/login/login.component.spec.ts](../src/app/login/login.component.spec.ts): 49 casos.
- [src/app/dashboard/dashboard.component.spec.ts](../src/app/dashboard/dashboard.component.spec.ts): 45 casos.
- [src/app/services/http-contract.spec.ts](../src/app/services/http-contract.spec.ts): 4 casos XHR reales.
- [src/testing/workshop-test-helpers.ts](../src/testing/workshop-test-helpers.ts): fixtures compartidas, Router, promesas diferidas y carga de plantillas reales.

Los fragmentos siguientes son codigo realmente ejecutado en esas suites; utilizan sus imports, mocks y beforeEach, no son pruebas propuestas. Los archivos enlazados contienen el resto de las matrices y su contexto completo. La prueba XHR usa su beforeAll de servidor y afterAll que cierra todas las conexiones, incluida la del timeout.

### Camino feliz integrado

```typescript
it('integrates login, a new dashboard instance, tasks and logout', async () => {
  const router = createRouter();
  const login = createLogin(router);
  Object.assign(login, { username: 'student', password: 'test' });
  vi.mocked(axios.post).mockResolvedValue({ data: { token: 'test-token', user: { username: 'student' } } });
  vi.mocked(axios.get).mockResolvedValue({ data: [{ title: 'Task', status: 'TODO', owner: 'student', priority: 'high' }] });
  await login.login();
  const dashboard = createDashboard(router);
  await dashboard.ngOnInit();
  expect(dashboard.visibleTasks).toHaveLength(1);
  expect(axios.get).toHaveBeenCalledWith('http://localhost:8000/api/tasks?owner=student', {
    headers: { Authorization: 'Bearer test-token' }
  });
  await dashboard.logout();
  expect(localStorage.getItem('workshop_token')).toBeNull();
  expect(localStorage.getItem('workshop_user')).toBeNull();
  expect(localStorage.getItem('workshop_preferences')).not.toBeNull();
  expect(router.navigate).toHaveBeenLastCalledWith(['/login']);
});
```

### Caso borde sin token

```typescript
it('does not store a session or navigate without a token', async () => {
  const router = createRouter();
  const component = createLogin(router);
  Object.assign(component, { username: 'student', password: 'test' });
  vi.mocked(axios.post).mockResolvedValue({ data: {} });
  await component.login();
  expect(component.message).toContain('sin token');
  expect(localStorage.getItem('workshop_token')).toBeNull();
  expect(router.navigate).not.toHaveBeenCalled();
  expect(component.busy).toBe(false);
});
```

### Errores HTTP y token rechazado

```typescript
it.each([400, 401, 403, 404, 429, 500, 503])('handles tasks HTTP %s without losing session or redirecting', async status => {
  seedSession();
  const router = createRouter();
  const component = createDashboard(router);
  vi.mocked(axios.get).mockRejectedValue({ response: { status, data: { detail: 'private-detail' } } });
  await component.ngOnInit();
  expect(component.error).toBe('No se pudo cargar el dashboard');
  expect(component.loading).toBe(false);
  expect(component.visibleTasks).toEqual([]);
  expect(localStorage.getItem('workshop_token')).toBe('test-token');
  expect(router.navigate).not.toHaveBeenCalled();
  expect(axios.get).toHaveBeenCalledTimes(1);
});
```

### Backend caido y timeout de UI

```typescript
it.each([
  ['backend unavailable', 'ECONNREFUSED'],
  ['network or CORS failure', 'ERR_NETWORK'],
  ['timeout', 'ECONNABORTED'],
  ['malformed response rejected by transport', 'ERR_BAD_RESPONSE']
])('handles login %s and restores busy', async (_scenario, code) => {
  const router = createRouter();
  const component = createLogin(router);
  Object.assign(component, { username: 'student', password: 'fixture-only' });
  vi.mocked(axios.post).mockRejectedValue({ code, message: 'private-detail' });
  await component.login();
  expect(component.message).toContain('Verifique sus credenciales o intente nuevamente.');
  expect(component.message).not.toContain('private-detail');
  expect(component.busy).toBe(false);
  expect(router.navigate).not.toHaveBeenCalled();
  expect(axios.post).toHaveBeenCalledWith('http://localhost:8080/auth/login', {
    username: 'student', password: 'fixture-only', client: 'angular-workshop'
  }, { timeout: 5000 });
});
```

### Timeout XHR real y conexion rota

```typescript
it('enforces the real login XHR timeout of 5000 ms against a nonresponding fixture', async () => {
  const client = axios.create({ adapter: 'xhr' });
  const started = Date.now();
  await expect(client.post(`${baseUrl}/auth/login`, {
    username: 'timeout-fixture', password: 'fixture-only', client: 'angular-workshop'
  }, { timeout: 5000 })).rejects.toMatchObject({ code: 'ECONNABORTED' });
  expect(Date.now() - started).toBeGreaterThanOrEqual(4900);
}, 10000);

it('rejects a real broken backend connection as a network error', async () => {
  const client = axios.create({ adapter: 'xhr' });
  await expect(client.post(`${baseUrl}/auth/login`, {
    username: 'network-fixture', password: 'fixture-only', client: 'angular-workshop'
  }, { timeout: 5000 })).rejects.toMatchObject({ code: 'ERR_NETWORK' });
});
```

El servidor de prueba detecta timeout-fixture y deja el POST sin respuesta; con network-fixture destruye el socket. Esas credenciales existen solo como controles del fixture, no como usuarios del backend. Los 5000 ms de timeout son reales; el caso de espera del GET utiliza temporizadores virtuales y termina resolviendo la promesa para no dejar trabajo pendiente.

### Regresion activa, sin adaptar la expectativa al bug

```typescript
it('BUG H-11: corrupted user JSON should end loading and show a safe error', async () => {
  seedSession();
  localStorage.setItem('workshop_user', '{bad');
  const component = createDashboard();
  await expect(component.ngOnInit()).resolves.toBeUndefined();
  expect(component.loading).toBe(false);
  expect(component.error).toBe('No se pudo cargar el dashboard');
  expect(axios.get).not.toHaveBeenCalled();
});
```

Esta prueba fallo realmente porque ngOnInit rechazo con SyntaxError. La prueba anterior esperaba la excepcion como exito; se sustituyo por esta expectativa correctiva. No se cambio produccion ni se marco el caso como esperado-fallido. El test directo de parseo de SessionService sigue verificando la excepcion de esa frontera; no sustituye la responsabilidad del componente de manejarla.

## Comandos y resultados de la fase inicial

Directorio de todos los comandos: reqflow-workspace/workshop-login-frontend, ruta canonica de esta maquina `C:\Users\Usuario\Documents\t63732-edgar-chipana\reqflow-workspace\workshop-login-frontend`. Se ejecuto npm desde esa carpeta, sin prefijo con unidad minuscula ni servicios externos.

| Comando | Codigo de salida | Resultado real |
|---|---|---|
| npm test -- --reporter=dot, antes de ampliar | 0 | Baseline: 72 aprobadas en 10 archivos. |
| npm test -- src/app/login/login.component.spec.ts src/app/dashboard/dashboard.component.spec.ts --reporter=dot, primer incremento | 1 | 86 ejecutadas: 84 aprobadas y 2 fallos de H-11. |
| npm test -- src/app/dashboard/dashboard.component.spec.ts --testNamePattern="real.*(template\|rendering)\|unexpected status" --reporter=dot | 0 | Diagnostico DOM: 2 aprobadas, 43 no seleccionadas por el filtro. No es resultado de la suite completa. |
| npm test -- src/app/services/http-contract.spec.ts --reporter=dot, ultimo incremento | 0 | 4 casos XHR aprobados; alrededor de 5,11 s en tests. |
| npm run test:coverage -- --reporter=json --outputFile=reports/testing-full.json | 1 | Suite completa: 133 ejecutadas, 127 aprobadas y 6 fallidas. No genero informe de cobertura al fallar. |
| npm run test:typecheck | 0 | TypeScript estricto de produccion y specs aprobado. |
| npm run test:coverage -- --coverage.reportOnFailure --reporter=json --outputFile=reports/testing-full.json | 1 | Mismos 133 casos, 127 aprobados y 6 fallos, sin pendientes/omitidos; genero cobertura actual de 100% en las cuatro metricas. |

La unica seleccion por nombre se uso para discriminar el funcionamiento del DOM. Las ejecuciones finales no tienen filtros: los bugs permanecen dentro de npm test y del gate de CI. reportOnFailure solo permite generar el informe cuando hay fallos; no convierte el comando en exitoso.

Para repetir la ejecucion completa y la comprobacion estatica desde el directorio anterior:

```powershell
npm run test:coverage -- --coverage.reportOnFailure --reporter=json --outputFile=reports/testing-full.json
npm run test:typecheck
```

En la prueba de conexion rota, jsdom emitio en stderr Error: socket hang up. Es consecuencia esperada del socket destruido y la asercion ERR_NETWORK paso; no se silencio ese aviso. No se interpretan errores de red simulados como evidencia de indisponibilidad de los backends reales.

## Resultados por archivo de la fase inicial

| Archivo | Ejecutadas | Aprobadas | Fallidas |
|---|---|---|---|
| login.component.spec.ts | 49 | 47 | 2 |
| dashboard.component.spec.ts | 45 | 41 | 4 |
| auth.service.spec.ts | 2 | 2 | 0 |
| http-contract.spec.ts | 4 | 4 | 0 |
| session.service.spec.ts | 9 | 9 | 0 |
| tasks.service.spec.ts | 4 | 4 | 0 |
| credential-validation.spec.ts | 8 | 8 | 0 |
| legacy-format.spec.ts | 5 | 5 | 0 |
| task-selection.spec.ts | 2 | 2 | 0 |
| user-facing-error.spec.ts | 5 | 5 | 0 |
| **Total** | **133** | **127** | **6** |

Los tests parametrizados cuentan cada entrada de la matriz como un caso. Los 61 casos netos adicionales incluyen reemplazar una caracterizacion que aprobaba el defecto por una regresion que falla, no solamente agregar casos verdes.

## Fallos historicos de la fase inicial

Esta tabla informa la ejecucion inicial, no lleva estados de seguimiento. Las correcciones posteriores estan arriba y en HALLAZGOS.md; las referencias a pruebas remiten a sus versiones actuales.

| Regresion | Observacion real | Evidencia |
|---|---|---|
| H-11, JSON de usuario corrupto | Se esperaba resolver y finalizar carga; ngOnInit rechazo con SyntaxError antes del GET. | [dashboard.component.spec.ts:101](../src/app/dashboard/dashboard.component.spec.ts#L101); [SessionService:19](../src/app/services/session.service.ts#L19) |
| H-11, almacenamiento inaccesible | Rechazo SecurityError durante getToken, fuera del try; no llegaba al manejo de error de UI. | [dashboard.component.spec.ts:115](../src/app/dashboard/dashboard.component.spec.ts#L115); [DashboardComponent](../src/app/dashboard/dashboard.component.ts) |
| H-12, navegacion devuelve false | La expectativa de mensaje fallo: message era cadena vacia. | [login.component.spec.ts:286](../src/app/login/login.component.spec.ts#L286); [LoginComponent:48](../src/app/login/login.component.ts#L48) |
| H-13, persistencia parcial | Tras fallar preferencias permanecio test-token en vez de null. | [login.component.spec.ts:346](../src/app/login/login.component.spec.ts#L346); [SessionService:37](../src/app/services/session.service.ts#L37) |
| H-14, logout con storage bloqueado | La expectativa de error contenido fallo: promesa rechazada con SecurityError. | [dashboard.component.spec.ts:261](../src/app/dashboard/dashboard.component.spec.ts#L261); [DashboardComponent:70](../src/app/dashboard/dashboard.component.ts#L70) |
| H-14, logout con navegacion rechazada | Promesa rechazada con Navigation failed, sin mensaje propio de UI. | [dashboard.component.spec.ts:261](../src/app/dashboard/dashboard.component.spec.ts#L261); [DashboardComponent:71](../src/app/dashboard/dashboard.component.ts#L71) |

Las expectativas correctivas se agregaron para los defectos locales expresamente descritos en ENDPOINTS.md. No se modifico ese contrato para fingir que la UI ya cumple esas expectativas. No se aprueban correcciones productivas fuera de esta solicitud de pruebas.

## Cobertura

| Metrica | Medicion actual |
|---|---|
| Lineas | 100% |
| Sentencias | 100% |
| Funciones | 100% |
| Ramas | 100% |

El umbral de 85% por archivo de [REGLAS.md](../REGLAS.md) y [vitest.config.ts](../vitest.config.ts) no se modifico ni se redujeron exclusiones/gates. El conjunto productivo instrumentado incluye componentes, servicios, modelos ejecutables, utilidades y environment. Solo cambiaron tests y su helper en esta solicitud; los specs y harness no forman parte de ese denominador productivo. Las interfaces sin instrucciones no aportan ramas ejecutables.

**Cobertura aprobada no equivale a suite aprobada:** el comando completo final sigue con codigo 1 por los tres fallos residuales de H-13/H-14. No se reutilizo el informe de cobertura anterior; Vitest lo regenero con reportOnFailure despues de cada item.

Artefactos de ejecucion:

- [reports/testing-full.json](../reports/testing-full.json): registro historico de la fase inicial con seis fallos.
- [reports/h12-full.json](../reports/h12-full.json): suite final actual, 142 casos y tres fallos residuales.
- [coverage/coverage-summary.json](../coverage/coverage-summary.json): cobertura final actual generada aun con fallos.
- [coverage/index.html](../coverage/index.html): informe HTML.

## Pendientes y pruebas propuestas

**Pendientes de correccion tras ambos items:** H-13 y H-14, con tres regresiones fallidas. Consultar estados en HALLAZGOS.md; las regresiones estan implementadas y ejecutadas, no son pruebas propuestas. H-03 conserva la decision de persistencia pendiente; no se cambio a memoria ni se aprobo esa alternativa.

**Pruebas propuestas, no implementadas ni ejecutadas en esta solicitud:**

- Flujo contra los dos backends reales para confirmar codigos y schemas, manteniendo POST /auth/login y GET /api/tasks; requiere disponibilidad y coordinacion externa sin leer otros componentes.
- CORS real en navegador con origen permitido/denegado. La simulacion ERR_NETWORK no verifica la politica remota.
- Token realmente expirado o revocado por el backend. Las fixtures de 401 comprueban la reaccion de UI, no implementan ni validan criptografia/expiracion.
- Matriz adicional de tipos arbitrarios de status, priority y owner; solo se verificaron los casos concretos de tablas y defaults. No se afirma tolerancia para cualquier payload.

En la fase inicial solo de pruebas no se ejecutaron build ni cambios productivos. En la implementacion posterior aprobada se ejecutaron typecheck y build por item, y se cambiaron exclusivamente los dos componentes previstos. No se ejecutaron auditoria ni nuevas pruebas manuales de navegador, no se agregaron dependencias ni commits. El DOM automatizado sigue usando plantillas reales mediante Angular TestBed.

## Documentos consultados

- [docs/ENDPOINTS.md](ENDPOINTS.md): solicitudes, respuestas, errores de UI, defectos locales y preguntas abiertas.
- [REGLAS.md](../REGLAS.md): meta de cobertura y prohibicion de relajar gates.
- [HALLAZGOS.md](../HALLAZGOS.md): ids existentes y registro unico de bugs detectados al ampliar la suite.

Tambien se consultaron los specs de login/dashboard/XHR, el helper de fixtures y los resultados JSON/coverage de la ejecucion; las evidencias de codigo productivo estan enlazadas en el reporte de fallos.