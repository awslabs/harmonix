// Get and parse secret information
const secrets = JSON.parse(process.env.RDS_CREDS);
const user = secrets.username;
const host = secrets.host;
const database = secrets.dbname;
const password = secrets.password;
const port = +secrets.port || 5432;


console.log(`pg configuration: user: ${user}, host: ${host}, database: ${database}, port: ${port}`);


const Pool = require('pg').Pool;
const pool = new Pool({ user, host, database, password, port });

const createTable = () => {
  pool.query('CREATE TABLE IF NOT EXISTS ${{ values.dbName }} (ID SERIAL PRIMARY KEY, name VARCHAR(30), email VARCHAR(30) );', (error, results) => {
    if (error) {
      console.error('Error: ', error);
    } else {
      console.log(`Created ${{ values.dbName }} table.  Results: ${JSON.stringify(results)}`)
    }
  })
}

// Get all ${{ values.dbObjectName }}s
const get${{ values.dbObjectName | capitalize }}s = (request, response) => {
  pool.query('SELECT * FROM ${{ values.dbName }} ORDER BY id ASC', (error, results) => {
    if (error) {
      console.error('Error: ', error);
      response.status(500).json({error: JSON.stringify(error)});
    } else {
      response.status(200).json(results.rows)
    }
  })
}

// Get a single ${{ values.dbObjectName }} by id
const get${{ values.dbObjectName | capitalize }}ById = (request, response) => {
  const id = parseInt(request.params.id)

  pool.query('SELECT * FROM ${{ values.dbName }} WHERE id = $1', [id], (error, results) => {
    if (error) {
      console.error('Error: ', error);
      response.status(500).json({error: JSON.stringify(error)});
    } else {
      response.status(200).json(results.rows)
    }
  })
}

// Create a new ${{ values.dbObjectName }}
const create${{ values.dbObjectName | capitalize }} = (request, response) => {
  const { name, email } = request.body

  pool.query('INSERT INTO ${{ values.dbName }} (name, email) VALUES ($1, $2) RETURNING *', [name, email], (error, results) => {
    if (error) {
      console.error('Error: ', error);
      response.status(500).json({error: JSON.stringify(error)});
    } else {
      response.status(201).send(`${{ values.dbObjectName | capitalize }} added with ID: ${results.rows[0].id}`)
    }
  })
}

// Update an existing ${{ values.dbObjectName }}
const update${{ values.dbObjectName | capitalize }} = (request, response) => {
  const id = parseInt(request.params.id)
  const { name, email } = request.body

  pool.query(
    'UPDATE ${{ values.dbName }} SET name = $1, email = $2 WHERE id = $3',
    [name, email, id],
    (error, results) => {
      if (error) {
        console.error('Error: ', error);
        response.status(500).json({error: JSON.stringify(error)});
      } else {
        response.status(200).send(`${{ values.dbObjectName | capitalize }} modified with ID: ${id}`)
      }
    }
  )
}

// Delete a ${{ values.dbObjectName }}
const delete${{ values.dbObjectName | capitalize }} = (request, response) => {
  const id = parseInt(request.params.id)

  pool.query('DELETE FROM ${{ values.dbName }} WHERE id = $1', [id], (error, results) => {
    if (error) {
      console.error('Error: ', error);
      response.status(500).json({error: JSON.stringify(error)});
    } else {
      response.status(200).send(`${{ values.dbObjectName | capitalize }} deleted with ID: ${id}`)
    }
  })
}

module.exports = {
  createTable,
  get${{ values.dbObjectName | capitalize }}s,
  get${{ values.dbObjectName | capitalize }}ById,
  create${{ values.dbObjectName | capitalize }},
  update${{ values.dbObjectName | capitalize }},
  delete${{ values.dbObjectName | capitalize }},
}