const express = require("express");
const cors = require("cors");
const db = require("./models");

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());

app.use(express.static('assets/images'));

// routes
const userRouter = require("./routes/userRouter");

app.use("/users", userRouter);
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

  // mysql://bee0279549dfba:703dfc5c@us-cdbr-east-04.cleardb.com/heroku_5b8e775f3c3a55f?reconnect=true