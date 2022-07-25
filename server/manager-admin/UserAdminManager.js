module.exports = function UserAdminManager(pool) {
  async function getUsers() {
    const result = await pool.query(
      `SELECT id, first_name, lastname, user_name, email_address, contact_number, date_registered, user_type_id, locked, locked_date FROM store_user `
    );

    return result.rows;
  }

  async function addUser(iObject) {
    const result = await pool.query(
      `INSERT INTO store_user(first_name, lastname, user_name, password, email_address, contact_number, user_type_id) 
      VALUES($1, $2, $3, $4, $5, $6, $7);`,
      [
        iObject.first_name,
        iObject.lastname,
        iObject.user_name,
        iObject.password,
        iObject.email_address,
        iObject.contact_number,
        iObject.user_type_id,
      ]
    );

    return result.rowCount;
  }

  async function updateUser() {}

  async function deleteUser() {}

  async function updateUserPasssword() {}

  return {
    getUsers,
    addUser,
    updateUser,
    deleteUser,
    updateUserPasssword,
  };
};
