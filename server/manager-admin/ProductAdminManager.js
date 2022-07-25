module.exports = function ProductAdminManager(pool) {
    async function getProductType() {
      const result = await pool.query(`select * from product_type`);
  
      return result.rows;
    }
  
    async function getProductsTop() {
      const result = await pool.query(
        `SELECT
        product.id, product.product_name, 
        product.price, product.quantity, product.available, 
        product.rental_duration, product.rental_duration_type, product.product_image, 
        product_type.name as "product_type"
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
        product.price, product.quantity, product.available, 
        product.rental_duration, product.rental_duration_type, product.product_image, 
        product_type.name as "product_type"
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
        product.price, product.quantity, product.available, 
        product.rental_duration, product.rental_duration_type, product.product_image, 
        product_type.name as "product_type"
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
      product.product_type_id
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
        WHERE id = $1 AND user_id = $2 AND is_cart = $3 LIMIT 1`,
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
        SUM(user_order_product.product_price) as total_price,
        SUM(user_order_product.product_quantity) as total_quantity
        FROM user_order_product
        WHERE order_id = $1`,
        [order_id]
      );
  
      return result.rowCount > 0 ? result.rows[0] : null;
    }
  
    async function addOrderPayment(order_id, amount, method) {}
  
    async function updateOrder(order_id) {}
  
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
    };
  };
  