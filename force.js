const scrape = require("./scrape.js");

let timeout = 1;

let loop = (success) => {
  scrape((courses) => {
    console.log("DONE");
  }, () => {
    console.log(`RETRYING AGAIN IN ${timeout} MILISECONDS`);
    setTimeout(() => {
      loop(success);
    }, timeout);
    timeout = timeout * 2;
  });
};

loop();
