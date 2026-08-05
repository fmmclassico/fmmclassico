import { detectBrand } from "./brandDetector.js";
import { detectCategory } from "./categoryDetector.js";
import { detectVariants } from "./variantDetector.js";


export function autoMapProduct(row = {}) {

  const productName =
    row["Product Name"] ||
    row.product_name ||
    row.name ||
    "";


  const detectedCategory =
    detectCategory(productName);


  const variants =
    detectVariants(row);



  return {


    name: productName,


    main_group:
      row["Main Category"] ||
      detectedCategory.main_group ||
      "",


    category:
      row.Category ||
      row.category ||
      detectedCategory.category ||
      "",


    subcategory:
      row["Product Type"] ||
      row.Subcategory ||
      detectedCategory.type ||
      "",



    brand:
      row.Brand ||
      detectBrand(productName),



    price:
      Number(
        row.Price ||
        row.price ||
        0
      ),


    original_price:
      Number(
        row["Original Price"] ||
        row.original_price ||
        0
      ),



    stock:
      row.Stock ||
      row.stock ||
      null,



    image_url:
      row["Main Image"] ||
      row["Image URL"] ||
      row.image_url ||
      "",



    image_urls:
      [
        row["Extra Image 1"],
        row["Extra Image 2"],
        row["Extra Image 3"],
        row["Extra Image 4"]
      ].filter(Boolean),



    video_url:
      row["Video URL"] ||
      row.video_url ||
      "",



    sku:
      row.SKU ||
      row.sku ||
      "",



    barcode:
      row.Barcode ||
      row.barcode ||
      "",



    warranty:
      row.Warranty ||
      row.warranty ||
      "",



    features:
      row.Features ||
      row.features ||
      "",



    ...variants,


    home_sections:

      row["Homepage Sections"]

      ?

      row["Homepage Sections"]
        .split(",")
        .map(item => item.trim().toLowerCase())

      :

      []

  };

}




export function validateImportedProduct(product) {


  const errors = [];


  if (!product.name) {
    errors.push("Product name missing");
  }


  if (!product.price) {
    errors.push("Product price missing");
  }


  if (!product.category) {
    errors.push("Category missing");
  }


  return {

    valid:
      errors.length === 0,

    errors

  };

}
