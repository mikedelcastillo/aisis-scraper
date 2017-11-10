const scrape = require("./scrape.js");

let timeout = 1;

let loop = (success) => {
  scrape((courses) => {
    console.log("DONE");
    require('fs').writeFile("courses.json", JSON.stringify(courses), () => {});
  }, () => {
    console.log(`RETRYING AGAIN IN ${timeout} MILISECONDS`);
    setTimeout(() => {
      loop(success);
    }, timeout);
    timeout = timeout * 2;
  });
};

loop();
