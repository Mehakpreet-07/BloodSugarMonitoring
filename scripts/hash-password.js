#!/usr/bin/env node
// Password hashing utility
const crypto = require('crypto');
const readline = require('readline');
const { promisify } = require('util');

const scrypt = promisify(crypto.scrypt);
const randomBytes = promisify(crypto.randomBytes);

async function hashPassword(password) {
  const salt = await randomBytes(32);
  const derivedKey = await scrypt(password, salt, 64);
  return salt.toString('hex') + ':' + derivedKey.toString('hex');
}

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

console.log('Password Hashing Utility');
console.log('========================\n');

rl.question('Enter password to hash: ', async (password) => {
  if (!password || password.length < 8) {
    console.error('Error: Password must be at least 8 characters long');
    rl.close();
    return;
  }

  try {
    const hash = await hashPassword(password);
    console.log('\nPassword hash:');
    console.log(hash);
    console.log('\nYou can use this hash in your database JSON files.');
  } catch (err) {
    console.error('Error hashing password:', err.message);
  }

  rl.close();
});