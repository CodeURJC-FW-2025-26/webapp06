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
