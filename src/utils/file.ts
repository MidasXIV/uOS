import dateFormat from 'dateformat'
import fs, {PathLike} from 'node:fs'
import os from 'node:os'
import path from 'node:path'
const homedir = os.homedir()

export const dir = `${homedir}/uOS_logs`
export const projectsFilePath = `${dir}/projects.json`

export const timeStamp = () => {
  const now = new Date()
  return dateFormat(now, 'HH:MM')
}

export const writeLineToCurrentFile = (line, type: null | string = null) => {
  const lineWithEOL = line + os.EOL
  const filePath = getCurrentFilePath()

  fs.mkdir(dir, {recursive: true}, (err) => {
    if (err) console.log(err)
  })

  if (line) {
    fs.appendFile(filePath, lineWithEOL, (err) => {
      if (err) console.log(`🤖 Something went wrong`)

      console.log(`👏 Logged to ${filePath}`)
      console.log('🧠', getRandomQuote())
    })

    // If it's a quote then also write to a dedicated file
    // for easier access later.
    if (type && type === 'quote') {
      fs.appendFile(`${dir}/atm_quotes.txt`, lineWithEOL, (err) => {
        if (err) console.log(`🤖 Something went wrong`)
        console.log(`🧠 I'll also remember this quote for you!`)
      })
    }
  }
}

export const getLastXFilePaths = (x = 7) => {
  const result: PathLike[] = []

  for (let i = 0; i < x; i++) {
    const d = new Date()
    d.setDate(d.getDate() - i)
    const fileName = dateFormat(d, 'dd-mm-yyyy')
    const filePath = `${dir}/${fileName}.txt`

    result.push(filePath)
  }

  return result
}

export const getCurrentFilePath = () => {
  const now = new Date()
  const fileName = dateFormat(now, 'dd-mm-yyyy')
  const filePath = `${dir}/${fileName}.txt`

  return filePath
}

const getRandomQuote = () => {
  const filePath = `${dir}/atm_quotes.txt`

  if (!fs.existsSync(filePath)) {
    return
  }

  const rawQuotes = fs.readFileSync(filePath).toString('utf8')
  const quotes = rawQuotes.split(os.EOL)
  const quoteString = quotes[Math.floor(Math.random() * quotes.length)]
  const quote = quoteString.split('|').pop()

  return quote
}

export const readProjectsFile = async () => {
  try {
    const data = fs.readFileSync(projectsFilePath).toString('utf8')
    return JSON.parse(data)
  } catch (error: any) {
    if (error.code === 'ENOENT') {
      // File doesn't exist, create an empty one
      fs.writeFileSync(projectsFilePath, '[]', 'utf8')
      return []
    }

    // Handle other errors
    console.error('Error reading projects file:', error.message)
    return null
  }
}

const createBackup = (filePath) => {
  const backupDir = path.join(path.dirname(filePath), 'backups')
  const timestamp = dateFormat(new Date(), 'yyyy-mm-dd_HH-MM-ss')
  const backupFileName = `projects.backup.${timestamp}.json`
  const backupPath = path.join(backupDir, backupFileName)

  try {
    // Ensure the backup directory exists
    fs.mkdirSync(backupDir, {recursive: true})

    // Copy the current file to the backup path
    fs.copyFileSync(filePath, backupPath)

    console.log(`Backup created: ${backupPath}`)
  } catch (error: any) {
    console.error('Error creating backup:', error.message)
  }
}

export const updateProjectsFile = async (newData) => {
  try {
    // Create a backup before overwriting
    createBackup(projectsFilePath)

    // Write the new data to the file
    fs.writeFileSync(projectsFilePath, JSON.stringify(newData, null, 2), 'utf8')

    console.log('Projects file updated successfully!')
  } catch (error: any) {
    console.error('Error updating projects file:', error.message)
  }
}
