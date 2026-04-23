# Trello Clone

Clon simplificado de Trello hecho con Flask y SQLite.

## Qué hace

- Crear tableros con listas y tarjetas
- Asignar usuarios a las tarjetas
- Dejar comentarios en las tarjetas
- Mover tarjetas entre listas
- Editar títulos y descripciones

## Cómo instalarlo

### Backend

\\\
cd backend
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
python app.py
\\\

Entra a http://localhost:5000

### Requisitos

- Python 3.8+
- Flask
- SQLite3 (viene incluido)

## Estructura

\\\
backend/
  app.py              - Servidor Flask
  trello.db           - Base de datos
  requirements.txt    - Dependencias

frontend/
  index.html
  js/app.js
  js/api.js
  css/styles.css
\\\

## Endpoints disponibles

**Usuarios**
- GET /api/usuarios
- POST /api/usuarios

**Tableros**
- GET /api/tableros
- POST /api/tableros
- GET /api/tableros/<id>
- DELETE /api/tableros/<id>

**Listas**
- POST /api/listas
- DELETE /api/listas/<id>

**Tarjetas**
- POST /api/tarjetas
- GET /api/tarjetas/<id>
- PATCH /api/tarjetas/<id>
- DELETE /api/tarjetas/<id>

**Comentarios**
- GET /api/tarjetas/<id>/comentarios
- POST /api/tarjetas/<id>/comentarios
- DELETE /api/comentarios/<id>

## Notas

- El servidor se reinicia automáticamente en desarrollo
- La base de datos se crea sola al iniciar
- CORS está habilitado para el frontend
