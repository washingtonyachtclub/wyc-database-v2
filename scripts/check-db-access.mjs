import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import ts from 'typescript'

const allowed = new Set(['src/db/index.ts', 'src/db/audit-store.ts'])
const driver = /^(mysql2|mysql|drizzle-orm\/mysql2|drizzle-orm\/mysql-proxy)(\/|$)/
const bypassProperties = new Set(['$client', 'iterator'])
let errors = 0

function checkFile(path) {
  if (allowed.has(path)) return
  const source = ts.createSourceFile(path, readFileSync(path, 'utf8'), ts.ScriptTarget.Latest, true)
  function fail(node) {
    const { line } = source.getLineAndCharacterOfPosition(node.getStart(source))
    console.error(`${path}:${line + 1}: Use the shared audited database client from @/db`)
    errors++
  }
  function visit(node) {
    if (
      (ts.isImportDeclaration(node) && !node.importClause?.isTypeOnly) ||
      (ts.isExportDeclaration(node) && !node.isTypeOnly)
    ) {
      if (node.moduleSpecifier && ts.isStringLiteral(node.moduleSpecifier)) {
        if (driver.test(node.moduleSpecifier.text)) fail(node)
      }
    }
    if (
      ts.isCallExpression(node) &&
      (node.expression.kind === ts.SyntaxKind.ImportKeyword ||
        (ts.isIdentifier(node.expression) && node.expression.text === 'require')) &&
      node.arguments[0] &&
      ts.isStringLiteral(node.arguments[0]) &&
      driver.test(node.arguments[0].text)
    ) {
      fail(node)
    }
    if (
      (ts.isPropertyAccessExpression(node) && bypassProperties.has(node.name.text)) ||
      (ts.isElementAccessExpression(node) &&
        ts.isStringLiteral(node.argumentExpression) &&
        bypassProperties.has(node.argumentExpression.text))
    ) {
      fail(node)
    }
    ts.forEachChild(node, visit)
  }
  visit(source)
}

function walk(directory) {
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name)
    if (entry.isDirectory()) walk(path)
    else if (/\.[cm]?[jt]sx?$/.test(entry.name)) checkFile(path)
  }
}

walk('src')
if (errors) process.exit(1)
console.log('Application database access uses the shared audited client.')
