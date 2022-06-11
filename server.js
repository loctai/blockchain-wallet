const express = require('express');
const morgan = require('morgan');
const connectDB = require('./db/db')
const cors = require('cors');
const path = require('path');
const app = express();

// Config dotev
require('dotenv').config({
    path: './config/config.env'
})
connectDB();
app.use(express.json());

const authRouter = require('./routes/auth.route.js');
const etherRouter = require('./routes/ether.route.js');
const SolanaRouter = require('./routes/solana.route.js');
// Dev Logginf Middleware
if (process.env.NODE_ENV === 'development') {
    app.use(cors())
    app.use(morgan('dev'))
    //Morgon give information about each request
    //Cors it's allow to deal with react for localhost at port 3000 without any problem
}
app.use('/api', authRouter)
app.use('/api', etherRouter)
app.use('/api', SolanaRouter)

app.use((req, res) => {
    res.status(404).json({
        success: false,
        msg: "Page not founded"
    })
})
const PORT = process.env.PORT || 5000

app.listen(PORT, () => {
    console.log(`App listening on port ${PORT}`);
});
