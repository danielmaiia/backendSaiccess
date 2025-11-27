// controller/login.js
const database = require("../database");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");

const JWT_SECRET = "AMmjBeXG4JbWay53i>8+"; // mesmo segredo para login e troca de senha

// LOGIN
exports.AuthUser = async (req, res) => {
  const email = req.body.email;
  const password = req.body.password;

  if (!email) {
    return res.status(400).json({ err: "Usuário inválido" });
  }

  let connection;

  try {
    connection = await database.getConnection();

    const query = `
      SELECT 
        cu.id,
        cu.name,
        cu.email,
        cu.password,
        cu.status,
        NVL(cug.group_id, 0) AS group_id
      FROM CONTROL_USER cu
      LEFT JOIN CONTROL_USER_GROUPS cug ON cug.USER_ID = cu.id
      WHERE cu.email = :email
    `;

    const result = await connection.execute(query, { email });

    const columnNames = result.metaData.map((col) => col.name);
    const rows = result.rows.map((row) => {
      const obj = {};
      columnNames.forEach((name, index) => {
        obj[name.toLowerCase()] = row[index];
      });
      return obj;
    });

    if (rows.length === 0) {
      return res.status(404).json({ err: "Usuário não encontrado" });
    }

    const user = rows[0];

    if (user.status !== 1) {
      return res.status(401).json({ err: "Usuário inativo" });
    }

    const ok = await bcrypt.compare(password, user.password);
    if (!ok) {
      return res.status(401).json({ err: "Senha incorreta" });
    }

    // gera JWT com id + email
    jwt.sign(
      { id: user.id, email: user.email },
      JWT_SECRET,
      { expiresIn: "10h" },
      (err, token) => {
        if (err) {
          console.error("Erro ao gerar token:", err);
          return res.status(400).json({ error: "Error token" });
        }

        // resposta 200 COM JSON (nada de 204)
        return res.status(200).json({
          token,
          id: user.id,
          name: user.name,
          email: user.email,
          group_id: user.group_id,
        });
      }
    );
  } catch (error) {
    console.error("Erro no AuthUser:", error);
    return res.status(500).json({ err: "Erro interno no servidor" });
  }
};

// CADASTRO DE FUNCIONÁRIO
exports.insertFuncionario = async (req, res) => {
  try {
    const connection = await database.getConnection();
    bcrypt.hash(req.body.password, 20, async (err, hash) => {
      if (err) {
        return res
          .status(500)
          .send({ error: "Erro ao gerar o hash da senha." });
      }

      const userInsert = `
        INSERT INTO CONTROL_USER
          (name, email, password, status)
        VALUES
          (:name, :email, :password, :status)
      `;

      const binds = {
        name: req.body.name,
        email: req.body.email,
        password: hash,
        status: 1,
      };

      await connection.execute(userInsert, binds, { autoCommit: true });
      return res.status(201).json({ message: "Success" });
    });
  } catch (error) {
    console.error("Erro no insertFuncionario:", error);
    return res.status(500).send({ error: error.message });
  }
};

// TROCA DE SENHA
exports.changePassword = async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  if (!currentPassword || !newPassword) {
    return res.status(400).json({ error: "Dados inválidos" });
  }

  // pega Authorization: Bearer <token>
  const authHeader = req.headers["authorization"] || "";
  if (!authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Token não informado" });
  }

  const token = authHeader.slice(7); // remove "Bearer "

  let decoded;
  try {
    decoded = jwt.verify(token, JWT_SECRET);
  } catch (err) {
    console.error("Erro ao verificar token:", err);
    return res.status(401).json({ error: "Token inválido ou expirado" });
  }

  const userId = decoded.id;

  let connection;
  try {
    connection = await database.getConnection();

    const selectQuery = `
      SELECT id, password, status
      FROM CONTROL_USER
      WHERE id = :id
    `;

    const result = await connection.execute(selectQuery, { id: userId });

    const columnNames = result.metaData.map((col) => col.name);
    const rows = result.rows.map((row) => {
      const obj = {};
      columnNames.forEach((name, index) => {
        obj[name.toLowerCase()] = row[index];
      });
      return obj;
    });

    if (rows.length === 0) {
      return res.status(404).json({ error: "Usuário não encontrado" });
    }

    const user = rows[0];

    if (user.status !== 1) {
      return res.status(403).json({ error: "Usuário inativo" });
    }

    const ok = await bcrypt.compare(currentPassword, user.password);
    if (!ok) {
      return res.status(401).json({ error: "Senha atual incorreta" });
    }

    const newHash = await bcrypt.hash(newPassword, 20);

    const updateQuery = `
      UPDATE CONTROL_USER
      SET password = :password
      WHERE id = :id
    `;

    await connection.execute(
      updateQuery,
      { password: newHash, id: user.id },
      { autoCommit: true }
    );

    return res.status(200).json({ message: "Senha alterada com sucesso" });
  } catch (error) {
    console.error("Erro ao trocar senha:", error);
    return res.status(500).json({ error: "Erro ao trocar senha" });
  }
};
