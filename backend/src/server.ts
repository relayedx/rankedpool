import express from 'express'
import dotenv from 'dotenv'
import { connectDB } from '../config/db'

// load env variables
dotenv.config();

// connect to DB & get server handle
connectDB();
const app = express();

// middleware
app.use(express.json());

//routes
app.post('/');

// check server
app.get('/', (req, res) => {
    res.send('server is running...');
})

const PORT = process.env.PORT || 3000;

// allow server to listen for reqs
app.listen(PORT, () => {
    console.log(`Server has a new connection on port: ${PORT}`);
})