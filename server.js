// server.js
const express = require('express');
const mssql = require('mssql');
const cors = require('cors'); // Importa el paquete cors
const bodyParser = require('body-parser'); // Importa body-parser

const app = express();
const PORT = process.env.PORT || 3000;

app.use(bodyParser.json());

app.use(cors());

// Configuración de la conexión a la base de datos
const dbConfig = {
  user: 'CloudSA365db3f2',
  password: 'Andresrozo#1',
  server: 'proyectoudistrital.database.windows.net',
  database: 'preferencias',
  options: {
    encrypt: true, // Habilita el cifrado
    trustServerCertificate: false // Deshabilita la confianza en el certificado del servidor
  }
};

// Conectar a la base de datos y crear la tabla si no existe
async function connectToDatabase() {
  try {
    await mssql.connect(dbConfig);
    console.log('Connected to the database successfully!');

    // Verificar si la tabla existe
    const tableExists = await mssql.query(`SELECT OBJECT_ID('listadistribucion', 'U') AS table_id`);
    if (!tableExists.recordset[0].table_id) {
      // La tabla no existe, así que la creamos
      await mssql.query(`
        CREATE TABLE listadistribucion (
          id INT IDENTITY(1,1) PRIMARY KEY,
          name NVARCHAR(100),
          
        )
      `);
      console.log('Table "preferencias" created successfully!');
    }
  } catch (error) {
    console.error('Error connecting to the database:', error);
  }
}

connectToDatabase();

// Definir rutas para la API REST
app.get('/api/preferencias', async (req, res) => {
  try {
    const result = await mssql.query('SELECT * FROM preferencias');
    res.json(result.recordset);
  } catch (error) {
    console.error('Error querying the database:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// TRAE LAS LISTAS DE DISTRIBUCION PARA SER MOSTRADA EN LOS CHECKBOXES

app.get('/api/listas', async (req, res) => {
  try {
    const result = await mssql.query('SELECT * FROM listadistribucion');
    res.json(result.recordset);
  } catch (error) {
    console.error('Error querying the database:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});


// METODO PARA INSERTAR O ACTUALIZAR LAS PREFERENCIAS DE UN USUARIO

app.post('/api/preferencias', async (req, res) => {
  try {
    const { idprofile, name, email, preferencias } = req.body;

    // Verificar si ya existen preferencias para el idprofile actual
    const existingRecord = await mssql.query(`
      SELECT preferencia FROM preferencias WHERE idprofile = '${idprofile}'
    `);

    let newPreferences = preferencias;

    if (existingRecord.recordset.length > 0) {
      // Si ya existen preferencias, las combinamos con las nuevas
      const existingPreferences = JSON.parse(existingRecord.recordset[0].preferencia);
      newPreferences = { ...existingPreferences, ...preferencias };

      // Actualizamos las preferencias combinadas
      await mssql.query(`
        UPDATE preferencias 
        SET name = '${name}', email = '${email}', preferencia = '${JSON.stringify(newPreferences)}'
        WHERE idprofile = '${idprofile}'
      `);
    } else {
      // Si no existen preferencias, insertamos las nuevas
      await mssql.query(`
        INSERT INTO preferencias (idprofile, name, email, preferencia)
        VALUES ('${idprofile}', '${name}', '${email}', '${JSON.stringify(newPreferences)}')
      `);
    }

    res.status(200).json({ message: 'Preferencias guardadas exitosamente' });
  } catch (error) {
    console.error('Error al guardar preferencias:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// VERIFICA SI EL ID YA ESTA REGISTRADO EN LA BD PARA ACTUALIZAR O CREAR NUEVOS REGISTROS.

app.get('/api/preferencias/:idProfile/exists', async (req, res) => {
  try {
    const { idProfile } = req.params;
    const result = await mssql.query(`SELECT TOP 1 * FROM preferencias WHERE idprofile = '${idProfile}'`);
    res.json(result.recordset.length > 0);
  } catch (error) {
    console.error('Error querying the database:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});


// TRAER LAS PREFERENCIAS DEL USUARIO ACTUALMENTE LOGUEADO

app.get('/api/preferencias/:idProfile', async (req, res) => {
  try {
    const { idProfile } = req.params;
    const result = await mssql.query(`SELECT preferencia FROM preferencias WHERE idprofile = '${idProfile}'`);
    res.json(result.recordset);
  } catch (error) {
    console.error('Error querying the database:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

//TRAE LOS EMAIL DE LOS USUARIOS COMPARANDO EL ID Y LA PREFERENCIA. 

app.get('/api/preferencias/:preferencia/email', async (req, res) => {
  try {
    const { preferencia } = req.params;
    // Dividir el parámetro de preferencia en un array
    const preferencias = preferencia.split(',');
    // Construir la consulta SQL con una cláusula WHERE que use LIKE
    const query = `SELECT email FROM preferencias WHERE preferencia LIKE '%${preferencias[0]}%'`;
    // Ejecutar la consulta SQL
    const result = await mssql.query(query);
    res.json(result.recordset);
  } catch (error) {
    console.error('Error querying the database:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});


app.post('/api/notification-permission', async (req, res) => {
  try {
    const { userid, token } = req.body;

    // Insertar el token sin comprobar si ya existe un registro
    const result = await mssql.query(`
      INSERT INTO tokens (userId, token)
      VALUES ('${userid}', '${token}')
    `);

    res.status(200).json({ message: 'Token FCM guardado exitosamente' });
  } catch (error) {
    console.error('Error al guardar el token FCM:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

app.get('/api/token/:preferencia/tokens', async (req, res) => {
  try {
    const { preferencia } = req.params;
    // Dividir el parámetro de preferencia en un array
    const preferencias = preferencia.split(',');
    // Construir la consulta SQL con una cláusula WHERE que use LIKE
    const query = `
    select t.token  
    from dbo.tokens t 
    join  dbo.preferencias p 
    on p.idprofile= t.userId
    where p.preferencia LIKE '%${preferencias[0]}%'`;
    // Ejecutar la consulta SQL
    const result = await mssql.query(query);
    res.json(result.recordset);
  } catch (error) {
    console.error('Error querying the database:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});


// Iniciar el servidor
app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});

