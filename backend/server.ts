import express from 'express'
import dotenv from 'dotenv'
import { connectDB } from './config/db'
import { clerkMiddleware } from '@clerk/express';
import userRoutes from './routes/pages'

// load env variables
dotenv.config();

// connect to DB & get server handle
connectDB();
const app = express();
app.use(clerkMiddleware())

// middleware
app.use(express.json());

//routes
app.use('/api', userRoutes);


// check server
app.get('/', (req, res) => {
    res.send('server is running...');
})

const PORT = process.env.PORT || 3000;

// allow server to listen for reqs
app.listen(PORT, () => {
    console.log(`Server has a new connection on port: ${PORT}`);
    console.log('Publishable:', process.env.CLERK_PUBLISHABLE_KEY);
    console.log('Secret exists:', !!process.env.CLERK_SECRET_KEY);
})