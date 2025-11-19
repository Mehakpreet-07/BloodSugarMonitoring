#!/usr/bin/env node
// Data seeding script for testing
const { db } = require('../server/storage/db');
const { hashPassword } = require('../server/utils/security');

async function seedData() {
  console.log('Initializing database...');
  await db.init();

  console.log('\n🗑️  Clearing existing data...');
  // Clear all tables to prevent duplicates
  const tables = [
    'administrators', 'staff', 'specialists', 'patients',
    'readings', 'foodActivityLogs', 'alerts', 'feedback',
    'thresholdSettings', 'reports', 'sessions', 'auditLogs'
  ];
  
  for (const table of tables) {
    try {
      const items = await db.find(table);
      for (const item of items) {
        await db.delete(table, item.id);
      }
      console.log(`✓ Cleared ${table} (${items.length} items)`);
    } catch (err) {
      // Table might not exist yet, that's okay
      console.log(`  Skipped ${table} (doesn't exist yet)`);
    }
  }

  console.log('\n✨ Seeding test data...\n');

  // Hash password "demo" for all test users (matches frontend display)
  const demoHash = await hashPassword('demo');

  // Create administrators
  console.log('Creating administrators...');
  const admin = await db.insert('administrators', {
    fullName: 'System Administrator',
    email: 'admin@demo.test',
    phone: '555-0100',
    passwordHash: demoHash
  });
  console.log(`✓ Created admin: ${admin.email}`);

  // Create staff
  console.log('\nCreating staff...');
  const staff = await db.insert('staff', {
    fullName: 'Clinic Staff',
    email: 'staff@demo.test',
    phone: '555-0101',
    workingID: 'STAFF001',
    passwordHash: demoHash
  });
  console.log(`✓ Created staff: ${staff.email}`);

  // Create specialists
  console.log('\nCreating specialists...');
  const specialist1 = await db.insert('specialists', {
    fullName: 'Dr. Demo Specialist',
    email: 'dr@demo.test',
    phone: '555-0102',
    workingID: 'DOC001',
    fieldOfSpecialization: 'Endocrinology',
    passwordHash: demoHash
  });
  console.log(`✓ Created specialist: ${specialist1.email}`);

  // Additional specialists for variety
  const specialist2 = await db.insert('specialists', {
    fullName: 'Dr. Sarah Chen',
    email: 'dr.chen@demo.test',
    phone: '555-0103',
    workingID: 'DOC002',
    fieldOfSpecialization: 'Internal Medicine',
    passwordHash: demoHash
  });
  console.log(`✓ Created specialist: ${specialist2.email}`);

  // Create patients
  console.log('\nCreating patients...');
  const patient1 = await db.insert('patients', {
    fullName: 'Demo Patient',
    email: 'patient@demo.test',
    phone: '555-0201',
    healthCareNumber: 'HC123456',
    dateOfBirth: '1985-03-15',
    preferredUnit: 'mg/dL',
    passwordHash: demoHash,
    registrationDate: new Date().toISOString()
  });
  console.log(`✓ Created patient: ${patient1.email}`);

  // Additional patients for testing
  const patient2 = await db.insert('patients', {
    fullName: 'Bhavni Rampal',
    email: 'bhavni@demo.test',
    phone: '555-0202',
    healthCareNumber: 'HC123457',
    dateOfBirth: '1990-07-22',
    preferredUnit: 'mmol/L',
    passwordHash: demoHash,
    registrationDate: new Date().toISOString()
  });
  console.log(`✓ Created patient: ${patient2.email}`);

  const patient3 = await db.insert('patients', {
    fullName: 'Rahul Chauhan',
    email: 'rahul@demo.test',
    phone: '555-0203',
    healthCareNumber: 'HC123458',
    dateOfBirth: '1988-11-30',
    preferredUnit: 'mg/dL',
    passwordHash: demoHash,
    registrationDate: new Date().toISOString()
  });
  console.log(`✓ Created patient: ${patient3.email}`);

  // Create sample readings for patient1
  console.log('\nCreating sample readings...');
  const now = Date.now();
  const readings = [
    { days: 0, hour: 8, value: 95, category: 'Normal', food: 'Oatmeal with berries' },
    { days: 0, hour: 12, value: 185, category: 'AbnormalHigh', food: 'Pizza and soda' },
    { days: 0, hour: 18, value: 142, category: 'Borderline', food: 'Rice and curry' },
    { days: 1, hour: 7, value: 88, category: 'Normal', food: 'Skipped breakfast' },
    { days: 1, hour: 13, value: 195, category: 'AbnormalHigh', food: 'Fast food burger' },
    { days: 1, hour: 19, value: 135, category: 'Normal', food: 'Grilled chicken salad' },
    { days: 2, hour: 8, value: 92, category: 'Normal', food: 'Whole grain toast' },
    { days: 2, hour: 14, value: 67, category: 'AbnormalLow', food: 'Heavy workout, delayed lunch' },
    { days: 3, hour: 9, value: 102, category: 'Normal', food: 'Greek yogurt' },
    { days: 3, hour: 15, value: 198, category: 'AbnormalHigh', food: 'Birthday cake, sugary dessert' },
    { days: 4, hour: 7, value: 85, category: 'Normal', food: 'Scrambled eggs' },
    { days: 5, hour: 8, value: 178, category: 'Borderline', food: 'Pancakes with syrup' },
    { days: 6, hour: 9, value: 94, category: 'Normal', food: 'Protein shake' },
    { days: 7, hour: 10, value: 190, category: 'AbnormalHigh', food: 'Skipped breakfast, stress at work' }
  ];

  for (const r of readings) {
    const readingTime = new Date(now - (r.days * 24 * 60 * 60 * 1000) + (r.hour * 60 * 60 * 1000));
    
    const reading = await db.insert('readings', {
      patientId: patient1.id,
      valueMgPerdL: r.value,
      unitEntered: 'mg/dL',
      category: r.category,
      notes: `Reading at ${r.hour}:00`,
      recordedAt: readingTime.toISOString()
    });

    // Add food/activity log
    await db.insert('foodActivityLogs', {
      readingId: reading.id,
      description: r.food,
      loggedAt: readingTime.toISOString()
    });
  }
  console.log(`✓ Created ${readings.length} readings for ${patient1.fullName}`);

  // Create some readings for patient2
  const readings2 = [
    { days: 0, hour: 9, value: 5.2, category: 'Normal', food: 'Breakfast cereal' },
    { days: 1, hour: 10, value: 10.5, category: 'AbnormalHigh', food: 'Sweetened coffee and pastry' },
    { days: 2, hour: 8, value: 4.8, category: 'Normal', food: 'Toast and jam' }
  ];

  for (const r of readings2) {
    const readingTime = new Date(now - (r.days * 24 * 60 * 60 * 1000) + (r.hour * 60 * 60 * 1000));
    
    const reading = await db.insert('readings', {
      patientId: patient2.id,
      valueMgPerdL: Math.round(r.value * 18), // Convert from mmol/L and round to avoid decimals
      unitEntered: 'mmol/L',
      category: r.category,
      notes: `Reading at ${r.hour}:00`,
      recordedAt: readingTime.toISOString()
    });

    await db.insert('foodActivityLogs', {
      readingId: reading.id,
      description: r.food,
      loggedAt: readingTime.toISOString()
    });
  }
  console.log(`✓ Created ${readings2.length} readings for ${patient2.fullName}`);

  // Create some readings for patient3 (Rahul)
  const readings3 = [
    { days: 0, hour: 8, value: 105, category: 'Normal', food: 'Morning tea' },       // 105 = Normal (70-140)
    { days: 1, hour: 10, value: 118, category: 'Normal', food: 'Breakfast sandwich' }, // 118 = Normal (70-140)
    { days: 2, hour: 9, value: 132, category: 'Normal', food: 'Cereal with milk' },  // 132 = Normal (70-140)
    { days: 3, hour: 11, value: 98, category: 'Normal', food: 'Fruit salad' },       // 98 = Normal (70-140)
    { days: 4, hour: 8, value: 142, category: 'Borderline', food: 'Pancakes' }       // 142 = Borderline (140-180)
  ];

  for (const r of readings3) {
    const readingTime = new Date(now - (r.days * 24 * 60 * 60 * 1000) + (r.hour * 60 * 60 * 1000));
    
    const reading = await db.insert('readings', {
      patientId: patient3.id,
      valueMgPerdL: r.value,
      unitEntered: 'mg/dL',
      category: r.category,
      notes: `Reading at ${r.hour}:00`,
      recordedAt: readingTime.toISOString()
    });

    await db.insert('foodActivityLogs', {
      readingId: reading.id,
      description: r.food,
      loggedAt: readingTime.toISOString()
    });
  }
  console.log(`✓ Created ${readings3.length} readings for ${patient3.fullName}`);

  // Create feedback
  console.log('\nCreating feedback...');
  const feedback1 = await db.insert('feedback', {
    patientId: patient1.id,
    specialistId: specialist1.id,
    comment: 'Your readings show high blood sugar after consuming sugary foods. Please reduce carbohydrate intake and monitor closely.',
    language: 'en',
    createdAt: new Date(now - 1 * 24 * 60 * 60 * 1000).toISOString()
  });
  console.log(`✓ Created feedback from ${specialist1.fullName} to ${patient1.fullName}`);

  // Create alerts
  console.log('\nCreating alerts...');
  const alert1 = await db.insert('alerts', {
    patientId: patient1.id,
    specialistId: specialist1.id,
    triggeredAt: new Date(now - 2 * 60 * 60 * 1000).toISOString(),
    reason: 'More than 3 abnormal readings in the past 7 days',
    status: 'Pending'
  });
  console.log(`✓ Created alert for ${patient1.fullName}`);

  // Alert for patient2 (Bhavni) who also has abnormal reading
  const alert2 = await db.insert('alerts', {
    patientId: patient2.id,
    specialistId: specialist1.id,
    triggeredAt: new Date(now - 1 * 24 * 60 * 60 * 1000).toISOString(),
    reason: 'Abnormal high reading detected',
    status: 'Pending'
  });
  console.log(`✓ Created alert for ${patient2.fullName}`);

  console.log('\n✅ Seeding complete!\n');
  console.log('Test Accounts (all with password: demo):');
  console.log('─────────────────────────────────────────────');
  console.log(`Doctor:      dr@demo.test`);
  console.log(`Admin:       admin@demo.test`);
  console.log(`Staff:       staff@demo.test`);
  console.log(`Patient:     patient@demo.test`);
  console.log(`Patient:     bhavni@demo.test (uses mmol/L)`);
  console.log(`Patient:     rahul@demo.test`);
  console.log('─────────────────────────────────────────────\n');
}

// Run seeding
seedData()
  .then(() => {
    console.log('Done!');
    process.exit(0);
  })
  .catch((err) => {
    console.error('Seeding error:', err);
    process.exit(1);
  });
