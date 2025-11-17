const express = require("express")
const app = express()
const bodyParser = require("body-parser")
const cors = require('cors')

const routeApi = require("./routes/routes")
const routeAuth = require("./routes/login")
const routeAgent = require("./routes/agent")

app.use(bodyParser.urlencoded({extended:true}))
app.use(bodyParser.json())
app.use(cors());

app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'PUT, POST, PATCH, DELETE, GET');
    res.header('Access-Control-Allow-Headers','Origin, X-Request-With, Content-Type, Accept, Authorization');
    next();
});


app.use("/api",routeApi)
app.use("/auth", routeAuth)
app.use("/agent", routeAgent)


module.exports = app