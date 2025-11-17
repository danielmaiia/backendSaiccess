const http = require("http")
const app = require("./app")
const port = process.env.PORT||9000
const server = http.createServer(app)

const db = require("./database")

async function startDB() {
  try {
    await db.initialize();
    server.listen(port, () => {
      console.log('Server running on port:', port);
    });
  } catch (err) {
    console.error('Error initializing server:', err);
  }
}

startDB()