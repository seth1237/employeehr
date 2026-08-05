import { exec } from 'child_process'
import { promisify } from 'util'
import fs from 'fs'
import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const serverRoot = path.resolve(__dirname, '../..')

dotenv.config({ path: path.join(serverRoot, '.env') })

const execAsync = promisify(exec)

function requireMysqlUrl() {
  if (!process.env.MYSQL_DATABASE_URL?.trim()) {
    throw new Error(
      'MYSQL_DATABASE_URL is not set. Add it to server/.env (see server/.env.example).',
    )
  }
}

function listMigrationNames() {
  const migrationsDir = path.join(serverRoot, 'prisma/migrations')
  if (!fs.existsSync(migrationsDir)) return []
  return fs
    .readdirSync(migrationsDir, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name)
    .sort()
}

function isPrismaP3005(error) {
  const text = `${error?.stderr || ''}\n${error?.stdout || ''}\n${error?.message || ''}`
  return text.includes('P3005') || text.includes('schema is not empty')
}

async function baselineExistingDatabase(execOpts) {
  const names = listMigrationNames()
  if (names.length === 0) {
    console.warn('⚠️ No migrations found to baseline')
    return false
  }

  console.warn(
    '⚠️ MySQL already has tables but no Prisma migration history (P3005). Baselining...',
  )

  for (const name of names) {
    console.log(`📌 Marking migration as applied: ${name}`)
    await execAsync(`npx prisma migrate resolve --applied "${name}"`, execOpts)
  }

  return true
}

export async function runMigrations() {
  requireMysqlUrl()

  const environment = process.env.NODE_ENV || 'development'
  const dbHost = process.env.MYSQL_DATABASE_URL.split('@')[1] || 'unknown'

  console.log(`🔄 Running Prisma migrations for ${environment}...`)
  console.log(`📍 Database: ${dbHost}`)
  console.log(`📂 Prisma schema: ${path.join(serverRoot, 'prisma/schema.prisma')}`)

  const execOpts = { cwd: serverRoot, env: process.env }

  try {
    if (environment === 'production') {
      console.log("📦 Using 'prisma migrate deploy' for production...")
      try {
        const { stdout, stderr } = await execAsync('npx prisma migrate deploy', execOpts)
        if (stdout) console.log(stdout)
        if (stderr) console.warn(stderr)
      } catch (deployError) {
        if (!isPrismaP3005(deployError)) throw deployError

        await baselineExistingDatabase(execOpts)
        console.log("📦 Retrying 'prisma migrate deploy' after baseline...")
        const { stdout, stderr } = await execAsync('npx prisma migrate deploy', execOpts)
        if (stdout) console.log(stdout)
        if (stderr) console.warn(stderr)
      }
    } else {
      console.log("📦 Using 'prisma db push' for development...")
      const { stdout, stderr } = await execAsync(
        'npx prisma db push --accept-data-loss',
        execOpts,
      )
      if (stdout) console.log(stdout)
      if (stderr) console.warn(stderr)
    }

    console.log('📦 Regenerating Prisma client...')
    const { stdout: genOut } = await execAsync('npx prisma generate', execOpts)
    if (genOut) console.log(genOut)

    console.log('✅ Prisma migrations completed successfully!')
    return true
  } catch (error) {
    console.error('❌ Prisma migration failed:')
    console.error(error?.stdout || error?.stderr || error)
    throw error
  }
}

export default runMigrations
