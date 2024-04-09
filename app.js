const express = require('express')
const path = require('path')
const {open} = require('sqlite')
const sqlite3 = require('sqlite3')
const bcrypt = require('bcrypt')
const jwt = require('jsonwebtoken')

const app = express()
app.use(express.json())

const dbPath = path.join(__dirname, 'covid19IndiaPortal.db')

let database = null
const initializaDBAndServer = async () => {
  try {
    database = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    })
    app.listen(3000, () => {
      console.log('Server running at http://localhost:3000/')
    })
  } catch (e) {
    console.log(`error ${e.massege}`)
    process.exit(1)
  }
}

initializaDBAndServer()

const Authentication = (request, response, next) => {
  let jwtToken
  const authhearder = request.hearders['authentication']
  if (authhearder !== undefined) {
    jwtToken = authhearder.split(' ')[1]
  }
  if (jwtToken === undefined) {
    response.status(401)
    response.send('Invalid JWT Token')
  } else {
    jwt.verify(jwtToken, 'screct_token', async (error, payload) => {
      if (error) {
        response.status(401)
        response.send('Invalid JWT Token')
      } else {
        console.log(payload)
        next()
      }
    })
  }
}
app.post('/login/', async (request, response) => {
  const {username, password} = request.body
  const selectusrQuery = `SELECT * FROM user WHERE username='${username}';`
  const dbuser = await database.get(selectusrQuery)
  if (dbuser === undefined) {
    response.status(400)
    response.send('Invalid user')
  } else {
    const isposswordMatch = await bcrypt.compare(password, dbuser.password)
    if (isposswordMatch === true) {
      const payload = {username: username}
      let jwtToken = jwt.sign(payload, 'screct_token')
      response.send({jwtToken})
    } else {
      response.status(400)
      response.send('Invalid password')
    }
  }
})

app.get('/states/', Authentication, async (request, response) => {
  console.log('Inset get book API')
  const getstaatesQuery = `
  SELECT 
  state_id AS stateId,
  state_name AS stateName,
  population
  FROM state;
  `
  const statesall = await database.all(getstaatesQuery)
  response.send(statesall)
})

app.get('/states/:stateId/', Authentication, async (request, response) => {
  const {stateId} = request.params
  const getstaatesQuery = `
  SELECT
  state_id AS stateId,
  state_name AS stateName,
  population
  FROM state
  WHERE
  state_id = '${stateId}';
  `
  const getstate = await database.get(getstaatesQuery)

  response.send(getstate)
})

app.post('/districts/', async (request, response) => {
  const {districtName, stateId, cases, cured, active, deaths} = request.body
  const postdistrictQuery = `
  INSERT INTO 
  district (district_name, state_id, cases, cured, active, deaths)
  VALUES
  (
    '${districtName}','${stateId}','${cases}','${cured}','${active}','${deaths}'
  );
  `
  await database.run(postdistrictQuery)
  response.send('District Successfully Added')
})

app.get(
  '/districts/:districtId/',
  Authentication,
  async (request, response) => {
    const {districtId} = request.params
    const getdistrictQuery = `
  SELECT 
  district_id AS districtId,
  district_name AS districtName,
  state_id AS stateId,
  cases,
  cured,
  active,
  deaths
  FROM district
  WHERE district_id= ${districtId};
  `
    const dbresponse = await database.get(getdistrictQuery)
    response.send(dbresponse)
  },
)

app.delete('/districts/:districtId/', async (request, response) => {
  const {districtId} = request.params
  const deletedistrictQuery = `
  SELECT *
  FROM district
  WHERE 
  district_id = '${districtId}';
  `
  await database.run(deletedistrictQuery)
  response.send('District Removed')
})

app.put('/districts/:districtId/', async (request, response) => {
  const {districtId} = request.params
  const {districtName, stateId, cases, cured, active, deaths} = request.body
  const putdistrictQuery = `
  UPDATE
  district
  SET
  district_name='${districtName}',
  state_id=${stateId},
  cases=${cases},
  cured=${cured},
  active=${active},
  deaths=${deaths}
  WHERE 
  district_id = ${districtId};
  `
  await database.run(putdistrictQuery)
  response.send('District Details Updated')
})

app.get('/states/:stateId/stats/', async (request, response) => {
  const {stateId} = request.params
  const gettotal = `
  SELECT 
  SUM(cases) AS totalCases,
  SUM(cured) AS totalCured,
  SUM(active) AS totalCured,
  SUM(deaths) AS totalDeaths
  FROM district
  WHERE state_id = ${stateId};
  `
  const dbresponse = await database.all(gettotal)
  response.send(dbresponse)
})
module.exports = app
