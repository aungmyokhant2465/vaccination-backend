const route = require("express").Router();
const { vaccinatedusers, qrtimes, users } = require("../models");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const { Op } = require("sequelize");
const qr = require("qrcode");
const { validateToken } = require("../middlewares/validation");
const multer = require('multer');
const readXlsxFile = require('read-excel-file/node')
const fs = require('fs');

const imageDelete = (image_name) => {
  if(image_name) {
    let path = "assets/images/" + image_name;
    fs.unlink(path, function (err) {
      if (err) throw err;
      console.log('File deleted!');
    });
  }
}

const imageFilter = (req, file, cb) => {
  console.log("image: ", file.mimetype)
  if (
    file.mimetype.includes("image")
  ) {
    cb(null, true);
  } else {
    cb("Please upload only image file.", false);
  }
}

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'assets/images/')
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + '-' +file.originalname)
  }
})

const excelFilter = (req, file, cb) => {
  if (
    file.mimetype.includes("excel") ||
    file.mimetype.includes("spreadsheetml")
  ) {
    cb(null, true);
  } else {
    cb("Please upload only excel file.", false);
  }
  cb(null, true);
};

var storageExcel = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "assets/excels/");
  },
  filename: (req, file, cb) => {
    console.log(file.originalname);
    cb(null, file.originalname);
  },
});

var uploadFile = multer({ storage: storageExcel, fileFilter: excelFilter });

const upload = multer({ storage: storage, limits: { fileSize: 2.5 * 1024 * 1024 }, fileFilter: imageFilter }).single('file')

route.post("/register", async (req, res) => {
  const { email, username, password } = req.body;

  try {
    const user = await users.findOne({
      where: {
        email: email,
      },
    });

    if (user) {
      return res.json({ message: "User already existed" });
    } else {
      bcrypt
        .hash(password, 10)
        .then(async (hash) => {
          await users.create({
            username: username,
            email: email,
            password: hash,
          });
          return res.json({ message: "Successfully created" });
        })
        .catch((err) => res.json({ message: err }));
    }
  } catch (err) {
    return res.json({ error: err });
  }
});

route.post("/login", async (req, res) => {
  const { email, password } = req.body;
  try {
    const user = await users.findOne({
      where: {
        email: email,
      },
    });

    if (!user) res.json({ message: "User not found" });
    else {
      bcrypt.compare(password, user.password).then((match) => {
        if (!match) res.json({ message: "Incorrect password" });

        const accessToken = jwt.sign(
          {
            id: user.id,
            username: user.username,
            email: user.email,
          },
          "secretCode"
          // {
          //   expiresIn: 3 * 24 * 60 * 60, // 3 days
          // }
        );
        return res.json({ accessToken, user: {
          id: user.id,
          username: user.username,
          email: user.email
        } });
      });
    }
  } catch (err) {
    return res.json({ error: err });
  }
});

route.get("/", validateToken, async (req, res) => {
  let offset = 0
  offset = Number(req.query.pages) * 5;
  let counts = 0
  try {
    const data = await qrtimes.findAll({
      include: [vaccinatedusers],
      offset: offset, limit: 5
    });
    if(isNaN(Number(req.query.totalPages)) || Number(req.query.totalPages) === 0 ) {
      counts = await vaccinatedusers.count({})
    } else {
      counts = req.query.totalPages
    }
    return res.json({ message: "success", data: data, counts: counts });
  } catch (err) {
    console.log("err", err);
    return res.json({ message: "server error" });
  }
});

route.put("/qrcount/:id", async (req, res) => {
  // user id
  const { id } = req.params;
  const { previous_count } = req.body;

  try {
    const user = await qrtimes.update(
      {
        times: previous_count + 1,
      },
      {
        where: {
          user_id: id,
        },
      }
    );
    return res.json({ message: "success" });
  } catch (err) {
    console.log("err", err);
    return res.json({ message: "server error" });
  }
});

route.get("/count_users", validateToken, async (req, res) => {
  try {
    const totalScannedCount = await qrtimes.findAll();

    const calcuatedScannedCount = totalScannedCount.reduce((total, current) => {
      return total + current.times;
    }, 0);

    const totalVaccinated = await vaccinatedusers.count();

    const fristVaccinatedCount = await vaccinatedusers.count({
      where: {
        vaccineFirstDate: {
          [Op.not]: null,
        },
        vaccineSecondDate: null,
      },
    });
    const secondVaccinatedCount = await vaccinatedusers.count({
      where: {
        vaccineFirstDate: {
          [Op.not]: null,
        },
        vaccineSecondDate: {
          [Op.not]: null,
        },
      },
    });

    return res.json({
      totalVaccinated,
      calcuatedScannedCount,
      fristVaccinatedCount,
      secondVaccinatedCount,
    });
  } catch (err) {
    console.log("err", err);
    return res.json({ message: "server error" });
  }
});

route.get("/first_vaccineted", validateToken, async (req, res) => {
  try {
    const data = await vaccinatedusers.findAll({
      where: {
        vaccineFirstDate: {
          [Op.not]: null,
        },
        vaccineSecondDate: null,
      },
    });
    return res.json({ message: "success", data });
  } catch (err) {
    console.log("err", err);
    return res.json({ message: "server error" });
  }
});

route.get("/second_vaccinated", validateToken, async (req, res) => {
  try {
    const data = await vaccinatedusers.findAll({
      where: {
        vaccineFirstDate: {
          [Op.not]: null,
        },
        vaccineSecondDate: {
          [Op.not]: null,
        },
      },
    });
    return res.json({ message: "success", data });
  } catch (err) {
    console.log("err", err);
    return res.json({ message: "server error" });
  }
});

route.get('/vaccinated', validateToken, async (req, res) => {
  try {
    const data = await vaccinatedusers.findAll({
      where: {
        vaccineFirstDate: {
          [Op.not]: null,
        }
      },
    });
    return res.json({ message: "success", data });
  } catch (err) {
    console.log("err", err);
    return res.json({ message: "server error" });
  }
})

route.get("/:id", async (req, res) => {
  const { id } = req.params;

  try {
    const data = await qrtimes.findOne({
      where: {
        user_id: id,
      },
      include: [vaccinatedusers],
    });
    return res.json({ message: "success", data: data });
  } catch (err) {
    console.log("err", err);
    return res.json({ message: "server error" });
  }
});

route.get('/find/:nrc', async (req, res) => {
  const { nrc } = req.params;
  try {
    const data = await vaccinatedusers.findOne({
      where: {
        nrc: nrc,
      }
    });
    if(!data) {
      res.json({ message: "user not found", status: 404 }).end()
    }
    return res.json({ message: "success", data: data.id });
  } catch (err) {
    console.log("err", err);
    return res.json({ message: "server error" });
  }
})

route.post('/upload-excel', uploadFile.single('file'), async (req, res) => {
  try {
    if (req.file == undefined) {
      return res.status(400).json({ message: 'Please upload an excel file!' })
    }

    let path = "assets/excels/" + req.file.filename;

    readXlsxFile(path).then( async (rows) => {
      rows.shift();

      let users = [];

      rows.forEach( async (row) => {
        let dob = row[2] ? new Date(Math.round((row[2] - (25567 + 2)) * 86400 * 1000)) : null
        let joinD = row[9] ? new Date(Math.round((row[9] - (25567 + 2)) * 86400 * 1000)) : null
        let vacFirst = row[10] ? new Date(Math.round((row[10] - (25567 + 2)) * 86400 * 1000)) : null
        let vacSecond = row[11] ? new Date(Math.round((row[11] - (25567 + 2)) * 86400 * 1000)) : null
        let user = {
          username: row[0],
          nrc: row[1],
          dob: dob,
          gender: row[3],
          address: row[4],
          id_no: row[5],
          position: row[6],
          department: row[7],
          company: row[8],
          joinDate: joinD,
          vaccineFirstDate: vacFirst,
          vaccineSecondDate: vacSecond,
          phone: row[12],
          note: row[13]
        };

        users.push(user);
      });

      try {
        fs.unlink(path, function (err) {
          if (err) throw err;
          console.log('File deleted!');
        });
        const result = await vaccinatedusers.bulkCreate(users)
        result.forEach( async v => {
          // const ipaddress = "192.168.100.3:3000"; // Change DNS or IP
          const ipaddress = "http://159.223.34.75"
          const src = await qr.toDataURL(
            `${ipaddress}/users/${v.dataValues.id}/scaned`
          );
          await vaccinatedusers.update(
            {
              qrcode: src,
            },
            {
              where: {
                id: v.dataValues.id,
              },
            }
          );
          await qrtimes.create({
            times: 0,
            user_id: v.dataValues.id,
          });
        })

        res.status(200).json({
          message: "Uploaded the file successfully: " + req.file.originalname, error: false
        });
      } catch (error) {
        res.status(500).send({
          message: "Fail to import data into database!",
          error: error.message,
        });
      }
    });
  } catch (err) {
    console.log("err catch :", err)
    res.status(500).send({
      message: 'Could not upload the file: ' + req.file.originalname
    })
  }
})

route.post('/upload', validateToken, async (req, res) => {
  try {
    upload(req, res, (err) => {
      if (err) {
        if(err.code === 'LIMIT_FILE_SIZE') {
          res.json({ message: 'Please upload smaller file. (max: 1MB)', error: true }).status(400).end()
        }
        if(err.includes('only image')) {
          res.json({ message: 'Please upload image file. (max: 1MB)', error: true }).status(400).end()
        }
        console.log("error:", err)
        res.status(500).end();
      } else {
        res.json({file: req.file}).end();
      }
    });
  } catch (error) {
    res.status(400).json({error: error})
  }
})

route.post("/", validateToken, async (req, res) => {
  const {
    nrc,
    dob,
    gender,
    address,
    vaccineFirstDate,
    vaccineSecondDate,
    phone,
    note,
    photo,
    recordCard,
    position,
    department,
    company,
    joinDate,
    id_no
  } = req.body;

  let username;
  if (req.body.username) {
    username = req.body.username;
  }
  try {
    const userData = {
      username: username,
      nrc: nrc,
      dob: dob,
      gender: gender,
      address: address,
      vaccineFirstDate: vaccineFirstDate? vaccineFirstDate: null,
      vaccineSecondDate: vaccineSecondDate? vaccineSecondDate: null,
      phone: phone,
      note: note,
      photo: photo,
      recordCard,
      position,
      department,
      company,
      joinDate: joinDate? joinDate : null,
      id_no
    };
    try {
      const user = await vaccinatedusers.create({ ...userData });
      // const ipaddress = "192.168.100.3:3000"; // Change DNS or IP
      const ipaddress = "http://159.223.34.75";
      const src = await qr.toDataURL(
        `${ipaddress}/users/${user.id}/scaned`
      );
      await vaccinatedusers.update(
        {
          qrcode: src,
        },
        {
          where: {
            id: user.id,
          },
        }
      );
      const qrcodeTimes = await qrtimes.create({
        times: 0,
        user_id: user.id,
      });
      return res.json({ message: "success", data: user, qrcodeTimes });
    } catch (err) {
      console.error(err);
      return res.json({ message: "Something wrong with generating qrcode" });
    }
  } catch (err) {
    console.log("err", err);
    return res.json({ message: "server error" });
  }
});

route.put("/:id", validateToken, async (req, res) => {
  const { data, photo, recordCard } = req.body;
  const id = req.params.id
  if(photo) {
    imageDelete(photo)
  }
  if(recordCard) {
    imageDelete(recordCard)
  }

  try {
    const user = await vaccinatedusers.update(
      {
        ...data,
      },
      {
        where: {
          id: id,
        },
      }
    );
    return res.json({ message: "success", data: user });
  } catch (err) {
    console.log("err", err);
    return res.json({ message: "server error" });
  }
});

route.delete('/:id', validateToken, async (req, res) => {
  let toDelete
  try {
    toDelete = await vaccinatedusers.findOne({ where: {id: req.params.id }});
    await vaccinatedusers.destroy({
      where: {
        id: toDelete.id
      }
    });
    imageDelete(toDelete.photo)
    imageDelete(toDelete.recordCard)
    res.json({ message: "success" });
  } catch (err) {
    console.log("err", err);
    return res.json({ message: "server error" });
  }
})

module.exports = route;
