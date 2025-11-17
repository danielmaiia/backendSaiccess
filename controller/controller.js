const database = require("../database")

exports.user = async (req, res) =>{
   var email = req.body.email
    try{
        connection = await database.getConnection();
        const result = await connection.execute(
             `
           SELECT 
            cu.id,
            cu.name,
            cu.email,
            cug.group_id 
            FROM CONTROL_USER cu
            INNER JOIN CONTROL_USER_GROUPS cug ON cug.USER_ID = cu.id
            WHERE cu.email = '${email}'
        `
        )
        return res.status(200).send(result)
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



exports.allUser = async (req, res) =>{
    try{
        connection = await database.getConnection();
        const result = await connection.execute(
             `
           SELECT 
            cu.id,
            cu.name,
            cu.email,
            cu.status,
            NVL(cug.group_id, 0) as group_id,
            cg.name as group_name
            FROM CONTROL_USER cu
            LEFT JOIN CONTROL_USER_GROUPS cug ON cug.USER_ID = cu.id
            LEFT JOIN CONTROL_GROUP cg ON cg.id = cug.group_id
        `
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




exports.permissionsForGroup = async (req, res) =>{
    try{
        connection = await database.getConnection();
        const result = await connection.execute(
             `
 	    		SELECT 
            cp.id,
            cg.name AS group_name,
           	cp.NAME AS permission_name,
           	cp.DESCRIPTION 
            FROM CONTROL_GROUP cg
            INNER JOIN CONTROL_GROUP_PERMISSION cgp ON cgp.GROUP_ID = cg.id
            INNER JOIN CONTROL_PERMISSION cp ON cgp.PERMISSION_ID = cp.ID 
        `
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
