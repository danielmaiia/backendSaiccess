const { GoogleGenerativeAI } = require('@google/generative-ai');
require('dotenv').config();

const API_KEY = process.env.API_KEY_GOOGLE;

exports.agentAI = async (req, res) => {
if (!API_KEY) {
  process.exit(1);
}

const genAI = new GoogleGenerativeAI(API_KEY);

  const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
  const prompt = req.body.prompt;

  try {
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    console.log(text);
    return res.status(200).json(text)
  } catch (error) {
    console.error('Erro na requisição:', error?.message || error);
  }
}

exports.registerAgent = async (req, res) => {
     try{
         connection = await database.getConnection();
         const result = await connection.execute(
          `SELECT 
           aa.ID, 
           aa.SUGGESTION_DATE, 
           aa.TEXT   
           FROM AGENT_AI aa `
         )
         const columnNames = result.metaData.map(col => col.name);
         const processedRows = result.rows.map(row => {
             const obj = {};
             columnNames.forEach((name, index) => {
                 obj[name.toLowerCase()] = row[index];
             });
             return obj;
             });
         return res.status(200).json(processedRows)
     }catch(e){
         return e
     }finally {
     if(connection) {
       try {
         await connection.close();
       } catch (err) {
         return err
       }
     }
   }
 }