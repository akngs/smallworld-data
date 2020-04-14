const fetch = require('node-fetch')
const { URL, URLSearchParams } = require('url')
const fs = require('fs')
const path = require('path')

const WDQS_ENDPOINT = 'https://query.wikidata.org/bigdata/namespace/wdq/sparql'

async function main() {
  console.log('Running sparql queries...')
  const [persons, relatives, relativesIndirect] = await Promise.all([
    query(loadQuery('persons')),
    query(loadQuery('relatives')),
    query(loadQuery('relatives-indirect')),
  ])

  console.log('Writing raw csvs...')
  writeRawCsv('persons', persons)
  writeRawCsv('relatives', relatives)
  writeRawCsv('relatives-indirect', relativesIndirect)
}

function loadQuery(name) {
  return fs.readFileSync(path.resolve(__dirname, `${name}.sparql`), {
    encoding: 'utf-8',
  })
}

function writeRawCsv(name, content) {
  fs.writeFileSync(
    path.resolve(__dirname, 'data', `raw-${name}.csv`),
    content,
  )
}

async function query(sparql) {
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
