// validate.js

const fs = require('fs-extra');
const { resolve } = require('path');
const validator = require('html-validator');

const validatorOptions = {
  validator: 'WHATWG',
  data: null,
  isFragment: false
};

console.log("\n**********  Running Validator  **********");
console.log("**********                     **********");

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

getFiles('src').then(async srcFiles => {
  for (let i = 0; i < srcFiles.length; i++) {
    const fileExt = srcFiles[i].split('.').pop();
    if (fileExt != 'html' && fileExt != 'HTML') continue;
    // Grab the HTML string from the file
    validatorOptions.data = fs.readFileSync(srcFiles[i], 'utf8');
    try {
      const result = await validator(validatorOptions);
      if (result.isValid) {
        console.log(`Passed - ${srcFiles[i]}`);
      } else {
        console.log(`Rejected - ${srcFiles[i]}`);
        console.log('******* Validation Error Detected *******');
        console.log(result);
        process.exit(1);
      }
    } catch (error) {
      console.log("******** Error Running Validator ********");
      console.log(error);
      console.log("**********                     **********");
      console.log("**********  Validation Failed  **********\n");
      process.exit(1);
    }
  }
  console.log("**********                     **********");
  console.log("*********  Validation Complete  *********\n");
});