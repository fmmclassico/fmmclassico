export function detectVariants(row = {}) {


const text =
JSON.stringify(row);



return {


show_colors:

/black|blue|silver|white|red|gold/i
.test(text),



available_colors:

text.match(
/black|blue|silver|white|red|gold/gi
)
||
[],



show_wattage:

/\d+w/i.test(text),



available_wattage:

text.match(
/\d+w/gi
)
||
[],



show_type:

/\d+gb/i.test(text),



available_types:

text.match(
/\d+gb/gi
)
||
[]


};


}
