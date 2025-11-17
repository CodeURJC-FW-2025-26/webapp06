import express from 'express';
import multer from 'multer';
import fs from 'node:fs/promises';
import path from 'node:path';

import * as sneakersdb from './sneakersdb.js';

const router = express.Router();
export default router;

const upload = multer({ dest: sneakersdb.UPLOADS_FOLDER })

router.get('/', async (req, res) => {

    let brands = await sneakersdb.getPosts();

    res.render('index', { brands });
});

router.post('/brand/new', upload.single('brand_image'), async function (req, res, next) {
    try {
        // Evitar destructuring complejo para que el código sea más claro
        const name = req.body.name;
        const country_origin = req.body.country_origin;
        const founded_year = req.body.founded_year;
        const description = req.body.description;
        const errors = [];

        //VALIDACIONES DEL SERVIDOR

        // 1) Campos obligatorios
        if (!name || !name.trim()) {
            errors.push("El nombre es obligatorio.");
        }
        if (!country_origin || !country_origin.trim()) {
            errors.push("El país de origen es obligatorio.");
        }
        if (!founded_year) {
            errors.push("El año de fundación es obligatorio.");
        }
        if (!description || !description.trim()) {
            errors.push("La descripción es obligatoria.");
        }

        // 2) Nombre empieza por mayúscula
        if (name && !/^[A-ZÁÉÍÓÚÑ]/.test(name.trim())) {
            errors.push("El nombre debe comenzar por una letra mayúscula.");
        }

        // 3) Nombre único en BBDD
        if (name && name.trim()) {
            const existingBrand = await sneakersdb.findBrandName(name.trim());
            if (existingBrand) {
                errors.push("Ya existe una marca con ese nombre.");
            }
        }

        // 4) Año en numero y dentro de rango
        let year = NaN;
        if (founded_year) {
            year = parseInt(founded_year, 10);
            if (Number.isNaN(year)) {
                errors.push("El año de fundación debe ser un número.");
            } else {
                const minYear = 1900;
                const maxYear = 2025; // igual en HTML
                if (year < minYear || year > maxYear) {
                    errors.push(`El año de fundación debe estar entre ${minYear} y ${maxYear}.`);
                }
            }
        }

        // 5) Descripción con longitud mínima y máxima
        const descTrim = (description || "").trim();
        if (descTrim.length < 20 || descTrim.length > 300) {
            errors.push("La descripción debe tener entre 20 y 300 caracteres.");
        }

        //SI HAY ERRORES -> VOLVER AL FORMULARIO

        if (errors.length > 0) {
            // Si se subió un archivo durante la petición y hay errores,
            // eliminar el fichero subido para no dejar archivos huérfanos
            if (req.file && req.file.filename) {
                try {
                    await fs.rm(sneakersdb.UPLOADS_FOLDER + '/' + req.file.filename);
                } catch (e) {
                    // ignore
                }
            }

            return res.status(400).render('new', {
                formTitle: 'Crear nueva marca',
                formAction: '/brand/new',
                hasErrors: true,
                errors,
                brand: {
                    name,
                    country_origin,
                    founded_year,
                    description
                }
            });
        }


        //SI NO HAY ERRORES -> GUARDAR EN MONGO 

        const brand = {
            name: name.trim(),
            country_origin: country_origin.trim(),
            founded_year: year,
            description: descTrim,
            imageFilename: req.file && req.file.filename ? req.file.filename : null,
            sneakers: []
        };

        const result = await sneakersdb.addPost(brand);
        const insertedId = result.insertedId.toString();

        // Página intermedia de confirmación
        res.render('message', {
            title: 'Marca creada',
            message: `La marca "${brand.name}" se ha creado correctamente.`,
            backUrl: `/brand/${insertedId}`,
            backText: 'Ver detalles de la marca',
            type: 'success'
        });

    } catch (err) {
        next(err);
    }
});


router.get('/brand/:id', async (req, res) => {

    let brand = await sneakersdb.getPost(req.params.id);

    // Convertir ObjectIds de modelos a strings para que funcione en Mustache
    if (brand && brand.models) {
        for (let i = 0; i < brand.models.length; i++) {
            // Convertimos el _id del modelo a string
            try {
                brand.models[i]._id = brand.models[i]._id.toString();
            } catch (e) {
                // si no tiene _id o no es ObjectId, lo dejamos como está
            }
        }
    }

    res.render('detail', { brand });
});

router.post('/brand/:id/delete', async (req, res) => {
    const brandId = req.params.id;

    // 1. Obtenemos la marca ANTES de borrarla
    const brand = await sneakersdb.getPost(brandId);

    if (!brand) {
        // No se ha encontrado la marca → error 404
        return res.status(404).render('message', {
            title: 'Marca no encontrada',
            message: 'La marca que intentas borrar no existe.',
            backUrl: '/index',
            backText: 'Volver a la página principal',
            type: 'danger'
        });
    }

    // 2. Borramos la marca (aunque deletePost devuelva lo que quiera)
    await sneakersdb.deletePost(brandId);

    // 3. Borramos la imagen asociada si existe
    if (brand.imageFilename) {
        await fs.rm(sneakersdb.UPLOADS_FOLDER + '/' + brand.imageFilename);
    }

    // 4. Mostramos página de confirmación genérica
    return res.render('message', {
        title: 'Marca borrada',
        message: `La marca "${brand.name}" se ha borrado correctamente.`,
        backUrl: '/index', // o la ruta de listado de marcas si la cambiáis
        backText: 'Volver a la página principal',
        type: 'success'
    });
});



router.get('/brand/:id/image', async (req, res) => {

    let post = await sneakersdb.getPost(req.params.id);

    res.download(sneakersdb.UPLOADS_FOLDER + '/' + post.imageFilename);

});

router.get('/brand.models/:id/image', async (req, res) => {
    // req.params.id is the model _id (p.ej. 'nike_0').
    const result = await sneakersdb.getModelById(req.params.id);

    if (!result || !result.model || !result.model.imageFilename) {
        return res.status(404).send('Imagen no encontrada');
    }

    // Servir la imagen del modelo desde la carpeta uploads (inline) para que funcione en <img>
    const imagePath = path.resolve(sneakersdb.UPLOADS_FOLDER, result.model.imageFilename);
    res.sendFile(imagePath, (err) => {
        if (err) {
            console.error('Error enviando fichero', err);
            res.status(404).send('Imagen no encontrada');
        }
    });

});

router.get('/detail/:id/', async (req, res) => {
    let brand = await sneakersdb.getPost(req.params.id);
    
    // Convertir ObjectIds de modelos a strings para que funcione en Mustache
    if (brand && brand.models) {
        for (let i = 0; i < brand.models.length; i++) {
            try {
                brand.models[i]._id = brand.models[i]._id.toString();
            } catch (e) {
                // ignore
            }
        }
    }
    
    res.render('detail', { brand });
});


router.get('/brand/:id/edit', async (req, res) => {

    const brand = await sneakersdb.getPost(req.params.id);

    if (!brand) {
        // Marca no existe → usamos la vista genérica de mensajes como error
        return res.status(404).render('message', {
            title: 'Marca no encontrada',
            message: 'La marca que intentas editar no existe.',
            backUrl: '/index',
            backText: 'Volver a la página principal',
            type: 'danger'
        });
    }

    // Reutilizamos la vista "new" pero en modo edición
    return res.render('new', {
        formTitle: 'Editar marca',
        formAction: `/brand/${req.params.id}/edit`,
        brand
    });
});


router.get('/new', (req, res) => {
    res.render('new', {
        formTitle: 'Crear nueva marca',
        formAction: '/brand/new',
        // brand vacío para que los campos salgan en blanco
        brand: {}
    });
});

router.post('/brand/:id/edit', upload.single('image'), async (req, res) => {
    try {
        const brandId = req.params.id;

        // 1. Obtenemos la marca actual
        const currentBrand = await sneakersdb.getPost(brandId);

        if (!currentBrand) {
            return res.status(404).render('message', {
                title: 'Marca no encontrada',
                message: 'La marca que intentas editar no existe.',
                backUrl: '/index',
                backText: 'Volver a la página principal',
                type: 'danger'
            });
        }

        // VALIDACIONES del formulario de edición (mismas que en creación)
        const name = req.body.name;
        const country_origin = req.body.country_origin;
        const founded_year = req.body.founded_year;
        const description = req.body.description;
        const errors = [];

        if (!name || !name.trim()) {
            errors.push("El nombre es obligatorio.");
        }
        if (!country_origin || !country_origin.trim()) {
            errors.push("El país de origen es obligatorio.");
        }
        if (!founded_year) {
            errors.push("El año de fundación es obligatorio.");
        }
        if (!description || !description.trim()) {
            errors.push("La descripción es obligatoria.");
        }

        if (name && !/^[A-ZÁÉÍÓÚÑ]/.test(name.trim())) {
            errors.push("El nombre debe comenzar por una letra mayúscula.");
        }

        // Comprobar nombre único (excluir la propia marca que estamos editando)
        if (name && name.trim()) {
            const existingBrand = await sneakersdb.findBrandName(name.trim());
            if (existingBrand && existingBrand._id && existingBrand._id.toString() !== brandId) {
                errors.push("Ya existe una marca con ese nombre.");
            }
        }

        let year = NaN;
        if (founded_year) {
            year = parseInt(founded_year, 10);
            if (Number.isNaN(year)) {
                errors.push("El año de fundación debe ser un número.");
            } else {
                const minYear = 1900;
                const maxYear = 2025;
                if (year < minYear || year > maxYear) {
                    errors.push(`El año de fundación debe estar entre ${minYear} y ${maxYear}.`);
                }
            }
        }

        const descTrim = (description || "").trim();
        if (descTrim.length < 20 || descTrim.length > 300) {
            errors.push("La descripción debe tener entre 20 y 300 caracteres.");
        }

        if (errors.length > 0) {
            // Si se subió un nuevo archivo, eliminarlo para no dejar huérfanos
            if (req.file && req.file.filename) {
                try {
                    await fs.rm(sneakersdb.UPLOADS_FOLDER + '/' + req.file.filename);
                } catch (e) {
                    // ignore
                }
            }

            return res.status(400).render('new', {
                formTitle: 'Editar marca',
                formAction: `/brand/${brandId}/edit`,
                hasErrors: true,
                errors,
                brand: {
                    name,
                    country_origin,
                    founded_year,
                    description,
                    imageFilename: currentBrand.imageFilename
                }
            });
        }

        // 2. Construimos los nuevos valores
        const updatedFields = {
            name: name.trim(),
            country_origin: country_origin.trim(),
            founded_year: year,
            description: descTrim
        };

        // 3. Si el usuario ha subido una nueva imagen, la guardamos y borramos la antigua
        if (req.file) {
            updatedFields.imageFilename = req.file.filename;

            if (currentBrand.imageFilename) {
                await fs.rm(sneakersdb.UPLOADS_FOLDER + '/' + currentBrand.imageFilename);
            }
        } else {
            // Si no sube nada, mantenemos la imagen anterior
            updatedFields.imageFilename = currentBrand.imageFilename;
        }

        // 4. Actualizamos en la base de datos (no necesitamos el retorno)
        await sneakersdb.updatePost(brandId, updatedFields);

        // 5. Mostramos página de confirmación usando message.html
        return res.render('message', {
            title: 'Marca actualizada',
            message: `La marca "${updatedFields.name}" se ha actualizado correctamente.`,
            backUrl: `/detail/${brandId}`,
            backText: 'Volver a la página de detalle',
            type: 'success'
        });

    } catch (error) {
        console.error('Error updating brand:', error);

        return res.status(500).render('message', {
            title: 'Error en el servidor',
            message: 'Ha ocurrido un error al actualizar la marca. Inténtalo de nuevo más tarde.',
            backUrl: '/index',
            backText: 'Volver a la página principal',
            type: 'danger'
        });
    }
});



router.get('/index', async (req, res) => {
    let brands = await sneakersdb.getPosts();
    res.render('index', { brands });
});
