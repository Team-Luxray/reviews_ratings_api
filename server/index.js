const express = require('express');
const morgan = require('morgan');
const cors = require('cors');
const router = require('./routes.js');

const app = express();
const PORT = 3000;

// initiate middleware
app.use(express.json());
app.use(morgan('dev'));
app.use(cors());

// routes
app.use('/api', router);

// listening on port 3000;
app.listen(PORT, () => {
  console.log(`Listening on port ${PORT}`);
});