/**
 * One-command deploy: ensure main is up to date, migrations applied, Railway + Vercel deployed.
 *
 * Usage (from repo root):
 *   node server/scripts/deploy-all.js
 *
 * Or from server/:
 *   npm run deploy:all
 *
 * This script:
 * 1. Checks git (on main, clean, up to date)
 * 2. Applies Supabase migrations if needed
 * 3. Updates Symbiosis M2 status (sets main-track winners to 'building')
 * 4. Deploys Railway server
 * 5. Deploys Vercel client
 * 6. Verifies everything works
 */

import { execSync } from 'child_process';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const scriptRepoRoot = path.resolve(__dirname, '../..');
const cwd = process.cwd();
const repoRoot = (() => {
  try {
    fs.accessSync(path.join(cwd, '.git'));
    return cwd;
  } catch {
    return scriptRepoRoot;
  }
})();

dotenv.config({ path: path.join(scriptRepoRoot, 'server', '.env') });

const API_BASE = process.env.API_BASE_URL || 'https://stadium-production-996a.up.railway.app/api';
const FRONTEND_URL = process.env.FRONTEND_URL || 'https://client-n7lu4qlus-sachalanskys-projects.vercel.app';

let step = 0;
const steps = [];

function logStep(name) {
  step++;
  console.log(`\n[${step}] ${name}`);
  console.log('─'.repeat(60));
  steps.push({ step, name, status: 'running' });
}

function logSuccess(msg) {
  console.log(`✅ ${msg}`);
  if (steps.length > 0) steps[steps.length - 1].status = 'success';
}

function logError(msg) {
  console.error(`❌ ${msg}`);
  if (steps.length > 0) steps[steps.length - 1].status = 'failed';
}

function logWarning(msg) {
  console.log(`⚠️  ${msg}`);
  if (steps.length > 0) steps[steps.length - 1].status = 'warning';
}

// Not used - using execSync directly for simplicity

async function checkGit() {
  logStep('Checking Git status');
  
  const branch = execSync('git branch --show-current', { cwd: repoRoot, encoding: 'utf-8' }).trim();
  if (branch !== 'main') {
    throw new Error(`Not on main branch (current: ${branch}). Switch to main first.`);
  }
  logSuccess(`On main branch`);

  const status = execSync('git status --porcelain', { cwd: repoRoot, encoding: 'utf-8' }).trim();
  if (status) {
    logWarning('Uncommitted changes detected. Committing them...');
    try {
      execSync('git add -A', { cwd: repoRoot });
      execSync('git commit -m "chore: auto-commit before deploy"', { cwd: repoRoot });
      logSuccess('Committed changes');
    } catch (err) {
      throw new Error('Could not auto-commit. Commit manually or stash changes.');
    }
  } else {
    logSuccess('Working tree clean');
  }

  try {
    execSync('git fetch origin main', { cwd: repoRoot, stdio: 'ignore' });
    const local = execSync('git rev-parse HEAD', { cwd: repoRoot, encoding: 'utf-8' }).trim();
    const remote = execSync('git rev-parse origin/main', { cwd: repoRoot, encoding: 'utf-8' }).trim();
    if (local !== remote) {
      logWarning(`Local (${local.slice(0, 7)}) != remote (${remote.slice(0, 7)}). Pushing...`);
      execSync('git push origin main', { cwd: repoRoot, stdio: 'inherit' });
      logSuccess('Pushed to origin/main');
    } else {
      logSuccess('Up to date with origin/main');
    }
  } catch (err) {
    throw new Error(`Git sync failed: ${err.message}`);
  }
}

async function checkSupabaseMigrations() {
  logStep('Checking Supabase migrations');
  
  try {
    const output = execSync('supabase migration list', { cwd: repoRoot, encoding: 'utf-8', stdio: 'pipe' });
    const lines = output.split('\n').filter(l => l.includes('|'));
    if (lines.length < 2) {
      logWarning('Could not parse migration list. Skipping migration check.');
      return;
    }
    
    const mismatches = lines.slice(1).filter(l => {
      const parts = l.split('|').map(p => p.trim());
      return parts.length >= 2 && parts[0] !== parts[1];
    });
    
    if (mismatches.length > 0) {
      logWarning(`${mismatches.length} migration(s) not applied. Applying...`);
      execSync('supabase db push', { cwd: repoRoot, stdio: 'inherit' });
      logSuccess('Migrations applied');
    } else {
      logSuccess('All migrations applied');
    }
  } catch (err) {
    logWarning(`Supabase CLI check failed: ${err.message}. Skipping migration check.`);
  }
}

async function updateSymbiosisM2Status() {
  logStep('Updating Symbiosis M2 status');
  
  const serverDir = path.join(repoRoot, 'server');
  try {
    // Check if env vars are set
    if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      logWarning('SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY not set. Skipping Symbiosis M2 update.');
      return;
    }
    
    // First set main-track winners to 'building'
    execSync('npm run db:symbiosis-m2-building', { cwd: serverDir, stdio: 'inherit' });
    logSuccess('Symbiosis M2 building status updated');
    
    // Then set completed projects to 'completed' (for Recently Shipped)
    execSync('npm run db:symbiosis-completed', { cwd: serverDir, stdio: 'inherit' });
    logSuccess('Symbiosis M2 completed status updated');
  } catch (err) {
    logWarning(`Symbiosis M2 update failed: ${err.message}. This is optional - projects may already be updated.`);
  }
}

async function deployRailway() {
  logStep('Deploying Railway server');
  
  const serverDir = path.join(repoRoot, 'server');
  try {
    execSync('railway up --detach', { cwd: serverDir, stdio: 'inherit' });
    logSuccess('Railway deployment queued');
    console.log('   (Wait 1-2 minutes for build to complete)');
  } catch (err) {
    throw new Error(`Railway deploy failed: ${err.message}`);
  }
}

async function deployVercel() {
  logStep('Deploying Vercel client');
  
  const clientDir = path.join(repoRoot, 'client');
  try {
    execSync('vercel --prod', { cwd: clientDir, stdio: 'inherit' });
    logSuccess('Vercel deployment completed');
  } catch (err) {
    throw new Error(`Vercel deploy failed: ${err.message}`);
  }
}

async function verify() {
  logStep('Quick verification');
  
  console.log('Waiting 10 seconds for deployments to start...');
  await new Promise(resolve => setTimeout(resolve, 10000));
  
  // Run basic checks
  try {
    const res = await fetch(`${API_BASE}/health`);
    if (res.ok) {
      logSuccess('Railway API is reachable');
    } else {
      logWarning(`Railway API returned ${res.status} (may still be building)`);
    }
  } catch (err) {
    logWarning(`Railway API not reachable yet: ${err.message} (build may still be running)`);
  }
  
  try {
    const res = await fetch(FRONTEND_URL, { method: 'HEAD' });
    if (res.ok || res.status === 405) {
      logSuccess('Vercel frontend is reachable');
    } else {
      logWarning(`Vercel returned ${res.status}`);
    }
  } catch (err) {
    logWarning(`Vercel not reachable: ${err.message}`);
  }
  
  console.log('\n💡 For full verification, wait 1-2 minutes then run:');
  console.log('   cd server && npm run verify:production');
}

async function main() {
  console.log('🚀 Deploy All: Main → Migrations → Railway → Vercel\n');
  console.log(`Repo: ${repoRoot}`);
  console.log(`API: ${API_BASE}`);
  console.log(`Frontend: ${FRONTEND_URL}\n`);

  try {
    await checkGit();
    await checkSupabaseMigrations();
    await updateSymbiosisM2Status();
    await deployRailway();
    await deployVercel();
    await verify();
    
    console.log('\n' + '='.repeat(60));
    console.log('🎉 DEPLOYMENT COMPLETE');
    console.log('='.repeat(60));
    console.log('\nNext steps:');
    console.log('  • Wait 1-2 minutes for Railway build to finish');
    console.log('  • Run: npm run verify:production (in server/) to verify everything');
    console.log('  • Check Railway/Vercel dashboards for deployment status');
    
  } catch (err) {
    console.error('\n' + '='.repeat(60));
    console.error('❌ DEPLOYMENT FAILED');
    console.error('='.repeat(60));
    console.error(`\nError: ${err.message}`);
    console.error('\nSteps completed:');
    steps.forEach(({ step, name, status }) => {
      const icon = status === 'success' ? '✅' : status === 'failed' ? '❌' : '⚠️';
      console.error(`  ${icon} [${step}] ${name}`);
    });
    process.exit(1);
  }
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
