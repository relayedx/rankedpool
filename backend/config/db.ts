import mongoose from 'mongoose'

export const connectDB = async () => {
    const mongodbURI = process.env.MONGODB_URI;
    if (!mongodbURI) {
        throw new Error('MONGODB_URI is missing!');
    }

    try {
        const conn = await mongoose.connect(mongodbURI);
    } catch (error: any) {
        console.log(`Error: ${error.message}`);
        process.exit(1);
    }
}
