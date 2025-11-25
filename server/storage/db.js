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
      'sessions',       // <--- Fixed: Added Comma
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
    const maxAttempts = 10;

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
            try { await unlink(tempPath); } catch (_) {}
            throw err;
          }
          await sleep(100 * attempts); // Exponential backoff
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
        }
      }

      return updated;
    });
  }

  async updateById(collectionName, id, update) {
    return this.update(collectionName, { id }, update);
  }

  async delete(collectionName, query) {
    return this.queueWrite(collectionName, () => {
      const collection = this.collections[collectionName];
      const initialLength = collection.length;

      this.collections[collectionName] = collection.filter(doc => {
        return !Object.entries(query).every(([key, value]) => 
          doc[key] === value
        );
      });

      return initialLength - this.collections[collectionName].length;
    });
  }

  async deleteById(collectionName, id) {
    return this.delete(collectionName, { id });
  }

  async aggregate(collectionName, pipeline) {
    let results = [...this.collections[collectionName]];

    for (const stage of pipeline) {
      if (stage.$match) {
        results = results.filter(doc => {
          return Object.entries(stage.$match).every(([key, value]) => {
            if (typeof value === 'object' && value !== null) {
              return doc[key] === value; 
            }
            return doc[key] === value;
          });
        });
      }
      if (stage.$sort) {
        const [field, order] = Object.entries(stage.$sort)[0];
        results.sort((a, b) => {
          const aVal = a[field];
          const bVal = b[field];
          if (aVal < bVal) return order === 1 ? -1 : 1;
          if (aVal > bVal) return order === 1 ? 1 : -1;
          return 0;
        });
      }
      if (stage.$limit) {
        results = results.slice(0, stage.$limit);
      }
      if (stage.$skip) {
        results = results.slice(stage.$skip);
      }
    }
    return results;
  }
}

const db = new Database();
module.exports = { db };