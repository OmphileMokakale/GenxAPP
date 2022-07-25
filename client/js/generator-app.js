import Axios from "axios";
import Joi from "joi";

export default function MoviePlaylistApp() {
  return {
    /////////////////
    // View Constants
    VIEW_HOME: 1,
    VIEW_PRODUCT: 2,
    VIEW_ABOUT: 3,
    VIEW_CONTACT: 4,
    VIEW_SEARCH: 5,
    VIEW_SIGNIN: 6,
    VIEW_SIGNUP: 7,
    VIEW_PROFILE: 10,
    VIEW_ORDERS: 32,
    VIEW_ORDERS_LIST: 301,
    VIEW_ORDERS_ITEMS: 302,
    VIEW_PASSWORD: 11,
    VIEW_CART: 15,
    VIEW_LOADING: 6000,
    VIEW_CHECKOUT: 60,

    VIEW_PRODUCT_CATEGORY: 200,
    VIEW_PRODUCT_ITEMS: 201,

    VIEW_PRODUCT_DESCRIPTION: 202,
    ////////////

    currentView: this.VIEW_HOME,
    lastView: 0,

    currentSubView: 0,
    serverUrl: "http://localhost:4017",
    user: {
      user_name: "",
      password: "",
      first_name: "",
      lastname: "",
      email_address: "",
      contact_number: "",
    },

    accountToken: "",
    menuBarSearchText: "",
    movieSearchText: "",
    popupMessage: "",
    popupVisible: false,
    accountVisible: false,
    profileData: {
      user_name: "",
      first_name: "",
      lastname: "",
      date_registred: "",
      email_address: "",
      countact_number: "",
      newPassword: "",
      confirmPassword: "",
    },

    addressData: [],
    addressSelect: {
      id: 0,
      house_number: 0,
      street_name: "",
      province: "",
      postal_code: 0,
    },

    accountName: "",

    orderData: [],
    orderProductsData: [],

    homeData: [],
    categoryData: [],
    categoryProductsData: [],
    searchData: [],
    cartData: [],

    addressData: [],

    searchText: "",

    cartInfomation: {
      is_delivery: 0,
      delivery_address: "",
      card_number: 0,
      card_month: 0,
      card_year: 0,
      card_cvc: 0,
    },

    selectedProduct: {
      id: 0,
      product_image: "",
      description: "",
      price: 0,
      quantity: 0,
      product_name: "",
      is_rentalble: false,
      rental_duration: 0,
      rental_duration_type: 0,
      selectd_quantity: 0,
      calculated_price: 0,
    },

    selectedOrder: {
      id: 0,
      order_date: "",
      order_total: "",
      order_items: 0,
      order_status: "",
    },

    orderItems: [],

    init() {
      this.checkUserToken();

      this.currentView = this.VIEW_HOME;
      this.loadHome();
    },

    ////////////////// Open View Functions
    openHome() {
      this.currentView = this.VIEW_HOME;
      this.cleanUp();
      this.loadHome();
    },

    openSignIn() {
      this.currentView = this.VIEW_SIGNIN;
    },
    openSignUp() {
      this.currentView = this.VIEW_SIGNUP;
      this.cleanUp();
    },

    openAbout() {
      this.currentView = this.VIEW_ABOUT;
    },

    openCategories() {
      this.currentView = this.VIEW_PRODUCT;
      this.currentSubView = this.VIEW_PRODUCT_CATEGORY;
      this.cleanUp();
      this.loadCategory();
    },

    openProducts(category_id) {
      this.currentView = this.VIEW_PRODUCT;
      this.currentSubView = this.VIEW_PRODUCT_ITEMS;
      this.cleanUp();
      this.loadProducts(category_id);
    },

    openSearch() {
      if (this.searchText.trim().length >= 3) {
        this.currentView = this.VIEW_SEARCH;
        this.cleanUp();
        this.loadSearchResults(this.searchText);
      } else {
        this.handleMessage("Please enter 3 or more characters to search for");
      }
    },

    openProductView(productItem) {
      this.selectedProduct = productItem;
      this.lastView = this.currentView;

      this.currentView = this.VIEW_PRODUCT_DESCRIPTION;
    },

    openShoppingCart() {
      this.cleanUp();
      this.currentView = this.VIEW_CART;
      this.loadCart();
    },

    openProfile() {
      this.cleanUp();
      this.currentView = this.VIEW_PROFILE;
      this.loadProfile();
    },
    openOrders() {
      this.currentView = this.VIEW_ORDERS;
      this.currentSubView = this.VIEW_ORDERS_LIST;
      this.cleanUp();

      this.loadOrders();
    },

    openOrderItems(order_data) {
      this.cleanUp();
      this.selectedOrder = order_data;
      this.currentView = this.VIEW_ORDERS;
      this.currentSubView = this.VIEW_ORDERS_ITEMS;

      this.loadOrderItems();
    },

    openCheckout() {
      this.currentView = this.VIEW_CHECKOUT;
    },

    /////////////////////////////////

    //// Process Functions
    signIn() {
      let loginInfo = {
        user_name: this.user.user_name,
        password: this.user.password,
      };
      let scheme = Joi.object({
        user_name: Joi.string().alphanum().min(5).max(25).required(),
        password: Joi.string().min(5).max(15).required(),
      });

      let sResult = scheme.validate(loginInfo);

      if (sResult.error !== undefined) {
        this.handleMessage(sResult.error.details[0].message);
        return;
      }

      Axios.post(`${this.serverUrl}/api/login`, loginInfo)
        .then((result) => result.data)
        .then((result) => {
          if (result.status === "success") {
            this.accountToken = result.token;
            this.saveToken();
            this.accountVisible = true;
            this.openHome();
          } else {
            this.handleMessage(result.message);
          }
        })
        .catch((error) => {
          this.handleError(error);
        });
    },

    signUp() {
      Axios.post(`${this.serverUrl}/api/signup`, this.user)
        .then((result) => result.data)
        .then((result) => {
          if (result.status === "success") {
            this.accountToken = result.token;
            this.accountVisible = true;
            this.saveToken();
            this.openHome();
          } else {
            this.handleMessage(result.message);
          }
        })
        .catch((error) => {
          this.handleError(error);
        });
    },

    signout() {
      this.removeToken();
    },

    loadCategory() {
      this.categoryData = [];

      Axios.get(`${this.serverUrl}/store/category`)
        .then((result) => result.data)
        .then((result) => {
          if (result && result.length > 0) {
            this.categoryData = result;
          }
        })
        .catch((error) => this.handleError(error));
    },

    loadProducts(category_id) {
      this.categoryProductsData = [];

      Axios.get(`${this.serverUrl}/store/category/${category_id}`)
        .then((result) => result.data)
        .then((result) => {
          if (result && result.length > 0) {
            this.categoryProductsData = result;
          }
        })
        .catch((error) => this.handleError(error));
    },

    loadHome() {
      this.homeData = [];

      Axios.get(`${this.serverUrl}/store/top`)
        .then((result) => result.data)
        .then((result) => {
          if (result && result.length > 0) {
            this.homeData = result;
          }
        })
        .catch((error) => this.handleError(error));
    },

    loadSearchResults() {
      this.searchData = [];

      Axios.get(`${this.serverUrl}/store/search/${this.searchText}`)
        .then((result) => result.data)
        .then((result) => {
          //alert(JSON.stringify(result));
          if (result && result.length > 0) {
            this.searchData = result;
          }
        })
        .catch((error) => this.handleError(error));
    },

    loadProfile() {
      Axios.get(`${this.serverUrl}/profile`, {
        headers: { authorization: `${this.accountToken}` },
      })
        .then((result) => result.data)
        .then((result) => {
          if (result) {
            this.profileData = result;
          }
        })
        .catch((error) => this.handleError(error));
    },

    updateProfilePersonal() {
      Axios.put(
        `${this.serverUrl}/profile/personal`,
        {
          first_name: this.profileData.first_name,
          lastname: this.profileData.lastname,
        },
        {
          headers: { authorization: `${this.accountToken}` },
        }
      )
        .then((result) => result.data)
        .then((result) => {
          if (result.status == "success") {
            this.handleMessage(result.message);
          } else {
            this.handleMessage(result.message);
          }
        })
        .catch((error) => this.handleError(error));
    },

    updateProfileContact() {
      Axios.put(
        `${this.serverUrl}/profile/contact`,
        {
          contact_number: this.profileData.contact_number,
          email_address: this.profileData.email_address,
        },
        {
          headers: { authorization: `${this.accountToken}` },
        }
      )
        .then((result) => result.data)
        .then((result) => {
          if (result.status == "success") {
            this.handleMessage(result.message);
          } else {
            this.handleMessage(result.message);
          }
        })
        .catch((error) => this.handleError(error));
    },

    updateProfilePassword() {
      Axios.put(
        `${this.serverUrl}/profile/password`,
        {
          confirm_password: this.profileData.confirmPassword,
          password: this.profileData.newPassword,
        },
        {
          headers: { authorization: `${this.accountToken}` },
        }
      )
        .then((result) => result.data)
        .then((result) => {
          if (result.status == "success") {
            this.handleMessage(result.message);
          } else {
            this.handleMessage(result.message);
          }
        })
        .catch((error) => this.handleError(error));
      this.profileData.newPassword = "";
      this.profileData.confirmPassword = "";
    },

    loadOrders() {
      this.orderData = [];

      Axios.get(`${this.serverUrl}/order`, {
        headers: { authorization: `${this.accountToken}` },
      })
        .then((result) => result.data)
        .then((result) => {
          if (result && result.length > 0) {
            this.orderData = result;
          }
        })
        .catch((error) => this.handleError(error));
    },

    loadOrderItems() {
      this.orderItems = [];

      Axios.get(`${this.serverUrl}/order/${this.selectedOrder.id}/items`, {
        headers: { authorization: `${this.accountToken}` },
      })
        .then((result) => result.data)
        .then((result) => {
          if (result && result.length > 0) {
            this.orderItems = result;
          }
        })
        .catch((error) => this.handleError(error));
    },

    loadCart() {
      this.cartData = [];

      Axios.get(`${this.serverUrl}/cart`, {
        headers: { authorization: `${this.accountToken}` },
      })
        .then((result) => result.data)
        .then((result) => {
          if (result && result.length > 0) {
            this.cartData = result;
            this.selectedOrder.order_total = 0;
            this.selectedOrder.order_items = 0;
            try {
              this.cartData.forEach((element) => {
                this.selectedOrder.order_total += new Number(element.sub_total);
                this.selectedOrder.order_items += new Number(
                  element.product_quantity
                );
              });
            } catch (error) {
              alert(error);
            }
          }
        })
        .catch((error) => this.handleError(error));
    },

    cartAdd() {
      Axios.post(
        `${this.serverUrl}/cart`,
        {
          product_id: this.selectedProduct.id,
          quantity: this.selectedProduct.selected_quantity,
        },
        {
          headers: { authorization: `${this.accountToken}` },
        }
      )
        .then((result) => result.data)
        .then((result) => {
          if (result.status == "success") {
            this.handleMessage(result.message);
            // Reload Cart
          } else {
            this.handleMessage(result.message);
          }
        })
        .catch((error) => this.handleError(error));
    },

    cartUpdate(cart_item) {
      Axios.put(
        `${this.serverUrl}/cart`,
        { product_id: cart_item.id, quantity: cart_item.product_quantity },
        {
          headers: { authorization: `${this.accountToken}` },
        }
      )
        .then((result) => result.data)
        .then((result) => {
          if (result.status == "success") {
            this.handleMessage(result.message);
            this.loadCart();
          } else {
            this.handleMessage(result.message);
          }
        })
        .catch((error) => this.handleError(error));
    },

    cartDelete(cart_item) {
      Axios.delete(`${this.serverUrl}/cart/${cart_item.id}`, {
        headers: { authorization: `${this.accountToken}` },
      })
        .then((result) => result.data)
        .then((result) => {
          if (result.status == "success") {
            this.handleMessage(result.message);
            this.loadCart();
          } else {
            this.handleMessage(result.message);
          }
        })
        .catch((error) => this.handleError(error));
    },

    cartClear() {
      Axios.delete(`${this.serverUrl}/cart/`, {
        headers: { authorization: `${this.accountToken}` },
      })
        .then((result) => result.data)
        .then((result) => {
          if (result.status == "success") {
            this.handleMessage(result.message);
            this.loadCart();
          } else {
            this.handleMessage(result.message);
          }
        })
        .catch((error) => this.handleError(error));
    },

    cartCompleteOrder() {
      Axios.post(`${this.serverUrl}/cart/complete/card`, this.cartInfomation, {
        headers: { authorization: `${this.accountToken}` },
      })
        .then((result) => result.data)
        .then((result) => {
          if (result.status == "success") {
            this.handleMessage(result.message);
            // Reload Cart
            this.openOrders();
          } else {
            this.handleMessage(result.message);
          }
        })
        .catch((error) => this.handleError(error));
    },

    addCartQuantity(cart_item, quantity) {
      let newQuantity = quantity + cart_item.product_quantity;

      if (newQuantity < 1 || newQuantity > cart_item.quantity) {
        cart_item.product_quantity = cart_item.product_quantity;
      } else {
        cart_item.product_quantity = newQuantity;
      }

      this.updateCartQuantity(cart_item);
    },

    updateCartQuantity(cart_item) {
      cart_item.sub_total =
        cart_item.product_price * cart_item.product_quantity;
    },

    removeToken() {
      this.cleanUp();
      localStorage.removeItem("token");
      this.accountToken = "";
      this.accountVisible = false;
    },

    checkUserToken() {
      this.accountToken = localStorage.getItem("token");
      if (this.accountToken != null) {
        this.accountVisible = true;
      }
    },
    ///////////////////////////////////////////////

    addSelectedQuantity(quantity) {
      let newQuantity = quantity + this.selectedProduct.selected_quantity;

      if (newQuantity < 0 || newQuantity > this.selectedProduct.quantity) {
        this.selectedProduct.selected_quantity =
          this.selectedProduct.selected_quantity;
      } else {
        this.selectedProduct.selected_quantity = newQuantity;
      }

      this.updateSelectedPrice();
    },

    updateSelectedPrice() {
      this.selectedProduct.calculated_price =
        this.selectedProduct.price * this.selectedProduct.selected_quantity;
    },

    cleanUp() {
      this.cartData = [];

      this.user.first_name = "";
      this.user.lastname = "";
      this.user.password = "";
      this.user.user_name = "";
      this.user.email_address = "";
      this.user.contact_number = "";
      this.accountName = "";
      this.orderData = [];
      this.orderProductsData = [];

      this.homeData = [];
      this.searchData = [];
      this.cartData = [];
      this.categoryData = [];
      this.addressData = [];
      this.categoryProductsData = [];

      this.selectedProduct = {
        id: 0,
        product_image: "",
        description: "",
        price: 0,
        quantity: 0,
        product_name: "",
        is_rentalble: false,
        rental_duration: 0,
        rental_duration_type: 0,
        selectd_quantity: 0,
        calculated_price: 0,
      };

      this.profileData = {
        user_name: "",
        first_name: "",
        lastname: "",
        date_registred: "",
        email_address: "",
        countact_number: "",
        newPassword: "",
        confirmPassword: "",
      };

      this.selectedOrder = {
        id: 0,
        order_date: "",
        order_total: "",
        order_items: 0,
        order_status: "",
      };
    },

    handleError(error) {
      if (
        error.response.status &&
        (error.response.status === 403 || error.response.status === 401)
      ) {
        this.removeToken();
        this.popupMessage = "Login expired";
      } else {
        this.popupMessage = "Could not process request";
      }

      this.popupVisible = true;
    },

    handleMessage(message) {
      this.popupMessage = message;
      this.popupVisible = true;
    },

    saveToken() {
      localStorage.setItem("token", this.accountToken);
    },
  };
}
