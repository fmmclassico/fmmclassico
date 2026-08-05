export function generateDescription(product){


return `

<h2>${product.name}</h2>


<p>
Premium ${product.brand || ""}
product available at FMM CLASSICO.
</p>


<h3>Features</h3>

<ul>

<li>
${product.features || "High quality product"}
</li>

<li>
Genuine product
</li>

<li>
Fast delivery available
</li>

</ul>


<h3>Warranty</h3>

<p>
${product.warranty || "Seller warranty available"}
</p>


<h3>
Why Buy From FMM CLASSICO?
</h3>


<p>
Trusted electronics destination in Ghana.
</p>

`;

}
