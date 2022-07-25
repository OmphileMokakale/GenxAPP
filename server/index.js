const express = require("express");
const app = express();
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const cors = require("cors");
const pg = require("pg");
const axios = require("axios");
const Hashids = require("hashids");
const Joi = require("joi");

// Customer Managers
const CustomerManager = require("./manager/customer-manager");
const StoreManager = require("./manager/store-manager");

// Admin Managers
const OrderAdminManager = require("./manager-admin/OrderAdminManager");
const ProductAdminManager = require("./manager-admin/ProductAdminManager");
const UserAdminManager = require("./manager-admin/UserAdminManager");

const Pool = pg.Pool;
require("dotenv").config();

/// Secret Constants
const jwt_key = process.env.ACCESS_TOKEN_SECRET || "";
const connection_string = process.env.DATABASE_URL || "";

// app use code
app.use(
  cors({
    origin: "*",
  })
);

app.use(express.static("public"));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

////////////////////////////

// Database config
const { parse } = require("pg-connection-string");

const config = parse(connection_string);

/*config.ssl = {
  rejectUnauthorized: false,
};*/
const pool = new Pool(config);
//////////////////////////////

const customerManager = CustomerManager(pool);
const storeManager = StoreManager(pool);

const orderAdminManager = OrderAdminManager(pool);
const productAdminManager = ProductAdminManager(pool);
const userAdminManager = UserAdminManager(pool);

const PORT = process.env.PORT || 4017;

// hash all ids so that they are predictable by the user
function hashID(value, saltKey) {
  let hashids = new Hashids(saltKey);
  value.forEach((element) => {
    element.id = hashids.encode(element.id)[0];
  });
}

////////////////////////////

// New / Existing User Routes

app.post("/api/login", async function (req, res) {
  const { user_name, password } = req.body;

  let scheme = Joi.object({
    user_name: Joi.string().alphanum().min(5).max(25).required(),
    password: Joi.string().min(5).max(15).required(),
  });

  let sResult = scheme.validate(req.body);

  if (sResult.error !== undefined) {
    res.json({
      status: "error",
      message: sResult.error.details[0].message,
      token: "",
    });

    return;
  }

  customerManager
    .getUserByUserName(user_name)
    .then((user_account) => {
      if (bcrypt.compareSync(password, user_account.password)) {
        const user = {
          user_id: user_account.id,
          first_name: user_account.first_name,
          lastname: user_account.lastname,
          user_type: user_account.user_type_id == 1 ? "customer" : "admin",
        };
        const accessKey = jwt.sign(user, jwt_key, {
          expiresIn: "5h",
        });

        res.json({
          status: "success",
          message: "Login was successful",
          token: accessKey,
        });
      } else {
        res.json({
          status: "error",
          message: "User could not be found, wrong user name or password",
          token: "",
        });
      }
    })
    .catch((error) => {
      res.json({
        status: "error",
        message: "User could not be found, wrong user name or password",
        token: "",
      });
    });
});

app.post("/api/signup", async function (req, res) {
  const {
    user_name,
    password,
    first_name,
    lastname,
    contact_number,
    email_address,
  } = req.body;

  let scheme = Joi.object({
    user_name: Joi.string().alphanum().min(5).max(25).required(),
    password: Joi.string().min(5).max(15).required(),
    first_name: Joi.string().min(2).max(50).required(),
    lastname: Joi.string().min(2).max(50).required(),
    contact_number: Joi.string().min(10).max(13).empty("").optional(),
    email_address: Joi.string().email().min(10).max(128).empty("").optional(),
  });

  let sResult = scheme.validate(req.body);

  if (sResult.error !== undefined) {
    res.json({
      status: "error",
      message: sResult.error.details[0].message,
      token: "",
    });

    return;
  }

  let user_account = await customerManager.getUserByUserName(user_name);

  if (user_account != null && user_account.id != null) {
    res.json({
      status: "error",
      message: "Account aleady exists",
    });
    return;
  }

  const encrypted_password = bcrypt.hashSync(password, 10);
  const result = await customerManager.registerUser(
    first_name,
    lastname,
    encrypted_password,
    user_name,
    email_address,
    contact_number,
    1
  );

  if (result > 0) {
    user_account = await customerManager.getUserByUserName(user_name);
    const user = {
      user_id: user_account.id,
      first_name: first_name,
      lastname: lastname,
      user_type: user_account.user_type_id == 1 ? "customer" : "admin",
    };
    const accessKey = jwt.sign(user, jwt_key, {
      expiresIn: "5h",
    });
    res.json({
      status: "success",
      message: "Signup success",
      token: accessKey,
    });
  } else {
    res.json({
      status: "error",
      message: "Could not sign up user",
    });
  }
});

//////////////////

// User Profile Routes

app.get("/profile/", checkAuthorizationToken, async function (req, res) {
  customerManager
    .getProfile(req.user.user_id)
    .then((profileInfo) => res.json(profileInfo))
    .catch((error) =>
      res.json({ status: "error", message: "Could not load profile" })
    );
});

app.put(
  "/profile/personal",
  checkAuthorizationToken,
  async function (req, res) {
    const { first_name, lastname } = req.body;

    let scheme = Joi.object({
      first_name: Joi.string().min(2).max(50).required(),
      lastname: Joi.string().min(2).max(50).required(),
    });

    let sResult = scheme.validate(req.body);

    if (sResult.error !== undefined) {
      res.json({
        status: "error",
        message: sResult.error.details[0].message,
      });

      return;
    }

    customerManager
      .updateUserPersonal(first_name, lastname, req.user.user_id)
      .then((updateStatus) =>
        res.json({
          status: updateStatus > 0 ? "success" : "error",
          message:
            updateStatus > 0
              ? "Personal information updated"
              : "Could not update personal information",
        })
      )
      .catch((error) =>
        res.json({
          status: "error",
          message: "Could not update personal information",
        })
      );
  }
);

app.put("/profile/contact", checkAuthorizationToken, async function (req, res) {
  const { contact_number, email_address } = req.body;

  let scheme = Joi.object({
    contact_number: Joi.string().min(10).max(13).empty("").optional(),
    email_address: Joi.string().email().min(10).max(128).empty("").optional(),
  });

  let sResult = scheme.validate(req.body);

  if (sResult.error !== undefined) {
    res.json({
      status: "error",
      message: sResult.error.details[0].message,
    });

    return;
  }

  customerManager
    .updateUserContact(email_address, contact_number, req.user.user_id)
    .then((updateStatus) =>
      res.json({
        status: updateStatus > 0 ? "success" : "error",
        message:
          updateStatus > 0
            ? "Contact information updated"
            : "Could not update contact information",
      })
    )
    .catch((error) =>
      res.json({
        status: "error",
        message: "Could not update contact information",
      })
    );
});

app.put(
  "/profile/password",
  checkAuthorizationToken,
  async function (req, res) {
    const { password, confirm_password } = req.body;

    let scheme = Joi.object({
      confirm_password: Joi.string().min(5).max(15).required(),
      password: Joi.string().min(5).max(15).required(),
    });

    let sResult = scheme.validate(req.body);

    if (sResult.error !== undefined) {
      res.json({
        status: "error",
        message: sResult.error.details[0].message,
      });

      return;
    } else if (password != confirm_password) {
      res.json({
        status: "error",
        message: "Both passwords must match",
      });

      return;
    }
    const encrypted_password = bcrypt.hashSync(password, 10);
    customerManager
      .updatePassword(encrypted_password, req.user.user_id)
      .then((updateStatus) =>
        res.json({
          status: updateStatus > 0 ? "success" : "error",
          message:
            updateStatus > 0 ? "Password updated" : "Could not update password",
        })
      )
      .catch((error) =>
        res.json({
          status: "error",
          message: "Could not update password",
        })
      );
  }
);

app.get("/profile/address", checkAuthorizationToken, async function (req, res) {
  customerManager
    .getAddressAll(req.user.user_id)
    .then((addressData) => res.json(addressData))
    .catch((error) => res.json([]));
});

app.get(
  "/profile/address/:address_id",
  checkAuthorizationToken,
  async function (req, res) {
    const { address_id } = req.params;

    let scheme = Joi.object({
      address_id: Joi.number().min(1).required(),
    });

    let sResult = scheme.validate(req.params);

    if (sResult.error !== undefined) {
      res.json({
        status: "error",
        message: sResult.error.details[0].message,
      });

      return;
    }

    customerManager
      .getAddress(address_id, req.user.user_id)
      .then((addressData) =>
        res.json({
          status: addressData != null ? "success" : "error",
          message: addressData != null ? "" : "Could not find address",
          address: addressData,
        })
      )
      .catch((error) =>
        res.json({ status: "error", message: "Could not find address" })
      );
  }
);

app.post(
  "/profile/address",
  checkAuthorizationToken,
  async function (req, res) {
    const { housenumber, street, province, postal_code } = req.body;

    let scheme = Joi.object({
      housenumber: Joi.number().min(0).max(99999).required(),
      street: Joi.string().min(3).max(200).required(),
      province: Joi.string().min(5).max(50).required(),
      postal_code: Joi.string().min(4).max(4).required(),
    });

    let sResult = scheme.validate(req.body);

    if (sResult.error !== undefined) {
      res.json({
        status: "error",
        message: sResult.error.details[0].message,
      });

      return;
    }

    customerManager
      .addAddress(housenumber, street, province, postal_code, req.user.user_id)
      .then((updateStatus) =>
        res.json({
          status: updateStatus > 0 ? "success" : "error",
          message: updateStatus > 0 ? "Address added" : "Could not add address",
        })
      )
      .catch((error) =>
        res.json({
          status: "error",
          message: "Could not add address",
        })
      );
  }
);

app.put("/profile/address", checkAuthorizationToken, async function (req, res) {
  const { address_id } = req.params;

  let scheme = Joi.object({
    housenumber: Joi.number().min(0).max(99999).required(),
    street: Joi.string().min(3).max(200).required(),
    province: Joi.string().min(5).max(50).required(),
    postal_code: Joi.string().min(4).max(4).required(),
  });

  let sResult = scheme.validate(req.body);

  if (sResult.error !== undefined) {
    res.json({
      status: "error",
      message: sResult.error.details[0].message,
    });

    return;
  }

  customerManager
    .updateAddress(housenumber, street, province, postal_code, req.user.user_id)
    .then((updateStatus) =>
      res.json({
        status: updateStatus > 0 ? "success" : "error",
        message:
          updateStatus > 0 ? "Address updated" : "Could not update address",
      })
    )
    .catch((error) =>
      res.json({
        status: "error",
        message: "Could not update address",
      })
    );
});

app.delete(
  "/profile/address/:address_id",
  checkAuthorizationToken,
  async function (req, res) {
    const { address_id } = req.params;

    let scheme = Joi.object({
      address_id: Joi.number().min(1).required(),
    });

    let sResult = scheme.validate(req.params);

    if (sResult.error !== undefined) {
      res.json({
        status: "error",
        message: sResult.error.details[0].message,
      });

      return;
    }

    customerManager
      .removeAddress(address_id, req.user.user_id)
      .then((updateStatus) =>
        res.json({
          status: updateStatus > 0 ? "success" : "error",
          message:
            updateStatus > 0 ? "Address removed" : "Could not find address",
        })
      )
      .catch((error) =>
        res.json({
          status: "error",
          message: "Could not find address",
        })
      );
  }
);

//////////////////

// Access store routes

app.get("/store/top", async function (req, res) {
  storeManager
    .getProductsTop()
    .then((productTypes) => res.json(productTypes))
    .catch((error) => res.json([]));
});

app.get("/store/category/", async function (req, res) {
  storeManager
    .getProductType()
    .then((productTypes) => res.json(productTypes))
    .catch((error) => res.json([]));
});

app.get("/store/category/:type_id", async function (req, res) {
  let { orderby, sort, outofstock } = req.query;

  orderby = orderby == null ? "" : orderby;
  sort = sort == null ? "" : sort;
  outofstock = outofstock == null ? "" : outofstock;

  const type_id = req.params.type_id;

  let scheme = Joi.object({
    product_id: Joi.number().min(1).required(),
  });

  let sResult = scheme.validate({ product_id: type_id });

  if (sResult.error !== undefined) {
    res.json([]);
    return;
  }

  storeManager
    .getProducts(
      type_id,
      orderby,
      sort.toLowerCase() == "desc",
      outofstock == "yes"
    )
    .then((productTypes) => res.json(productTypes))
    .catch((error) => res.json([]));
});

app.get("/store/search/:search_name", async function (req, res) {
  let { orderby, sort, outofstock } = req.query;
  const search = req.params.search_name;

  orderby = orderby == null ? "" : orderby;
  sort = sort == null ? "" : sort;
  outofstock = outofstock == null ? "" : outofstock;

  let scheme = Joi.object({
    search_name: Joi.string().min(3).required(),
  });

  let sResult = scheme.validate({ search_name: search });

  if (sResult.error !== undefined) {
    res.json([]);
    return;
  }

  storeManager
    .getProductsSearch(
      search,
      orderby,
      sort.toLowerCase() == "desc",
      outofstock == "yes"
    )
    .then((productTypes) => res.json(productTypes))
    .catch((error) => res.json([]));
});

app.get("/store/product/:product_id", async function (req, res) {
  const prod_id = req.params.product_id;

  let scheme = Joi.object({
    product_id: Joi.number().min(1).required(),
  });

  let sResult = scheme.validate({ product_id: prod_id });

  if (sResult.error !== undefined) {
    res.sendStatus(404);
    return;
  }

  storeManager
    .getProduct(prod_id)
    .then((product) => {
      if (product != null) {
        res.json(product);
      } else {
        res.sendStatus(404);
      }
    })
    .catch((error) => res.sendStatus(404));
});

//////////////////////////////////

// cart routes

app.get("/cart/", checkAuthorizationToken, async function (req, res) {
  storeManager
    .getOrderCart(req.user.user_id)
    .then((cart_info) => {
      if (cart_info != null) {
        return cart_info;
      }
      return Promise.reject();
    })
    .then(
      (cart_info) =>
        (cartItems = storeManager.getOrderProductsCart(cart_info.id))
    )
    .then((cart_out) => res.json(cart_out))
    .catch((error) => res.json([]));
});

app.post("/cart/", checkAuthorizationToken, async function (req, res) {
  const { product_id, quantity } = req.body;

  let scheme = Joi.object({
    product_id: Joi.number().min(1).required(),
    quantity: Joi.number().min(1).required(),
  });

  let sResult = scheme.validate(req.body);

  if (sResult.error !== undefined) {
    res.json({
      status: "error",
      message: sResult.error.details[0].message,
    });

    return;
  }

  let cartInfo = await storeManager.getOrderCart(req.user.user_id);
  if (cartInfo == null) {
    if ((await storeManager.addOrder(req.user.user_id)) > 0) {
      cartInfo = await storeManager.getOrderCart(req.user.user_id);
    }
  }

  if (cartInfo == null) {
    res.json({
      status: "error",
      message: "Could not add item to cart",
    });

    return;
  }

  const product = await storeManager.getProduct(product_id);

  if (product == null) {
    res.json({
      status: "error",
      message: "Could not find product",
    });

    return;
  } else if (product.quantity <= 0 || product.quantity < quantity) {
    res.send({
      status: product.quantity <= 0 ? "error" : "success",
      message:
        product.quantity <= 0
          ? "Product is out of stock"
          : `Your selected quantity is too high, only ${product.quantity} item(s) are in stock`,
    });
    return;
  }

  const order_product = await storeManager.getOrderProduct(
    cartInfo.id,
    product.id
  );

  let result = 0;
  if (order_product == null) {
    result = await storeManager.addOrderProduct(
      cartInfo.id,
      product.id,
      product.product_type_id > 1 && product.product_type_id < 5,
      product.price,
      quantity
    );
  } else {
    result = await storeManager.updateOrderProduct(
      order_product.id,
      product.price,
      quantity
    );
  }

  res.send({
    status: result > 0 ? "success" : "error",
    message:
      result > 0
        ? order_product == null
          ? "Item Added to cart"
          : "Cart item updated"
        : "Could not add item to cart",
  });
});

app.put("/cart/", checkAuthorizationToken, async function (req, res) {
  const { product_id, quantity } = req.body;

  let scheme = Joi.object({
    product_id: Joi.number().min(1).required(),
    quantity: Joi.number().min(1).required(),
  });

  let sResult = scheme.validate(req.body);

  if (sResult.error !== undefined) {
    res.json({
      status: "error",
      message: sResult.error.details[0].message,
    });

    return;
  }

  let cartInfo = await storeManager.getOrderCart(req.user.user_id);

  if (cartInfo == null) {
    res.json({
      status: "error",
      message: "Could not update cart item",
    });

    return;
  }

  const product = await storeManager.getProduct(product_id);

  if (product == null) {
    res.json({
      status: "error",
      message: "Could not find product",
    });

    return;
  } else if (product.quantity <= 0 || product.quantity < quantity) {
    res.send({
      status: product.quantity <= 0 ? "error" : "success",
      message:
        product.quantity <= 0
          ? "Product is out of stock"
          : `Your selected quantity is too high, only ${product.quantity} item(s) are in stock`,
    });
    return;
  }

  const order_product = await storeManager.getOrderProduct(
    cartInfo.id,
    product.id
  );

  let result = 0;
  if (order_product != null) {
    result = await storeManager.updateOrderProduct(
      order_product.id,
      product.price,
      quantity
    );
  }

  res.send({
    status: result > 0 ? "success" : "error",
    message: result > 0 ? "Cart item updated" : "Could not update cart item",
  });
});

app.delete("/cart/", checkAuthorizationToken, async function (req, res) {
  let cartInfo = await storeManager.getOrderCart(req.user.user_id);

  if (cartInfo == null) {
    res.json({
      status: "error",
      message: "Could not find cart items",
    });
    return;
  }

  const result = await storeManager.clearCart(cartInfo.id);

  res.send({
    status: result > 0 ? "success" : "error",
    message: result > 0 ? "Cart Cleared" : "Cart is empty",
  });
});

app.delete(
  "/cart/:product_id",
  checkAuthorizationToken,
  async function (req, res) {
    const { product_id } = req.params;

    let scheme = Joi.object({
      product_id: Joi.number().min(1).required(),
    });

    let sResult = scheme.validate(req.params);

    if (sResult.error !== undefined) {
      res.status(400).send(sResult.error.details[0].message);
      return;
    }

    let cartInfo = await storeManager.getOrderCart(req.user.user_id);

    if (cartInfo == null) {
      res.sendStatus(400);
      return;
    }

    const result = await storeManager.removeOrderProduct(
      cartInfo.id,
      product_id
    );

    res.send({
      status: result > 0 ? "success" : "error",
      message: result > 0 ? "Item removed from cart" : "Item not found in cart",
    });
  }
);

app.post(
  "/cart/complete/card",
  checkAuthorizationToken,
  async function (req, res) {
    const {
      is_delivery,
      delivery_address,
      card_number,
      card_month,
      card_year,
      card_cvc,
    } = req.body;

    //method, payment_details

    let scheme = Joi.object({
      card_number: Joi.string()
        .pattern(/^[0-9]+$/)
        .min(16)
        .max(16)
        .required()
        .messages({
          "string.pattern.base": `Card Number must be must be 16 digital values`,
        }),
      card_month: Joi.number().min(1).max(12).required(),
      card_year: Joi.number().min(20).max(99).required(),
      card_cvc: Joi.string()
        .pattern(/^[0-9]+$/)
        .min(3)
        .max(3)
        .messages({ "string.pattern.base": `CVC must be 3 digital values` })
        .required(),
      is_delivery: Joi.number().min(0).max(1).required(),
      delivery_address: Joi.string().empty().min(0).max(250).optional(),
    });

    let sResult = scheme.validate(req.body);
    if (sResult.error !== undefined) {
      res.json({
        status: "error",
        message: sResult.error.details[0].message,
      });
      return;
    } else if (is_delivery == 1 && delivery_address.length < 30) {
      res.json({
        status: "error",
        message: "Invalid delivery address",
      });
      return;
    }

    let cartInfo = await storeManager.getOrderCart(req.user.user_id);
    if (cartInfo == null) {
      res.json({
        status: "error",
        message: "Cart does not have any items",
      });
      return;
    }

    // Check if cart has any items inside
    let cartTotal = await storeManager.getOrderTotals(cartInfo.id);
    if (cartTotal.total_quantity == 0 || cartTotal.total_price == 0) {
      res.json({
        status: "error",
        message: "Cart does not have any items",
      });
      return;
    }

    // check Cart quantity is enough with stock
    const invalidQuantity = await storeManager.checkOrderQuantity(cartInfo.id);
    if (invalidQuantity.invalid_products > 0) {
      res.json({
        status: "error",
        message:
          "There are some items in your cart that may be out of stock or are less",
      });
      return;
    }

    // try to add cart payment
    const paymentSuccess = await storeManager.addOrderPayment(
      cartTotal.total_price,
      "CREDIT CARD",
      `Card Number: ${card_number}, Card Date: ${card_month}/${card_year}, Card CVC: ${card_cvc}`,
      cartInfo.id
    );

    if (paymentSuccess == 0) {
      res.json({
        status: "error",
        message: "Could not add cart payment",
      });
      return;
    }

    // update product quantity in the product table
    const updateProducts = await storeManager.updateProductQauntity(
      cartInfo.id
    );
    if (updateProducts == 0) {
      storeManager.clearPayments(cartInfo.id).then().catch();

      res.json({
        status: "error",
        message: "Could not complete cart order, status 102",
      });
      return;
    }

    // complete order
    const result = await storeManager.updateOrder(
      cartTotal.total_price,
      cartTotal.total_quantity,
      is_delivery == 1,
      delivery_address,
      2,
      cartInfo.id
    );

    if (result > 0) {
      res.json({ status: "success", message: "Cart completed" });
    } else {
      // reverse cart payment and product quantity update
      storeManager.clearPayments(cartInfo.id).then().catch();
      storeManager.updateProductQauntityReverse(cartInfo.id).then().catch();

      res.json({
        status: "error",
        message: "Could not complete cart order, status 302",
      });
    }
  }
);

//////////////////////////

// order routes

app.get("/order/", checkAuthorizationToken, async function (req, res) {
  storeManager
    .getOrders(req.user.user_id, false)
    .then((orderInfo) => res.json(orderInfo))
    .catch((error) => res.json([]));
});

app.get("/order/:order_id", checkAuthorizationToken, async function (req, res) {
  const { order_id } = req.params;

  let scheme = Joi.object({
    order_id: Joi.number().min(1).required(),
  });

  let sResult = scheme.validate(req.params);

  if (sResult.error !== undefined) {
    res.json({
      status: "error",
      message: sResult.error.details[0].message,
    });

    return;
  }
  storeManager
    .getOrder(order_id, req.user.user_id)
    .then((orderInfo) =>
      res.json({ status: "success", message: "", order: orderInfo })
    )
    .catch((error) =>
      res.json({ status: "error", message: "Order could not be found" })
    );
});

app.get(
  "/order/:order_id/items",
  checkAuthorizationToken,
  async function (req, res) {
    const { order_id } = req.params;

    let scheme = Joi.object({
      order_id: Joi.number().min(1).required(),
    });

    let sResult = scheme.validate(req.params);

    if (sResult.error !== undefined) {
      res.json({
        status: "error",
        message: sResult.error.details[0].message,
      });

      return;
    }
    storeManager
      .getOrder(order_id, req.user.user_id)
      .then((cart_info) => {
        if (cart_info != null) {
          return cart_info;
        }
        return Promise.reject();
      })
      .then(
        (order_info) =>
          (cartItems = storeManager.getOrderProducts(order_info.id))
      )
      .then((orderInfo) => res.json(orderInfo))
      .catch((error) => res.json([]));
  }
);

////////////////////////////////////////////////////////////

// Admin routes

// Select Records
app.get("/admin/user/", (req, res) => {
  userAdminManager
    .getUsers()
    .then((userResult) => res.json(userResult))
    .catch((error) => {
      console.log(error);
      res.json([]);
    });
});

// Select Record
app.get("/admin/user/:id", (req, res) => {
  let con = Connection.NewConnection();
  let iObject = { id: req.params.id };
  let scheme = Joi.object({
    id: Joi.number().integer().required(),
  });

  let sResult = scheme.validate(iObject);

  if (sResult.error !== undefined) {
    res.status(400).send(sResult.error.details[0].message);
    return;
  }

  userAdminManager
    .getUsers()
    .then((userResult) => res.json(userResult))
    .catch((error) => res.json(null));

  con.connect(function (err) {
    if (err) {
      res.status(400).send("Could not load store_user record");
      return;
    }

    con.query(
      `SELECT id, first_name, lastname, user_name, password, email_address, contact_number, date_registered, user_type_id, locked, locked_date 
	 FROM store_user WHERE id = ? `,
      [iObject.id],
      function (err, result, fields) {
        if (err || result.length < 1) {
          res.status(400).send("Could not load store_user record");
        } else {
          res.send(result[0]);
        }
        con.end();
      }
    );
  });
});

// Insert Record
app.post("/admin/user/", (req, res) => {
  let scheme = Joi.object({
    first_name: Joi.string().min(1).required(),
    lastname: Joi.string().min(1).required(),
    user_name: Joi.string().min(1).required(),
    password: Joi.string().min(1).required(),
    email_address: Joi.string().email().max(250).required(),
    contact_number: Joi.string().min(1).required(),
    user_type_id: Joi.number().integer().min(1).max(2).required(),
  });

  let sResult = scheme.validate(req.body);

  if (sResult.error !== undefined) {
    res.status(400).send();

    res.json({ status: "error", message: sResult.error.details[0].message });
    return;
  }

  const iObject = {
    first_name: req.body.first_name.trim(),
    lastname: req.body.lastname.trim(),
    user_name: req.body.user_name.trim(),
    password: bcrypt.hashSync(req.body.password, 10),
    email_address: req.body.email_address.trim(),
    contact_number: req.body.contact_number.trim(),
    user_type_id: req.body.user_type_id.trim(),
  };

  userAdminManager
    .addUser(iObject)
    .then((addResult) =>
      res.json({
        status: addResult > 0 ? "success" : "error",
        message: addResult > 0 ? "User added" : "Could not add user",
      })
    )
    .catch((error) =>
      res.json({ status: "error", message: "Could not add user" })
    );
});

// Update Record
app.put("/admin/user/", (req, res) => {
  let con = Connection.NewConnection();
  let scheme = Joi.object({
    id: Joi.number().integer().required(),
    first_name: Joi.string().min(1).required(),
    lastname: Joi.string().min(1).required(),
    user_name: Joi.string().min(1).required(),
    email_address: Joi.string().min(1).required(),
    contact_number: Joi.string().min(1).required(),
    user_type_id: Joi.number().integer().required(),
    locked: Joi.bool().required(),
  });

  let sResult = scheme.validate(req.body);

  if (sResult.error !== undefined) {
    res.status(400).send(sResult.error.details[0].message);
    return;
  }
  let iObject = {
    id: req.body.id.trim(),
    first_name: req.body.first_name.trim(),
    lastname: req.body.lastname.trim(),
    user_name: req.body.user_name.trim(),
    email_address: req.body.email_address.trim(),
    contact_number: req.body.contact_number.trim(),
    user_type_id: req.body.user_type_id.trim(),
    locked: req.body.locked.trim(),
  };

  con.connect(function (err) {
    if (err) {
      res.status(400).send("Could not update store_user");
      return;
    }

    con.query(
      `UPDATE store_user SET first_name = ?, lastname = ?, user_name = ?,  email_address = ?, contact_number = ?, user_type_id = ?, locked = ? WHERE id = ?`,
      [
        iObject.first_name,
        iObject.lastname,
        iObject.user_name,

        iObject.email_address,
        iObject.contact_number,

        iObject.user_type_id,
        iObject.locked,

        iObject.id,
      ],
      function (err, result, fields) {
        if (err) {
          res.status(400).send("Could not update store_user");
        } else {
          res.send(jRes.getResponse(1, "store_user Updated"));
        }
        con.end();
      }
    );
  });
});

// Delete Record
app.delete("/admin/user/:id", (req, res) => {
  let con = Connection.NewConnection();
  let iObject = { id: req.params.id };
  let scheme = Joi.object({
    id: Joi.number().integer().required(),
  });

  let sResult = scheme.validate(iObject);

  if (sResult.error !== undefined) {
    res.status(400).send(sResult.error.details[0].message);
    return;
  }

  con.connect(function (err) {
    if (err) {
      res.status(400).send("Could not delete store_user record");
      return;
    }

    con.query(
      `DELETE FROM store_user WHERE id = ? `,
      [iObject.id],
      function (err, result, fields) {
        if (err || result.affectedRows < 1) {
          res.status(400).send("Could not delete store_user record");
        } else {
          res.send(jRes.getResponse(1, "Record Deleted"));
        }
        con.end();
      }
    );
  });
});

////////////////////////////////////////////////////////////

function checkAuthorizationToken(req, res, next) {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ");

  if (token == null) {
    return res.sendStatus(401);
  }

  jwt.verify(token[0], jwt_key, (err, user) => {
    if (!err) {
      req.user = user;
      next();
    } else {
      res.sendStatus(403);
    }
  });
}

function checkAdminAuthorizationToken(req, res, next) {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ");

  if (token == null) {
    return res.sendStatus(401);
  }

  jwt.verify(token[0], jwt_key, (err, user) => {
    if (!err && user.user_type == "admin") {
      req.user = user;
      next();
    } else {
      res.sendStatus(403);
    }
  });
}

app.listen(PORT, function () {
  console.log(`App started on port ${PORT}`);
});
