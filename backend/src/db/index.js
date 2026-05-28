import mongoose from 'mongoose';
import { DB_NAME } from '../constants.js';

const connectDB = async () => {
    try {
        const baseUri = process.env.MONGODB_URI || '';
        const uri = baseUri.includes(`/${DB_NAME}`) ? baseUri : `${baseUri}/${DB_NAME}`;
        const connectionInstance = await mongoose.connect(uri);
        console.log('Connected to MongoDB');
        console.log(`\n Mongodb connected ! DB Host : ${connectionInstance.connection.host} \n`);
    } catch (error) {
        console.error('Error connecting to MongoDB:', error);
        process.exit(1);
    }
};

export default connectDB;