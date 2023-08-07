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
  pool.query('CREATE TABLE IF NOT EXISTS ${{ values.db_name }} (ID SERIAL PRIMARY KEY, name VARCHAR(30), email VARCHAR(30) );', (error, results) => {
    if (error) {
      console.error('Error: ', error);
    } else {
      console.log(`Created ${{ values.db_name }} table.  Results: ${JSON.stringify(results)}`)
    }
  })
}

// Get all ${{ values.db_object_name }}s
const get${{ values.db_object_name | capitalize }}s = (request, response) => {
  pool.query('SELECT * FROM ${{ values.db_name }} ORDER BY id ASC', (error, results) => {
    if (error) {
      console.error('Error: ', error);
      response.status(500).json({error: JSON.stringify(error)});
    } else {
      response.status(200).json(results.rows)
    }
  })
}

// Get a single ${{ values.db_object_name }} by id
const get${{ values.db_object_name | capitalize }}ById = (request, response) => {
  const id = parseInt(request.params.id)

  pool.query('SELECT * FROM ${{ values.db_name }} WHERE id = $1', [id], (error, results) => {
    if (error) {
      console.error('Error: ', error);
      response.status(500).json({error: JSON.stringify(error)});
    } else {
      response.status(200).json(results.rows)
    }
  })
}

// Create a new ${{ values.db_object_name }}
const create${{ values.db_object_name | capitalize }} = (request, response) => {
  const { name, email } = request.body

  pool.query('INSERT INTO ${{ values.db_name }} (name, email) VALUES ($1, $2) RETURNING *', [name, email], (error, results) => {
    if (error) {
      console.error('Error: ', error);
      response.status(500).json({error: JSON.stringify(error)});
    } else {
      response.status(201).send(`${{ values.db_object_name | capitalize }} added with ID: ${results.rows[0].id}`)
    }
  })
}

// Update an existing ${{ values.db_object_name }}
const update${{ values.db_object_name | capitalize }} = (request, response) => {
  const id = parseInt(request.params.id)
  const { name, email } = request.body

  pool.query(
    'UPDATE ${{ values.db_name }} SET name = $1, email = $2 WHERE id = $3',
    [name, email, id],
    (error, results) => {
      if (error) {
        console.error('Error: ', error);
        response.status(500).json({error: JSON.stringify(error)});
      } else {
        response.status(200).send(`${{ values.db_object_name | capitalize }} modified with ID: ${id}`)
      }
    }
  )
}

// Delete a ${{ values.db_object_name }}
const delete${{ values.db_object_name | capitalize }} = (request, response) => {
  const id = parseInt(request.params.id)

  pool.query('DELETE FROM ${{ values.db_name }} WHERE id = $1', [id], (error, results) => {
    if (error) {
      console.error('Error: ', error);
      response.status(500).json({error: JSON.stringify(error)});
    } else {
      response.status(200).send(`${{ values.db_object_name | capitalize }} deleted with ID: ${id}`)
    }
  })
}

module.exports = {
  createTable,
  get${{ values.db_object_name | capitalize }}s,
  get${{ values.db_object_name | capitalize }}ById,
  create${{ values.db_object_name | capitalize }},
  update${{ values.db_object_name | capitalize }},
  delete${{ values.db_object_name | capitalize }},
}