create database generator_app;
create role generator_user login password 'generator123';
grant all privileges on database generator_app to generator_user;



