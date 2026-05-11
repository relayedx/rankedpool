import express from 'express'

const app = express()

// middleware
app.use(express.json())

//routes

// check server
app.get('/', (req, res) => {
    res.send('server is running...')
})

const PORT = process.env.PORT || 3000

// allow server to listen for reqs
app.listen(PORT, () => {
    console.log(`Server has a new connection on port: ${PORT}`)
})