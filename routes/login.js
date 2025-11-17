const express = require('express')
const router = express.Router()

const loginController = require('../controller/login');

router.post('/login/user', loginController.AuthUser)
router.post('/insert/user', loginController.insertFuncionario) 


module.exports = router