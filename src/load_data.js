import fs from 'node:fs/promises';
import * as brand from './sneakersdb.js';
import { ObjectId } from 'mongodb';

const UPLOADS_FOLDER = './uploads';
const DATA_FOLDER = './data';

let dataFile = 'data.json';

const dataString = await fs.readFile(DATA_FOLDER + '/' + dataFile, 'utf8');

const brands = JSON.parse(dataString);

await sneakersdb.deletePosts();
for (let brand of brands) {
    await sneakersdb.addPost(brand);
}


await fs.rm(UPLOADS_FOLDER, { recursive: true, force: true });
await fs.mkdir(UPLOADS_FOLDER);
await fs.cp(DATA_FOLDER + '/images', UPLOADS_FOLDER, { recursive: true });

console.log('Demo data loaded');