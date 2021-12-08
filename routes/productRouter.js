const route = require('express').Router();
const { products } = require('../models');
const { validateToken } = require('../middlewares/validation');
const qr = require("qrcode");
const multer = require('multer');
const fs = require('fs');

const imageDelete = (image_name) => {
    if(image_name) {
      let path = "assets/products/" + image_name;
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
      cb(null, 'assets/products/')
    },
    filename: (req, file, cb) => {
      cb(null, Date.now() + '-' +file.originalname)
    }
})

const upload = multer({ storage: storage, limits: { fileSize: 2.5 * 1024 * 1024 }, fileFilter: imageFilter }).single('file')

route.get('/', validateToken, async (req, res) => {
    let offset = 0
    offset = Number(req.query.pages) * 5;
    let counts = 0
    try {
        const data = await products.findAll({
            offset: offset, limit: 5
        })
        if(isNaN(Number(req.query.total)) || Number(req.query.total) === 0 ) {
            counts = await products.count({})
          } else {
            counts = req.query.total
          }
        return res.json({ message: 'success', data: data, counts: counts })
    } catch (err) {
        console.log('err : ', err)
        return res.json({ message: 'server error' })
    }
})

route.get('/:id', async (req, res) => {
    console.log(req.params.id)
    try {
        const data = await products.findOne({
            where: {
                id: req.params.id
            }
        })
        if(!data) {
            return res.json({ message: 'Record not found' })
        }
        return res.json({ message: 'success', data: data })
    } catch (err) {
        console.log('err : ', err)
        return res.json({ message: 'server error' })
    }
})

route.post('/', validateToken, async (req, res) => {
    try {
        const data = await products.create({ ...req.body })
        const ipaddress = "192.168.100.3:3000"; // Change DNS or IP
        // const ipaddress = "http://159.223.34.75";
        const src = await qr.toDataURL(`${ipaddress}/products/${data.id}/scaned`)
        await data.update(
            {
                qrcode: src,
            }, {
                where: {
                    id: data.id
                }
            }
        )
        return res.json({ message: 'success', data: data })
    } catch (err) {
        console.error(err);
        return res.json({ message: 'Something wrong with generating qrcode or server error' });
    }
})

route.put('/:id', validateToken, async (req, res) => {
    const { data, photo } = req.body
    if(photo) {
        console.log("photo : ", photo)
        imageDelete(photo)
    }
    try {
        await products.update({
            ...data
        },{
            where: {
                id: req.params.id
            }
        })
        return res.json({ message: 'success' })
    } catch (err) {
        console.log("err", err);
        return res.json({ message: "server error" });
    }
})

route.delete('/:id', validateToken, async (req, res) => {
    try {
        const toDelete = await products.findOne({
            where: {
                id: req.params.id
            }
        })
        if(!toDelete) {
            return res.json({ message: "record not found" })
        }
        const data = await products.destroy({
            where: {
                id: req.params.id
            }
        })
        imageDelete(toDelete.photo)
        res.json({ message: 'success' })
    } catch (err) {
        console.log("err", err);
        return res.json({ message: "server error" });
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

module.exports = route