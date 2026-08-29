# Plan funcional de implementación del frontend

## 1. Objetivo

Planificar el frontend de una aplicación de composición visual donde una persona combina:

1. **Fondo (obligatorio):** imagen base procesada como mapa de profundidad.
2. **Producto (obligatorio):** imagen sin fondo, con una o más vistas generadas.
3. **Texto (opcional):** una o más capas tipográficas configurables.

El resultado final es una imagen compuesta. Una misma sesión de trabajo puede producir y conservar varios resultados.

## 2. Alcance y restricciones

### Incluido

- Aplicación web construida con Next.js App Router.
- Autenticación y rutas privadas ya disponibles en el proyecto.
- Interfaz para cargar, procesar, visualizar y organizar recursos.
- Editor visual 2D/3D para fondo, cubo guía, producto y texto.
- Consumo reactivo de queries, mutations y actions expuestas por Convex.
- Persistencia de sesiones, transformaciones, vistas y resultados mediante Convex.
- Diseño monocromático, responsive y accesible.
- Estados de espera, progreso, error, reintento y recuperación.

### No incluido

- Implementación interna de los servicios de IA o procesamiento de imágenes.
- Implementación de funciones, esquema o almacenamiento del backend.
- Entrenamiento o selección de modelos de profundidad, recorte o generación de vistas.
- Aplicación móvil nativa.
- Colaboración multiusuario en tiempo real durante la primera versión.

El frontend solo consumirá contratos de Convex. No deberá conocer credenciales de almacenamiento ni comunicarse directamente con servicios internos de procesamiento.

## 3. Estado actual del repositorio

El proyecto ya cuenta con Next.js 16, React 19, Tailwind CSS 4, Convex React, Convex Auth, componentes base de shadcn y autenticación con Google. `/dashboard` y `/app(.*)` son rutas protegidas.

Todavía no existen en el frontend:

- El workspace del editor.
- La carga y administración de imágenes.
- Un motor de escena 3D.
- Contratos Convex de fondos, productos, vistas, composiciones o resultados.
- Indicadores de trabajos asíncronos.
- La gestión de capas de texto.
## 4. Conceptos funcionales

### Proyecto

Contenedor principal perteneciente al usuario. Agrupa sesiones y permite retomar el trabajo.

### Sesión de composición

Unidad editable que relaciona un fondo, un producto, la vista activa, las capas de texto, el estado del editor y los resultados generados. Puede seguir abierta después de generar un resultado.

### Recurso

Archivo administrado por el backend: imagen original, imagen sin fondo, mapa de profundidad, vista generada o resultado final. El frontend maneja identificadores y URLs temporales o públicas entregadas por Convex.

### Transformación

Estado visual de un elemento dentro de la escena: posición, rotación y escala. Para el cubo y el producto también incluye parámetros de cámara y perspectiva.

### Trabajo de procesamiento

Operación asíncrona iniciada desde Convex, con estado `queued`, `processing`, `completed` o `failed`, progreso opcional, mensaje de error y recursos resultantes.

## 5. Flujo principal del usuario

1. La persona inicia sesión y entra al listado de proyectos.
2. Crea un proyecto o abre uno existente.
3. Crea o retoma una sesión de composición.
4. Carga la imagen del fondo.
5. Solicita la generación del mapa de profundidad y revisa el resultado.
6. Ajusta el cubo 3D, sus ejes, cámara y punto de fuga sobre el fondo.
7. Carga la imagen del producto.
8. Solicita la eliminación del fondo del producto y revisa la vista base limpia.
9. Posiciona el cubo donde debe integrarse el producto.
10. Genera una nueva vista del producto usando los parámetros espaciales del cubo.
11. Sustituye la representación del cubo por una vista del producto y ajusta la composición.
12. Opcionalmente agrega y configura capas de texto.
13. Solicita la generación del resultado final.
14. Revisa, descarga y conserva el resultado en la sesión.
15. Modifica la composición y genera resultados adicionales sin perder los anteriores.

No se habilita la generación final hasta que exista un fondo procesado y una vista válida del producto.

## 6. Arquitectura de información y rutas

- `/dashboard`: proyectos recientes, sesiones recientes y acceso para crear un proyecto.
- `/app/new`: creación de proyecto y sesión inicial.
- `/app/[projectId]`: resumen del proyecto y sus sesiones.
- `/app/[projectId]/sessions/[sessionId]`: editor principal.

El editor se organiza como una superficie de trabajo, no como un mosaico de tarjetas:

- **Barra superior:** regreso, nombre editable, estado de guardado, deshacer/rehacer, zoom, generar y menú de sesión.
- **Panel izquierdo:** pasos y recursos de Fondo, Producto y Texto.
- **Viewport central:** imagen de fondo, visualización de profundidad, escena 3D y composición.
- **Inspector derecho:** propiedades del elemento seleccionado.
- **Bandeja inferior:** vistas del producto y resultados de la sesión.

En pantallas pequeñas, los paneles laterales se convierten en drawers. La experiencia de edición completa se optimiza primero para escritorio; móvil permite consultar resultados y realizar ajustes básicos.

## 7. Módulo Fondo — obligatorio

### 7.1 Carga

- Aceptar formatos definidos por el backend, inicialmente JPEG, PNG o WebP.
- Mostrar límites de peso y resolución antes de seleccionar el archivo.
- Permitir selección mediante explorador y arrastrar/soltar.
- Mostrar nombre, dimensiones, peso, miniatura y progreso de carga.
- Validar formato y tamaño antes de solicitar una URL de carga.
- Permitir cancelar o reemplazar la imagen con confirmación si ya existen ajustes dependientes.

### 7.2 Generación del mapa de profundidad

- Habilitar `Generar mapa de profundidad` al completar la carga.
- Crear el trabajo por medio de una action de Convex.
- Reflejar el estado del trabajo en tiempo real.
- Mantener usable la navegación mientras se procesa.
- Mostrar el mapa generado en modos:
  - Fondo original.
  - Profundidad en escala de grises.
  - Comparación antes/después.
  - Superposición con opacidad regulable.
- Permitir reintentar un trabajo fallido y regenerar el mapa sin borrar automáticamente el anterior.
- Mostrar errores accionables, sin exponer mensajes internos del servicio.

### 7.3 Herramientas espaciales

- Activar la escena cuando el mapa de profundidad esté listo.
- Mostrar un cubo guía interactivo encima del fondo.
- Permitir seleccionar, mover, rotar y escalar el cubo.
- Permitir manipulación desde controles visuales y campos numéricos.
- Mostrar u ocultar ejes X, Y y Z.
- Mostrar el punto de fuga y permitir ajustarlo mediante controles de cámara/perspectiva.
- Incluir acciones `Restablecer`, `Centrar` y `Ajustar a vista`.
- Sincronizar viewport e inspector en ambas direcciones.
- Persistir cambios al terminar un gesto, no en cada frame.

### 7.4 Estado mínimo persistido

- Recurso del fondo original.
- Recurso del mapa de profundidad activo.
- Transformación del cubo: posición, rotación y escala en tres ejes.
- Cámara: posición, objetivo, distancia focal o campo de visión según el contrato acordado.
- Punto de fuga y visibilidad de ejes.
- Versión de los parámetros para mantener compatibilidad con el generador de vistas.
## 8. Módulo Producto — obligatorio

### 8.1 Carga y limpieza

- Cargar una imagen del producto con el mismo patrón de validación y progreso del fondo.
- Mostrar el original antes de iniciar el procesamiento.
- Solicitar la eliminación de fondo mediante Convex.
- Representar el estado del trabajo en tiempo real.
- Al completarse, mostrar el producto sobre un patrón cuadriculado para comprobar la transparencia.
- Permitir comparar original y recorte.
- Permitir aprobar el recorte, regenerarlo o reemplazar el original.
- Crear la primera `vista base` solo después de aprobar el resultado limpio.

### 8.2 Gestión de vistas

Cada vista contiene una imagen sin fondo y los parámetros usados para generarla.

- Mostrar las vistas en una bandeja de miniaturas.
- Diferenciar la vista base de las vistas generadas.
- Permitir seleccionar, renombrar y eliminar vistas generadas.
- No permitir eliminar la única vista válida sin confirmación y una alternativa.
- Mostrar por vista su estado de procesamiento y, si falla, ofrecer reintento.
- Mantener seleccionada una vista activa para la composición.

### 8.3 Generación de una nueva vista

- Habilitar `Generar vista` cuando el producto limpio y el cubo estén listos.
- Presentar un resumen de la orientación que se enviará.
- Capturar desde el estado persistido la transformación del cubo y los parámetros de cámara/perspectiva.
- Enviar IDs y parámetros estructurados; evitar enviar blobs o capturas del viewport salvo que el contrato lo requiera.
- Crear una miniatura temporal con estado de procesamiento.
- Al completar, agregar la vista sin reemplazar la vista activa automáticamente, salvo elección del usuario.
- Evitar solicitudes duplicadas mientras exista un trabajo equivalente activo.

### 8.4 Integración con el fondo

El viewport tendrá dos representaciones mutuamente excluyentes:

- **Modo guía:** muestra el cubo y sus controles.
- **Modo producto:** sustituye visualmente el cubo por la vista seleccionada del producto.

En modo producto:

- Mantener la transformación espacial asociada al cubo.
- Permitir ajustes finales de posición, rotación y escala.
- Conservar una acción para volver al cubo sin perder los ajustes.
- Mostrar una advertencia si la vista seleccionada fue generada con parámetros muy diferentes de la transformación actual.
- Ofrecer `Generar vista actualizada` en lugar de modificar silenciosamente el recurso.

## 9. Módulo Texto — opcional

- Permitir continuar y generar sin texto.
- Crear múltiples capas de texto.
- Configurar contenido, fuente, color, tamaño, alineación, posición, rotación, escala y opacidad.
- Permitir edición directa en el viewport e inspección numérica.
- Permitir mostrar/ocultar, duplicar, reordenar y eliminar capas.
- Mantener las capas dentro del área exportable o advertir cuando queden fuera.
- Limitar el catálogo inicial a fuentes aprobadas y cargadas por la aplicación.
- Conservar contraste suficiente en los controles; el color del texto puede variar dentro del selector aunque la interfaz sea monocromática.
- Aplicar el mismo autosave al finalizar gestos o después de una pausa breve de escritura.

## 10. Resultados finales

### Generación

- La acción primaria `Generar resultado` valida los requisitos antes de crear el trabajo.
- El frontend envía referencias a recursos y una instantánea versionada de la composición.
- La generación no bloquea la sesión; el usuario puede seguir navegando.
- Si se edita la composición durante el proceso, el trabajo conserva la instantánea con la que se inició.

### Galería de resultados

- Mostrar todos los resultados de la sesión, del más reciente al más antiguo.
- Cada elemento muestra miniatura, fecha, estado y versión de composición.
- Permitir ampliar, comparar, descargar y eliminar con confirmación.
- Permitir marcar un resultado como favorito o principal.
- Un error no elimina resultados anteriores ni el estado editable.
- Regenerar crea un resultado nuevo; no sobrescribe el anterior.

### Formato de salida

El backend define los formatos disponibles. El frontend debe contemplar al menos:

- PNG para conservar calidad.
- JPEG o WebP para una descarga optimizada.
- Dimensiones o relación de aspecto seleccionables antes de generar, cuando el servicio las soporte.

## 11. Estado del frontend

### Estado persistente en Convex

- Proyecto, sesión y propiedad del usuario.
- IDs de recursos y trabajos.
- Vista de producto activa.
- Transformaciones confirmadas.
- Cámara y perspectiva.
- Capas de texto.
- Configuración de exportación.
- Resultados generados.

### Estado local transitorio

- Elemento seleccionado.
- Panel o drawer abierto.
- Transformación mientras se arrastra.
- Hover, foco, selección temporal y modo de visualización.
- Zoom y desplazamiento del viewport si no forman parte del resultado.
- Archivos locales antes de completar la carga.

### Guardado

- Convex actúa como fuente de verdad persistente y reactiva.
- Los gestos actualizan estado local en tiempo real y guardan al finalizar.
- Los campos de texto usan debounce.
- La barra superior muestra `Guardando`, `Guardado` o `Error al guardar`.
- Los errores conservan los cambios locales y permiten reintentar.
- Deshacer/rehacer opera inicialmente sobre una pila local; al confirmar el estado resultante se persiste.
## 12. Contrato Convex requerido por el frontend

Los nombres son propuestos y deberán acordarse con backend. El frontend no implementa estos contratos dentro de este plan.

### Queries

- `projects.list`
- `projects.get`
- `sessions.listByProject`
- `sessions.getEditorState`
- `assets.getUploadStatus`
- `productViews.listBySession`
- `jobs.get`
- `results.listBySession`

### Mutations

- `projects.create`, `projects.rename`, `projects.archive`
- `sessions.create`, `sessions.rename`, `sessions.updateComposition`
- `assets.generateUploadUrl` o equivalente compatible con el almacenamiento elegido
- `assets.registerUploadedAsset`, `assets.remove`
- `sessions.setBackground`, `sessions.setDepthMap`
- `sessions.setProduct`, `sessions.setActiveProductView`
- `productViews.rename`, `productViews.remove`
- `textLayers.create`, `textLayers.update`, `textLayers.reorder`, `textLayers.remove`
- `results.setPrimary`, `results.remove`

### Actions

- `processing.generateDepthMap`
- `processing.removeProductBackground`
- `processing.generateProductView`
- `processing.generateComposition`
- `processing.retryJob`

### Requisitos del contrato

- Todas las operaciones validan pertenencia al usuario autenticado.
- Las actions devuelven un `jobId` rápidamente; el progreso se consulta de forma reactiva.
- Los recursos incluyen metadatos: tipo MIME, dimensiones, tamaño y URL de lectura válida.
- La URL de lectura debe renovarse mediante query si expira.
- Los errores incluyen un código estable y un mensaje seguro para la interfaz.
- Las transformaciones usan unidades, orden de rotación y sistema de coordenadas documentados.
- Los payloads incorporan `schemaVersion` o `transformVersion`.
- Las mutations sensibles aceptan una versión esperada para detectar conflictos.
- El backend aplica límites de carga y procesamiento; el frontend replica esos límites solo para respuesta inmediata.

## 13. Estructura frontend propuesta

```text
apps/web/
  app/
    dashboard/
    app/
      new/
      [projectId]/
        page.tsx
        sessions/[sessionId]/page.tsx
  components/
    editor/
      editor-shell.tsx
      editor-toolbar.tsx
      editor-viewport.tsx
      editor-inspector.tsx
      asset-upload.tsx
      job-status.tsx
      background-panel.tsx
      product-panel.tsx
      product-views-tray.tsx
      text-panel.tsx
      results-tray.tsx
    scene/
      scene-canvas.tsx
      depth-preview.tsx
      transform-controls.tsx
      vanishing-point-control.tsx
    ui/
  hooks/
    use-editor-session.ts
    use-asset-upload.ts
    use-processing-job.ts
    use-autosave.ts
    use-editor-history.ts
  lib/
    convex-errors.ts
    editor-validation.ts
    transforms.ts
    upload.ts
  types/
    editor.ts
```

Los nombres pueden cambiar durante la implementación. Los componentes 3D deben cargarse dinámicamente sin renderizado del lado del servidor. Las llamadas Convex se concentran en hooks de dominio para no acoplar los controles visuales a la API.

## 14. Tecnología del viewport

Para un cubo manipulable con ejes, cámara y perspectiva se recomienda WebGL mediante Three.js y React Three Fiber, con controles de transformación compatibles. Esta dependencia todavía no existe y debe aprobarse antes de implementarla.

Responsabilidades del viewport:

- Ajustar la imagen de fondo al área de composición.
- Convertir correctamente coordenadas de pantalla, escena y exportación.
- Representar profundidad, cubo, ejes, punto de fuga, producto y texto.
- Mantener una relación de aspecto de salida estable.
- Separar calidad de interacción y calidad de exportación.
- Liberar texturas y recursos al reemplazar imágenes.
- Mostrar una alternativa clara si WebGL no está disponible.

La imagen final no debe generarse capturando exclusivamente el canvas del navegador. El frontend envía una descripción determinista de la composición para que el servicio produzca el resultado final consistente.

## 15. Diseño monocromático

- Usar una escala de blanco, negro y grises mediante los tokens existentes.
- Reservar el mayor contraste para la acción primaria y la selección activa.
- Comunicar estados con iconos, texto, patrones y contraste, no solo con color.
- Evitar gradientes decorativos, mosaicos de tarjetas y bordes gruesos en cada panel.
- Priorizar una superficie central amplia, jerarquía tipográfica clara y controles compactos.
- Usar divisores sutiles y elevación solo para menús, diálogos y elementos flotantes.
- Soportar tema claro y oscuro sin alterar la lectura de las imágenes.
- Mostrar transparencia con un patrón de grises.
- Los colores del contenido generado no limitan la paleta de la interfaz.

## 16. Accesibilidad y experiencia

- Todos los controles tienen nombre accesible y foco visible.
- Las transformaciones pueden modificarse con teclado y campos numéricos, no solo arrastrando.
- Los iconos incluyen tooltip cuando su significado no es evidente.
- Los diálogos retienen el foco y pueden cerrarse con Escape cuando no haya riesgo de pérdida.
- El progreso usa mensajes anunciables sin producir anuncios excesivos.
- Las miniaturas tienen texto alternativo funcional.
- La interfaz respeta reducción de movimiento.
- Los targets táctiles cumplen un tamaño mínimo adecuado.
- Antes de abandonar una carga o un cambio todavía no persistido se muestra una advertencia.

## 17. Estados y errores obligatorios

Cada módulo implementa:

- Vacío inicial con una acción clara.
- Carga inicial y skeleton cuando corresponda.
- Subida con porcentaje, cancelación y reintento.
- Procesamiento en cola y en curso.
- Éxito con siguiente acción sugerida.
- Error recuperable con reintento.
- Error no recuperable con explicación segura.
- Sin conexión y reconexión.
- Sesión o recurso no encontrado.
- Acceso denegado.
- Recurso reemplazado o eliminado desde otra pestaña.

No se deben usar notificaciones temporales como único medio para comunicar un error que bloquea el flujo.
## 18. Fases de implementación

### Fase 0 — Definición de contratos

- Confirmar términos de dominio y estados.
- Acordar almacenamiento y flujo de carga.
- Definir queries, mutations, actions, errores y límites.
- Definir sistema de coordenadas, parámetros de cámara y formato de transformaciones.
- Definir formatos y tamaños de salida.
- Preparar datos de ejemplo o contratos simulados para desbloquear la UI.

**Salida:** contratos tipados suficientes para construir el frontend sin asumir comportamiento del procesamiento.

### Fase 1 — Fundamentos del workspace

- Crear rutas de proyectos y sesiones bajo `/app`.
- Implementar shell del editor responsive.
- Implementar estados de carga, acceso y error.
- Crear hooks de sesión y autosave.
- Definir tokens monocromáticos y componentes base necesarios.

**Criterio de salida:** una sesión autenticada puede abrirse, editar datos básicos y persistirlos.

### Fase 2 — Fondo y profundidad

- Implementar carga del fondo.
- Integrar trabajo de generación de profundidad.
- Crear los modos de visualización original, depth, comparación y superposición.
- Gestionar reemplazo, reintento y versiones del mapa.

**Criterio de salida:** el usuario carga un fondo y obtiene un mapa de profundidad visible y persistido.

### Fase 3 — Escena y cubo 3D

- Integrar el motor 3D aprobado.
- Implementar cámara, cubo, ejes y controles de transformación.
- Implementar punto de fuga y sincronización con inspector.
- Persistir parámetros al finalizar gestos.

**Criterio de salida:** al recargar la página se recupera la misma configuración espacial.

### Fase 4 — Producto y vista base

- Implementar carga de producto.
- Integrar eliminación de fondo.
- Implementar comparación, aprobación y vista base.
- Crear bandeja de vistas.

**Criterio de salida:** existe una vista base limpia y seleccionable del producto.

### Fase 5 — Vistas generadas e integración

- Enviar parámetros del cubo para generar una vista.
- Mostrar trabajos de generación en la bandeja.
- Implementar selección y gestión de vistas.
- Sustituir cubo por producto y conservar transformaciones.

**Criterio de salida:** una vista generada puede integrarse en el fondo y permanecer al reabrir la sesión.

### Fase 6 — Texto opcional

- Implementar capas de texto.
- Añadir edición directa e inspector.
- Añadir orden, visibilidad, duplicación y eliminación.

**Criterio de salida:** el usuario puede generar con cero o más capas de texto y recuperar sus ajustes.

### Fase 7 — Resultados

- Integrar validación previa y generación final.
- Implementar progreso, errores y reintentos.
- Crear galería, preview, comparación y descarga.
- Conservar varios resultados por sesión.

**Criterio de salida:** una sesión produce múltiples resultados inmutables sin perder el estado editable.

### Fase 8 — Endurecimiento

- Optimizar texturas, carga diferida y memoria del viewport.
- Revisar responsive, teclado y lector de pantalla.
- Añadir recuperación ante red inestable y conflictos.
- Verificar navegadores soportados y fallback WebGL.
- Medir tiempos de carga e interacción.

## 19. Criterios de aceptación del MVP

### Fondo

- Se puede cargar y reemplazar una imagen válida.
- Se puede iniciar y observar la generación de profundidad.
- Se puede alternar entre original y mapa de profundidad.
- El cubo se puede mover, rotar y escalar.
- Se pueden visualizar e inspeccionar ejes y punto de fuga.
- La configuración reaparece al recargar.

### Producto

- Se puede cargar una imagen y solicitar su limpieza.
- La vista base conserva transparencia.
- Se puede generar una nueva vista usando parámetros del cubo.
- Se pueden conservar y seleccionar varias vistas.
- Se puede reemplazar el cubo por la vista activa del producto.

### Texto

- El flujo funciona sin texto.
- Se puede añadir al menos una capa con fuente, color y tamaño.
- La capa puede moverse, rotarse y escalarse.

### Resultados

- Solo se genera cuando fondo y producto están listos.
- El progreso y los errores son visibles.
- Se conservan varios resultados por sesión.
- Cada resultado puede previsualizarse y descargarse.
- Editar después de generar no modifica resultados existentes.

### Calidad

- Ninguna acción crítica depende únicamente del color.
- El editor se puede operar con teclado en sus funciones principales.
- Un error de procesamiento no destruye el trabajo previo.
- No se exponen claves ni URLs internas de servicios.
- Los cambios persistidos se sincronizan mediante Convex.

## 20. Dependencias y decisiones pendientes

Antes de iniciar las fases afectadas deben resolverse:

1. **Mapa de profundidad:** servicio, formato de salida, resolución, versionado y posibilidad de regeneración.
2. **Motor 3D:** confirmar Three.js/React Three Fiber u otra alternativa WebGL.
3. **Punto de fuga:** confirmar si representa una cámara 3D real, una corrección 2D o ambos.
4. **Transformaciones:** sistema de coordenadas, unidades, orden de rotación y parámetros exactos requeridos por el generador.
5. **Generación de vistas:** servicio, payload, estados, límites, tiempo esperado y política de reintento.
6. **Eliminación de fondo:** soporte de transparencia, edición manual y regeneración.
7. **Almacenamiento:** confirmar si los recursos se sirven mediante Convex Storage, MinIO con URLs firmadas o una abstracción común.
8. **Exportación:** formatos, resoluciones, relaciones de aspecto y fondo transparente.
9. **Fuentes:** catálogo permitido y licencias para incrustarlas en resultados.
10. **Retención:** límites de proyectos, sesiones, vistas y resultados por usuario.
11. **Móvil:** definir si requiere edición completa o solo consulta y ajustes básicos.
12. **Historial:** alcance del deshacer/rehacer y necesidad futura de versionado persistente.

## 21. Riesgos y mitigaciones

- **Desalineación entre viewport y servicio:** usar transformaciones versionadas, escenas de referencia y pruebas visuales compartidas.
- **Pérdida de rendimiento por imágenes grandes:** validar, generar miniaturas, cargar texturas bajo demanda y liberar recursos.
- **Demasiadas escrituras durante gestos 3D:** mantener estado local y persistir al finalizar o con throttling controlado.
- **Trabajos largos o fallidos:** usar estados persistentes, suscripción reactiva, reintento idempotente y resultados parciales claramente marcados.
- **URLs caducadas:** resolver recursos por ID y solicitar nuevas URLs mediante Convex.
- **Edición mientras se genera:** asociar cada trabajo a una instantánea inmutable de la composición.
- **Cambios de contrato:** aislar Convex en hooks/adaptadores y versionar payloads.
- **WebGL no disponible:** detectar capacidad y mostrar instrucciones o una vista 2D limitada.
- **Reemplazo de recursos con dependencias:** advertir qué mapas, vistas o resultados podrían quedar desactualizados antes de confirmar.

## 22. Definición de terminado por funcionalidad

Una funcionalidad se considera terminada cuando:

- Consume contratos Convex tipados, sin datos simulados activos.
- Incluye estados vacío, carga, éxito y error.
- Persiste y recupera su estado al recargar.
- Tiene navegación por teclado y foco visible.
- Funciona en los tamaños de pantalla definidos.
- No expone detalles internos o secretos.
- Supera typecheck, lint y build del workspace web.
- Fue validada manualmente en el flujo completo self-hosted.

## 23. Orden recomendado para el primer incremento usable

El primer incremento vertical debe ser: crear sesión → cargar fondo → generar profundidad → manipular cubo → cargar producto → eliminar fondo → crear vista base → sustituir cubo por producto → generar resultado → descargarlo.

La generación de vistas adicionales y las capas de texto se agregan después de validar este flujo. Así se comprueba temprano la integración completa sin invertir primero en funcionalidades opcionales.