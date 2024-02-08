# Amazon Scraper Documentation

## Introduction

This project automates the process of web scraping data from Amazon's website to gather information about laptops. The Puppeteer library is used for browser automation, ensuring the entire process is executed seamlessly. The scraped data is saved in a compressed NDJSON (Newline Delimited JSON) format.

## Prerequisites

Before running the code, ensure that [Node.js](https://nodejs.org/) and [npm](https://www.npmjs.com/) are installed on your machine.

## Contents

1. [Amazon Scraper](#amazon-scraper)
2. [Data Extraction](#data-extraction)
3. [Decompression and Analysis](#decompression-and-analysis)
4. [Quality Control](#quality-control)
5. [Documentation](#documentation)
6. [Conclusion](#conclusion)

## Amazon Scraper

### Dependencies

- `puppeteer`: Used for browser automation.
- `fs`: File system module for file operations.
- `zlib`: Used for gzip compression.

### Class: `AmazonScraper`

- `initialize()`: Initializes the Puppeteer browser and creates a new page.
- `close()`: Closes the Puppeteer browser.
- `scrapeAmazon()`: Navigates through Amazon's pages, automates the search and extraction process for laptops, and saves the data.
- `getTheDetails(laptopNode)`: Extracts details from an individual laptop node.
- `saveDataToGzippedNdjson(data)`: Saves data to a gzipped NDJSON file.

### Main Execution

- Creates an instance of `AmazonScraper`.
- Initializes the Puppeteer browser.
- Initiates the automated scraping process, including search, navigation, and extraction.
- Closes the Puppeteer browser after completing the automated tasks.

## Data Extraction

- Navigates to Amazon's search results for laptops.
- Automates the process of searching, clicking on items, and extracting information.
- Saves the data in a gzipped NDJSON file named `output_data.gz`.

## Decompression and Analysis

- Reads the gzipped file content (`output_data.gz`).
- Decompresses the gzipped data.
- Converts the decompressed data to a string and splits it into an array of JSON objects.
- Outputs the array (`jsonObjects`) containing the scraped data.

## Quality Control

- Removes the first item (duplicate) from the scraped data.
- Filters out properties with the value "N/A".
- Provides statistics on the total count, not null, and null counts for mandatory fields (MRP, selling price, discount, weight, brand).

## Challenges Faced During the Scraping Process

- Verification prompts: The website may prompt verification checks to distinguish between humans and robots.
- Protocol timeout errors: Some network-related errors, such as protocol timeouts, may occur during the scraping process.
- Variability in HTML structure: Items on the website may have different class and ID attributes, posing challenges in locating and extracting specific details.

## How to see the output_data.gz file

I have already make the read-output_data-file.js you just have to compile that file **node read-output_data-file.js**

## Conclusion

The project successfully automates the entire process of scraping laptop information from Amazon. Challenges include verification prompts, network-related errors, and variability in HTML structure. Continuous monitoring and updates are recommended to adapt to any changes on the website.
