import express from 'express';
import multer from 'multer';
import fs from 'node:fs/promises';
import path from 'node:path';

import * as sneakersdb from './sneakersdb.js';

const router = express.Router();
export default router;

const upload = multer({ dest: sneakersdb.UPLOADS_FOLDER })

router.get('/', async (req, res) => {
    try {
        const q = req.query.q || '';
        const category = req.query.category || '';
        let page = parseInt(req.query.page, 10) || 1;
        if (page < 1) page = 1;
        const pageSize = 6;

        const { items, total } = await sneakersdb.getPostsPaged({ q, category }, page, pageSize);
        const totalPages = Math.max(1, Math.ceil(total / pageSize));
        if (page > totalPages) page = totalPages;

        const pages = [];
        for (let i = 1; i <= totalPages; i++) {
            pages.push({ n: i, active: i === page, q, category });
        }

        const categories = {};
        if (category) categories[`categories_${category}`] = true;

        return res.render('index', {
            brands: items,
            currentPage: page,
            totalPages,
            pages,
            q,
            category,
            prevPage: Math.max(1, page - 1),
            nextPage: Math.min(totalPages, page + 1),
            prevDisabled: page === 1,
            nextDisabled: page === totalPages,
            ...categories
        });
    } catch (err) {
        console.error('Error listing brands:', err);
        return res.status(500).render('message', {
            title: 'Error en el servidor',
            message: 'No se pudieron listar las marcas.',
            backUrl: '/index',
            backText: 'Volver',
            type: 'danger'
        });
    }
});

router.post('/brand/new', upload.single('brand_image'), async function (req, res, next) {
    try {
       
        const name = req.body.name;
        const country_origin = req.body.country_origin;
        const founded_year = req.body.founded_year;
        const description = req.body.description;
        const errors = [];

        // SERVER VALIDATIONS

        // 1) Required fields
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

        // 2) Name starts with uppercase letter
        if (name && !/^[A-ZÁÉÍÓÚÑ]/.test(name.trim())) {
            errors.push("El nombre debe comenzar por una letra mayúscula.");
        }

        // 3) Unique name in database
        if (name && name.trim()) {
            const existingBrand = await sneakersdb.findBrandName(name.trim());
            if (existingBrand) {
                errors.push("Ya existe una marca con ese nombre.");
            }
        }

        // 4) Year is numeric and within range
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

        // 5) Description with minimum and maximum length
        const descTrim = (description || "").trim();
        if (descTrim.length < 20 || descTrim.length > 300) {
            errors.push("La descripción debe tener entre 20 y 300 caracteres.");
        }

        // IF THERE ARE ERRORS -> RETURN TO FORM

        if (errors.length > 0) {
            // If a file was uploaded during the request and there are errors,
            // delete the uploaded file to avoid orphaned files
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


        // IF NO ERRORS -> SAVE TO MONGO 

        const brand = {
            name: name.trim(),
            country_origin: country_origin.trim(),
            founded_year: year,
            description: descTrim,
            imageFilename: req.file && req.file.filename ? req.file.filename : null,
            models: []
        };

        const result = await sneakersdb.addPost(brand);
        const insertedId = result.insertedId.toString();

        // Confirmation page
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

    // Convert model ObjectIds to strings for Mustache to work
    if (brand && brand.models) {
        for (let i = 0; i < brand.models.length; i++) {
            // Convert model _id to string
            try {
                brand.models[i]._id = brand.models[i]._id.toString();
            } catch (e) {
                // If it doesn't have _id or is not an ObjectId, leave it as is
            }
        }
    }

    res.render('detail', { brand });
});

router.post('/brand/:id/delete', async (req, res) => {
    const brandId = req.params.id;

    // 1. Get the brand BEFORE deleting it
    const brand = await sneakersdb.getPost(brandId);

    if (!brand) {
        // Brand not found → error 404
        return res.status(404).render('message', {
            title: 'Marca no encontrada',
            message: 'La marca que intentas borrar no existe.',
            backUrl: '/index',
            backText: 'Volver a la página principal',
            type: 'danger'
        });
    }

    // 2. Delete the brand (regardless of what deletePost returns)
    await sneakersdb.deletePost(brandId);

    // 3. Delete associated image if it exists
    if (brand.imageFilename) {
        await fs.rm(sneakersdb.UPLOADS_FOLDER + '/' + brand.imageFilename);
    }

    // 4. Show generic confirmation page
    return res.render('message', {
        title: 'Marca borrada',
        message: `La marca "${brand.name}" se ha borrado correctamente.`,
        backUrl: '/index', // or the brand listing route if you change it
        backText: 'Volver a la página principal',
        type: 'success'
    });
});



router.get('/brand/:id/image', async (req, res) => {

    let post = await sneakersdb.getPost(req.params.id);

    res.download(sneakersdb.UPLOADS_FOLDER + '/' + post.imageFilename);

});

router.get('/brand.models/:id/image', async (req, res) => {
    // req.params.id is the model _id (e.g. 'nike_0').
    const result = await sneakersdb.getModelById(req.params.id);

    if (!result || !result.model || !result.model.imageFilename) {
        return res.status(404).send('Image not found');
    }

    // Serve model image from uploads folder (inline) to work in <img>
    const imagePath = path.resolve(sneakersdb.UPLOADS_FOLDER, result.model.imageFilename);
    res.sendFile(imagePath, (err) => {
        if (err) {
            console.error('Error sending file', err);
            res.status(404).send('Image not found');
        }
    });

});

router.get('/detail/:id/', async (req, res) => {
    let brand = await sneakersdb.getPost(req.params.id);
    
    // Convert model ObjectIds to strings for Mustache to work
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
        // Brand doesn't exist → use generic message view as error
        return res.status(404).render('message', {
            title: 'Marca no encontrada',
            message: 'La marca que intentas editar no existe.',
            backUrl: '/index',
            backText: 'Volver a la página principal',
            type: 'danger'
        });
    }

    // Reuse "new" view but in edit mode
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
        // Empty brand so fields are blank
        brand: {}
    });
});

router.post('/brand/:id/edit', upload.single('brand_image'), async (req, res) => {
    try {
        const brandId = req.params.id;

        // 1. Get current brand
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

        // VALIDATIONS for edit form (same as creation)
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

        // Check unique name (exclude the brand we are editing)
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
            // If a new file was uploaded, delete it to avoid orphaned files
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

        // 2. Build new values
        const updatedFields = {
            name: name.trim(),
            country_origin: country_origin.trim(),
            founded_year: year,
            description: descTrim
        };

        // 3. If user uploaded new image, save it and delete old one
        if (req.file) {
            updatedFields.imageFilename = req.file.filename;

            if (currentBrand.imageFilename) {
                await fs.rm(sneakersdb.UPLOADS_FOLDER + '/' + currentBrand.imageFilename);
            }
        } else {
            // If no upload, keep previous image
            updatedFields.imageFilename = currentBrand.imageFilename;
        }

        // 4. Update in database (we don't need the return value)
        await sneakersdb.updatePost(brandId, updatedFields);

        // 5. Show confirmation page using message.html
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
    try {
        const q = req.query.q || '';
        const category = req.query.category || '';
        let page = parseInt(req.query.page, 10) || 1;
        if (page < 1) page = 1;
        const pageSize = 6;

        const { items, total } = await sneakersdb.getPostsPaged({ q, category }, page, pageSize);
        const totalPages = Math.max(1, Math.ceil(total / pageSize));
        if (page > totalPages) page = totalPages;

        const pages = [];
        for (let i = 1; i <= totalPages; i++) {
            pages.push({ n: i, active: i === page, q, category });
        }

        const categories = {};
        if (category) categories[`categories_${category}`] = true;

        return res.render('index', {
            brands: items,
            currentPage: page,
            totalPages,
            pages,
            q,
            category,
            prevPage: Math.max(1, page - 1),
            nextPage: Math.min(totalPages, page + 1),
            prevDisabled: page === 1,
            nextDisabled: page === totalPages,
            ...categories
        });
    } catch (err) {
        console.error('Error listing brands:', err);
        return res.status(500).render('message', {
            title: 'Error en el servidor',
            message: 'No se pudieron listar las marcas.',
            backUrl: '/index',
            backText: 'Volver',
            type: 'danger'
        });
    }
});

router.post('/brand/:id/model/:modelId/delete', async (req, res) => {
    const brandId = req.params.id;
    const modelId = req.params.modelId;
    // 1. Get the brand
    const brand = await sneakersdb.getPost(brandId);

    if (!brand) {
        // Brand not found → error 404
        return res.status(404).render('message', {
            title: 'Marca no encontrada',
            message: 'La marca que intentas borrar no existe.',
            backUrl: '/index',
            backText: 'Volver a la página principal',
            type: 'danger'
        });

    }
    // 2. Find the model inside the brand (protect if it has no models)
    const modelsArray = brand.models || [];
    const modelIndex = modelsArray.findIndex(model => {
        try {
            return model._id.toString() === modelId;
        } catch (e) {
            return false;
        }
    });

    if (modelIndex === -1) {
        // Model not found → error 404
        return res.status(404).render('message', {
            title: 'Modelo no encontrado',
            message: 'El modelo que intentas borrar no existe en esta marca.',
            backUrl: `/brand/${brandId}`,
            backText: 'Volver a la página de la marca',
            type: 'danger'
        });

    }

    // 3. Delete the model from array
    // Ensure we have the array in the brand before modifying
    brand.models = modelsArray;
    brand.models.splice(modelIndex, 1);
    await sneakersdb.updatePost(brandId, { models: brand.models });

    // 4. Show confirmation page
    return res.render('message', {
        title: 'Modelo borrado',
        message: `El modelo se ha borrado correctamente.`,
        backUrl: `/brand/${brandId}`,
        backText: 'Volver a la página de la marca',
        type: 'success'
    });
});

router.get('/brand/:id/model/:modelId/edit', async (req, res) => {
    const brandId = req.params.id;
    const modelId = req.params.modelId;
    const result = await sneakersdb.getModelById(modelId);

    if (!result || !result.model) {
        return res.status(404).render('message', {
            title: 'Modelo no encontrado',
            message: 'El modelo que intentas editar no existe.',
            backUrl: `/brand/${brandId}`,
            backText: 'Volver a la página de la marca',
            type: 'danger'
        });

    }

    // Create object to mark selected category
    const categories = {};
    if (result.model.category) {
        categories[`categories_${result.model.category}`] = true;
    }

    return res.render('edit_model', {
        formTitle: 'Editar modelo',
        formAction: `/brand/${brandId}/model/${modelId}/edit`,
        brandId,
        model: result.model,
        ...categories
    });
});

router.post('/brand/:id/model/new', upload.single('cover_image'), async function(req, res) {
    try {
        const brandId = req.params.id;
        const brand = await sneakersdb.getPost(brandId);

        if (!brand) {
            return res.status(404).render('message', {
                title: 'Marca no encontrada',
                message: 'La marca no existe.',
                backUrl: '/index',
                backText: 'Volver a la página principal',
                type: 'danger'
            });
        }

        // Get form data
        const name = req.body.name;
        const category = req.body.category;
        const description = req.body.description;
        const release_year = req.body.release_year;
        const price = req.body.price;
        const average_rating = req.body.average_rating;
        const colorway = req.body.colorway;
        const size_range = req.body.size_range;
        const errors = [];

        // Validations
        if (!name || !name.trim()) {
            errors.push("El nombre del modelo es obligatorio.");
        }
        if (!category || !category.trim()) {
            errors.push("La categoría es obligatoria.");
        }
        if (!description || !description.trim()) {
            errors.push("La descripción es obligatoria.");
        }
        if (!release_year) {
            errors.push("El año de lanzamiento es obligatorio.");
        }
        if (!price) {
            errors.push("El precio es obligatorio.");
        }

        // Validate unique name in brand (protect if brand.models doesn't exist)
        const modelsArray = brand.models || [];
        if (name && name.trim()) {
            const existingModel = modelsArray.find(model => 
                model.name && model.name.toLowerCase() === name.trim().toLowerCase()
            );
            if (existingModel) {
                errors.push("Ya existe un modelo con ese nombre en esta marca.");
            }
        }

        // Validate numeric year and within range
        let year = NaN;
        if (release_year) {
            year = parseInt(release_year, 10);
            if (Number.isNaN(year)) {
                errors.push("El año de lanzamiento debe ser un número.");
            } else {
                const minYear = 1970;
                const maxYear = 2025;
                if (year < minYear || year > maxYear) {
                    errors.push(`El año de lanzamiento debe estar entre ${minYear} y ${maxYear}.`);
                }
            }
        }

        // Validate numeric and positive price
        let priceNum = NaN;
        if (price) {
            priceNum = parseFloat(price);
            if (Number.isNaN(priceNum) || priceNum < 0) {
                errors.push("El precio debe ser un número positivo.");
            }
        }

        // Validate rating
        let rating = NaN;
        if (average_rating && average_rating.trim()) {
            rating = parseFloat(average_rating);
            if (Number.isNaN(rating) || rating < 0 || rating > 5) {
                errors.push("La valoración debe estar entre 0 y 5.");
            }
        }

        // Validate description length
        const descTrim = (description || "").trim();
        if (descTrim.length < 10 || descTrim.length > 500) {
            errors.push("La descripción debe tener entre 10 y 500 caracteres.");
        }

        if (errors.length > 0) {
            // If file was uploaded and there are errors, delete it
            if (req.file && req.file.filename) {
                try {
                    await fs.rm(sneakersdb.UPLOADS_FOLDER + '/' + req.file.filename);
                } catch (e) {
                    // ignore
                }
            }

            // Create object to mark selected category
            const categories = {};
            if (category) {
                categories[`categories_${category}`] = true;
            }

            return res.status(400).render('edit_model', {
                formTitle: 'Añadir nuevo modelo',
                formAction: `/brand/${brandId}/model/new`,
                brandId,
                hasErrors: true,
                errors,
                model: {
                    name,
                    category,
                    description,
                    release_year,
                    price,
                    average_rating,
                    colorway,
                    size_range
                },
                ...categories
            });
        }

        // Create new model with ObjectId
        const { ObjectId } = await import('mongodb');
        const newModel = {
            _id: new ObjectId(),
            name: name.trim(),
            category: category.trim(),
            description: descTrim,
            release_year: year,
            price: priceNum,
            average_rating: rating || 0,
            colorway: colorway ? colorway.trim() : '',
            size_range: size_range ? size_range.trim() : '',
            imageFilename: req.file && req.file.filename ? req.file.filename : null
        };

        // Add model to brand array
        if (!brand.models) {
            brand.models = [];
        }
        brand.models.push(newModel);

        // Save to database
        await sneakersdb.updatePost(brandId, { models: brand.models });

        return res.render('message', {
            title: 'Modelo creado',
            message: `El modelo "${newModel.name}" se ha creado correctamente.`,
            backUrl: `/brand/${brandId}`,
            backText: 'Volver a la página de la marca',
            type: 'success'
        });

    } catch (error) {
        console.error('Error creating model:', error);
        return res.status(500).render('message', {
            title: 'Error en el servidor',
            message: 'Ha ocurrido un error al crear el modelo.',
            backUrl: '/index',
            backText: 'Volver a la página principal',
            type: 'danger'
        });
    }
});

router.post('/brand/:id/model/:modelId/edit', upload.single('cover_image'), async function(req, res) {
    try {
        const brandId = req.params.id;
        const modelId = req.params.modelId;

        // Get the brand
        const brand = await sneakersdb.getPost(brandId);
        if (!brand) {
            return res.status(404).render('message', {
                title: 'Marca no encontrada',
                message: 'La marca no existe.',
                backUrl: '/index',
                backText: 'Volver a la página principal',
                type: 'danger'
            });
        }

        // Find the model (protect if brand.models doesn't exist)
        const modelsArray = brand.models || [];
        const modelIndex = modelsArray.findIndex(model => {
            try {
                return model._id.toString() === modelId;
            } catch (e) {
                return false;
            }
        });

        if (modelIndex === -1) {
            return res.status(404).render('message', {
                title: 'Modelo no encontrado',
                message: 'El modelo no existe en esta marca.',
                backUrl: `/brand/${brandId}`,
                backText: 'Volver a la página de la marca',
                type: 'danger'
            });
        }

        // Ensure brand.models exists before working with it
        brand.models = modelsArray;
        const currentModel = brand.models[modelIndex];

        // Get form data
        const name = req.body.name;
        const category = req.body.category;
        const description = req.body.description;
        const release_year = req.body.release_year;
        const price = req.body.price;
        const average_rating = req.body.average_rating;
        const colorway = req.body.colorway;
        const size_range = req.body.size_range;
        const errors = [];

        // Validations (same as creation)
        if (!name || !name.trim()) {
            errors.push("El nombre del modelo es obligatorio.");
        }
        if (!category || !category.trim()) {
            errors.push("La categoría es obligatoria.");
        }
        if (!description || !description.trim()) {
            errors.push("La descripción es obligatoria.");
        }
        if (!release_year) {
            errors.push("El año de lanzamiento es obligatorio.");
        }
        if (!price) {
            errors.push("El precio es obligatorio.");
        }

        // Validate unique name in brand (except current model)
        if (name && name.trim()) {
            const existingModel = brand.models.find(model => {
                try {
                    const modelIdStr = model._id.toString();
                    const isSameModel = modelIdStr === modelId;
                    const sameName = model.name && model.name.toLowerCase() === name.trim().toLowerCase();
                    return sameName && !isSameModel;
                } catch (e) {
                    return false;
                }
            });
            if (existingModel) {
                errors.push("Ya existe un modelo con ese nombre en esta marca.");
            }
        }

        // Validate numeric year and within range
        let year = NaN;
        if (release_year) {
            year = parseInt(release_year, 10);
            if (Number.isNaN(year)) {
                errors.push("El año de lanzamiento debe ser un número.");
            } else {
                const minYear = 1970;
                const maxYear = 2025;
                if (year < minYear || year > maxYear) {
                    errors.push(`El año de lanzamiento debe estar entre ${minYear} y ${maxYear}.`);
                }
            }
        }

        // Validate numeric and positive price
        let priceNum = NaN;
        if (price) {
            priceNum = parseFloat(price);
            if (Number.isNaN(priceNum) || priceNum < 0) {
                errors.push("El precio debe ser un número positivo.");
            }
        }

        // Validate rating
        let rating = NaN;
        if (average_rating && average_rating.trim()) {
            rating = parseFloat(average_rating);
            if (Number.isNaN(rating) || rating < 0 || rating > 5) {
                errors.push("La valoración debe estar entre 0 y 5.");
            }
        }

        // Validate description length
        const descTrim = (description || "").trim();
        if (descTrim.length < 10 || descTrim.length > 500) {
            errors.push("La descripción debe tener entre 10 y 500 caracteres.");
        }

        if (errors.length > 0) {
            // If file was uploaded and there are errors, delete it
            if (req.file && req.file.filename) {
                try {
                    await fs.rm(sneakersdb.UPLOADS_FOLDER + '/' + req.file.filename);
                } catch (e) {
                    // ignore
                }
            }

            // Create object to mark selected category
            const categories = {};
            if (category) {
                categories[`categories_${category}`] = true;
            }

            return res.status(400).render('edit_model', {
                formTitle: 'Editar modelo',
                formAction: `/brand/${brandId}/model/${modelId}/edit`,
                brandId,
                hasErrors: true,
                errors,
                model: {
                    name,
                    category,
                    description,
                    release_year,
                    price,
                    average_rating,
                    colorway,
                    size_range,
                    imageFilename: currentModel.imageFilename
                },
                ...categories
            });
        }

        // Update the model
        const updatedModel = {
            _id: currentModel._id,
            name: name.trim(),
            category: category.trim(),
            description: descTrim,
            release_year: year,
            price: priceNum,
            average_rating: rating || 0,
            colorway: colorway ? colorway.trim() : '',
            size_range: size_range ? size_range.trim() : '',
            imageFilename: currentModel.imageFilename
        };

        // If new image was uploaded, update
        if (req.file && req.file.filename) {
            updatedModel.imageFilename = req.file.filename;
            // Delete old image if it exists
            if (currentModel.imageFilename) {
                try {
                    await fs.rm(sneakersdb.UPLOADS_FOLDER + '/' + currentModel.imageFilename);
                } catch (e) {
                    // ignore
                }
            }
        }

        // Replace model in array
        brand.models[modelIndex] = updatedModel;

        // Save to database
        await sneakersdb.updatePost(brandId, { models: brand.models });

        return res.render('message', {
            title: 'Modelo actualizado',
            message: `El modelo "${updatedModel.name}" se ha actualizado correctamente.`,
            backUrl: `/brand/${brandId}`,
            backText: 'Volver a la página de la marca',
            type: 'success'
        });

    } catch (error) {
        console.error('Error updating model:', error);
        return res.status(500).render('message', {
            title: 'Error en el servidor',
            message: 'Ha ocurrido un error al actualizar el modelo.',
            backUrl: '/index',
            backText: 'Volver a la página principal',
            type: 'danger'
        });
    }
});


