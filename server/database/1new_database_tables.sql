DROP TABLE IF EXISTS user_order_product;
DROP TABLE IF EXISTS product;
DROP TABLE IF EXISTS product_type;
DROP TABLE IF EXISTS user_order_payment;
DROP TABLE IF EXISTS user_order;
DROP TABLE IF EXISTS order_status;
DROP TABLE IF EXISTS user_address;
DROP TABLE IF EXISTS store_user;
DROP TABLE IF EXISTS user_type;



CREATE TABLE user_type (
  id 								INT 							NOT NULL PRIMARY KEY,
  description 					text 							NOT NULL
);


INSERT INTO user_type VALUES 
(1, 'Customer'),
(2, 'Admin');

CREATE TABLE store_user (
  id 								serial 						NOT NULL PRIMARY KEY ,
  first_name 					varchar(50) 				NOT NULL,
  lastname 					varchar(50) 				NOT NULL,
  user_name 					varchar(50) 				NOT NULL,
  password				 		text 							NOT NULL,
  email_address	 			varchar(128) 			NOT NULL DEFAULT ' ',
  contact_number 			varchar(13) 				NOT NULL DEFAULT ' ',
  date_registered 			TIMESTAMP 			NOT NULL DEFAULT CURRENT_TIMESTAMP,
  user_type_id 				INT 							NOT NULL,
  locked 						bool 							NOT NULL DEFAULT false,
  locked_date 				TIMESTAMP 			NOT NULL DEFAULT '1990-01-01 00:00:00',
  
  FOREIGN KEY (user_type_id) REFERENCES user_type (id) 
  ON DELETE CASCADE 
  ON UPDATE CASCADE
);

CREATE TABLE user_address (
  id  			 					serial  			 			NOT NULL PRIMARY KEY,
  housenumber  			INT  			 			NOT NULL,
  street  						text  			 			NOT NULL,
  province  					text  			 			NOT NULL,
  postal_code  				text  			 			NOT NULL,
  user_id  						INT  			 			NOT NULL,
  
  FOREIGN KEY (user_id) REFERENCES store_user (id) 
  ON DELETE CASCADE 
  ON UPDATE CASCADE
  
);

CREATE TABLE order_status (
  id  			 					INT  			 			NOT NULL PRIMARY KEY,
  description  				text  			 			NOT NULL
);	

INSERT INTO order_status VALUES 
(1, 'Order Pending'),
(2, 'Order Complete, Awaiting collection'),
(3, 'Order Complete, Preparing for delivery'),
(4, 'Order Delivery: On route'),
(5, 'Order Collected'),
(6, 'Order Delivered'),
(7, 'Order Cancelled');



CREATE TABLE user_order (
  id  			 					serial  			 			NOT NULL PRIMARY KEY ,
  is_cart						boolean					NOT NULL DEFAULT TRUE,
  
  order_date  				TIMESTAMP 			NOT NULL DEFAULT '1990/01/01',
  order_total  				decimal(10,2) 						NOT NULL DEFAULT 0,
  order_items  				INT 							NOT NULL DEFAULT 0,
  
  is_delivery					boolean					NOT NULL DEFAULT FALSE,
  delivery_address			text							NOT NULL DEFAULT '',
  
  order_status_id  			INT  			 			NOT NULL DEFAULT 1,
  user_id  			 			INT  			 			NOT NULL,

   FOREIGN KEY (order_status_id) REFERENCES order_status (id) 
   ON DELETE CASCADE 
   ON UPDATE CASCADE,
   
  FOREIGN KEY (user_id) REFERENCES store_user (id) 
  ON DELETE CASCADE 
  ON UPDATE CASCADE
);

CREATE TABLE user_order_payment (
  id  			 			 		SERIAL 						NOT NULL PRIMARY KEY,
  amount  			 			decimal(10,2) 			NOT NULL,
  payment_date  			TIMESTAMP 			NOT NULL DEFAULT CURRENT_TIMESTAMP,
  method  			 			text 							NOT NULL DEFAULT 'CREDIT CARD',
  payment_details			text							NOT NULL DEFAULT '',
  user_order_id  			INT 							NOT NULL,
  
  FOREIGN KEY (user_order_id) REFERENCES user_order (id) 
  ON DELETE CASCADE 
  ON UPDATE CASCADE
);

CREATE TABLE product_type (
  id  			 			 		INT  			 			NOT NULL PRIMARY KEY,
  name  						text  			 			NOT NULL,
  image							text							NOT NULL DEFAULT ''
);


INSERT INTO product_type(id,name) VALUES 
(1, 'Gas Container'), 
(2, 'Gas Refill'), 
(3, 'Generator Rental'),
(4, 'Generator Purchase');


-- RENTAL DURATION
-- MINUTES = 1
-- HOURS = 2
-- DAYS =3
-- MONTH = 4
-- YEAR = 5

CREATE TABLE product (
  id  			 			 		serial  						NOT NULL PRIMARY KEY,
  product_name  			text  			 			NOT NULL,
  description  				text  			 			NOT NULL,
  price  			 				decimal(10,2)  			 		NOT NULL DEFAULT 0,
  quantity  			 		INT  			 			NOT NULL DEFAULT 0,
  available  			 		bool  			 			NOT NULL DEFAULT true,
  is_rentalble        bool              NOT NULL DEFAULT FALSE,
  rental_duration  			INT  			 			NOT NULL DEFAULT 0,
  rental_duration_type  	INT  			 			NOT NULL DEFAULT 1,
  product_type_id  			INT  			 			NOT NULL DEFAULT 1,
  product_image				TEXT							NOT NULL DEFAULT '',
  product_date				TIMESTAMP				NOT NULL DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (product_type_id) REFERENCES product_type (id) 
  ON DELETE CASCADE 
  ON UPDATE CASCADE
);

CREATE TABLE user_order_product (
  id  			 			 		SERIAL  			 		NOT NULL PRIMARY KEY,
  order_id  					INT  			 			NOT NULL,
  product_id  			 		INT  			 			NOT NULL,
  
  has_rental  			 		bool  			 			NOT NULL DEFAULT false,
  rental_returned  			bool  			 			NOT NULL DEFAULT false,
  rental_chosen_duration  INT             NOT NULL DEFAULT 0,
  rental_duration  			INT  			 			NOT NULL DEFAULT 0,
  rental_duration_type  	INT  			 			NOT NULL DEFAULT 1,
  rental_start_date  		TIMESTAMP  			NOT NULL DEFAULT '1990-01-01 00:00:00',
  rental_end_date 			TIMESTAMP  			NOT NULL DEFAULT '1990-01-01 00:00:00',
  date_returned  			TIMESTAMP  			NOT NULL DEFAULT '1990-01-01 00:00:00',
  product_quantity  		INT  			 			NOT NULL DEFAULT 0,
  product_price  			decimal(10,2)  					NOT NULL DEFAULT 0,
  sub_total  					decimal(10,2)  			 		NOT NULL DEFAULT 0,
  
	FOREIGN KEY (product_id) REFERENCES product (id) 
	ON DELETE CASCADE 
	ON UPDATE CASCADE,

	FOREIGN KEY (order_id) REFERENCES user_order (id) 
	ON DELETE CASCADE 
	ON UPDATE CASCADE
);

GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA "public" TO generator_user;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA "public" TO generator_user;

