"""
Backend - Clon simplificado de Trello
Flask + SQLite
Endpoints:
  /api/usuarios         GET, POST
  /api/tableros         GET, POST
  /api/tableros/<id>    GET, DELETE
  /api/listas           POST
  /api/listas/<id>      DELETE
  /api/tarjetas         POST
  /api/tarjetas/<id>    GET, PATCH, DELETE  (PATCH sirve para mover/renombrar/asignar)
  /api/tarjetas/<id>/comentarios  GET, POST
  /api/comentarios/<id>           DELETE
"""
import os
import sqlite3
from datetime import datetime
from flask import Flask, request, jsonify, g, send_from_directory
from flask_cors import CORS

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DB_PATH = os.path.join(BASE_DIR, "trello.db")
FRONTEND_DIR = os.path.join(BASE_DIR, "..", "frontend")

app = Flask(__name__, static_folder=None)
CORS(app)  # habilita peticiones desde el frontend


# ---------------- BASE DE DATOS ----------------
def get_db():
    if "db" not in g:
        g.db = sqlite3.connect(DB_PATH)
        g.db.row_factory = sqlite3.Row
        g.db.execute("PRAGMA foreign_keys = ON")
    return g.db


@app.teardown_appcontext
def close_db(exception):
    db = g.pop("db", None)
    if db is not None:
        db.close()


def init_db():
    conn = sqlite3.connect(DB_PATH)
    cur = conn.cursor()
    cur.executescript("""
    CREATE TABLE IF NOT EXISTS usuarios (
        id         INTEGER PRIMARY KEY AUTOINCREMENT,
        nombre     TEXT NOT NULL,
        email      TEXT NOT NULL UNIQUE,
        creado_en  TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS tableros (
        id         INTEGER PRIMARY KEY AUTOINCREMENT,
        nombre     TEXT NOT NULL,
        creado_en  TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS listas (
        id         INTEGER PRIMARY KEY AUTOINCREMENT,
        tablero_id INTEGER NOT NULL,
        nombre     TEXT NOT NULL,
        posicion   INTEGER NOT NULL DEFAULT 0,
        creado_en  TEXT NOT NULL,
        FOREIGN KEY(tablero_id) REFERENCES tableros(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS tarjetas (
        id          INTEGER PRIMARY KEY AUTOINCREMENT,
        lista_id    INTEGER NOT NULL,
        titulo      TEXT NOT NULL,
        descripcion TEXT DEFAULT '',
        posicion    INTEGER NOT NULL DEFAULT 0,
        usuario_id  INTEGER,          -- asignado a (puede ser NULL)
        creado_en   TEXT NOT NULL,
        FOREIGN KEY(lista_id)   REFERENCES listas(id)   ON DELETE CASCADE,
        FOREIGN KEY(usuario_id) REFERENCES usuarios(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS comentarios (
        id          INTEGER PRIMARY KEY AUTOINCREMENT,
        tarjeta_id  INTEGER NOT NULL,
        usuario_id  INTEGER NOT NULL,
        texto       TEXT NOT NULL,
        creado_en   TEXT NOT NULL,
        FOREIGN KEY(tarjeta_id) REFERENCES tarjetas(id) ON DELETE CASCADE,
        FOREIGN KEY(usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE
    );
    """)
    conn.commit()

    # Datos de ejemplo si está vacío (para demo al presentar)
    if cur.execute("SELECT COUNT(*) FROM tableros").fetchone()[0] == 0:
        now = datetime.now().isoformat(timespec="seconds")
        cur.execute("INSERT INTO usuarios (nombre, email, creado_en) VALUES (?,?,?)",
                    ("Ana López", "ana@example.com", now))
        cur.execute("INSERT INTO usuarios (nombre, email, creado_en) VALUES (?,?,?)",
                    ("Luis Pérez", "luis@example.com", now))
        cur.execute("INSERT INTO tableros (nombre, creado_en) VALUES (?,?)",
                    ("Proyecto Final", now))
        tablero_id = cur.lastrowid
        for i, n in enumerate(["To Do", "Doing", "Done"]):
            cur.execute(
                "INSERT INTO listas (tablero_id, nombre, posicion, creado_en) VALUES (?,?,?,?)",
                (tablero_id, n, i, now),
            )
        conn.commit()
    conn.close()


def now_iso():
    return datetime.now().isoformat(timespec="seconds")


def row_to_dict(row):
    return dict(row) if row else None


# ---------------- USUARIOS ----------------
@app.route("/api/usuarios", methods=["GET", "POST"])
def usuarios():
    db = get_db()
    if request.method == "POST":
        data = request.get_json() or {}
        nombre = (data.get("nombre") or "").strip()
        email = (data.get("email") or "").strip().lower()
        if not nombre or not email:
            return jsonify({"error": "nombre y email son obligatorios"}), 400
        try:
            cur = db.execute(
                "INSERT INTO usuarios (nombre, email, creado_en) VALUES (?,?,?)",
                (nombre, email, now_iso()),
            )
            db.commit()
            row = db.execute("SELECT * FROM usuarios WHERE id=?", (cur.lastrowid,)).fetchone()
            return jsonify(row_to_dict(row)), 201
        except sqlite3.IntegrityError:
            # ya existe — lo devolvemos
            row = db.execute("SELECT * FROM usuarios WHERE email=?", (email,)).fetchone()
            return jsonify(row_to_dict(row)), 200

    rows = db.execute("SELECT * FROM usuarios ORDER BY nombre").fetchall()
    return jsonify([dict(r) for r in rows])


# ---------------- TABLEROS ----------------
@app.route("/api/tableros", methods=["GET", "POST"])
def tableros():
    db = get_db()
    if request.method == "POST":
        data = request.get_json() or {}
        nombre = (data.get("nombre") or "").strip()
        if not nombre:
            return jsonify({"error": "nombre es obligatorio"}), 400
        cur = db.execute(
            "INSERT INTO tableros (nombre, creado_en) VALUES (?,?)",
            (nombre, now_iso()),
        )
        tablero_id = cur.lastrowid
        # Crear listas por defecto
        for i, n in enumerate(["To Do", "Doing", "Done"]):
            db.execute(
                "INSERT INTO listas (tablero_id, nombre, posicion, creado_en) VALUES (?,?,?,?)",
                (tablero_id, n, i, now_iso()),
            )
        db.commit()
        row = db.execute("SELECT * FROM tableros WHERE id=?", (tablero_id,)).fetchone()
        return jsonify(row_to_dict(row)), 201

    rows = db.execute("SELECT * FROM tableros ORDER BY creado_en DESC").fetchall()
    return jsonify([dict(r) for r in rows])


@app.route("/api/tableros/<int:tablero_id>", methods=["GET", "DELETE"])
def tablero_detalle(tablero_id):
    db = get_db()
    if request.method == "DELETE":
        db.execute("DELETE FROM tableros WHERE id=?", (tablero_id,))
        db.commit()
        return jsonify({"ok": True})

    tablero = db.execute("SELECT * FROM tableros WHERE id=?", (tablero_id,)).fetchone()
    if not tablero:
        return jsonify({"error": "Tablero no encontrado"}), 404

    listas = db.execute(
        "SELECT * FROM listas WHERE tablero_id=? ORDER BY posicion, id",
        (tablero_id,),
    ).fetchall()

    resultado = {"id": tablero["id"], "nombre": tablero["nombre"], "listas": []}
    for l in listas:
        tarjetas = db.execute(
            """SELECT t.*, u.nombre AS asignado_nombre
                 FROM tarjetas t
                 LEFT JOIN usuarios u ON u.id = t.usuario_id
                WHERE t.lista_id=?
             ORDER BY t.posicion, t.id""",
            (l["id"],),
        ).fetchall()
        resultado["listas"].append({
            "id": l["id"],
            "nombre": l["nombre"],
            "posicion": l["posicion"],
            "tarjetas": [dict(t) for t in tarjetas],
        })
    return jsonify(resultado)


# ---------------- LISTAS ----------------
@app.route("/api/listas", methods=["POST"])
def crear_lista():
    data = request.get_json() or {}
    tablero_id = data.get("tablero_id")
    nombre = (data.get("nombre") or "").strip()
    if not tablero_id or not nombre:
        return jsonify({"error": "tablero_id y nombre son obligatorios"}), 400
    db = get_db()
    # posicion = última + 1
    max_pos = db.execute(
        "SELECT COALESCE(MAX(posicion),-1) AS m FROM listas WHERE tablero_id=?",
        (tablero_id,),
    ).fetchone()["m"]
    cur = db.execute(
        "INSERT INTO listas (tablero_id, nombre, posicion, creado_en) VALUES (?,?,?,?)",
        (tablero_id, nombre, max_pos + 1, now_iso()),
    )
    db.commit()
    row = db.execute("SELECT * FROM listas WHERE id=?", (cur.lastrowid,)).fetchone()
    return jsonify(row_to_dict(row)), 201


@app.route("/api/listas/<int:lista_id>", methods=["DELETE", "PATCH"])
def lista_detalle(lista_id):
    db = get_db()
    if request.method == "DELETE":
        db.execute("DELETE FROM listas WHERE id=?", (lista_id,))
        db.commit()
        return jsonify({"ok": True})

    data = request.get_json() or {}
    nombre = data.get("nombre")
    if nombre:
        db.execute("UPDATE listas SET nombre=? WHERE id=?", (nombre.strip(), lista_id))
        db.commit()
    row = db.execute("SELECT * FROM listas WHERE id=?", (lista_id,)).fetchone()
    return jsonify(row_to_dict(row))


# ---------------- TARJETAS ----------------
@app.route("/api/tarjetas", methods=["POST"])
def crear_tarjeta():
    data = request.get_json() or {}
    lista_id = data.get("lista_id")
    titulo = (data.get("titulo") or "").strip()
    if not lista_id or not titulo:
        return jsonify({"error": "lista_id y titulo son obligatorios"}), 400
    db = get_db()
    max_pos = db.execute(
        "SELECT COALESCE(MAX(posicion),-1) AS m FROM tarjetas WHERE lista_id=?",
        (lista_id,),
    ).fetchone()["m"]
    cur = db.execute(
        """INSERT INTO tarjetas (lista_id, titulo, descripcion, posicion, usuario_id, creado_en)
           VALUES (?,?,?,?,?,?)""",
        (
            lista_id,
            titulo,
            data.get("descripcion", ""),
            max_pos + 1,
            data.get("usuario_id"),
            now_iso(),
        ),
    )
    db.commit()
    row = db.execute(
        """SELECT t.*, u.nombre AS asignado_nombre
             FROM tarjetas t LEFT JOIN usuarios u ON u.id=t.usuario_id
            WHERE t.id=?""",
        (cur.lastrowid,),
    ).fetchone()
    return jsonify(row_to_dict(row)), 201


@app.route("/api/tarjetas/<int:tarjeta_id>", methods=["GET", "PATCH", "DELETE"])
def tarjeta_detalle(tarjeta_id):
    db = get_db()

    if request.method == "DELETE":
        db.execute("DELETE FROM tarjetas WHERE id=?", (tarjeta_id,))
        db.commit()
        return jsonify({"ok": True})

    if request.method == "PATCH":
        data = request.get_json() or {}
        campos = []
        valores = []
        for k in ("titulo", "descripcion", "lista_id", "posicion", "usuario_id"):
            if k in data:
                campos.append(f"{k}=?")
                valores.append(data[k])
        if campos:
            valores.append(tarjeta_id)
            db.execute(f"UPDATE tarjetas SET {', '.join(campos)} WHERE id=?", valores)
            db.commit()

    row = db.execute(
        """SELECT t.*, u.nombre AS asignado_nombre
             FROM tarjetas t LEFT JOIN usuarios u ON u.id=t.usuario_id
            WHERE t.id=?""",
        (tarjeta_id,),
    ).fetchone()
    if not row:
        return jsonify({"error": "Tarjeta no encontrada"}), 404
    return jsonify(row_to_dict(row))


# ---------------- COMENTARIOS ----------------
@app.route("/api/tarjetas/<int:tarjeta_id>/comentarios", methods=["GET", "POST"])
def comentarios(tarjeta_id):
    db = get_db()
    if request.method == "POST":
        data = request.get_json() or {}
        usuario_id = data.get("usuario_id")
        texto = (data.get("texto") or "").strip()
        if not usuario_id or not texto:
            return jsonify({"error": "usuario_id y texto son obligatorios"}), 400
        cur = db.execute(
            """INSERT INTO comentarios (tarjeta_id, usuario_id, texto, creado_en)
               VALUES (?,?,?,?)""",
            (tarjeta_id, usuario_id, texto, now_iso()),
        )
        db.commit()
        row = db.execute(
            """SELECT c.*, u.nombre FROM comentarios c
                 JOIN usuarios u ON u.id=c.usuario_id
                WHERE c.id=?""",
            (cur.lastrowid,),
        ).fetchone()
        return jsonify(row_to_dict(row)), 201

    rows = db.execute(
        """SELECT c.*, u.nombre FROM comentarios c
             JOIN usuarios u ON u.id=c.usuario_id
            WHERE c.tarjeta_id=?
         ORDER BY c.creado_en ASC""",
        (tarjeta_id,),
    ).fetchall()
    return jsonify([dict(r) for r in rows])


@app.route("/api/comentarios/<int:comentario_id>", methods=["DELETE"])
def borrar_comentario(comentario_id):
    db = get_db()
    db.execute("DELETE FROM comentarios WHERE id=?", (comentario_id,))
    db.commit()
    return jsonify({"ok": True})


# ---------------- SERVIR FRONTEND ----------------
@app.route("/")
def index():
    return send_from_directory(FRONTEND_DIR, "index.html")


@app.route("/<path:filename>")
def static_files(filename):
    return send_from_directory(FRONTEND_DIR, filename)


# ---------------- MAIN ----------------
if __name__ == "__main__":
    init_db()
    # host=0.0.0.0 -> accesible en red local
    app.run(host="0.0.0.0", port=5000, debug=True)
