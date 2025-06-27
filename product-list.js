const products = [
  { id: 1, name: "Notebook", price: 2.5, quantity: 100 },
  { id: 2, name: "Ballpen", price: 0.5, quantity: 200 },
  { id: 3, name: "Eraser", price: 0.75, quantity: 150 }
];

function displayProducts() {
  console.log("=== Koncepto Product List ===");
  products.forEach(product => {
    console.log(`${product.name} - ₱${product.price.toFixed(2)} (Qty: ${product.quantity})`);
  });
}

function addProduct(name, price, quantity) {
  if (!name || isNaN(price) || isNaN(quantity)) {
    console.log("Invalid input. Product not added.");
    return;
  }

  const newProduct = {
    id: Date.now(),
    name,
    price,
    quantity
  };

  products.push(newProduct);
  console.log(`Added product: ${name}`);
}

function removeProduct(id) {
  const index = products.findIndex(p => p.id === id);
  if (index !== -1) {
    console.log(`Removed product: ${products[index].name}`);
    products.splice(index, 1);
  } else {
    console.log("Product not found.");
  }
}

function updateQuantity(id, newQuantity) {
  const product = products.find(p => p.id === id);
  if (product && !isNaN(newQuantity)) {
    product.quantity = newQuantity;
    console.log(`Updated quantity of ${product.name} to ${newQuantity}`);
  } else {
    console.log("Invalid quantity or product not found.");
  }
}

// Example usage
displayProducts();
addProduct("Ruler", 1.25, 80);
updateQuantity(1, 120);
removeProduct(2);
displayProducts();
