const express = require("express");
const cors = require("cors");
const db = require("./models");

const app = express();
const PORT = process.env.PORT || 4001;

app.use(cors());
app.use(express.json());

app.use(express.static('assets/images'));

// routes
const userRouter = require("./routes/userRouter");
const path = require("path");

const root = require('path').join(__dirname, 'build');
app.use(express.static(root));

app.use("/users", userRouter);

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