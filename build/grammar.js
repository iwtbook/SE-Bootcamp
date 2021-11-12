// grammar.js

const fs = require('fs-extra');
const gramma = require('gramma');
const config = fs.readFileSync('build/config.json', 'utf8');
const nativeLang = JSON.parse(config).nativeLang;
const prettier = require('prettier');

let changesMade = 0;

console.log('\n*** Grammar Checking - Process Start     ***');

// Creates the template object for handlebars to use
function assembleLanguageJson(lang) {
  const langData = {};
  const files = fs.readdirSync(`lang/${lang}`);
  files.forEach(file => {
    let fileName = file.split('-').splice(1).join('-');
    fileName = fileName.split('.');
    fileName.pop();
    fileName = fileName.join('.');
    const fileJSON = fs.readFileSync(`lang/${lang}/${file}`, 'utf8');
    if (!langData[lang]) langData[lang] = {};
    langData[lang][fileName] = JSON.parse(fileJSON);
  });
  return langData;
}

console.log(`*** Parsing lang/${nativeLang} files                ***`);

const jsonTextData = assembleLanguageJson(nativeLang);

function prepareReplacements(matches) {
  const replacements = [];
  for (let i = 0; i < matches.length; i++) {
    const newReplacement = {};
    if (matches[i]['replacements'].length > 0) {
      newReplacement['offset'] = matches[i]['offset'];
      newReplacement['length'] = matches[i]['length'];
      newReplacement['change'] = matches[i]['replacements'][0].value;
    } else {
      newReplacement['offset'] = 0;
      newReplacement['length'] = matches[i]['sentence'].length;
      newReplacement['change'] = matches[i]['sentence'];
    }
    replacements.push(newReplacement);
  }
  return replacements;
}

let pendingRecursive = 0;
async function checkGrammarOfObject(object, callback) {
  pendingRecursive += Object.keys(object).length;
  for (const [key, value] of Object.entries(object)) {
    if (typeof value == 'object') {
      await checkGrammarOfObject(object[key], callback);
      pendingRecursive -= 1;
    } else {
      const { matches } = await gramma.check(value);
      if (matches.length > 0) {
        changesMade += 1;
        object[key] = gramma.replaceAll(value, prepareReplacements(matches));
      }
      pendingRecursive -= 1;
    }
  }
  if (pendingRecursive == 0) {
    callback(object);
  }
}

console.log('*** Checking the Grammar of Parsed Files ***');

checkGrammarOfObject(jsonTextData, checked => {
  Object.keys(checked).forEach(lang => {
    const files = fs.readdirSync(`lang/${lang}`);
    files.forEach(file => {
      let fileName = file.split('-').splice(1).join('-');
      fileName = fileName.split('.');
      fileName.pop();
      fileName = fileName.join('.');
      let dataToWrite = JSON.stringify(checked[lang][fileName]);
      dataToWrite = prettier.format(dataToWrite, { parser: 'json' });
      fs.writeFileSync(`lang/${lang}/${file}`, dataToWrite);
    });
  });
  console.log('*** Grammar Check Complete!              ***');
  console.log(`*** Total Grammatical Changes Made: ${changesMade}    ***\n`);
});