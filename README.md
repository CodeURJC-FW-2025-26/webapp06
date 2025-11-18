# SNEAKERS STORE

## Integrantes

- **Julián García Panadero**  
  Email: [j.garciap.2024@alumnos.urjc.es](mailto:j.garciap.2024@alumnos.urjc.es)  
  Usuario: julianjgp23  

- **Pablo Villaplana Rodríguez**  
  Email: [p.villaplana.2024@alumnos.urjc.es](mailto:p.villaplana.2024@alumnos.urjc.es)  
  Usuario: pvillar81  

- **Álvaro Fernández Jiménez**  
  Email: [a.fernandezj.2024@alumnos.urjc.es](mailto:a.fernandezj.2024@alumnos.urjc.es)  
  Usuario: minicruck  

---

# Funcionalidad

## Entidades  

### Entidad Principal  
**Nombre de la Entidad:** Marca  
**Descripción:** Representa cada marca de zapatillas disponible en la plataforma...

**Atributos:**  
- `name` → Nombre de la marca (Nike, Adidas, New Balance, etc.)  
- `description` → Breve descripción de la marca  
- `country_origin` → País de origen de la marca  
- `founded_year` → Año de fundación de la marca  
- `logo_image` → Imagen/logo de la marca  

---

### Entidad Secundaria  
**Nombre de la Entidad:** Sneaker  
**Descripción:** Representa cada modelo de zapatilla listado dentro de una marca.  

**Atributos:**  
- `name` → Nombre del modelo de la sneaker  
- `description` → Breve descripción del producto  
- `category` → Tipo (running, lifestyle, basketball, skate, etc.)  
- `release_year` → Año de lanzamiento del modelo  
- `colorway` → Combinación de colores de la sneaker  
- `price` → Precio de venta  
- `stock` → Disponibilidad en inventario  
- `size_range` → Tallas disponibles  
- `cover_image` → Imagen principal de la sneaker  
- `average_rating` → Valoración media de los usuarios  

---

## Imágenes  
- **Marcas** tendrán un `logo_image` asociado.  
- **Sneakers** tendrán una `cover_image` y se pueden añadir imágenes adicionales (vista lateral, suela, detalle de materiales).  

---

## Búsqueda y Filtrado  

- **Búsqueda:**  
  - Los usuarios pueden buscar **Marcas** por `name`.  
  - Dentro de cada marca, se pueden buscar **Sneakers** por `name`.  

- **Filtrado:**  
  La aplicación permite filtrar Sneakers en base a:  
  - `category`  
  - `release_year`  
  - `colorway`  
  - `price range`  
  - `size_range`  
  - `average_rating`

## Práctica 2

### 1. Instrucciones de ejecución

#### 1.1. Requisitos previos

- **Node.js**: versión **18.x o superior**  
- **npm**: versión **9.x o superior**  
- **MongoDB**: versión **6.x o superior** ejecutándose en local  
  - URL por defecto: `mongodb://localhost:27017`
  - Base de datos: `sneakersdb`

Opcional:

- **nodemon** (dev dependency).

#### 1.2. Clonado del repositorio

```bash
git clone https://github.com/USUARIO/REPO.git
cd REPO
```

#### 1.3. Instalación de dependencias

```bash
npm install
```

#### 1.4. Ejecución de MongoDB

```bash
mongod
```

O iniciar el servicio desde Windows.

#### 1.5. Carga de datos y ejecución

```bash
npm start
```
La aplicación estará disponible en:

👉 **http://localhost:3000/**

Para desarrollo con recarga automática:
```bash
npm run watch
```
Este comando utiliza **nodemon** para reiniciar automáticamente el servidor cuando detecta cambios en los archivos:

- `.js`
- `.html`
- `.css`

De esta forma no es necesario reiniciar manualmente la aplicación durante el desarrollo.

---

### 2. Descripción de ficheros

#### 2.1. Backend (Node.js / Express)

- `src/app.js`: Configuración principal de Express, Mustache, rutas y carga de datos.
- `src/router.js`: Define todas las rutas de la web.
- `src/sneakersdb.js`: Acceso a MongoDB.
- `src/load_data.js`: Carga los datos de demo y gestiona la carpeta uploads.

#### 2.2. Vistas (Mustache)

- `views/header.html`: Cabecera común.
- `views/footer.html`: Pie de página.
- `views/index.html`: Página principal.
- `views/detail.html`: Detalle de un modelo.
- `views/new.html`: Crear marca.
- `views/edit_model.html`: Editar modelo.
- `views/message.html`: Página de mensajes.

#### 2.3. Estilos y estáticos

- `public/css/styles.css`: Estilos personalizados.
- `public/img/sneakers/`: Imágenes de modelos.
- `public/img/web/`: Recursos web.

#### 2.4. Datos de ejemplo

- `data/data.json`: Datos de marcas y modelos.
- `data/images/`: Imágenes para copiar a uploads.

---

### 3. Vídeo demostrativo

📹 [Vídeo demostrativo](https://www.youtube.com)

---

### 4. Participación de miembros

| Miembro | Usuario GitHub | Tareas |
|--------|----------------|--------|
| Julián García Panadero | `julianjgp23` | Backend, vistas, estilos |
| Pablo Villaplana Rodríguez | `pvillar81` | Rutas, validaciones, filtros |
| Álvaro Fernández Jiménez | `minicruck` | MongoDB, carga de datos |
