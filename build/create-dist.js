
// create-dist.js

const fs = require("fs-extra");

console.log("\n***** Creating the /dist directory *****");
console.log("Step 1 - Removing old /dist directory");

// Remove the old /dist directory
fs.rmdirSync("dist", { recursive: true });

console.log("Step 2 - Copying over files for new /dist directory");

// Copy over /src to a new /dist directory
fs.copySync("src", "dist");

console.log("Finished!\n");