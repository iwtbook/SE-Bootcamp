// minify.js

const fs = require("fs");
const { resolve } = require("path");
const minifyHTML = require("html-minifier").minify;
const CleanCSS = require("clean-css");
const UglifyJS = require("uglify-js");

const htmlMinOptions = {
  caseSensitive: true, // Treat attributes in case sensitive manner (useful for custom HTML tags)
  collapseBooleanAttributes: true, // Omit attribute values from boolean attributes
  collapseInlineTagWhitespace: true, // Don't leave any spaces between display:inline; elements when collapsing. Must be used in conjunction with collapseWhitespace=true
  collapseWhitespace: true, // Collapse white space that contributes to text nodes in a document tree
  html5: true, // Parse input according to HTML5 specifications
  minifyCSS: true, // Minify CSS in style elements and style attributes (uses clean-css)
  minifyJS: true, // 	Minify JavaScript in script elements and event attributes (uses UglifyJS)
  removeAttributeQuotes: true, // Remove quotes around attributes when possible
  removeComments: true, // Strip HTML comments
  removeEmptyAttributes: true, // Remove all attributes with whitespace-only values
};

const cssMinOptions = {
  level: {
    2: {
      mergeAdjacentRules: true, // controls adjacent rules merging; defaults to true
      mergeIntoShorthands: true, // controls merging properties into shorthands; defaults to true
      mergeMedia: true, // controls `@media` merging; defaults to true
      mergeNonAdjacentRules: true, // controls non-adjacent rule merging; defaults to true
      mergeSemantically: false, // controls semantic merging; defaults to false
      overrideProperties: true, // controls property overriding based on understandability; defaults to true
      removeEmpty: true, // controls removing empty rules and nested blocks; defaults to `true`
      reduceNonAdjacentRules: true, // controls non-adjacent rule reducing; defaults to true
      removeDuplicateFontRules: true, // controls duplicate `@font-face` removing; defaults to true
      removeDuplicateMediaBlocks: true, // controls duplicate `@media` removing; defaults to true
      removeDuplicateRules: true, // controls duplicate rules removing; defaults to true
      removeUnusedAtRules: false, // controls unused at rule removing; defaults to false (available since 4.1.0)
      restructureRules: false, // controls rule restructuring; defaults to false
      skipProperties: [], // controls which properties won't be optimized, defaults to `[]` which means all will be optimized (since 4.1.0)
    },
  },
};

const jsMinOptions = {
  annotations: false, // pass false to ignore all comment annotations and elide them from output. Useful when, for instance, external tools incorrectly applied /*@__PURE__*/ or /*#__PURE__*/. Pass true to both compress and retain comment annotations in output to allow for further processing downstream.
  compress: {}, // pass false to skip compressing entirely. Pass an object to specify custom compress options.
  ie: false, // enable workarounds for Internet Explorer bugs.
  keep_fnames: false, //pass true to prevent discarding or mangling of function names. Useful for code relying on Function.prototype.name.
  mangle: true, // pass false to skip mangling names, or pass an object to specify mangle options (see below).
  nameCache: null, // pass an empty object {} or a previously used nameCache object if you wish to cache mangled variable and property names across multiple invocations of minify(). Note: this is a read/write property. minify() will read the name cache state of this object and update it during minification so that it may be reused or externally persisted by the user.
  output: null, // pass an object if you wish to specify additional output options. The defaults are optimized for best compression.
  parse: {}, //pass an object if you wish to specify some additional parse options.
  sourceMap: false, //pass an object if you wish to specify source map options.
  toplevel: false, //set to true if you wish to enable top level variable and function name mangling and to drop unused variables and functions.
  v8: false, //enable workarounds for Chrome & Node.js bugs.
  warnings: false, //pass true to return compressor warnings in result.warnings. Use the value "verbose" for more detailed warnings.
  webkit: false, //enable workarounds for Safari/WebKit bugs. PhantomJS users should set this option to true.
};

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

// Get all of the files from 'dist' and then minify the HTML, CSS, & JS
console.log("\n***** Minifying the /dist directory *****");
console.log("**********                     **********");
console.log("**********     minifying...    **********");
getFiles("dist")
  .then((files) => {
    files.forEach((file) => {
      const ext = file.split(".").pop();
      let fileData;

      // Minify the HTML
      if (ext == "html" || ext == "HTML") {
        fileData = fs.readFileSync(file, "utf8");
        fileData = minifyHTML(fileData, htmlMinOptions);

        // Minify the CSS
      } else if (ext == "css" || ext == "CSS") {
        fileData = fs.readFileSync(file, "utf8");
        fileData = new CleanCSS(cssMinOptions).minify(fileData).styles;

        // Minify the JS
      } else if (ext == "js" || ext == "JS") {
        fileData = fs.readFileSync(file, "utf8");
        const result = UglifyJS.minify(fileData, jsMinOptions);
        if (!result.error) {
          fileData = result.code;
        } else {
          console.log(`Error minifying JS: ${result.error}`);
        }
      }

      // Write file data to file
      if (fileData) fs.writeFileSync(file, fileData);
    });
  })
  .then(() => {
    console.log("**********                     **********");
    console.log("********* Minification complete *********\n");
  });