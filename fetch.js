const fetch = require('node-fetch')
const { URL, URLSearchParams } = require('url')
const fs = require('fs')
const path = require('path')

const nationalities = require('./nationalities.js')

const WDQS_ENDPOINT = 'https://query.wikidata.org/bigdata/namespace/wdq/sparql'


async function main() {
  console.log('Running persons.sparql...')
  const personsSparql = fs.readFileSync(
    path.resolve(__dirname, 'persons.sparql'),
    { encoding: 'utf-8' },
  )
  const persons = await query(personsSparql, nationalities)

  console.log('Running relatives.sparql...')
  const relativesSparql = fs.readFileSync(
    path.resolve(__dirname, 'relatives.sparql'),
    { encoding: 'utf-8' },
  )
  const relatives = await query(relativesSparql, nationalities)

  console.log('Running relatives-indirect.sparql...')
  const relativesIndirectSparql = fs.readFileSync(
    path.resolve(__dirname, 'relatives-indirect.sparql'),
    { encoding: 'utf-8' },
  )
  const relativesIndirect = await query(relativesIndirectSparql, nationalities)

  console.log('Writing raw-persons.csv...')
  fs.writeFileSync(
    path.resolve(__dirname, 'data', 'raw-persons.csv'),
    persons,
  )

  console.log('Writing raw-relatives.csv...')
  fs.writeFileSync(
    path.resolve(__dirname, 'data', 'raw-relatives.csv'),
    relatives,
  )

  console.log('Writing raw-relatives-indirect.csv...')
  fs.writeFileSync(
    path.resolve(__dirname, 'data', 'raw-relatives-indirect.csv'),
    relativesIndirect,
  )

  console.log('Done!')
}

async function query(sparql, nationalities) {
  const queries = nationalities.map((n) => queryOne(sparql.replace('{{NATIONALITY}}', n)))
  return (await Promise.all(queries)).flat()
}

async function queryOne(sparql) {
  const url = new URL(WDQS_ENDPOINT)
  url.search = new URLSearchParams({ query: sparql })
  const res = await fetch(url, { headers: { Accept: 'text/csv' } })
  const text = await res.text()

  if (res.status !== 200) {
    console.log(res.status)
    console.log(text)
    throw new Error()
  }

  return text
}

main().then()
