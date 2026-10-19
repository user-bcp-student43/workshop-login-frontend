# Resultados de tests despues del refactor

Fecha de ejecucion: 2026-10-19. Repositorio: workshop-login-frontend. Runner: Vitest 3.2.4; cobertura con V8.

Se ejecuto la suite existente del repositorio; no se agregaron ni modificaron archivos de pruebas o codigo productivo en esta solicitud. Este archivo es un informe de ejecucion, no una segunda matriz de seguimiento de hallazgos.

## Comandos ejecutados

Ejecucion final desde la carpeta del repositorio, usando la ruta canonica de Windows con unidad C:.

```powershell
npm run test:coverage -- --reporter=dot --reporter=json --outputFile=reports/tests-despues.json
```

Tambien se ejecuto la comprobacion estatica:

```powershell
npm run test:typecheck
```

## Resultado general

| Indicador | Resultado |
|---|---|
| Archivos de pruebas | 10 aprobados |
| Pruebas ejecutadas | 72 |
| Pruebas aprobadas | 72 |
| Pruebas fallidas | 0 |
| Pruebas pendientes | 0 |
| Duracion final informada por Vitest | 3,95 segundos |
| Comando final de tests y cobertura | Aprobado, codigo de salida 0 |
| Typecheck estricto de produccion y specs | Aprobado, codigo de salida 0 |

## Resultado por archivo

| Archivo | Pruebas | Aprobadas | Fallidas | Comportamiento verificado |
|---|---|---|---|---|
| [login.component.spec.ts](src/app/login/login.component.spec.ts) | 20 | 20 | 0 | Validacion, preferencias, POST exacto, sesion antes de navegar, token ausente, errores seguros, finally, flujo integrado, plantilla real y actualizacion asincrona del boton. |
| [dashboard.component.spec.ts](src/app/dashboard/dashboard.component.spec.ts) | 16 | 16 | 0 | Redireccion sin token, Bearer/owner, filtrado ARCHIVED, etiquetas, orden, lista vacia, loading, errores sin logout, traducciones de estados y JSON de usuario invalido. |
| [auth.service.spec.ts](src/app/services/auth.service.spec.ts) | 2 | 2 | 0 | URL, credenciales originales, client, timeout y propagacion de rechazo HTTP. |
| [http-contract.spec.ts](src/app/services/http-contract.spec.ts) | 1 | 1 | 0 | Adaptador XHR real contra servidor local efimero: JSON de login, Bearer de tareas y rechazo 401. |
| [session.service.spec.ts](src/app/services/session.service.spec.ts) | 9 | 9 | 0 | Persistencia entre instancias, limpieza de sesion, conservacion de preferencias, usuario opcional y validacion de campos/JSON persistidos. |
| [tasks.service.spec.ts](src/app/services/tasks.service.spec.ts) | 4 | 4 | 0 | Construccion original de owner, cabecera Bearer, arreglo directo y propagacion de rechazo HTTP. |
| [credential-validation.spec.ts](src/app/utils/credential-validation.spec.ts) | 8 | 8 | 0 | null, undefined, vacio, espacios y valores no vacios, sin normalizar credenciales. |
| [legacy-format.spec.ts](src/app/utils/legacy-format.spec.ts) | 5 | 5 | 0 | Formato, datos ausentes, defaults y conversion de valores truthy a texto. |
| [task-selection.spec.ts](src/app/utils/task-selection.spec.ts) | 2 | 2 | 0 | Filtrado y etiquetas sin mutar entradas; prioridades numericas, iguales o ausentes. |
| [user-facing-error.spec.ts](src/app/utils/user-facing-error.spec.ts) | 5 | 5 | 0 | Mensajes locales por contexto, sin revelar detalles de errores externos. |
| **Total** | **72** | **72** | **0** | |

## Cobertura

| Metrica | Resultado final |
|---|---|
| Lineas | 100% |
| Sentencias | 100% |
| Funciones | 100% |
| Ramas | 100% |

El gate configurado del 85% por archivo se aprobo sin cambiar umbrales ni exclusiones. La medicion corresponde al conjunto productivo definido en [vitest.config.ts](vitest.config.ts): componentes de login/dashboard, servicios, modelos, utilidades y configuracion de entorno. No implica cobertura del 100% de toda la aplicacion. Los modelos que solo declaran interfaces no contienen instrucciones ejecutables.

## Evidencia generada

- [reports/tests-despues.json](reports/tests-despues.json): resultado completo de la ultima ejecucion, incluidos nombres y estados de los casos.
- [coverage/coverage-summary.json](coverage/coverage-summary.json): resumen de cobertura generado por V8.
- [coverage/index.html](coverage/index.html): informe HTML de cobertura.

## Incidencia de ejecucion en Windows

Los primeros comandos con --prefix y unidad c: generaron entradas duplicadas del mismo codigo bajo rutas c: y C:. Las 72 pruebas pasaron, pero esa medicion de cobertura contaba archivos duplicados: 42,59% de lineas/sentencias, 51,85% de funciones y 67,70% de ramas. PowerShell tambien rechazo inicialmente el JSON por esas claves que solo diferian en mayusculas; se inspecciono con ConvertFrom-Json -AsHashtable.

Se repitio el comando desde la ruta canonica C: del repositorio, sin --prefix, y se obtuvieron los resultados finales del 100% indicados arriba. No se modifico codigo ni se relajaron gates para corregir la ejecucion. Los artefactos enlazados corresponden a esa ultima ejecucion.

## Limites

- Las llamadas de componentes y servicios usan transporte simulado; la prueba XHR usa un servidor local de fixture, no los backends reales de autenticacion y tareas.
- No se ejecutaron nuevas pruebas de navegador, build ni auditoria de dependencias en esta solicitud. El typecheck no sustituye esas comprobaciones.
- Aprobar tests no demuestra ausencia de vulnerabilidades ni verifica autorizacion, expiracion o revocacion real de tokens.
- La suite conserva la politica de sesion vigente; estos resultados no implementan ni aprueban el cambio de persistencia propuesto para H-03. Su seguimiento permanece en [HALLAZGOS.md](HALLAZGOS.md).