const { users } = require('./models')
const bcrypt = require("bcrypt");

const setup = () => {
    bcrypt
    .hash('admin', 10)
    .then(async (hash) => {
      await users.create({
        username: 'Admin',
        email: 'admin@gmail.com',
        password: hash,
      });
      console.log("Success")
    })
    .catch((err) => {
        throw new Error(err)
    });
}

setup()