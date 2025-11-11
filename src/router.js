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
        funded_year: req.body.funded_year,
        imageFilename: req.file?.filename
    };

    await sneakersdb.addPost(brand);

    res.render('saved_brand', { _id: post._id.toString() });

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
    res.render('detail', { brand } );
}
)

