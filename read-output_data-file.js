const fs = require("fs");
const zlib = require("zlib");
// Specify the path to the gzipped file
const gzippedFilePath = "output_data.gz";

// Read the gzipped file content
const gzippedData = fs.readFileSync(gzippedFilePath);

// Decompress the gzipped data
const decompressedData = zlib.gunzipSync(gzippedData);

// Convert the decompressed data to a string
const ndjsonString = decompressedData.toString();

// Split the ndjson string into an array of JSON objects
const jsonObjects = ndjsonString.split("\n").map((line) => JSON.parse(line));

// Now 'jsonObjects' is an array containing your scraped data as individual JSON objects
console.log(jsonObjects);
