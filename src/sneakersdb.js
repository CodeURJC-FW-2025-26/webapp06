import express from 'express';
import { MongoClient, ObjectId } from 'mongodb';

const router = express.Router();
export default router;

const client = new MongoClient('mongodb://localhost:27017');

const db = client.db('sneakersdb');
const brands = db.collection('brands');

export const UPLOADS_FOLDER = './uploads';

export async function addPost(brand) {

    return await brands.insertOne(brand);
}

export async function deletePost(id){

    return await brands.findOneAndDelete({ _id: new ObjectId(id) });
}

export async function deletePosts(){

    return await brands.deleteMany();
}

export async function getPosts(){

    return await brands.find().toArray();
}

export async function getPost(id){

    return await brands.findOne({ _id: new ObjectId(id) });
}

// Busca y devuelve un modelo por su _id dentro del array models de las marcas.
// Retorna { model, brandId } o null si no se encuentra.
export async function getModelById(modelId){
    // Buscar la marca que contenga el modelo con _id == modelId
    let brand = await brands.findOne(
        { 'models._id': modelId },
        { projection: { models: { $elemMatch: { _id: modelId } }, _id: 1 } }
    );

    // Si no se encuentra, probar si modelId es un ObjectId en base 16 y buscar con ObjectId
    if(!brand){
        try{
            if(ObjectId.isValid(modelId)){
                const oid = new ObjectId(modelId);
                brand = await brands.findOne(
                    { 'models._id': oid },
                    { projection: { models: { $elemMatch: { _id: oid } }, _id: 1 } }
                );
            }
        }catch(e){
            // ignore
        }
    }

    if(!brand || !brand.models || brand.models.length === 0) return null;

    return { model: brand.models[0], brandId: brand._id };
}

