/**
 * Colored logging utility for Stadium backend
 */
import chalk from 'chalk';

const logger = {
  info: (message, ...args) => {
    console.log(chalk.blue(`[INFO] ${message}`), ...args);
  },
  
  success: (message, ...args) => {
    console.log(chalk.green(`[SUCCESS] ${message}`), ...args);
  },
  
  warn: (message, ...args) => {
    console.log(chalk.yellow(`[WARN] ${message}`), ...args);
  },
  
  error: (message, ...args) => {
    console.error(chalk.red(`[ERROR] ${message}`), ...args);
  },
  
  auth: (message, ...args) => {
    console.log(chalk.cyan(`[AUTH] ${message}`), ...args);
  },
  
  security: (message, ...args) => {
    console.log(chalk.magenta(`[SECURITY] ${message}`), ...args);
  },
  
  update: (message, ...args) => {
    console.log(chalk.green(`[UPDATE] ${message}`), ...args);
  },
  
  submission: (message, ...args) => {
    console.log(chalk.greenBright(`[SUBMISSION] ${message}`), ...args);
  },
  
  validation: (message, ...args) => {
    console.log(chalk.yellow(`[VALIDATION] ${message}`), ...args);
  }
};

export default logger;

