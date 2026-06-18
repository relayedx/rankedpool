import express from 'express'
import dotenv from 'dotenv'
import { connectDB } from './config/db'
import { clerkMiddleware } from '@clerk/express';
import pagesRoutes from './routes/pages'
import matchReportRoutes from './routes/matchReports'
import cors from 'cors'

// load env variables
dotenv.config();

// connect to DB & get server handle
connectDB();
const app = express();

// middleware
app.use(express.json());

app.use(cors({
    origin: 'http://localhost:5173',
    credentials: true
}));
app.use(clerkMiddleware());

//routes
app.use('/api', pagesRoutes);
app.use('/api', matchReportRoutes);

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