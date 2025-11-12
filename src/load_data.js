import fs from 'node:fs/promises';
import * as board from './sneakersdb.js';
import { ObjectId } from 'mongodb';

const UPLOADS_FOLDER = './uploads';
const DATA_FOLDER = './data';

let dataFile = 'data.json';

const dataString = await fs.readFile(DATA_FOLDER + '/' + dataFile, 'utf8');

const brands = JSON.parse(dataString);

await board.deletePosts();
for(let brand of brands){
    for(let i = 0; i < brand.models.length; i++){
        let model = brand.models[i];
        model._id = new ObjectId();
    }
    await board.addPost(brand);
}


await fs.rm(UPLOADS_FOLDER, { recursive: true, force: true });
await fs.mkdir(UPLOADS_FOLDER);
await fs.cp(DATA_FOLDER + '/images', UPLOADS_FOLDER, { recursive: true });

console.log('Demo data loaded');