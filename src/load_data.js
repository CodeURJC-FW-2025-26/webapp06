import fs from 'node:fs/promises';
import * as sneakersdb from './sneakersdb.js';
import { ObjectId } from 'mongodb';

const UPLOADS_FOLDER = './uploads';
const DATA_FOLDER = './data';

let dataFile = 'data.json';

const dataString = await fs.readFile(DATA_FOLDER + '/' + dataFile, 'utf8');

const brands = JSON.parse(dataString);

await sneakersdb.deletePosts();
for (let brand of brands) {
    // Asignar _id a cada modelo si no lo tienen
    if (brand.models && Array.isArray(brand.models)) {
        brand.models = brand.models.map(model => ({
            ...model,
            _id: new ObjectId()
        }));
    }
    await sneakersdb.addPost(brand);
}


await fs.rm(UPLOADS_FOLDER, { recursive: true, force: true });
await fs.mkdir(UPLOADS_FOLDER);
await fs.cp(DATA_FOLDER + '/images', UPLOADS_FOLDER, { recursive: true });

console.log('Demo data loaded');