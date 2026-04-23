/* =========================================================
   api.js - Wrapper para consumir el backend Flask
   Todas las funciones regresan promesas (async/await)
   ========================================================= */

// Como servimos el frontend desde Flask, usamos rutas relativas.
// Si el frontend se sirviera desde otro origen, aquí iría la URL completa:
// const API_BASE = "http://192.168.1.x:5000/api";
const API_BASE = "/api";

async function request(url, options = {}) {
  const opts = {
    headers: { "Content-Type": "application/json" },
    ...options,
  };
  if (opts.body && typeof opts.body !== "string") {
    opts.body = JSON.stringify(opts.body);
  }
  const res = await fetch(API_BASE + url, opts);
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Error desconocido" }));
    throw new Error(err.error || `HTTP ${res.status}`);
  }
  return res.status === 204 ? null : res.json();
}

const API = {
  // --- Usuarios ---
  listarUsuarios:  ()         => request("/usuarios"),
  crearUsuario:    (data)     => request("/usuarios", { method: "POST", body: data }),

  // --- Tableros ---
  listarTableros:  ()         => request("/tableros"),
  crearTablero:    (nombre)   => request("/tableros", { method: "POST", body: { nombre } }),
  obtenerTablero:  (id)       => request(`/tableros/${id}`),
  borrarTablero:   (id)       => request(`/tableros/${id}`, { method: "DELETE" }),

  // --- Listas ---
  crearLista:      (data)     => request("/listas", { method: "POST", body: data }),
  borrarLista:     (id)       => request(`/listas/${id}`, { method: "DELETE" }),

  // --- Tarjetas ---
  crearTarjeta:    (data)     => request("/tarjetas", { method: "POST", body: data }),
  actualizarTarjeta: (id, data) => request(`/tarjetas/${id}`, { method: "PATCH", body: data }),
  borrarTarjeta:   (id)       => request(`/tarjetas/${id}`, { method: "DELETE" }),

  // --- Comentarios ---
  listarComentarios: (tarjetaId)       => request(`/tarjetas/${tarjetaId}/comentarios`),
  crearComentario:   (tarjetaId, data) => request(`/tarjetas/${tarjetaId}/comentarios`, { method: "POST", body: data }),
  borrarComentario:  (id)              => request(`/comentarios/${id}`, { method: "DELETE" }),
};
