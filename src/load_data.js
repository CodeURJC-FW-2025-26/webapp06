import fs from 'node:fs/promises';
import * as board from './sneakersdb.js';

const UPLOADS_FOLDER = './uploads';
const DATA_FOLDER = './data';

let dataFile = 'data.json';

const dataString = await fs.readFile(DATA_FOLDER + '/' + dataFile, 'utf8');

const brands = JSON.parse(dataString);

await board.deletePosts();
for(let brand of brands){
    await board.addPost(brand);
}

await fs.rm(UPLOADS_FOLDER, { recursive: true, force: true });
await fs.mkdir(UPLOADS_FOLDER);
await fs.cp(DATA_FOLDER + '/images', UPLOADS_FOLDER, { recursive: true });

console.log('Demo data loaded');