const express = require('express');
const cors = require('cors');
require('dotenv').config();

const uploadRoute = require('./routes/uploadRoute');

const app = express();
app.use(cors());
app.use(express.json());
app.use('/', uploadRoute);

module.exports = app;