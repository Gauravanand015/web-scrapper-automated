// Import required modules
const puppeteer = require("puppeteer");
const fs = require("fs");
const zlib = require("zlib");

// Define a class for AmazonScraper
class AmazonScraper {
  constructor() {
    // Initialize browser and page properties
    this.browser = null;
    this.page = null;
  }

  // Method to initialize the Puppeteer browser and create a new page
  async initialize() {
    try {
      this.browser = await puppeteer.launch({
        headless: false,
        args: ["--no-sandbox", "--disable-setuid-sandbox"],
        defaultViewport: null,
        userAgent:
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.110 Safari/537.3",
      });
      this.page = await this.browser.newPage();
    } catch (error) {
      console.error("Error in initialize:", error);
    }
  }

  // Method to close the Puppeteer browser
  async close() {
    try {
      await this.browser.close();
    } catch (error) {
      console.error("Error in close:", error);
    }
  }

  // Method to scrape Amazon for laptop information
  async scrapeAmazon() {
    const searchQuery = "laptop";

    try {
      // Navigate to Amazon homepage
      await this.page.goto("https://www.amazon.in/ref=nav_logo");

      // Wait for the search input field to be visible and type the search query
      await this.page.waitForSelector("#twotabsearchtextbox");
      await this.page.type("#twotabsearchtextbox", searchQuery);

      // Click on the search button
      await this.page.click("#nav-search-submit-button");

      // Wait for the pagination item indicating the last page to be loaded
      await this.page.waitForSelector(
        ".s-pagination-item.s-pagination-disabled"
      );

      // Get the total number of search result pages
      const allSpanTexts = await this.page.$$eval(
        ".s-pagination-item.s-pagination-disabled",
        (spans) => spans.map((span) => span.textContent)
      );
      const lastSpanText = parseInt(allSpanTexts[allSpanTexts.length - 1]);
      let laptops = [];

      // Loop through each page of search results
      for (let i = 1; i <= lastSpanText; i++) {
        // Get the list of laptop nodes on the current page
        const laptopNodes = await this.page.$$(
          'div[data-component-type="s-search-result"]'
        );

        // Loop through each laptop node to extract details
        for (let j = 0; j < laptopNodes.length; j++) {
          try {
            let product = await this.getTheDetails(laptopNodes[j]);
            if (product === undefined) {
              continue;
            } else {
              laptops.push(product);
            }
          } catch (error) {
            console.error("Error in getTheDetails:", error);
          }
        }

        // Click on the "Next" button to navigate to the next page
        const nextPageButton = await this.page.$(
          ".s-pagination-item.s-pagination-next"
        );
        if (nextPageButton) {
          await nextPageButton.click();
        } else {
          break;
        }

        // Wait for a short duration before navigating to the next page
        await this.page.waitForTimeout(3000);
      }

      // Remove the first item (duplicate) and filter out properties with the value "N/A"
      laptops.shift();
      laptops = laptops.map((product) => {
        Object.keys(product).forEach((key) => {
          if (product[key] === "N/A") {
            delete product[key];
          }
        });
        return product;
      });

      // Save the scraped data to a gzipped NDJSON file
      this.saveDataToGzippedNdjson(laptops);
    } catch (error) {
      console.error("Error:", error);
    } finally {
      // Close the Puppeteer browser after scraping is complete
      await this.browser.close();
    }
  }

  // Method to extract details from an individual laptop node
  async getTheDetails(laptopNode) {
    try {
      // Click on the laptop node to view its details
      await laptopNode.click();

      // Wait for a short duration for the new page with details to load
      await this.page.waitForTimeout(3000);

      // Find the newly opened page among all open pages
      const pages = await this.browser.pages();
      const newPage = pages.find((current_page) => current_page !== this.page);

      // Extract details from the product page
      const product_title = await newPage.$("#productTitle");
      const productTitle = product_title
        ? await newPage.evaluate(
            (element) => element.textContent.trim(),
            product_title
          )
        : "N/A";

      // Extract MRP, Selling Price, Discount, and other details
      const product_MRP_Tag = await newPage.$(
        productTitle.includes("(Refurbished)")
          ? "#corePrice_desktop > div > table > tbody > tr:nth-child(1) > td.a-span12.a-color-secondary.a-size-base > span.a-price.a-text-price.a-size-base > span.a-offscreen"
          : "#corePriceDisplay_desktop_feature_div > div.a-section.a-spacing-small.aok-align-center > span > span.aok-relative > span > span > span.a-offscreen"
      );

      const productMRP = product_MRP_Tag
        ? await newPage.evaluate(
            (element) => element.textContent.trim(),
            product_MRP_Tag
          )
        : "N/A";

      const product_selling_price = await newPage.$(
        productTitle.includes("(Refurbished)")
          ? "#corePrice_desktop > div > table > tbody > tr:nth-child(2) > td.a-span12 > span.a-price.a-text-price.a-size-medium.apexPriceToPay > span.a-offscreen"
          : "#corePriceDisplay_desktop_feature_div > div.a-section.a-spacing-none.aok-align-center > span.a-price.aok-align-center.reinventPricePriceToPayMargin.priceToPay > span:nth-child(2) > span.a-price-whole"
      );

      const sellingPrice = product_selling_price
        ? await newPage.evaluate(
            (sp) => sp.textContent.trim(),
            product_selling_price
          )
        : "N/A";

      const product_discount = await newPage.$(
        productTitle.includes("(Refurbished)")
          ? "#corePrice_desktop > div > table > tbody > tr:nth-child(3) > td.a-span12.a-color-price.a-size-base > span.a-color-price"
          : "#corePriceDisplay_desktop_feature_div > div.a-section.a-spacing-none.aok-align-center > span.a-size-large.a-color-price.savingPriceOverride.aok-align-center.reinventPriceSavingsPercentageMargin.savingsPercentage"
      );

      const discount = product_discount
        ? await newPage.evaluate(
            (element) => element.innerText.trim(),
            product_discount
          )
        : "N/A";

      const table_body = await newPage.$(
        "#productDetails_techSpec_section_1 > tbody"
      );

      let productWeight = "N/A"; // Default value if no valid weight is found

      if (table_body) {
        const th_tags = await table_body.$$(
          "th.a-color-secondary.a-size-base.prodDetSectionEntry"
        );

        for (const th_tag of th_tags) {
          const textContent = await newPage.evaluate(
            (element) => element.textContent.trim(),
            th_tag
          );
          if (textContent === "Item Weight") {
            const td_tag = await th_tag.evaluateHandle((th) => {
              const row = th.closest("tr");
              return row.querySelector("td.a-size-base.prodDetAttrValue");
            });
            productWeight = await newPage.evaluate(
              (element) => element.textContent.trim(),
              td_tag
            );
            break;
          }
        }
      }

      const product_brand_name = await newPage.$(
        "#productDetails_techSpec_section_1 > tbody > tr:nth-child(1) > td"
      );
      const productBrand = product_brand_name
        ? await newPage.evaluate(
            (element) => element.textContent.trim(),
            product_brand_name
          )
        : "N/A";

      const product_image = await newPage.$("#landingImage");
      const productImage = product_image
        ? await newPage.evaluate((element) => element.src, product_image)
        : "N/A";

      const productSpecificationElement = await newPage.$(
        "#poExpander > div.a-expander-content.a-expander-partial-collapse-content > div"
      );
      const productSpecification = productSpecificationElement
        ? await newPage.evaluate(
            (element) => element.textContent.trim(),
            productSpecificationElement
          )
        : "N/A";

      const product_description = await newPage.$("#feature-bullets > ul");
      const productDescription = product_description
        ? await newPage.evaluate(
            (element) => element.textContent.trim(),
            product_description
          )
        : "N/A";

      // Close the product page
      await newPage.close();

      // Return an object containing the extracted details
      return {
        Product_Title: productTitle,
        Product_MRP: productMRP,
        Product_Selling_Price: sellingPrice,
        Product_Discount: discount,
        Product_Weight: productWeight,
        Product_Brand: productBrand,
        Product_Image_URL: productImage,
        Product_Specification: productSpecification,
        Product_Description: productDescription,
      };
    } catch (error) {
      console.error("Error in getTheDetails:", error);
    }
  }

  // Method to save data to a gzipped NDJSON file
  saveDataToGzippedNdjson(data) {
    try {
      // Convert the data to NDJSON format and gzip it
      const ndjsonString = data.map((item) => JSON.stringify(item)).join("\n");
      const gzippedData = zlib.gzipSync(ndjsonString);

      // Write the gzipped data to a file
      fs.writeFileSync("output_data.gz", gzippedData);
      console.log("Data saved to output_data.gz");
    } catch (error) {
      console.error("Error in saveDataToGzippedNdjson:", error);
    }
  }
}

// Main execution block
(async () => {
  // Create an instance of AmazonScraper
  const amazonScraper = new AmazonScraper();

  // Initialize the Puppeteer browser
  await amazonScraper.initialize();

  // Start the scraping process
  await amazonScraper.scrapeAmazon();

  // Close the Puppeteer browser
  await amazonScraper.close();
})();
