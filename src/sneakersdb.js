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
        { returnDocument: 'after' } // return updated document
    );
}


export async function deletePost(id) {

    return await brands.findOneAndDelete({ _id: new ObjectId(id) });
}

export async function deletePosts() {

    return await brands.deleteMany();
}

export async function getPosts() {

    return await brands.find().toArray();
}

// Get posts with optional filtering and pagination
export async function getPostsPaged(filterParams = {}, page = 1, pageSize = 6) {
    const { q, category } = filterParams || {};
    const filter = {};

    if (q) {
        filter.$or = [
            { name: { $regex: q, $options: 'i' } },
            { 'models.name': { $regex: q, $options: 'i' } }
        ];
    }

    if (category) {
        filter['models.category'] = category;
    }

    const total = await brands.countDocuments(filter);
    const skip = (Math.max(1, page) - 1) * pageSize;
    const items = await brands.find(filter).skip(skip).limit(pageSize).toArray();

    return { items, total };
}
export async function getPost(id) {

    return await brands.findOne({ _id: new ObjectId(id) });
}

// Find and return a model by its _id within the models array of brands.
// Returns { model, brandId } or null if not found.
export async function getModelById(modelId) {
    // Find the brand containing the model with _id == modelId
    let brand = await brands.findOne(
        { 'models._id': modelId },
        { projection: { models: { $elemMatch: { _id: modelId } }, _id: 1 } }
    );

    // If not found, try if modelId is a hex-based ObjectId and search with ObjectId
    if (!brand) {
        try {
            if (ObjectId.isValid(modelId)) {
                const oid = new ObjectId(modelId);
                brand = await brands.findOne(
                    { 'models._id': oid },
                    { projection: { models: { $elemMatch: { _id: oid } }, _id: 1 } }
                );
            }
        } catch (e) {
            // ignore
        }
    }

    if (!brand || !brand.models || brand.models.length === 0) return null;

    return { model: brand.models[0], brandId: brand._id };
}

export async function findBrandName(name) {
    return await brands.findOne({ name: name });
}
