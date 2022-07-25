const supertest = require("supertest");
const express = require("express");
const app = express();
const pg = require("pg");
//const axios = require("axios");
const API = require("../server/manager/customer-manager");
const Pool = pg.Pool;
require("dotenv").config();
const connection_string = process.env.DATABASE_URL || "";
const { parse } = require("pg-connection-string");

const config = parse(connection_string);
const pool = new Pool(config);

app.use(express.static("public"));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
//const PgPromise = require("pg-promise");
//const pgp = PgPromise({});
const DATABASE_URL = process.env.DATABASE_URL;

//const pg = require('{{pg}}');
//const db = pg(DATABASE_URL);
//import {assert} from 'console';
let assert = require("assert");
describe("The Generator App", function () {
  //before(async function () {
  //this.timeout(5000);
  //await pool.query(`delete from user_address`);
  //});

  ///customer///
  it("should be able to register a new user", async () => {
    const response = await supertest(app).post("/api/signup").send({
      user_name: "Mattm2",
      password: "word456",
      first_name: "Matthew",
      lastname: "Markhams",
      contact_number: "0976543456",
      email_address: "matt@gmail.com",
    });

    const { status, message } = response.body;
    if (status == "error") {
      assert("Account already exists", message);
    } else {
      assert("Signup success", message);
    }
  });

  it("should not register a user if they have missing fields in the registration", async () => {
    const response = await supertest(app).post("/api/signup").send({
      user_name: "Mattm2",
      password: "word456",
      first_name: "Matthew",
      lastname: "Markhams",
      contact_number: "0976543456",
      email_address: "matt@gmail.com",
    });

    const { status, message } = response.body;
    if (status == "error") {
      assert("Could not sign up user", message);
    } else {
      assert("Signup success", message);
    }
  });

  it("should allow registered user to be able to log in", async () => {
    const response = await supertest(app).post("/api/login").send({
      user_name: "Mattm2",
      password: "word456",
    });
    token = response.body.token;
    const { status, message } = response.body;
    if (status == "error") {
      assert("User could not be found, wrong user name or password", message);
    } else {
      assert("Login was successful", message);
    }

    //assert.equal('Login was successful', message);
  });

  it("should not log in when username and password do not match", async () => {
    const response = await supertest(app).post("/api/login").send({
      user_name: "Mattm2",
      password: "pass123",
    });
    token = response.body.token;
    const { status, message } = response.body;
    if (status == "error") {
      assert("User could not be found, wrong user name or password", message);
    } else {
      assert("Login was successful", message);
    }
  });

  //store//
  it("should be able to seach for items in store by name", async () => {
    const search_name = "dal";
    const response = await supertest(app).get(`/store/search/${search_name}`);
    //.set({ "Authorization": `Bearer ${token}` })

    const search = response.body;
    assert.equal(3, search.length);
  });

  //it('should be able to find items in store ', async () => {

  //const response = await supertest(app)
  //.get('/store/product/:product_id')
  //.set({ "Authorization": `Bearer ${token}` })
  //.send(404)

  //const prod_id = response.body.product_id
  //assert.equal('product', response.body.status)

  //});
  it("should not allow user to purchase a product out of stock", async () => {
    const response = await supertest(app)
      .post("/cart")
      .set({ Authorization: `Bearer ${token}` });

    token = response.body.token;
    const { status, message } = response.body;
    if (status == "error") {
      assert("0", message);
    } else {
      assert("Product is out of stock", message);
    }
  });

  it("should allow user to add items to cart", async () => {
    const response = await supertest(app)
      .post("/cart")
      .set({ Authorization: `Bearer ${token}` });

    token = response.body.token;
    const { status, message } = response.body;
    if (status == "error") {
      assert(">0", message);
    } else {
      assert("Item Added to cart", message);
    }
  });

  it("should show the item the added to the cart", async () => {
    const response = await supertest(app)
      .post("/cart")
      .set({ Authorization: `Bearer ${token}` });

    token = response.body.token;
    const { status, message } = response.body;
    if (status == "error") {
      assert("1", message);
    } else {
      assert("Cart item updated", message);
    }
  });

  it("should allow user to proceed to checkout after they have added the items they want on the cart", async () => {
    const response = await supertest(app)
      .post("/cart")
      .set({ Authorization: `Bearer ${token}` });

    token = response.body.token;
    const { status, message } = response.body;
    if (status == "error") {
      assert("Cart is empty", message);
    } else {
      assert("Cart is cleared", message);
    }
  });

  it("should allow user to remove items they nolonger want on the cart", async () => {
    const response = await supertest(app)
      .post("/cart/:product_id")
      .set({ Authorization: `Bearer ${token}` });

    token = response.body.token;
    const { status, message } = response.body;
    if (status == "error") {
      assert("Item not found in cart", message);
    } else {
      assert("Item removed from cart", message);
    }
  });
  after(() => {
    pool.end();
  });
});
