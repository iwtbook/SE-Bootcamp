'use strict';

const fs = require('fs-extra');
const pa11y = require('pa11y');
const urls = require('./a11y_lighthouse_includes/urls.js').urls;
const asyncForEach = require('./a11y_lighthouse_includes/helpers.js').asyncForEach;
const prettier = require('prettier');

runTests();

async function runTests() {
  try {
    const options = {
      // log: {
      //   debug: console.log,
      //   error: console.error,
      //   info: console.log
      // }
    };

    const results = [];

    await asyncForEach(urls, async (url) => {
      console.log(`Running test for ${url}`);
      results.push(await pa11y(url, options));
    });

    let data = JSON.stringify(results);
    data = prettier.format(data, { parser: 'json' })
    fs.outputFileSync('./outputs/a11y/a11y-results.json', data);

  } catch (error) {
    console.error(error.message);
  }
}