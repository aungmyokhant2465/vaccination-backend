const express = require("express");
const cors = require("cors");
const db = require("./models");

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());

app.use(express.static('assets/images'));
app.use(express.static('assets/products'))

// routes
const userRouter = require("./routes/userRouter");
const productRouter = require("./routes/productRouter");
const path = require("path");

const root = require('path').join(__dirname, 'build');
app.use(express.static(root));

app.use("/users", userRouter);
app.use("/products", productRouter)

app.use('/*', (req, res) => {
  res.sendFile(path.join(__dirname, 'build', 'index.html'))
})

app.use("/", (req, res) => {
  res.send("pond")
})

db.sequelize
  .sync()
  .then(() => {
    app.listen(PORT, () => console.log(`Listening on port ${PORT}`));
  })
  .catch((err) => {
    console.log("err", err);
  });