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

router.post('/brand/new', upload.single('image'), async (req, res) => {

    let brand = {
        name: req.body.name,
        country_origin: req.body.country_origin,
        founded_year: req.body.founded_year,
        imageFilename: req.file?.filename
    };

    await sneakersdb.addPost(brand);

    res.render('saved_brand', { _id: post._id.toString() });

});

router.get('/brand/:id', async (req, res) => {

    let brand = await sneakersdb.getPost(req.params.id);

    res.render('show_post', { post });
});

router.post('/brand/:id/delete', async (req, res) => {

    // Llamamos a deletePost, que usa findOneAndDelete
    const result = await sneakersdb.deletePost(req.params.id);

    // result.value es el documento borrado (o null si no existía)
    const deletedBrand = result.value;

    if (!deletedBrand) {
        // No se ha encontrado la marca → error 404
        return res.status(404).render('message', {
            title: 'Marca no encontrada',
            message: 'La marca que intentas borrar no existe.',
            backUrl: '/index',
            backText: 'Volver a la página principal',
            type: 'danger'
        });
    }

    // Si tenía imagen asociada, la borramos del disco
    if (deletedBrand.imageFilename) {
        await fs.rm(sneakersdb.UPLOADS_FOLDER + '/' + deletedBrand.imageFilename);
    }

    // Mostramos página de confirmación genérica
    return res.render('message', {
        title: 'Marca borrada',
        message: `La marca "${deletedBrand.name}" se ha borrado correctamente.`,
        backUrl: '/index', // o la ruta de listado de marcas si la cambiáis
        backText: 'Volver a la página principal',
        type: 'success'
    });
});



router.get('/brand/:id/image', async (req, res) => {

    let post = await sneakersdb.getPost(req.params.id);

    res.download(sneakersdb.UPLOADS_FOLDER + '/' + post.imageFilename);

});

router.get('/detail/:id/', async (req, res) => {
    let brand = await sneakersdb.getPost(req.params.id);
    res.render('detail', { brand } );
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

        // 2. Construimos los nuevos valores
        const updatedFields = {
            name: req.body.name,
            country_origin: req.body.country_origin,
            founded_year: req.body.founded_year
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

        // Aquí podrías añadir validaciones: campos vacíos, año correcto, etc.

        // 4. Actualizamos en la base de datos
        const result = await sneakersdb.updatePost(brandId, updatedFields);
        const updatedBrand = result.value; // gracias a returnDocument: 'after'

        // 5. Mostramos página de confirmación usando message.html
        return res.render('message', {
            title: 'Marca actualizada',
            message: `La marca "${updatedBrand.name}" se ha actualizado correctamente.`,
            backUrl: `/detail/${brandId}`,   // o /brand/${brandId} según la ruta que uséis
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



