import { GROUP_BRANDS } from "@/services/products/productWriteService.js";


export function detectBrand(name = "") {


const brands =
Object.values(GROUP_BRANDS || {})
.flat();



const found =
brands.find(
brand =>
name
.toLowerCase()
.includes(
brand.toLowerCase()
)
);



return found || "Other";


}
