// populate-template.js

const fs = require("fs-extra");
const { resolve } = require("path");
const Handlebars = require("handlebars");
const translate = require("extended-google-translate-api");

const translateConfig = JSON.parse(fs.readFileSync('build/config.json', 'utf8'));

console.log("\n***** Creating the /dist directory *****");
console.log("Step 1 - Removing old /dist directory");

// Remove the old /dist directory
if (fs.existsSync("dist")) {
  fs.rmdirSync("dist", { recursive: true });
}

fs.readdirSync("lang").forEach(lang => {
  if (lang != translateConfig.nativeLang) {
    fs.rmdirSync(`lang/${lang}`, { recursive: true });
  }
});

console.log("Step 2 - Translating all of the files in /lang/en");

let pendingRecursive = {};
function translateObject(object, fromLang, toLang, file, callback) {
  pendingRecursive[toLang][file] += 1;
  Object.keys(object).forEach(key => {
    if (typeof val == 'object') {
      translateObject(object[key], fromLang, toLang, file, callback);
    } else {
      translate(object[key], fromLang, toLang).then(res => {
        pendingRecursive[toLang][file] -= 1;
        object[key] = res.translation;
        if (pendingRecursive[toLang][file] == 0) callback(object);
      }).catch(err => {
        console.error(err);
      });
    }
  });
}

// Translate all of the native language files in lang/ to the other language subdirs in lang/
// e.g. lang/en to lang/de & lang/es & lang/fr etc.
let numTranslated = 0;
let nativeLangFiles = fs.readdirSync(`lang/${translateConfig.nativeLang}`);
translateConfig['translateTo'].forEach(lang => {
  for (let i = 0; i < nativeLangFiles.length; i++) {
    let fileName = nativeLangFiles[i].split('-').splice(1).join('-');
    fileName = `${lang}-${fileName}`;
    let jsonToTranslate = JSON.parse(fs.readFileSync(`lang/${translateConfig.nativeLang}/${nativeLangFiles[i]}`, 'utf8'));
    if (!pendingRecursive[lang]) pendingRecursive[lang] = {};
    pendingRecursive[lang][nativeLangFiles[i]] = 0;
    translateObject(jsonToTranslate, translateConfig.nativeLang, lang, nativeLangFiles[i], translatedJSON => {
      fs.ensureFileSync(`lang/${lang}/${fileName}`);
      fs.writeFileSync(`lang/${lang}/${fileName}`, JSON.stringify(translatedJSON));
      numTranslated += 1;
      // If all of the languages have been translated, continue
      if (numTranslated == nativeLangFiles.length * translateConfig['translateTo'].length) {
        copyNativeTempInSrcToDist();
      }
    });
  }
});

console.log("Step 3 - Copying over files for new /dist directory");

// Create a directory for each language
function copyNativeTempInSrcToDist() {
  fs.readdirSync('lang').forEach(lang => {
    // Copy over /src to a new /dist directory
    fs.copySync("src", `dist/${lang}`);
  });
  applyLangsToTemplate();
}

console.log("Step 4 - Populating all of the templates in /dist");

// A function to recursively collect the file paths of all of the files in a given dir
async function getFiles(dir) {
  const dirents = fs.readdirSync(dir, { withFileTypes: true });
  const files = await Promise.all(
    dirents.map((dirent) => {
      const res = resolve(dir, dirent.name);
      return dirent.isDirectory() ? getFiles(res) : res;
    })
  );
  return Array.prototype.concat(...files);
}

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

// Takes the template object, plugs it into template, then writes to file
function applyLangsToTemplate() {
  fs.readdirSync('dist').forEach(async (lang) => {
    const langData = assembleLanguageJson(lang);
    const files = await getFiles(`dist/${lang}`);
    files.forEach(file => {
      let fileExt = file.split('.').pop();
      if (fileExt == 'html' || fileExt == 'HTML') {
        const template = Handlebars.compile(fs.readFileSync(file, 'utf8'));
        const result = template(langData[lang]);
        fs.writeFileSync(file, result);
      }
    });
  });
  console.log("Finished!\n");
}
