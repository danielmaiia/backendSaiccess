const express = require('express')
const router = express.Router()
const multer = require('multer')
const upload = multer()

const agentController = require('../controller/ia-server');
const openAIController = require('../controller/ia-agent');

// Rotas para Google Gemini
router.post('/ia-server', agentController.agentAI)
router.get('/register-agent', agentController.registerAgent)

// Rota para análise de CSV com Gemini 
router.post('/ia-analyze-csv', upload.single('file'), openAIController.analyzeCsvWithGemini)

module.exports = router