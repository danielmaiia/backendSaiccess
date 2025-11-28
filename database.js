const oracledb = require('oracledb');
require('dotenv').config();

const dbConfig = {
    user:process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    connectString: process.env.DB_HOST,
    };

// Inicializa o pool de conexões
let pool;// Apenas testa uma conexão quando o servidor sobe
async function initialize() {
  let conn;  // <- isso estava faltando!
  try {
    conn = await oracledb.getConnection(dbConfig);
    console.log("Database connected (single connection test)");
  } catch (err) {
    console.error("Error connection:", err);
    process.exit(1);
  } finally {
    if (conn) {
      try {
        await conn.close();
      } catch (err) {
        console.error("Erro ao fechar conexão inicial:", err);
      }
    }
  }
}
// Exporta a função da conexão
async function getConnection() {
  return await oracledb.getConnection(dbConfig);
}

// Exporta a função para fechar o pool quando a aplicação for encerrada
async function closePoolAndExit() {
    console.log('Fechando o pool de conexões...');
    console.log('Pool de conexões fechado.');
    process.exit(0);
}

module.exports = {
    initialize,
    getConnection,
    closePoolAndExit
};