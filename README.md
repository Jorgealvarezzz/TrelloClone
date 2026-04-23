# Trello Clone

Un clon simplificado de Trello construido con Flask, SQLite y Vanilla JavaScript.

## ?? Características

- ? Crear tableros, listas y tarjetas
- ? Asignar usuarios a tarjetas
- ? Comentarios en tarjetas
- ? Mover tarjetas entre listas
- ? Renombrar y actualizar tarjetas
- ? API REST completa
- ? CORS habilitado para frontend
- ? Base de datos SQLite

## ?? Requisitos

- Python 3.8+
- Navegador moderno

## ?? Instalación

### Backend (Flask)

\\\ash
cd backend
python -m venv venv

# En Windows:
venv\Scripts\activate
# En Mac/Linux:
source venv/bin/activate

pip install -r requirements.txt
python app.py
\\\

El servidor corre en **http://localhost:5000**

### Frontend

El frontend está servido por Flask en la misma URL.

## ?? API Endpoints

### Usuarios
- \GET /api/usuarios\ - Obtener todos los usuarios
- \POST /api/usuarios\ - Crear usuario

### Tableros
- \GET /api/tableros\ - Obtener todos los tableros
- \POST /api/tableros\ - Crear tablero
- \GET /api/tableros/<id>\ - Obtener tablero con listas y tarjetas
- \DELETE /api/tableros/<id>\ - Borrar tablero

### Listas
- \POST /api/listas\ - Crear lista
- \DELETE /api/listas/<id>\ - Borrar lista
- \PATCH /api/listas/<id>\ - Actualizar lista

### Tarjetas
- \POST /api/tarjetas\ - Crear tarjeta
- \GET /api/tarjetas/<id>\ - Obtener tarjeta
- \PATCH /api/tarjetas/<id>\ - Actualizar tarjeta (mover, renombrar, asignar)
- \DELETE /api/tarjetas/<id>\ - Borrar tarjeta

### Comentarios
- \GET /api/tarjetas/<id>/comentarios\ - Obtener comentarios
- \POST /api/tarjetas/<id>/comentarios\ - Crear comentario
- \DELETE /api/comentarios/<id>\ - Borrar comentario

## ?? Estructura del Proyecto

\\\
TrelloClone/
+-- backend/
¦   +-- app.py                  # Aplicación Flask principal
¦   +-- requirements.txt         # Dependencias Python
¦   +-- trello.db               # Base de datos SQLite (generada automáticamente)
¦
+-- frontend/
¦   +-- index.html              # HTML principal
¦   +-- js/
¦   ¦   +-- app.js              # Lógica principal del frontend
¦   ¦   +-- api.js              # Cliente HTTP para la API
¦   +-- css/
¦       +-- styles.css          # Estilos CSS
¦
+-- .gitignore
+-- README.md
\\\

## ?? Cómo Usar

1. Instala las dependencias: \pip install -r requirements.txt\
2. Ejecuta el backend: \python app.py\
3. Abre http://localhost:5000 en tu navegador
4. ¡Crea tableros, listas y tarjetas!

## ??? Desarrollo

- El backend recarga automáticamente cuando cambias código (debug=True)
- Los cambios en frontend requieren refresh en el navegador

## ?? Ejemplo de Uso

### Crear un usuario
\\\ash
curl -X POST http://localhost:5000/api/usuarios \
  -H "Content-Type: application/json" \
  -d '{"nombre": "Juan", "email": "juan@example.com"}'
\\\

### Crear un tablero
\\\ash
curl -X POST http://localhost:5000/api/tableros \
  -H "Content-Type: application/json" \
  -d '{"nombre": "Mi Proyecto"}'
\\\

## ?? Licencia

MIT License

## ????? Autor

Jorge Álvarez - [GitHub](https://github.com/Jorgealvarezzz)
