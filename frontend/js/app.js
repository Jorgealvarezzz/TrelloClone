/* =========================================================
   app.js - Lógica principal del frontend
   Maneja: vistas, usuarios, tableros, listas, tarjetas,
           drag & drop y comentarios.
   ========================================================= */

// -------- ESTADO GLOBAL --------
const state = {
  usuarioActual: null,    // { id, nombre, email }
  usuarios: [],
  tableroActual: null,    // objeto completo { id, nombre, listas:[...] }
  tarjetaEditando: null,  // objeto de la tarjeta abierta en el modal
};

// Guardamos el usuario en localStorage para no pedirlo cada vez
const LS_KEY = "minitrello_user";


// ========================================================
// INICIO
// ========================================================
document.addEventListener("DOMContentLoaded", async () => {
  // Listeners de la navbar
  document.getElementById("btn-nuevo-tablero").addEventListener("click", crearTableroUI);
  document.getElementById("btn-volver").addEventListener("click", mostrarVistaTableros);
  document.getElementById("btn-cambiar-usuario").addEventListener("click", abrirModalUsuario);

  // Listeners del modal de usuario
  document.getElementById("btn-usar-usuario").addEventListener("click", usarUsuarioSeleccionado);
  document.getElementById("btn-crear-usuario").addEventListener("click", crearYUsarUsuario);

  // Listeners del modal de tarjeta
  document.getElementById("btn-guardar-tarjeta").addEventListener("click", guardarTarjeta);
  document.getElementById("btn-borrar-tarjeta").addEventListener("click", borrarTarjetaActual);
  document.getElementById("btn-agregar-comentario").addEventListener("click", agregarComentario);

  // Cerrar modales con la X
  document.querySelectorAll("[data-close-modal]").forEach(btn => {
    btn.addEventListener("click", () => cerrarModal(btn.dataset.closeModal));
  });

  // Cerrar modales haciendo clic fuera del contenido
  document.querySelectorAll(".modal-overlay").forEach(overlay => {
    overlay.addEventListener("click", e => {
      if (e.target === overlay) overlay.style.display = "none";
    });
  });

  // Cargar usuario desde localStorage (si hay)
  const cached = localStorage.getItem(LS_KEY);
  if (cached) {
    state.usuarioActual = JSON.parse(cached);
    actualizarUsuarioUI();
  } else {
    abrirModalUsuario();
  }

  await cargarTableros();
});


// ========================================================
// USUARIOS
// ========================================================
async function abrirModalUsuario() {
  try {
    state.usuarios = await API.listarUsuarios();
  } catch (e) {
    state.usuarios = [];
  }
  const sel = document.getElementById("select-usuario");
  sel.innerHTML = "";
  if (state.usuarios.length === 0) {
    sel.innerHTML = '<option value="">(no hay usuarios)</option>';
  } else {
    state.usuarios.forEach(u => {
      const opt = document.createElement("option");
      opt.value = u.id;
      opt.textContent = `${u.nombre} (${u.email})`;
      sel.appendChild(opt);
    });
  }
  document.getElementById("modal-usuario").style.display = "flex";
}

function usarUsuarioSeleccionado() {
  const sel = document.getElementById("select-usuario");
  const id = parseInt(sel.value, 10);
  const u = state.usuarios.find(x => x.id === id);
  if (!u) return alert("Selecciona un usuario");
  setUsuario(u);
}

async function crearYUsarUsuario() {
  const nombre = document.getElementById("input-nuevo-nombre").value.trim();
  const email = document.getElementById("input-nuevo-email").value.trim();
  if (!nombre || !email) return alert("Nombre y email son obligatorios");
  try {
    const u = await API.crearUsuario({ nombre, email });
    setUsuario(u);
    document.getElementById("input-nuevo-nombre").value = "";
    document.getElementById("input-nuevo-email").value = "";
  } catch (e) {
    alert(e.message);
  }
}

function setUsuario(u) {
  state.usuarioActual = u;
  localStorage.setItem(LS_KEY, JSON.stringify(u));
  actualizarUsuarioUI();
  cerrarModal("modal-usuario");
}

function actualizarUsuarioUI() {
  const pill = document.getElementById("usuario-actual");
  pill.textContent = state.usuarioActual ? `👤 ${state.usuarioActual.nombre}` : "Sin usuario";
}


// ========================================================
// VISTAS
// ========================================================
function mostrarVistaTableros() {
  document.getElementById("vista-tableros").style.display = "block";
  document.getElementById("vista-tablero").style.display = "none";
  document.getElementById("btn-volver").style.display = "none";
  document.getElementById("btn-nuevo-tablero").style.display = "inline-block";
  state.tableroActual = null;
  cargarTableros();
}

function mostrarVistaTablero() {
  document.getElementById("vista-tableros").style.display = "none";
  document.getElementById("vista-tablero").style.display = "block";
  document.getElementById("btn-volver").style.display = "inline-block";
  document.getElementById("btn-nuevo-tablero").style.display = "none";
}


// ========================================================
// TABLEROS
// ========================================================
async function cargarTableros() {
  const grid = document.getElementById("tableros-grid");
  grid.innerHTML = "<p style='color:#fff;'>Cargando...</p>";
  try {
    const tableros = await API.listarTableros();
    if (tableros.length === 0) {
      grid.innerHTML = "<p style='color:#fff;'>No hay tableros. Crea el primero.</p>";
      return;
    }
    grid.innerHTML = "";
    tableros.forEach(t => {
      const div = document.createElement("div");
      div.className = "tablero-card";
      div.innerHTML = `
        <h3></h3>
        <button class="btn-delete-board" title="Eliminar">🗑</button>
      `;
      div.querySelector("h3").textContent = t.nombre;
      div.addEventListener("click", e => {
        if (e.target.closest(".btn-delete-board")) return;
        abrirTablero(t.id);
      });
      div.querySelector(".btn-delete-board").addEventListener("click", async () => {
        if (!confirm(`¿Eliminar tablero "${t.nombre}"?`)) return;
        await API.borrarTablero(t.id);
        cargarTableros();
      });
      grid.appendChild(div);
    });
  } catch (e) {
    grid.innerHTML = `<p style='color:#fff;'>Error: ${e.message}</p>`;
  }
}

async function crearTableroUI() {
  const nombre = prompt("Nombre del tablero:");
  if (!nombre || !nombre.trim()) return;
  try {
    await API.crearTablero(nombre.trim());
    cargarTableros();
  } catch (e) {
    alert(e.message);
  }
}

async function abrirTablero(id) {
  try {
    state.tableroActual = await API.obtenerTablero(id);
    // Aseguramos tener la lista de usuarios para asignar
    if (state.usuarios.length === 0) {
      state.usuarios = await API.listarUsuarios();
    }
    document.getElementById("tablero-titulo").textContent = state.tableroActual.nombre;
    mostrarVistaTablero();
    renderListas();
  } catch (e) {
    alert(e.message);
  }
}


// ========================================================
// RENDER: LISTAS Y TARJETAS
// ========================================================
function renderListas() {
  const container = document.getElementById("listas-container");
  container.innerHTML = "";

  state.tableroActual.listas.forEach(lista => {
    container.appendChild(crearElementoLista(lista));
  });

  // Botón "Agregar otra lista"
  const btnAgregar = document.createElement("div");
  btnAgregar.className = "agregar-lista";
  btnAgregar.textContent = "+ Agregar otra lista";
  btnAgregar.addEventListener("click", () => mostrarFormularioLista(btnAgregar));
  container.appendChild(btnAgregar);
}

function crearElementoLista(lista) {
  const div = document.createElement("div");
  div.className = "lista";
  div.dataset.listaId = lista.id;
  div.innerHTML = `
    <div class="lista-header">
      <h3></h3>
      <button class="btn-delete-list" title="Eliminar lista">🗑</button>
    </div>
    <div class="tarjetas"></div>
    <div class="agregar-tarjeta">+ Agregar tarjeta</div>
  `;
  div.querySelector("h3").textContent = lista.nombre;

  // Eliminar lista
  div.querySelector(".btn-delete-list").addEventListener("click", async () => {
    if (!confirm(`¿Eliminar la lista "${lista.nombre}"?`)) return;
    await API.borrarLista(lista.id);
    await recargarTablero();
  });

  // Tarjetas
  const cont = div.querySelector(".tarjetas");
  lista.tarjetas.forEach(t => cont.appendChild(crearElementoTarjeta(t)));

  // Agregar tarjeta
  div.querySelector(".agregar-tarjeta").addEventListener("click", ev => {
    mostrarFormularioTarjeta(lista.id, ev.currentTarget);
  });

  // Configurar drag-over (las tarjetas se sueltan en el contenedor .tarjetas)
  habilitarDropEnLista(div, cont, lista.id);

  return div;
}

function crearElementoTarjeta(tarjeta) {
  const div = document.createElement("div");
  div.className = "tarjeta";
  div.draggable = true;
  div.dataset.tarjetaId = tarjeta.id;
  const asignado = tarjeta.asignado_nombre
    ? `<span class="tarjeta-asignado">👤 ${escapeHtml(tarjeta.asignado_nombre)}</span>`
    : "";
  div.innerHTML = `<div>${escapeHtml(tarjeta.titulo)}</div>${asignado}`;

  // Bandera para distinguir click de drag
  let fueArrastrada = false;

  // Drag events
  div.addEventListener("dragstart", e => {
    fueArrastrada = true;
    div.classList.add("dragging");
    e.dataTransfer.setData("text/plain", String(tarjeta.id));
    e.dataTransfer.effectAllowed = "move";
  });
  div.addEventListener("dragend", () => {
    div.classList.remove("dragging");
    // Pequeño delay para que el click posterior al drag no abra el modal
    setTimeout(() => { fueArrastrada = false; }, 50);
  });

  // Abrir modal al hacer clic (si NO fue un drag)
  div.addEventListener("click", () => {
    if (fueArrastrada) return;
    abrirModalTarjeta(tarjeta);
  });

  return div;
}

// ========================================================
// DRAG & DROP
// Los handlers dragover/drop se ponen sobre el elemento .lista completo
// (no solo sobre .tarjetas) para que también funcione cuando la lista está
// vacía o al soltar entre el header y las tarjetas.
// ========================================================
function habilitarDropEnLista(listaEl, contenedorTarjetas, listaId) {
  listaEl.addEventListener("dragover", e => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    listaEl.classList.add("drag-over");

    const dragging = document.querySelector(".tarjeta.dragging");
    if (!dragging) return;

    // Colocamos visualmente la tarjeta arrastrada en el contenedor
    const despues = obtenerElementoDespuesDe(contenedorTarjetas, e.clientY);
    if (despues == null) {
      contenedorTarjetas.appendChild(dragging);
    } else {
      contenedorTarjetas.insertBefore(dragging, despues);
    }
  });

  listaEl.addEventListener("dragleave", e => {
    // Solo quitamos el highlight si salimos realmente de la lista
    if (!listaEl.contains(e.relatedTarget)) {
      listaEl.classList.remove("drag-over");
    }
  });

  listaEl.addEventListener("drop", async e => {
    e.preventDefault();
    e.stopPropagation();
    listaEl.classList.remove("drag-over");

    const tarjetaId = parseInt(e.dataTransfer.getData("text/plain"), 10);
    if (!tarjetaId) return;

    // Calculamos la nueva posición según el orden visual actual
    const posicion = Array.from(contenedorTarjetas.children)
      .findIndex(el => parseInt(el.dataset.tarjetaId, 10) === tarjetaId);

    try {
      await API.actualizarTarjeta(tarjetaId, {
        lista_id: listaId,
        posicion: posicion >= 0 ? posicion : 0,
      });
      await recargarTablero();
    } catch (err) {
      alert("No se pudo mover la tarjeta: " + err.message);
      await recargarTablero();
    }
  });
}

// Encuentra el elemento de tarjeta más cercano verticalmente para saber
// dónde insertar la tarjeta arrastrada
function obtenerElementoDespuesDe(container, y) {
  const tarjetas = [...container.querySelectorAll(".tarjeta:not(.dragging)")];
  return tarjetas.reduce(
    (cercano, el) => {
      const box = el.getBoundingClientRect();
      const offset = y - box.top - box.height / 2;
      if (offset < 0 && offset > cercano.offset) {
        return { offset, el };
      }
      return cercano;
    },
    { offset: Number.NEGATIVE_INFINITY, el: null }
  ).el;
}

// ========================================================
// FORMULARIOS INLINE (agregar lista / tarjeta)
// ========================================================
function mostrarFormularioLista(btnEl) {
  const form = document.createElement("div");
  form.className = "agregar-lista-form";
  form.innerHTML = `
    <input type="text" placeholder="Título de la lista" />
    <div class="acciones">
      <button class="btn btn-primary btn-agregar">Agregar</button>
      <button class="btn btn-ghost btn-cancelar">Cancelar</button>
    </div>
  `;
  btnEl.replaceWith(form);
  const input = form.querySelector("input");
  input.focus();

  const cancelar = () => renderListas();
  form.querySelector(".btn-cancelar").addEventListener("click", cancelar);
  form.querySelector(".btn-agregar").addEventListener("click", async () => {
    const nombre = input.value.trim();
    if (!nombre) return cancelar();
    await API.crearLista({ tablero_id: state.tableroActual.id, nombre });
    await recargarTablero();
  });
  input.addEventListener("keydown", e => {
    if (e.key === "Enter") form.querySelector(".btn-agregar").click();
    if (e.key === "Escape") cancelar();
  });
}

function mostrarFormularioTarjeta(listaId, btnEl) {
  const form = document.createElement("div");
  form.className = "agregar-tarjeta-form";
  form.innerHTML = `
    <textarea rows="2" placeholder="Introduce un título para esta tarjeta..."></textarea>
    <div class="acciones">
      <button class="btn btn-primary btn-agregar">Añadir</button>
      <button class="btn btn-ghost btn-cancelar">Cancelar</button>
    </div>
  `;
  btnEl.replaceWith(form);
  const ta = form.querySelector("textarea");
  ta.focus();

  const cancelar = () => recargarTablero();
  form.querySelector(".btn-cancelar").addEventListener("click", cancelar);
  form.querySelector(".btn-agregar").addEventListener("click", async () => {
    const titulo = ta.value.trim();
    if (!titulo) return cancelar();
    await API.crearTarjeta({ lista_id: listaId, titulo });
    await recargarTablero();
  });
  ta.addEventListener("keydown", e => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      form.querySelector(".btn-agregar").click();
    }
    if (e.key === "Escape") cancelar();
  });
}


// ========================================================
// MODAL DE TARJETA (detalle + asignación + comentarios)
// ========================================================
async function abrirModalTarjeta(tarjeta) {
  state.tarjetaEditando = tarjeta;
  document.getElementById("tarjeta-titulo").value = tarjeta.titulo;
  document.getElementById("tarjeta-descripcion").value = tarjeta.descripcion || "";

  // Nombre de la lista
  const lista = state.tableroActual.listas.find(l => l.id === tarjeta.lista_id);
  document.getElementById("tarjeta-lista-nombre").textContent = lista ? lista.nombre : "?";

  // Llenar select de asignado
  const sel = document.getElementById("tarjeta-asignado");
  sel.innerHTML = '<option value="">Sin asignar</option>';
  state.usuarios.forEach(u => {
    const opt = document.createElement("option");
    opt.value = u.id;
    opt.textContent = u.nombre;
    if (u.id === tarjeta.usuario_id) opt.selected = true;
    sel.appendChild(opt);
  });

  // Cargar comentarios
  await renderComentarios(tarjeta.id);

  document.getElementById("modal-tarjeta").style.display = "flex";
}

async function guardarTarjeta() {
  const t = state.tarjetaEditando;
  if (!t) return;
  const titulo = document.getElementById("tarjeta-titulo").value.trim();
  const descripcion = document.getElementById("tarjeta-descripcion").value;
  const asignadoVal = document.getElementById("tarjeta-asignado").value;
  const usuario_id = asignadoVal ? parseInt(asignadoVal, 10) : null;
  if (!titulo) return alert("El título no puede estar vacío");
  try {
    await API.actualizarTarjeta(t.id, { titulo, descripcion, usuario_id });
    cerrarModal("modal-tarjeta");
    await recargarTablero();
  } catch (e) {
    alert(e.message);
  }
}

async function borrarTarjetaActual() {
  const t = state.tarjetaEditando;
  if (!t) return;
  if (!confirm(`¿Eliminar la tarjeta "${t.titulo}"?`)) return;
  await API.borrarTarjeta(t.id);
  cerrarModal("modal-tarjeta");
  await recargarTablero();
}

async function renderComentarios(tarjetaId) {
  const ul = document.getElementById("comentarios-lista");
  ul.innerHTML = "<li>Cargando...</li>";
  try {
    const comentarios = await API.listarComentarios(tarjetaId);
    ul.innerHTML = "";
    if (comentarios.length === 0) {
      ul.innerHTML = "<li style='background:none;color:#888;'>Sin comentarios</li>";
      return;
    }
    comentarios.forEach(c => {
      const li = document.createElement("li");
      const fecha = new Date(c.creado_en).toLocaleString();
      li.innerHTML = `
        <div>
          <span class="autor"></span>
          <span class="texto"></span>
          <div class="fecha"></div>
        </div>
        <button class="btn-borrar-comentario" title="Eliminar">🗑</button>
      `;
      li.querySelector(".autor").textContent = c.nombre;
      li.querySelector(".texto").textContent = c.texto;
      li.querySelector(".fecha").textContent = fecha;
      li.querySelector(".btn-borrar-comentario").addEventListener("click", async () => {
        await API.borrarComentario(c.id);
        await renderComentarios(tarjetaId);
      });
      ul.appendChild(li);
    });
  } catch (e) {
    ul.innerHTML = `<li>Error: ${e.message}</li>`;
  }
}

async function agregarComentario() {
  const t = state.tarjetaEditando;
  if (!t) return;
  if (!state.usuarioActual) return alert("Selecciona un usuario primero");
  const texto = document.getElementById("comentario-texto").value.trim();
  if (!texto) return;
  try {
    await API.crearComentario(t.id, {
      usuario_id: state.usuarioActual.id,
      texto,
    });
    document.getElementById("comentario-texto").value = "";
    await renderComentarios(t.id);
  } catch (e) {
    alert(e.message);
  }
}


// ========================================================
// UTILIDADES
// ========================================================
async function recargarTablero() {
  if (!state.tableroActual) return;
  state.tableroActual = await API.obtenerTablero(state.tableroActual.id);
  renderListas();
}

function cerrarModal(id) {
  document.getElementById(id).style.display = "none";
}

function escapeHtml(str) {
  if (str == null) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
