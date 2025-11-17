const oracledb = require('oracledb');
require('dotenv').config();

const dbConfig = {
    user:process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    connectString: process.env.DB_HOST,
    poolMin: 10,
    poolMax: 10,
    poolIncrement: 0
};

// Inicializa o pool de conexões
let pool;

async function initialize() {
  try {
    pool = await oracledb.createPool(dbConfig);
    console.log('Database connected');
  } catch (err) {
    console.error('Error connection:', err);
    process.exit(1); 
  }
}

// Exporta a função da conexão
async function getConnection() {
    try {
        const connection = await pool.getConnection();
        return connection;
    } catch (err) {
        throw err;
    }
}

// Exporta a função para fechar o pool quando a aplicação for encerrada
async function closePoolAndExit() {
    console.log('Fechando o pool de conexões...');
    try {
        await pool.close(10);
        console.log('Pool de conexões fechado.');
        process.exit(0);
    } catch (err) {
        console.error('Erro ao fechar o pool:', err);
        process.exit(1);
    }
}

module.exports = {
    initialize,
    getConnection,
    closePoolAndExit
};