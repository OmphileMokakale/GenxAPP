module.exports = function StoreManager(pool) {
  async function getProductType() {
    const result = await pool.query(`select * from product_type`);
    return result.rows;
  }

  async function getProductsTop() {
    const result = await pool.query(
      `SELECT
      product.id, product.product_name, 
      product.price,description, product.quantity, product.available, 
      product.rental_duration, product.rental_duration_type, product.product_image, 
      product_type.name as "product_type",
      0 as "selected_quantity",
      0 as "calculated_price"
      FROM product
      INNER JOIN product_type ON product.product_type_id = product_type.id
      where available = true ORDER BY product.product_date DESC LIMIT 5`
    );

    return result.rows;
  }

  async function getProducts(
    product_type_id,
    orderBy,
    is_not_desc,
    show_outofstock = false
  ) {
    let sortOrder = is_not_desc == false ? "ASC" : "DESC";
    let outOfOrderFilter = show_outofstock ? "AND product.quantity <= 0" : "";

    let constraint = "";
    switch (orderBy) {
      case "date":
        constraint = `ORDER BY product.product_date ${sortOrder}`;
        break;

      case "price":
        constraint = `ORDER BY product.price ${sortOrder}`;
        break;

      case "name":

      default:
        constraint = `ORDER BY product.product_name ${sortOrder}`;
        break;
    }

    const result = await pool.query(
      `SELECT
      product.id, product.product_name, 
      product.price, description, product.quantity, product.available, 
      product.rental_duration, product.rental_duration_type, product.product_image, 
      product_type.name as "product_type",
      0 as "selected_quantity",
      0 as "calculated_price"
      FROM product
      INNER JOIN product_type ON product.product_type_id = product_type.id
      where product_type.id = $1 AND available = true ${outOfOrderFilter} ${constraint}`,
      [product_type_id]
    );

    return result.rows;
  }

  async function getProductsSearch(
    search_name,
    orderBy,
    is_not_desc,
    show_outofstock = false
  ) {
    let sortOrder = is_not_desc == false ? "ASC" : "DESC";
    let outOfOrderFilter = show_outofstock ? "AND product.quantity <= 0" : "";

    let constraint = "";
    switch (orderBy) {
      case "date":
        constraint = `ORDER BY product.product_date ${sortOrder}`;
        break;

      case "price":
        constraint = `ORDER BY product.price ${sortOrder}`;
        break;

      case "name":

      default:
        constraint = `ORDER BY product.product_name ${sortOrder}`;
        break;
    }

    const result = await pool.query(
      `SELECT
      product.id, product.product_name, 
      product.price, description, product.quantity, product.available, 
      product.rental_duration, product.rental_duration_type, product.product_image, 
      product_type.name as "product_type",
      0 as "selected_quantity",
      0 as "calculated_price"
      FROM product
      INNER JOIN product_type ON product.product_type_id = product_type.id
      where lower(product.product_name) LIKE $1 AND available = true ${outOfOrderFilter} ${constraint}`,
      ["%" + `${search_name.toLowerCase()}` + "%"]
    );

    return result.rows;
  }
  async function getProduct(product_id) {
    const result = await pool.query(
      ` SELECT
    product.id, product.product_name, product.description,
    product.price, product.quantity, product.available, 
    product.rental_duration, product.rental_duration_type, product.product_image, 
    product_type.name as "product_type",
    product.product_type_id,
    0 as "selected_quantity",
    0 as "calculated_price"
    FROM product
    INNER JOIN product_type ON product.product_type_id = product_type.id
    WHERE product.id = $1 AND product.available = true LIMIT 1`,
      [product_id]
    );

    return result.rowCount > 0 ? result.rows[0] : null;
  }

  /////////////////////////////

  /// Orders

  async function addOrder(user_id) {
    const result = await pool.query(
      `INSERT INTO user_order(user_id) VALUES($1);`,
      [user_id]
    );

    return result.rowCount;
  }

  async function hasCart(user_id) {
    const result = await pool.query(
      `SELECT 
      COUNT(user_order.id) AS "carts"
      FROM user_order 
      WHERE user_id = $1 AND is_cart = true LIMIT 1`,
      [user_id]
    );

    return result.rowCount > 0 && result.rows[0].carts > 0;
  }

  async function getOrderCart(user_id) {
    const result = await pool.query(
      `SELECT 
      user_order.id,
      user_order.order_date,
      user_order.order_total,
      user_order.order_items, 
      order_status.description as "order_status"
      FROM user_order 
      INNER JOIN order_status ON order_status.id = user_order.order_status_id
      WHERE user_id = $1 AND is_cart = true LIMIT 1`,
      [user_id]
    );

    return result.rowCount > 0 ? result.rows[0] : null;
  }

  async function getOrder(order_id, user_id, is_cart = false) {
    const result = await pool.query(
      `SELECT 
      user_order.id,
      user_order.order_date,
      user_order.order_total,
      user_order.order_items, 
      order_status.description as "order_status"
      FROM user_order 
      INNER JOIN order_status ON order_status.id = user_order.order_status_id
      WHERE user_order.id = $1 AND user_id = $2 AND is_cart = $3 LIMIT 1`,
      [order_id, user_id, is_cart]
    );

    return result.rowCount > 0 ? result.rows[0] : null;
  }

  async function getOrders(user_id, is_cart = false) {
    const result = await pool.query(
      `SELECT 
      user_order.id,
      user_order.order_date,
      user_order.order_total,
      user_order.order_items, 
      order_status.description as "order_status"
      FROM user_order 
      INNER JOIN order_status ON order_status.id = user_order.order_status_id
      WHERE user_id = $1 AND is_cart = $2`,
      [user_id, is_cart]
    );

    return result.rows;
  }

  async function getOrderProductsCart(order_id) {
    const result = await pool.query(
      `SELECT
      product."id", 
      product.product_name, 
      product.description,
      product.quantity,
      product.price,
      user_order_product.product_price, 
      user_order_product.product_quantity, 
      user_order_product.sub_total, 
      user_order_product.date_returned, 
      user_order_product.rental_end_date, 
      user_order_product.rental_start_date, 
      user_order_product.rental_returned, 
      user_order_product.has_rental, 
      product.product_image, 
      product_type.name as product_type
      FROM user_order_product
      INNER JOIN product ON user_order_product.product_id = product."id"
      INNER JOIN product_type ON product.product_type_id = product_type."id"
      WHERE order_id = $1`,
      [order_id]
    );

    return result.rows;
  }

  async function getOrderProducts(order_id) {
    const result = await pool.query(
      `SELECT
      product."id", 
      product.product_name, 
      product.description,
      user_order_product.product_price, 
      user_order_product.product_quantity, 
      user_order_product.sub_total, 
      user_order_product.date_returned, 
      user_order_product.rental_end_date, 
      user_order_product.rental_start_date, 
      user_order_product.rental_returned, 
      user_order_product.has_rental, 
      product.product_image, 
      product_type.name as product_type
      FROM user_order_product
      INNER JOIN product ON user_order_product.product_id = product."id"
      INNER JOIN product_type ON product.product_type_id = product_type."id"
      WHERE order_id = $1`,
      [order_id]
    );

    return result.rows;
  }

  async function getOrderProduct(order_id, product_id) {
    const result = await pool.query(
      `SELECT
      user_order_product."id", 
      product.product_name,
      product.product_image,
      user_order_product.product_price, 
      user_order_product.product_quantity, 
      user_order_product.sub_total, 
      user_order_product.date_returned, 
      user_order_product.rental_end_date, 
      user_order_product.rental_start_date, 
      user_order_product.rental_returned, 
      user_order_product.has_rental
      FROM user_order_product
      INNER JOIN product ON user_order_product.product_id = product."id"
      INNER JOIN product_type ON product.product_type_id = product_type."id"
      WHERE product_id=$2 AND order_id = $1 LIMIT 1`,
      [order_id, product_id]
    );

    return result.rowCount > 0 ? result.rows[0] : null;
  }

  async function addOrderProduct(
    order_id,
    product_id,
    is_rental,
    product_price,
    product_quantity
  ) {
    const total = product_price * product_quantity;
    const result = await pool.query(
      `INSERT INTO user_order_product(order_id,product_id,has_rental,product_price,product_quantity,sub_total) 
      VALUES($1, $2, $3, $4, $5, $6)`,
      [order_id, product_id, is_rental, product_price, product_quantity, total]
    );

    return result.rowCount;
  }

  async function updateOrderProduct(
    order_product_id,
    product_price,
    product_quantity
  ) {
    const total = product_price * product_quantity;
    const result = await pool.query(
      `UPDATE user_order_product SET product_price=$2, product_quantity=$3 , sub_total=$4 
      WHERE id = $1`,
      [order_product_id, product_price, product_quantity, total]
    );

    return result.rowCount;
  }

  async function removeOrderProduct(order_id, product_id) {
    const result = await pool.query(
      `DELETE FROM user_order_product
      WHERE product_id = $2 AND order_id = $1`,
      [order_id, product_id]
    );

    return result.rowCount;
  }

  async function clearCart(order_id) {
    const result = await pool.query(
      `DELETE FROM user_order_product
      WHERE order_id = $1`,
      [order_id]
    );

    return result.rowCount;
  }

  async function getOrderTotals(order_id) {
    const result = await pool.query(
      `SELECT
      SUM(user_order_product.sub_total) as total_price,
      SUM(user_order_product.product_quantity) as total_quantity
      FROM user_order_product
      WHERE order_id = $1`,
      [order_id]
    );

    return result.rowCount > 0 ? result.rows[0] : null;
  }

  async function checkOrderQuantity(order_id) {
    const result = await pool.query(
      `SELECT
        SUM( CASE  
              WHEN product.quantity<user_order_product.product_quantity OR user_order_product.product_quantity < 0 THEN 1 
              ELSE 0
          END  ) as "invalid_products"
      FROM
      user_order_product
      INNER JOIN product ON user_order_product.product_id = product."id"
      WHERE user_order_product.order_id = $1`,
      [order_id]
    );

    return result.rowCount > 0 ? result.rows[0] : null;
  }

  async function updateProductQauntity(order_id) {
    const result = await pool.query(
      `UPDATE product
      SET quantity=quantity - order_products.product_quantity
      FROM (SELECT product_id,order_id,product_quantity FROM user_order_product) AS order_products
      WHERE product.id = order_products.product_id AND order_products.order_id = $1;`,
      [order_id]
    );

    return result.rowCount;
  }

  async function updateProductQauntityReverse(order_id) {
    const result = await pool.query(
      `UPDATE product
      SET quantity=quantity + order_products.product_quantity
      FROM (SELECT product_id,order_id,product_quantity FROM user_order_product) AS order_products
      WHERE product.id = order_products.product_id AND order_products.order_id = $1;`,
      [order_id]
    );

    return result.rowCount;
  }

  async function addOrderPayment(amount, method, payment_details, order_id) {
    const result = await pool.query(
      `INSERT INTO user_order_payment(amount,method,payment_details,user_order_id) 
      VALUES($1, $2, $3, $4)`,
      [amount, method, payment_details, order_id]
    );

    return result.rowCount;
  }

  async function clearPayments(order_id) {
    const result = await pool.query(
      `DELETE FROM user_order_payment WHERE user_order_id = $1;`,
      [order_id]
    );

    return result.rowCount;
  }

  async function updateOrder(
    order_total,
    order_items,
    is_delivery,
    delivery_address,
    order_status_id,
    order_id
  ) {
    const result = await pool.query(
      `UPDATE user_order
      SET order_date = CURRENT_TIMESTAMP,
      order_total = $1,
      order_items = $2,
      is_delivery = $3,
      delivery_address = $4,
      order_status_id = $5,
      is_cart = false
      WHERE user_order.id = $6;`,
      [
        order_total,
        order_items,
        is_delivery,
        delivery_address,
        order_status_id,
        order_id,
      ]
    );

    return result.rowCount;
  }

  return {
    getProductType,
    getProduct,
    getProducts,
    getProductsSearch,
    addOrder,
    getOrder,
    getOrderCart,
    getOrders,
    hasCart,
    getOrderProducts,
    addOrderPayment,
    getOrderTotals,
    updateOrder,
    getOrderProduct,
    addOrderProduct,
    updateOrderProduct,
    removeOrderProduct,
    clearCart,
    getProductsTop,
    updateProductQauntity,
    checkOrderQuantity,
    clearPayments,
    updateProductQauntityReverse,
    getOrderProductsCart,
  };
};
