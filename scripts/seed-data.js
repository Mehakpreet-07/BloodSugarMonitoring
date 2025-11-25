// scripts/seed-data.js
const { db } = require('../server/storage/db');
const { hashPassword } = require('../server/utils/security');

async function seedData() {
  console.log('Initializing database...');
  await db.init();

  console.log('\n🗑️  Clearing existing data...');
  const tables = [
    'administrators', 'staff', 'specialists', 'patients',
    'readings', 'foodActivityLogs', 'feedback', 'alerts',
    'thresholdSettings', 'reports', 'sessions', 'auditLogs', 'emailTemplates'
  ];
  
  for (const table of tables) {
    try {
      const items = await db.find(table);
      for (const item of items) await db.delete(table, { id: item.id });
    } catch (err) {}
  }

  console.log('\n✨ Seeding compliant test data...\n');
  const demoHash = await hashPassword('demo');

  // 1. Admin (Fixed Phone: 10 digits)
  const admin = await db.insert('administrators', {
    fullName: 'System Administrator',
    email: 'admin@demo.test',
    phone: '555-123-0000', 
    passwordHash: demoHash,
    profileImage: 'https://ui-avatars.com/api/?name=Admin&background=0D8ABC&color=fff'
  });

  // 2. Staff (Fixed Phone: 10 digits)
  await db.insert('staff', {
    fullName: 'Clinic Staff',
    email: 'staff@demo.test',
    phone: '555-123-0001',
    workingID: 'STAFF001',
    passwordHash: demoHash,
    profileImage: 'https://ui-avatars.com/api/?name=Staff&background=666&color=fff'
  });

  // 3. Specialists (Fixed Phones: 10 digits)
  const specialist1 = await db.insert('specialists', {
    fullName: 'Dr. Demo Specialist',
    email: 'dr@demo.test',
    phone: '555-123-0002',
    workingID: 'DOC001',
    fieldOfSpecialization: 'Endocrinology',
    passwordHash: demoHash,
    profileImage: 'https://ui-avatars.com/api/?name=Dr+Demo&background=random'
  });

  const specialist2 = await db.insert('specialists', {
    fullName: 'Dr. Sarah Chen',
    email: 'dr.chen@demo.test',
    phone: '555-123-0003',
    workingID: 'DOC002',
    fieldOfSpecialization: 'Internal Medicine',
    passwordHash: demoHash,
    profileImage: 'https://ui-avatars.com/api/?name=Dr+Chen&background=random'
  });

  // 4. Patients (Fixed Phones: 10 digits, HC: 9 digits)
  const patient1 = await db.insert('patients', {
    fullName: 'Demo Patient',
    email: 'patient@demo.test',
    phone: '555-987-0001',
    healthCareNumber: '123-456-789', // Exactly 9 digits
    dateOfBirth: '1985-03-15',
    preferredUnit: 'mg/dL',
    assignedSpecialistId: specialist1.id, 
    passwordHash: demoHash,
    profileImage: 'https://ui-avatars.com/api/?name=Demo+Patient&background=random',
    registrationDate: new Date().toISOString()
  });

  const patient2 = await db.insert('patients', {
    fullName: 'Bhavni Rampal',
    email: 'bhavni@demo.test',
    phone: '555-987-0002',
    healthCareNumber: '987-654-321', // Exactly 9 digits
    dateOfBirth: '1990-07-22',
    preferredUnit: 'mmol/L',
    assignedSpecialistId: specialist1.id, 
    passwordHash: demoHash,
    profileImage: 'https://ui-avatars.com/api/?name=Bhavni+Rampal&background=random',
    registrationDate: new Date().toISOString()
  });

  const patient3 = await db.insert('patients', {
    fullName: 'Rahul Chauhan',
    email: 'rahul@demo.test',
    phone: '555-987-0003',
    healthCareNumber: '111-222-333', // Exactly 9 digits
    dateOfBirth: '1988-11-30',
    preferredUnit: 'mg/dL',
    assignedSpecialistId: specialist2.id, 
    passwordHash: demoHash,
    profileImage: 'https://ui-avatars.com/api/?name=Rahul+Chauhan&background=random',
    registrationDate: new Date().toISOString()
  });

  // 5. Readings (Coherent Data: Demo Patient has Highs, Rahul has Normals)
  const now = Date.now();
  
  // Patient 1 Readings (Demo Patient - High/Abnormal)
  const readingsP1 = [
    { days: 0, hour: 12, value: 185, category: 'AbnormalHigh', food: 'Pizza and soda', event: 'Birthday party', symptom: 'Thirsty' },
    { days: 1, hour: 13, value: 195, category: 'AbnormalHigh', food: 'Fast food burger', event: 'Stress meeting', symptom: 'Dizzy' },
    { days: 2, hour: 8, value: 92, category: 'Normal', food: 'Toast', event: 'Walk', symptom: 'None' },
    { days: 3, hour: 15, value: 198, category: 'AbnormalHigh', food: 'Cake', event: 'Sitting', symptom: 'Fatigue' },
    { days: 4, hour: 7, value: 85, category: 'Normal', food: 'Eggs', event: 'Yoga', symptom: 'None' }
  ];

  for (const r of readingsP1) {
    const readingTime = new Date(now - (r.days * 24 * 60 * 60 * 1000) + (r.hour * 60 * 60 * 1000));
    await db.insert('readings', {
      patientId: patient1.id,
      valueMgPerdL: r.value,
      unitEntered: 'mg/dL',
      category: r.category,
      foodIntake: r.food,
      eventActivity: r.event,
      symptoms: r.symptom,
      recordedAt: readingTime.toISOString()
    });
  }

  // Patient 2 Readings (Bhavni - Mixed)
  const readingsP2 = [
    { days: 0, hour: 9, value: 5.2, category: 'Normal', food: 'Cereal', event: 'Work', symptom: 'None' },
    { days: 1, hour: 10, value: 10.5, category: 'AbnormalHigh', food: 'Pastry', event: 'Meeting', symptom: 'Headache' }
  ];

  for (const r of readingsP2) {
    const readingTime = new Date(now - (r.days * 24 * 60 * 60 * 1000) + (r.hour * 60 * 60 * 1000));
    await db.insert('readings', {
      patientId: patient2.id,
      valueMgPerdL: Math.round(r.value * 18), // Convert mmol
      unitEntered: 'mmol/L',
      category: r.category,
      foodIntake: r.food,
      eventActivity: r.event,
      symptoms: r.symptom,
      recordedAt: readingTime.toISOString()
    });
  }

  // 6. Feedback
  await db.insert('feedback', {
    patientId: patient1.id,
    specialistId: specialist1.id,
    comment: 'Please reduce sugar intake.',
    language: 'en',
    createdAt: new Date(now - 1 * 24 * 60 * 60 * 1000).toISOString()
  });

  // 7. Alerts
  await db.insert('alerts', {
    patientId: patient1.id,
    specialistId: specialist1.id,
    triggeredAt: new Date(now - 2 * 60 * 60 * 1000).toISOString(),
    reason: 'More than 3 abnormal readings in the past 7 days',
    status: 'Pending'
  });

  console.log('✅ Seeding complete! Data is now fully coherent and valid.');
  console.log('------------------------------------------------');
  console.log('Admin: admin@demo.test');
  console.log('Doctor: dr@demo.test');
  console.log('Patient: patient@demo.test');
  console.log('------------------------------------------------');
}

seedData().then(() => process.exit(0)).catch(console.error);