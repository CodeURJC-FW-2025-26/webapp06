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

export async function updatePost(id, updatedFields) {
    return await brands.findOneAndUpdate(
        { _id: new ObjectId(id) },
        { $set: updatedFields },
        { returnDocument: 'after' } // devolvemos el documento actualizado
    );
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

