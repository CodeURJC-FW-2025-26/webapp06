import express from 'express';
import multer from 'multer';
import fs from 'node:fs/promises';

import * as sneakersdb from './sneakersdb.js';

const router = express.Router();
export default router;

const upload = multer({ dest: sneakersdb.UPLOADS_FOLDER })

router.get('/', async (req, res) => {

    let brands = await sneakersdb.getPosts();

    res.render('index', { brands });
});

router.post('/brand/new', upload.single('brand_image'), async (req, res, next) => {
    try {
        const { name, country_origin, founded_year, description } = req.body;
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
            return res.status(400).render('new', {
                hasErrors: errors.length > 0,
                errors,
                form: {
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
            imageFilename: req.file?.filename ?? null,
            sneakers: []
        };

        const result = await sneakersdb.addPost(brand);
        const insertedId = result.insertedId.toString();

        // Página intermedia de confirmación
        res.render('message', {
            _id: insertedId,
            name: brand.name
        });

    } catch (err) {
        next(err);
    }
});


router.get('/brand/:id', async (req, res) => {

    let brand = await sneakersdb.getPost(req.params.id);

    res.render('show_post', { post });
});

router.get('/brand/:id/delete', async (req, res) => {

    let brand = await sneakersdb.deletePost(req.params.id);

    if (brand && brand.imageFilename) {
        await fs.rm(sneakersdb.UPLOADS_FOLDER + '/' + brand.imageFilename);
    }

    res.render('deleted_post');
});

router.get('/brand/:id/image', async (req, res) => {

    let post = await sneakersdb.getPost(req.params.id);

    res.download(sneakersdb.UPLOADS_FOLDER + '/' + post.imageFilename);

});

router.get('/detail/:id/', async (req, res) => {
    let brand = await sneakersdb.getPost(req.params.id);
    res.render('detail', { brand });
});

router.get('/new', (req, res) => {
    res.render('new');
});

router.get('/index', async (req, res) => {
    let brands = await sneakersdb.getPosts();
    res.render('index', { brands });
});
