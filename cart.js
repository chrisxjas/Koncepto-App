class KonceptoUser {
  constructor(fullName, username, password) {
    this.fullName = fullName;
    this.usernaame = username;
    this.password = password;
    this.cart = [];
  }

  addToCart(item) {
    this.cart.push(item);
    console.log(> '${item}' added to ${this.fullName}'s cart.');
  }

  viewCart() {
    if (this.cart.length === 0) {
      console.log("> Your cart is empty.");
    } else {
      console.log(> ${this.fullName}'s Cart:');
      this.cart.forEach((item, index) => {
        console.log( ${index + 1}. ${item});
      });
    }
  }
}
