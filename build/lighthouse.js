const fs = require('fs-extra');
const urls = require('./a11y_lighthouse_includes/urls.js').urls;
const config = require('./a11y_lighthouse_includes/lighthouse-config.js');
const asyncForEach = require('./a11y_lighthouse_includes/helpers.js').asyncForEach;
const lighthouse = require('lighthouse');
const chromeLauncher = require('chrome-launcher');


(async () => {
  const chrome = await chromeLauncher.launch({ chromeFlags: ['--headless'] });

  const options = {
    // logLevel: 'info', 
    output: ['html', 'csv'],
    onlyCategories: ['performance', 'accessibility', 'best-practices', 'seo'], // 'pwa'
    port: chrome.port
  };

  const timestamp = Math.floor(+new Date() / 1000);

  let report = '';

  let data = [];

  async function runLighthouse() {
    let runnerResult;
    console.log('\n============================================================');
    await asyncForEach(urls, async url => {
      // First regex removes protocol, hostname, and port, second replaces all slashes with underscores
      const subpath = url.replace(/^[a-zA-Z]{3,5}\:\/{2}[a-zA-Z0-9_.:-]+\//, '').replace(/\//g, '__');
      const path = `./outputs/lighthouse/lighthouse-reports/lighthouse-${subpath}.html`;

      runnerResult = await lighthouse(url, options, config);
      report += runnerResult.report[1];

      const obj = {
        og_url: url,
        url: runnerResult.lhr.finalUrl,
        performance: Math.round(runnerResult.lhr.categories.performance?.score * 100),
        accessibility: runnerResult.lhr.categories.accessibility?.score * 100,
        bestPractices: runnerResult.lhr.categories['best-practices']?.score * 100,
        seo: runnerResult.lhr.categories.seo?.score * 100,
        file: path
      };

      console.log('P:', obj.performance, 'A:', obj.accessibility, 'B:', obj.bestPractices, 'S:', obj.seo, 'U:', obj.url);
      console.log('============================================================');

      data.push(obj);

      // Individual HTML reports can be loaded into https://googlechrome.github.io/lighthouse/viewer/ for viewing
      fs.outputFileSync(path, runnerResult.report[0]);
      // Optionally write CSV files for each page
      // fs.writeFileSync(`./outputs/lighthouse-reports/lighthouse-${path}.csv`, runnerResult.report[1]);
    });

    data.sort((a, b) => b.performance - a.performance);

    return report;
  }


  await runLighthouse().then(async () => {
    // Always kill chrome when done
    await chrome.kill();
    // Save "all pages" file
    fs.writeFileSync(`./outputs/lighthouse/lighthouse_full_${timestamp}.csv`, report);
    buildMainPage();
    // Optionally save a complete JSON file - CANNOT be loaded into lighthouse viewer
    // fs.writeFileSync(`./outputs/lighthouse_full_${date}.json`, JSON.stringify(data));
  });

  function buildMainPage() {
    let markup = `
    <html>
      <head>
        <title>Lighthouse Links</title>
      </head>
      <style>[data-value^="1"],[data-value^="2"] { background: rgb(195 74 74 / 58%) } [data-value^="3"],[data-value^="4"],[data-value^="5"],[data-value^="6"] { background: rgb(195 106 74 / 24%) } [data-value^="7"],[data-value^="8"] { background: rgb(195 173 74 / 24%) } [data-value^="9"],[data-value="100"] { background: rgb(139 195 74 / 24%) }</style>
      <body>
        <h1>Lighthouse Results Overview</h1>
        <table>
          <tr>
            <th>Performance</th>
            <th>Accessibility</th>
            <th>Best Practices</th>
            <th>Seo</th>
            <th>URL</th>
          </tr>`;

    data.forEach(obj => {
      const path = obj.file.split('./outputs/lighthouse/')[1];
      markup += `
          <tr>
            <td>${obj.performance}</td>
            <td>${obj.accessibility}</td>
            <td>${obj.bestPractices}</td>
            <td>${obj.seo}</td>
            <td><a href="${path}">${obj.og_url}</a></td>
          </tr>`;
    });

    markup += `
        </table>
      </body>
    </html>`;

    fs.outputFileSync(`./outputs/lighthouse/lighthouse_overview_${timestamp}.html`, markup);
  }

})();
