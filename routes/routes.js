const express = require("express")
const router = express.Router()
const controller = require("../controller/controller")

router.get("/user", controller.user)
router.get("/all-user", controller.allUser)
router.get("/permission-for-group", controller.permissionsForGroup)


module.exports = router