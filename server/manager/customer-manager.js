module.exports = function UserManager(pool) {
  // basic users
  async function registerUser(
    first_name,
    lastname,
    password,
    user_name,
    email_address,
    contact_number,
    user_type_id
  ) {
    const result = await pool.query(
      `INSERT INTO store_user(first_name,lastname, password, user_name, email_address,contact_number,user_type_id) 
        VALUES($1,$2,$3,$4,$5,$6,$7); `,
      [
        first_name,
        lastname,
        password,
        user_name,
        email_address,
        contact_number,
        user_type_id,
      ]
    );

    return result.rowCount;
  }

  async function updateUserPersonal(first_name, lastname, user_id) {
    const result = await pool.query(
      `UPDATE store_user SET first_name = $1,lastname = $2 WHERE id = $3`,
      [first_name, lastname, user_id]
    );

    return result.rowCount;
  }

  async function updateUserContact(email_address, contact_number, user_id) {
    const result = await pool.query(
      `UPDATE store_user SET email_address = $1, contact_number = $2 WHERE id = $3`,
      [email_address, contact_number, user_id]
    );

    return result.rowCount;
  }

  async function updatePassword(password, user_id) {
    const result = await pool.query(
      `UPDATE store_user SET password = $1 WHERE id = $2`,
      [password, user_id]
    );

    return result.rowCount;
  }

  async function getUserByUserName(user_name) {
    const result = await pool.query(
      `select * from store_user where lower(user_name) = lower($1) LIMIT 1`,
      [user_name]
    );

    return result.rowCount > 0 ? result.rows[0] : null;
  }

  async function getUserByID(user_id) {
    const result = await pool.query(
      `select * from store_user where id = $1 LIMIT 1`,
      [user_id]
    );

    return result.rowCount > 0 ? result.rows[0] : null;
  }

  async function getProfile(user_id) {
    const result = await pool.query(
      `SELECT
      store_user.first_name, 
      store_user.lastname, 
      store_user.user_name, 
      store_user.email_address, 
      store_user.contact_number, 
      store_user.date_registered, 
      user_type.description AS user_type
      FROM store_user
      INNER JOIN user_type ON store_user.user_type_id = user_type."id" 
      WHERE store_user.id = $1 LIMIT 1`,
      [user_id]
    );

    return result.rowCount > 0 ? result.rows[0] : null;
  }

  //////////////////////////

  // User address
  async function addAddress(
    housenumber,
    street,
    province,
    postal_code,
    user_id
  ) {
    const result = await pool.query(
      `INSERT INTO user_address(housenumber,street,province,postal_code,user_id) 
        VALUES($1,$2,$3,$4,$5);`,
      [housenumber, street, province, postal_code, user_id]
    );

    return result.rowCount;
  }

  async function updateAddress(
    housenumber,
    street,
    province,
    postal_code,
    user_id
  ) {
    const result = await pool.query(
      `UPDATE user_address SET housenumber = $1, street = $2, province = $3, postal_code = $4 WHERE id = $5`,
      [housenumber, street, province, postal_code, user_id]
    );

    return result.rowCount;
  }

  async function removeAddress(address_id, user_id) {
    const result = await pool.query(
      `DELETE FROM user_address WHERE user_id = $1 and id =$2`,
      [user_id, address_id]
    );

    return result.rowCount;
  }

  async function getAddressAll(user_id) {
    const result = await pool.query(
      `SELECT id,housenumber,street,province,postal_code FROM user_address WHERE user_id = $1`,
      [user_id]
    );

    return result.rows;
  }

  async function getAddress(address_id, user_id) {
    const result = await pool.query(
      `SELECT id,housenumber,street,province,postal_code FROM user_address WHERE id= $1 AND user_id = $2`,
      [address_id, user_id]
    );

    return result.rowCount > 0 ? result.rows[0] : null;
  }

  return {
    getUserByUserName,
    getUserByID,
    registerUser,
    updateUserPersonal,
    updateUserContact,
    updatePassword,
    getAddress,
    addAddress,
    updateAddress,
    removeAddress,
    getAddressAll,
    getProfile,
  };
};
