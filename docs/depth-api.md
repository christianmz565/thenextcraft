# API de profundidad y perspectivas — guía para el frontend

Todo lo necesario para subir imágenes, generar el mapa de profundidad, componer
el producto sobre el fondo y re-generarlo desde otro ángulo.

**Reparto de responsabilidades:** el backend estima la profundidad de la escena y
sirve las imágenes. El **posicionamiento y el escalado del producto son del
frontend** — el backend nunca compone nada, solo entrega el mapa y las URLs.

---

## 1. Requisitos previos

Todas las funciones exigen sesión: sin ella lanzan `Error("Not authenticated")`.
Ninguna devuelve `null` como cortesía (a diferencia de `api.users.current`), así
que **montá los componentes que consultan dentro de `<Authenticated>`**, o el
primer render dispara la query antes de que el cliente tenga token:

```tsx
export default function Page() {
  return (
    <>
      <AuthLoading><p>Comprobando sesión…</p></AuthLoading>
      <Authenticated><MiComponente /></Authenticated>
    </>
  );
}
```

Variables que deben estar en el deployment (`bun run convex:admin-key` las
sincroniza): `REPLICATE_API_KEY`, `AUTH_GOOGLE_ID`, `AUTH_GOOGLE_SECRET`,
`SITE_URL`, `JWT_PRIVATE_KEY`, `JWKS`. Verificalas con:

```bash
cd packages/backend && bun node_modules/.bin/convex env list \
  --url http://127.0.0.1:3210 --admin-key "<CONVEX_SELF_HOSTED_ADMIN_KEY de .env.dev>"
```

---

## 2. Modelo de datos

### `depthMaps` — un trabajo de estimación

| Campo | Tipo | Notas |
|---|---|---|
| `_id` | `Id<"depthMaps">` | el id que se usa para el polling |
| `_creationTime` | `number` | |
| `userId` | `Id<"users">` | |
| `objectStorageId` | `Id<"_storage">` | imagen del producto |
| `sceneStorageId` | `Id<"_storage">` | imagen del fondo |
| `depthStorageId` | `Id<"_storage">?` | mapa gris — presente solo si `completed` |
| `colorStorageId` | `Id<"_storage">?` | mapa coloreado, opcional |
| `status` | `"pending" \| "processing" \| "completed" \| "failed"` | |
| `modelVersion` | `string` | versión pineada de Depth Anything V2 |
| `error` | `string?` | presente si `failed`, truncado a 1000 chars |
| `createdAt` / `completedAt` | `number` / `number?` | |

### `userFiles` — imágenes subidas

`userId`, `storageId`, `kind: "object" | "scene"`, `createdAt`. Es la tabla que
prueba la propiedad del blob: `enqueue` rechaza cualquier `storageId` que no
tenga acá una fila tuya con el `kind` correcto.

---

## 3. Referencia de la API

Todo cuelga de `api.depth` salvo donde se indique.

### `generateUploadUrl` — mutation

```ts
() => Promise<string>
```
URL firmada de un solo uso. Sirve para ambos tipos de imagen; el tipo se declara
después, en `registerUpload`.

### `registerUpload` — mutation

```ts
({ storageId: Id<"_storage">, kind: "object" | "scene" }) => Promise<Id<"userFiles">>
```
Marca el blob como tuyo y con qué rol. **Obligatorio**: sin esto `enqueue` falla
con `"Images do not belong to the authenticated user"`.

### `enqueue` — mutation

```ts
({ objectStorageId: Id<"_storage">, sceneStorageId: Id<"_storage"> }) => Promise<Id<"depthMaps">>
```
Encola y **devuelve al instante** — no espera a Replicate. Valida propiedad y
roles, inserta el job en `pending` y agenda la action.

Si ya existe un job `completed` tuyo para **la misma escena**, reutiliza su mapa
y devuelve un job ya `completed` sin llamar a Replicate. El mapa depende solo del
fondo, así que cambiar de producto sobre la misma escena es gratis e instantáneo.

Lanza: `"Not authenticated"`, `"Uploaded image not found"`,
`"Images do not belong to the authenticated user"`.

### `get` — query (el polling)

```ts
({ id: Id<"depthMaps"> }) => HydratedDepthMap
```
Es una query reactiva de Convex: **no hace falta un `setInterval`**. Se re-ejecuta
sola cuando la action agendada actualiza la fila.

Lanza `"Depth map not found"` si el id no existe o no es tuyo.

### `list` — query

```ts
({}) => HydratedDepthMap[]
```
Todos tus jobs, más recientes primero. Sin paginar todavía.

### `listUploads` — query

```ts
({ kind?: "object" | "scene" }) => (UserFile & { url: string | null })[]
```
Tus imágenes ya subidas, para reusarlas entre sesiones sin volver a subirlas.

### `remove` — mutation

```ts
({ id: Id<"depthMaps"> }) => Promise<void>
```
Borra el job y sus mapas. Si otro job comparte la misma escena (por el caché de
`enqueue`), los blobs se conservan. Las imágenes originales de `userFiles` nunca
se borran acá.

### `HydratedDepthMap`

La fila de `depthMaps` **más las cuatro URLs** que el frontend necesita:

```ts
type HydratedDepthMap = Doc<"depthMaps"> & {
  sceneUrl: string | null;       // el fondo, se dibuja tal cual
  objectUrl: string | null;      // el producto (PNG con transparencia)
  depthUrl: string | null;       // mapa GRIS — el que se muestrea
  colorDepthUrl: string | null;  // coloreado — solo visualización
};
```

`depthUrl` y `colorDepthUrl` son `null` mientras el job no esté `completed`.

---

## 4. Flujo completo

```tsx
// 1. Subir cada imagen (dos pasos por imagen)
const generateUploadUrl = useMutation(api.depth.generateUploadUrl);
const registerUpload = useMutation(api.depth.registerUpload);

async function subir(file: File, kind: "object" | "scene") {
  const url = await generateUploadUrl();
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": file.type || "application/octet-stream" },
    body: file,
  });
  if (!res.ok) throw new Error(`Upload falló (${res.status})`);
  const { storageId } = await res.json();   // ← devuelve un OBJETO, no el id suelto
  await registerUpload({ storageId, kind });
  return storageId;
}

// 2. Encolar
const enqueue = useMutation(api.depth.enqueue);
const [jobId, setJobId] = useState<Id<"depthMaps"> | null>(null);
setJobId(await enqueue({ objectStorageId, sceneStorageId }));

// 3. Polling reactivo — sin timers
const job = useQuery(api.depth.get, jobId ? { id: jobId } : "skip");

if (job?.status === "failed") mostrarError(job.error);
if (job?.status === "completed") componer(job);  // depthUrl ya está listo
```

---

## 5. Contrato del mapa de profundidad

Esto es lo que hay que respetar para que el escalado por profundidad funcione.
El prototipo de referencia, ya validado, está en `temp/scale/`.

### Convención

`depthUrl` es una **PNG en escala de grises, misma resolución que la escena**:

> **brillo alto (255) = cerca · brillo bajo (0) = lejos**

Se lee el **canal R** (los tres canales son iguales). `colorDepthUrl` es el mismo
mapa coloreado por el modelo: sirve para un toggle de visualización y **no se
calcula nada con él**.

### CORS — imprescindible

El mapa se lee con `getImageData`, y eso *taintea* el canvas si la imagen se
cargó como recurso cross-origin opaco. La app corre en `localhost:3000` y el
storage en `127.0.0.1:3210`: **son orígenes distintos**.

Convex sí manda los headers correctos (verificado: responde
`access-control-allow-origin: http://localhost:3000`), pero eso solo alcanza si
además pedís la imagen sin credenciales:

```tsx
<img src={job.depthUrl} crossOrigin="anonymous" />
```

```ts
const img = new Image();
img.crossOrigin = "anonymous";   // ← sin esto, getImageData tira SecurityError
img.src = job.depthUrl;
```

Es el error más fácil de cometer acá y falla recién al muestrear, no al cargar.

### Muestreo (de `temp/scale/script.js`)

1. El punto `(x, y)` del click es el **punto de apoyo en el suelo**; el objeto
   crece hacia arriba desde ahí, no se centra en el punto.
2. Si el mapa tiene otra resolución que la imagen mostrada, se transforma la
   coordenada proporcionalmente (`dx = x / drawW * depthW`).
3. Se **promedia un disco** de radio `SAMPLE_RADIUS` (6 px) alrededor del punto,
   para no depender de un píxel ruidoso.
4. Ese promedio se mapea linealmente a un tamaño entre `MIN_SIZE` (16) y
   `MAX_SIZE` (180) px.
5. Fuera de los límites de la imagen → se ignora el evento.

`DEPTH_MIN`/`DEPTH_MAX` no se fijan en 0/255: el prototipo **los calibra
recorriendo el mapa real** y normaliza contra el rango observado, porque una foto
puede no usar todo el rango. El slider de escala aplica un multiplicador
(0.3x–3x) *encima* del tamaño derivado de la profundidad, no lo reemplaza.

---

## 6. Estados y errores

| `status` | Qué mostrar |
|---|---|
| `pending` | encolado, la action todavía no arrancó |
| `processing` | corriendo en Replicate (~decenas de segundos) |
| `completed` | `depthUrl` disponible |
| `failed` | leer `job.error` |

La action **no relanza** al fallar: escribe el motivo en `job.error` y marca
`failed`. O sea, un fallo de Replicate llega por la query, no como excepción del
`enqueue`. Los errores de `enqueue` (auth, propiedad, blob inexistente) sí llegan
como excepción y hay que atraparlos con try/catch.

Recargar la página no pierde el trabajo: el job vive en la base y `get` lo
recupera con el id.

---

## 7. Cosas que muerden

- **`await res.json()` del upload devuelve `{ storageId }`**, no el id. Pasar el
  objeto entero a `registerUpload` falla la validación de `v.id("_storage")`.
- **Saltarse `registerUpload`** hace que `enqueue` rechace con
  `"Images do not belong to the authenticated user"`.
- **Olvidar `crossOrigin="anonymous"`** → `SecurityError` al muestrear.
- **`enqueue` es una mutation, no una action** — se llama con `useMutation`.
  `processDepthMap` es interna y no es invocable desde el cliente.
- **`get` lanza** si el id no es tuyo; no devuelve `null`.
- `list` no está paginada.

---

## 8. Servicio de perspectivas (`api.angles`)

Re-genera la foto del producto desde otro ángulo de cámara. Encadena **dos**
modelos, porque el primero no preserva la transparencia:

1. `qwen/qwen-edit-multiangle` — rota el producto, pero le pinta **su propio fondo
   de estudio**.
2. `851-labs/background-remover` — le devuelve un canal alpha real (`rgba`, `png`).

Ambas versiones están pineadas en [`angles.ts`](../packages/backend/convex/angles.ts)
para que una actualización del modelo no cambie resultados en silencio.

### `enqueue` — mutation

```ts
({
  sourceStorageId: Id<"_storage">,
  rotateDegrees: number,
  verticalTilt?: number,
  moveForward?: number,
  useWideAngle?: boolean,
  prompt?: string,
  seed?: number,
}) => Promise<Id<"productAngles">>
```

Encola y devuelve al instante, igual que `depth.enqueue`. El `sourceStorageId`
tiene que estar registrado como `kind: "object"` (ver `registerUpload`).

**No hace falta validar los rangos en el cliente** — el backend recorta:

| Argumento | Rango del modelo | Significado |
|---|---|---|
| `rotateDegrees` | entero `[-90, 90]` | giro horizontal (del `rotY` del panel) |
| `verticalTilt` | entero `[-1, 0, 1]` | `-1` vista de pájaro · `0` nivel · `1` vista de gusano |
| `moveForward` | entero `[0, 10]` | acercar la cámara (dolly), `0` = sin cambio |
| `useWideAngle` | booleano | lente gran angular |
| `prompt` | texto libre | descripción adicional del encuadre buscado |
| `seed` | entero | misma seed + mismos parámetros = mismo resultado |

Los cuatro últimos son opcionales y **solo se le mandan al modelo si los pasás**:
omitirlos deja los defaults del modelo, no `undefined`. El prototipo de
`temp/scale` solo cableaba los dos primeros porque su panel tenía tres sliders;
el modelo acepta el resto. Todo queda persistido en el job, así que una corrida
se puede auditar o repetir.

> Los dos ángulos son lo que el LoRA (`dx8152/Qwen-Edit-2509-Multiple-angles`)
> tiene entrenado, y están validados contra la API real. `prompt`,
> `move_forward`, `use_wide_angle` y `seed` salen del schema verificado del
> modelo, pero **no se probaron en una corrida real** — cada prueba cuesta.

`verticalTilt` es **discreto, no un ángulo**. El prototipo lo deriva del signo de
`rotX` con un umbral de 20° (`VERTICAL_TILT_THRESHOLD_DEG`) para que una
inclinación mínima no dispare un tilt. `rotZ` **no tiene equivalente en el modelo
y no se manda**: sigue aplicando solo a la vista previa 3D local.

### `get` / `list` — queries

```ts
get({ id: Id<"productAngles"> }) => HydratedProductAngle
list({}) => HydratedProductAngle[]
```

```ts
type HydratedProductAngle = Doc<"productAngles"> & {
  sourceUrl: string | null;
  resultUrl: string | null;   // null hasta que status === "completed"
};
```

Mismos estados que profundidad (`pending` → `processing` → `completed` / `failed`)
y el mismo polling reactivo: `useQuery(api.angles.get, id ? { id } : "skip")`.

### `remove` — mutation

Borra el job y su imagen. La conserva si un job posterior la usó como fuente
(cadena), y de paso limpia su registro en `userFiles`.

### Encadenar ángulos

Al completarse, el resultado se registra **solo** en `userFiles` como
`kind: "object"`. Eso es lo que lo habilita para dos cosas, sin volver a subir nada:

```ts
// seguir rotando desde la imagen ya generada
await angles.enqueue({ sourceStorageId: job.resultStorageId, rotateDegrees: 30 });

// o pedir un encuadre personalizado
await angles.enqueue({
  sourceStorageId: job.resultStorageId,
  rotateDegrees: -45,
  verticalTilt: -1,        // vista de pájaro
  moveForward: 4,          // más cerca
  useWideAngle: true,
  seed: 1234,              // para poder repetirlo exacto
});

// o usarla como producto de una composición
await depth.enqueue({ objectStorageId: job.resultStorageId, sceneStorageId });
```

**Al recibir el resultado, reseteá la rotación manual a 0**: la imagen nueva ya
*es* esa perspectiva, seguir aplicándole el giro del panel la duplicaría.

### Cosas que muerden acá

- **Cada generación son 2 llamadas reales a Replicate (~25-45s) y cuestan.** No hay
  caché ni debounce — a diferencia de `depth.enqueue`, que sí reutiliza el mapa de
  una escena ya procesada. Deshabilitá el botón mientras `status` no sea final.
- El `output_format` de qwen **viene en `webp` por default**; se fija en `png` del
  lado del backend, así que el `resultUrl` siempre es PNG.
- La remoción de fondo puede dejar **restos tenues de sombra o reflejo** del fondo
  de estudio. Es limitación del modelo de segmentación, no un bug del pipeline.
- El primer modelo devuelve un **array** de URIs y el segundo un string suelto; el
  backend ya normaliza ambos, pero tenelo en cuenta si tocás esa parte.

---

## 9. Recorte de sujeto — texto detrás del objeto (`api.cutouts`)

Para el efecto "text behind image" (fondo atrás, letras en el medio, objeto al
frente) el frontend necesita el **sujeto de la foto recortado con canal alpha**.
Este servicio lo produce con una sola llamada a `851-labs/background-remover`
(la misma versión pineada que usa perspectivas).

El texto NO pasa por el backend: se dibuja en canvas. Las capas son:

```
┌─────────────────────────┐
│ 3. cutout (resultUrl)   │  ← el sujeto con alpha, tapa el texto
│ 2. texto (canvas/DOM)   │
│ 1. foto original        │  ← sourceUrl / la imagen ya subida
└─────────────────────────┘
```

### `enqueue` — mutation

```ts
({
  sourceStorageId: Id<"_storage">,
  threshold?: number,       // [0..1], default del modelo: 0
}) => Promise<Id<"subjectCutouts">>
```

Acepta cualquier imagen registrada con `registerUpload` (`scene` u `object` —
para text-behind normalmente es la foto de escena). Mismo patrón asíncrono:
devuelve el id al instante y el trabajo corre agendado.

**Tiene caché**: mismo `sourceStorageId` + mismo `threshold` reutiliza un recorte
ya completado sin llamar a Replicate. Repetir el efecto sobre la misma foto es
gratis e instantáneo.

### `get` / `list` / `remove`

Iguales a los otros servicios. `HydratedSubjectCutout`:

```ts
type HydratedSubjectCutout = Doc<"subjectCutouts"> & {
  sourceUrl: string | null;   // la foto original
  resultUrl: string | null;   // PNG con alpha — null hasta "completed"
};
```

### Flujo completo del efecto

```ts
// 1. la foto ya está subida y registrada (ver §3)
const cutoutId = await cutoutsEnqueue({ sourceStorageId: sceneStorageId });

// 2. polling reactivo
const cutout = useQuery(api.cutouts.get, cutoutId ? { id: cutoutId } : "skip");

// 3. al completarse, componer en canvas:
//    drawImage(fotoOriginal) → fillText(...) → drawImage(cutoutPng)
```

Las dos imágenes se dibujan con `crossOrigin="anonymous"` si después vas a
exportar el canvas (`toBlob`/`toDataURL` fallan con canvas tainted, igual que
`getImageData` — ver §5).

### Composición con lo demás

El recorte se registra en `userFiles` como `kind: "object"`, así que también
sirve como entrada de los otros servicios: generar un ángulo del sujeto
(`angles.enqueue`) o usarlo como producto de una composición (`depth.enqueue`).

### Cosas que muerden acá

- La segmentación puede dejar **restos tenues** de borde (misma limitación que
  en perspectivas). `threshold` ajusta el corte del alpha si el default recorta
  de más o de menos.
- El sujeto que el modelo elige es **el prominente de la foto** — no hay forma
  de indicarle cuál. En fotos con varios sujetos el resultado puede sorprender.
- "Guardar imagen" del editor es del cliente (`canvas.toBlob`); si además quieren
  persistirla en la cuenta, se sube por el flujo normal de §3.

---

## 10. Correr todo

```bash
docker compose --env-file .env.dev -f docker-compose.dev.yml up -d
bun run convex:admin-key
bun run dev
```

Página de prueba: `http://localhost:3000/depth-test` (protegida por middleware,
redirige a `/signin`).

> No entres a mano a `http://127.0.0.1:3211/api/auth/callback/google`: Google lo
> invoca con `?code=…&state=…&iss=…` y sin esos parámetros falla con
> `"iss" (issuer) missing` y te rebota a `SITE_URL`. Es esperado, no un bug.
