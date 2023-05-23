const express = require('express');
const app = express();

app.get('/', (req, res) => {
  res.json({
    message: "Hello backend"
  })
})

app.get('/signs', (req, res) => {
  res.json({
    "sign 1": {
      "name": "100 km/h",
      "qty": 0,
      "url": "https://www.uags.com.au/assets/full/CF36AS.jpg?20200707030635"
    }
  })
})

app.listen(3000);
