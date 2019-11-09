const fs = require('fs')
const createCsvWriter = require('csv-writer').createObjectCsvWriter
const csvParser = require('csv-parser')
const path = require('path')


async function main() {
  // Read raw data
  let raw = []
  raw = raw.concat(await readCsv(path.resolve(__dirname, 'data', 'raw-relatives.csv')))
  raw = raw.concat(await readCsv(path.resolve(__dirname, 'data', 'raw-relatives-indirect.csv')))
  raw = raw.concat(await readCsv(path.resolve(__dirname, 'data', 'raw-persons.csv')))
  raw = raw.map(simplifyPerson)

  // Normalize
  const persons = new Map()
  const nationalities = new Map()
  const person2person = []
  const person2nationality = []

  raw.forEach((d) => {
    persons.set(d.key, [d.key, d.name, d.gender, d.birthdate, d.deathdate])
  })
  raw.forEach((d) => {
    if (d.invReltype) {
      const a = persons.get(d.key)
      const b = persons.get(d.relative)
      const { invReltype } = d
      const reltype = inverseReltype(a, b, invReltype)
      person2person.push([d.key, d.relative, reltype])
      person2person.push([d.relative, d.key, invReltype])
    }
    if (d.nationalityKey) {
      nationalities.set(
        d.nationalityKey,
        [d.nationalityKey, d.nationalityLabel],
      )
      person2nationality.push([d.key, d.nationalityKey])
    }
  })

  // Save CSVs
  await writeCsv(
    path.resolve(__dirname, 'data', 'persons.csv'),
    ['key', 'name', 'gender', 'birthdate', 'deathdate'],
    sort(Array.from(persons.values())),
  )
  await writeCsv(
    path.resolve(__dirname, 'data', 'nationalities.csv'),
    ['key', 'name'],
    sort(Array.from(nationalities.values())),
  )
  await writeCsv(
    path.resolve(__dirname, 'data', 'person2person.csv'),
    ['a', 'b', 'reltype'],
    unique(sort(person2person)),
  )
  await writeCsv(
    path.resolve(__dirname, 'data', 'person2nationality.csv'),
    ['person', 'nationality'],
    unique(sort(person2nationality)),
  )
}

function readCsv(filename) {
  return new Promise((resolve) => {
    const data = []
    fs.createReadStream(filename)
      .pipe(csvParser())
      .on('data', (d) => data.push(d))
      .on('end', () => resolve(data))
  })
}

function sort(rows) {
  return rows.sort((a, b) => {
    const aKey = a.join('\t')
    const bKey = b.join('\t')
    if (aKey === bKey) return 0
    return aKey > bKey ? 1 : -1
  })
}

function unique(rows) {
  if (rows.length === 0) return []

  const result = [rows[0]]
  for (let i = 1; i < rows.length; i += 1) {
    const last = result[result.length - 1]
    const cur = rows[i]
    if (last.join('\t') !== cur.join('\t')) result.push(cur)
  }
  return result
}

async function writeCsv(fullpath, header, rows) {
  await createCsvWriter({
    path: fullpath,
    header: header.map((x) => ({ id: x, title: x })),
  }).writeRecords(rows.map((r) => {
    const map = {}
    r.forEach((d, i) => { map[header[i]] = d })
    return map
  }))
}

function simplifyPerson(row) {
  return {
    key: simplifyUriEntity(row.human),
    name: row.humanLabel,
    nationalityKey: simplifyUriEntity(row.nationality),
    nationalityLabel: row.nationalityLabel,
    gender: simplifyGender(row.gender),
    birthdate: simplifyDate(row.birthdate),
    deathdate: simplifyDate(row.deathdate),
    educationKey: simplifyUriEntity(row.education),
    educationLabel: row.educationLabel,
    relative: simplifyUriEntity(row.relative),
    invReltype: simplifyReltype(row.invReltype),
  }
}

function simplifyUriEntity(field) {
  try {
    return field ? field.match(/^https?:\/\/.+?\/([QP]\d+)$/)[1] : null
  } catch (e) {
    console.log(e.message)
    console.log(field)
    return null
  }
}

function simplifyDate(field) {
  try {
    return field ? field.match(/^(\d\d\d\d)-(\d\d)-(\d\d).*$/).slice(1, 4).join('') : null
  } catch (e) {
    console.log(e.message)
    console.log(field)
    return null
  }
}

function simplifyGender(field) {
  const qid = simplifyUriEntity(field)
  if (qid === null) return null
  if (qid === 'Q6581097') return 'm'
  if (qid === 'Q6581072') return 'f'
  if (qid === 'Q1052281') return 'tf'
  if (qid === 'Q2449503') return 'tm'

  console.log(`Unknown gender: ${qid}`)
  console.log(field)
  return null
}

function simplifyReltype(field) {
  const qid = simplifyUriEntity(field)
  if (qid === null) return null
  if (qid === 'P22') return 'father'
  if (qid === 'P25') return 'mother'
  if (qid === 'P26') return 'spouse'
  if (qid === 'P40') return 'child'
  if (qid === 'P3373') return 'sibling'
  if (qid === 'Q31184') return 'sibling'
  if (qid === 'Q9238344') return 'grandfather'
  if (qid === 'Q9235758') return 'grandmother'

  console.log(`Unknown reltype: ${qid}`)
  console.log(field)
  return null
}

function inverseReltype(a, b, reltype) {
  if (reltype === 'father') {
    return 'child'
  }
  if (reltype === 'grandfather') {
    return 'grandchild'
  }
  if (reltype === 'mother') {
    return 'child'
  }
  if (reltype === 'grandmother') {
    return 'grandchild'
  }
  if (reltype === 'child') {
    return (a.gender === 'm' || a.gender === 'tm') ? 'father' : 'mother'
  }
  if (reltype === 'grandchild') {
    return (a.gender === 'm' || a.gender === 'tm') ? 'grandfather' : 'grandmother'
  }
  return reltype
}

main().then()
