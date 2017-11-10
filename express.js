const express = require('express');
const app = express();
const server = require('http').Server(app);
const fs = require('fs');

const PORT = 3000;
console.log("Server is running on " + PORT);

server.listen(PORT);

app.get('/', (request, response) => {
  const scrape = require("./scrape.js");
  scrape((courses) => {
    response.send(JSON.stringify(courses));
  }, () => {
    response.send("Something went wrong.");
  });
});
