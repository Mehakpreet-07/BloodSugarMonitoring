// File-based JSON database with ACID-like properties
const fs = require('fs');
const path = require('path');
const { promisify } = require('util');

const readFile = promisify(fs.readFile);
const writeFile = promisify(fs.writeFile);
const mkdir = promisify(fs.mkdir);
const rename = promisify(fs.rename);
const unlink = promisify(fs.unlink);

// Helper: Sleep function
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

class Database {
  constructor(dataDir = path.join(__dirname, '../../data')) {
    this.dataDir = dataDir;
    this.collections = {};
    this.writeQueues = {};
    this.initialized = false;
  }

  async init() {
    if (this.initialized) return;
    
    try {
      await mkdir(this.dataDir, { recursive: true });
    } catch (err) {
      if (err.code !== 'EEXIST') throw err;
    }

    // Initialize all collections
    const collectionNames = [
      'patients',
      'specialists',
      'staff',
      'administrators',
      'readings',
      'foodActivityLogs',
      'feedback',
      'alerts',
      'thresholdSettings',
      'reports',
      'auditLogs',
      'sessions',
      'emailTemplates'
    ];

    for (const name of collectionNames) {
      await this.loadCollection(name);
    }

    // Seed default threshold settings if empty
    if (this.collections.thresholdSettings && this.collections.thresholdSettings.length === 0) {
      await this.insert('thresholdSettings', {
        name: 'default',
        normalMinMg: 70,
        normalMaxMg: 140,
        borderlineMinMg: 140,
        borderlineMaxMg: 180,
        abnormalMinMg: 0,
        abnormalMaxMg: 70,
        abnormalHighMinMg: 180,
        abnormalHighMaxMg: 500,
        active: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
    }

    this.initialized = true;
  }

  async loadCollection(name) {
    const filePath = this.getFilePath(name);
    try {
      const data = await readFile(filePath, 'utf8');
      this.collections[name] = JSON.parse(data);
    } catch (err) {
      if (err.code === 'ENOENT') {
        this.collections[name] = [];
        await this.saveCollection(name);
      } else {
        throw err;
      }
    }
    this.writeQueues[name] = Promise.resolve();
  }

  getFilePath(name) {
    return path.join(this.dataDir, `${name}.json`);
  }

  // Robust Write with Retry Logic for Windows EPERM fix
  async saveCollection(name) {
    const filePath = this.getFilePath(name);
    const tempPath = `${filePath}.tmp`;
    const dataStr = JSON.stringify(this.collections[name], null, 2);
    
    let attempts = 0;
    const maxAttempts = 5;

    while (attempts < maxAttempts) {
      try {
        await writeFile(tempPath, dataStr);
        await rename(tempPath, filePath);
        return; // Success
      } catch (err) {
        attempts++;
        // If it's a permission error (locking), wait and retry
        if (err.code === 'EPERM' || err.code === 'EBUSY') {
          if (attempts >= maxAttempts) {
            console.error(`Failed to save ${name} after ${maxAttempts} attempts:`, err.message);
            // Try to clean up temp file
            try { await unlink(tempPath); } catch (_) {}
            throw err;
          }
          await sleep(50 * attempts); // Exponential backoff (50ms, 100ms, 150ms...)
        } else {
          throw err; // Throw other errors immediately
        }
      }
    }
  }

  async queueWrite(collectionName, operation) {
    this.writeQueues[collectionName] = this.writeQueues[collectionName].then(async () => {
      const result = await operation();
      await this.saveCollection(collectionName);
      return result;
    });
    return this.writeQueues[collectionName];
  }

  async find(collectionName, query = {}) {
    const collection = this.collections[collectionName];
    if (!collection) throw new Error(`Collection ${collectionName} not found`);

    if (Object.keys(query).length === 0) {
      return [...collection];
    }

    return collection.filter(doc => {
      return Object.entries(query).every(([key, value]) => {
        if (key.includes('.')) {
          const keys = key.split('.');
          let current = doc;
          for (const k of keys) {
            if (current === undefined || current === null) return false;
            current = current[k];
          }
          return current === value;
        }
        return doc[key] === value;
      });
    });
  }

  async findOne(collectionName, query) {
    const results = await this.find(collectionName, query);
    return results[0] || null;
  }

  async findById(collectionName, id) {
    return this.findOne(collectionName, { id });
  }

  async insert(collectionName, doc) {
    return this.queueWrite(collectionName, () => {
      const collection = this.collections[collectionName];
      
      if (!doc.id) {
        const maxId = collection.reduce((max, item) => 
          Math.max(max, item.id || 0), 0);
        doc.id = maxId + 1;
      }

      const now = new Date().toISOString();
      doc.createdAt = doc.createdAt || now;
      doc.updatedAt = doc.updatedAt || now;

      collection.push(doc);
      return { ...doc };
    });
  }

  async update(collectionName, query, update) {
    return this.queueWrite(collectionName, () => {
      const collection = this.collections[collectionName];
      let updated = 0;

      for (let i = 0; i < collection.length; i++) {
        const matches = Object.entries(query).every(([key, value]) => 
          collection[i][key] === value
        );

        if (matches) {
          collection[i] = {
            ...collection[i],
            ...update,
            updatedAt: new Date().toISOString()
          };
          updated++;