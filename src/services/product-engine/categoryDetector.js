export function detectCategory(name = "") {


const text =
name.toLowerCase();



if(
text.includes("iphone") ||
text.includes("galaxy") ||
text.includes("tecno") ||
text.includes("infinix")
){

return {

main_group:"electronics",

category:"phones",

type:"smartphone"

};

}



if(
text.includes("laptop") ||
text.includes("macbook") ||
text.includes("thinkpad")
){

return {

main_group:"electronics",

category:"laptops",

type:"laptop"

};

}



return {

main_group:"",

category:"",

type:""

};


}
