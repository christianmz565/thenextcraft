import React, { useState } from "https://esm.sh/react@19.2.4";
import { createRoot } from "https://esm.sh/react-dom@19.2.4/client";
import { ConvexAuthProvider, useAuthActions, useConvexAuth } from "https://esm.sh/@convex-dev/auth@0.0.95/react?external=react,react-dom";
import { Authenticated, Unauthenticated, useMutation, useQuery, ConvexReactClient } from "https://esm.sh/convex@1.45.0/react?external=react,react-dom";

document.getElementById("fallback").hidden = true;

// El backend self-hosted expone Convex en este puerto.
const convex = new ConvexReactClient("http://127.0.0.1:3210");

function Upload({ kind, onUploaded }) {
  const [file, setFile] = useState(null);
  const uploadUrl = useMutation("depth:generateUploadUrl");
  const registerUpload = useMutation("depth:registerUpload");

  async function upload() {
    if (!file) return;
    const url = await uploadUrl({});
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": file.type || "application/octet-stream" },
      body: file,
    });
    if (!response.ok) throw new Error(`Upload falló (${response.status})`);
    const storageId = await response.json();
    await registerUpload({ storageId, kind });
    onUploaded(storageId);
  }

  return React.createElement("div", null,
    React.createElement("input", { type: "file", accept: "image/*", onChange: e => setFile(e.target.files?.[0] ?? null) }),
    React.createElement("button", { disabled: !file, onClick: () => upload().catch(e => alert(e.message)) }, `Subir ${kind}`),
  );
}

function Tester() {
  const { isAuthenticated, isLoading } = useConvexAuth();
  const { signIn, signOut } = useAuthActions();
  const [objectStorageId, setObjectStorageId] = useState(null);
  const [sceneStorageId, setSceneStorageId] = useState(null);
  const [result, setResult] = useState(null);
  const [busy, setBusy] = useState(false);
  const generateDepthMap = useMutation("depthActions:generateDepthMap");
  const jobs = useQuery("depth:list", isAuthenticated ? {} : "skip");

  if (isLoading) return React.createElement("p", null, "Comprobando sesión...");
  if (!isAuthenticated) return React.createElement("button", { onClick: () => signIn("google", { redirectTo: window.location.href }) }, "Iniciar sesión con Google");

  async function processScene() {
    if (!objectStorageId || !sceneStorageId) return alert("Sube ambas imágenes primero");
    setBusy(true); setResult(null);
    try { setResult(await generateDepthMap({ objectStorageId, sceneStorageId })); }
    catch (e) { setResult({ error: e.message }); }
    finally { setBusy(false); }
  }

  return React.createElement(React.Fragment, null,
    React.createElement("p", null, "Sesión activa. ", React.createElement("button", { onClick: () => signOut() }, "Cerrar sesión")),
    React.createElement("label", null, "Imagen del producto"),
    React.createElement(Upload, { kind: "object", onUploaded: setObjectStorageId }),
    React.createElement("label", null, "Imagen del escenario"),
    React.createElement(Upload, { kind: "scene", onUploaded: setSceneStorageId }),
    React.createElement("button", { disabled: busy || !objectStorageId || !sceneStorageId, onClick: processScene }, busy ? "Procesando..." : "Generar mapa de profundidad"),
    result && React.createElement("div", null, React.createElement("h2", null, "Resultado"), React.createElement("pre", { id: "status" }, JSON.stringify(result, null, 2)), result.depthUrl && React.createElement("img", { src: result.depthUrl, alt: "Mapa de profundidad" })),
    jobs && React.createElement("p", null, `Trabajos registrados: ${jobs.length}`),
  );
}

createRoot(document.getElementById("app")).render(
  React.createElement(ConvexAuthProvider, { client: convex },
    React.createElement(Authenticated, null, React.createElement(Tester)),
    React.createElement(Unauthenticated, null, React.createElement(Tester)),
  ),
);
