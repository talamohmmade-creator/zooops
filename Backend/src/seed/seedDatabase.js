require('dotenv').config();

const bcrypt = require('bcryptjs');
const connectDatabase = require('../config/database');
const {
  Role,
  User,
  Zone,
  Enclosure,
  Animal,
  Task,
  Evidence,
  Comment,
  MentionThread,
  CalendarReminder,
  Notification
} = require('../models');

const rolePermissions = {
  Keeper: [
    { resource: 'tasks', actions: ['read', 'update'] },
    { resource: 'evidence', actions: ['create', 'read', 'update', 'upload'] },
    { resource: 'comments', actions: ['create', 'read'] },
    { resource: 'calendar', actions: ['read'] },
    { resource: 'animals', actions: ['read'] }
  ],

  Supervisor: [
    { resource: 'tasks', actions: ['create', 'read', 'update', 'assign'] },
    { resource: 'evidence', actions: ['read', 'approve', 'return', 'escalate'] },
    { resource: 'comments', actions: ['create', 'read', 'update'] },
    { resource: 'mentions', actions: ['create', 'read', 'update'] },
    { resource: 'calendar', actions: ['create', 'read', 'update'] },
    { resource: 'animals', actions: ['read', 'update'] },
    { resource: 'ai', actions: ['read'] }
  ],

  Management: [
    { resource: 'tasks', actions: ['create', 'read', 'update', 'assign'] },
    { resource: 'evidence', actions: ['read', 'approve', 'return'] },
    { resource: 'comments', actions: ['create', 'read', 'update'] },
    { resource: 'mentions', actions: ['create', 'read', 'update'] },
    { resource: 'calendar', actions: ['create', 'read', 'update'] },
    { resource: 'animals', actions: ['read', 'update'] },
    { resource: 'reports', actions: ['read', 'manage'] },
    { resource: 'ai', actions: ['read'] }
  ],

  Admin: [
    { resource: 'users', actions: ['create', 'read', 'update', 'delete', 'manage'] },
    { resource: 'roles', actions: ['create', 'read', 'update', 'delete', 'manage'] },
    { resource: 'tasks', actions: ['create', 'read', 'update', 'delete', 'assign', 'manage'] },
    { resource: 'evidence', actions: ['read', 'approve', 'return', 'manage'] },
    { resource: 'comments', actions: ['create', 'read', 'update', 'delete'] },
    { resource: 'mentions', actions: ['create', 'read', 'update', 'delete'] },
    { resource: 'calendar', actions: ['create', 'read', 'update', 'delete', 'manage'] },
    { resource: 'animals', actions: ['create', 'read', 'update', 'delete', 'manage'] },
    { resource: 'enclosures', actions: ['create', 'read', 'update', 'delete', 'manage'] },
    { resource: 'reports', actions: ['read', 'manage'] },
    { resource: 'ai', actions: ['read', 'manage'] }
  ]
};

async function upsertRole(name, description) {
  return Role.findOneAndUpdate(
    { name },
    { name, description, permissions: rolePermissions[name] },
    { upsert: true, new: true }
  );
}

async function upsertUser(data, role) {
  const passwordHash = await bcrypt.hash(data.password, 10);
  return User.findOneAndUpdate(
    { email: data.email },
    {
      fullName: data.fullName,
      email: data.email,
      passwordHash,
      role: role._id,
      jobTitle: data.jobTitle,
      active: true
    },
    { upsert: true, new: true }
  );
}

async function seed() {
  await connectDatabase();

  await Promise.all([
    Role.deleteMany({}),
    User.deleteMany({}),
    Zone.deleteMany({}),
    Enclosure.deleteMany({}),
    Animal.deleteMany({}),
    Task.deleteMany({}),
    Evidence.deleteMany({}),
    Comment.deleteMany({}),
    MentionThread.deleteMany({}),
    CalendarReminder.deleteMany({}),
    Notification.deleteMany({})
  ]);

  const keeperRole = await upsertRole('Keeper', 'Can complete assigned tasks and submit evidence.');
  const supervisorRole = await upsertRole('Supervisor', 'Can review keeper work, approve, request updates, and escalate.');
  const managementRole = await upsertRole('Management', 'Can view operations and return supervisor-approved evidence if needed.');
  const adminRole = await upsertRole('Admin', 'Can manage users, roles, settings, and all operational data.');

  const keeper = await upsertUser(
    { fullName: 'S. Ahmed', email: 'keeper@zooops.local', password: 'Password123', jobTitle: 'Keeper' },
    keeperRole
  );
  const supervisor = await upsertUser(
    { fullName: 'M. Khalid', email: 'supervisor@zooops.local', password: 'Password123', jobTitle: 'Supervisor' },
    supervisorRole
  );
  const manager = await upsertUser(
    { fullName: 'Tommy Wilken', email: 'manager@zooops.local', password: 'Password123', jobTitle: 'Manager' },
    managementRole
  );
  const admin = await upsertUser(
    { fullName: 'Admin User', email: 'admin@zooops.local', password: 'Password123', jobTitle: 'System Admin' },
    adminRole
  );

  const zone1 = await Zone.create({ name: 'Zone 1', description: 'Savannah and large animal area' });
  const zone4 = await Zone.create({ name: 'Zone 4', description: 'Aviary and highland area' });

  const savannahDeck1 = await Enclosure.create({ name: 'Savannah Deck 1', zone: zone1._id, type: 'Savannah' });
  const savannahDeck2 = await Enclosure.create({ name: 'Savannah Deck 2', zone: zone1._id, type: 'Savannah' });
  const aviaryNorth = await Enclosure.create({ name: 'Aviary North', zone: zone4._id, type: 'Aviary' });

  const kito = await Animal.create({
    name: 'Kito',
    species: 'Reticulated Giraffe',
    enclosure: savannahDeck1._id,
    sex: 'male',
    dietNotes: 'Acacia browse, hay, and approved pellets.',
    behaviorBaseline: {
      normalActivity: 'Browses in the morning and moves slowly around the enclosure.',
      normalFeeding: 'Usually eats most browse during morning checks.',
      normalSocialBehavior: 'Calm near platform and aware of herd activity.',
      warningSigns: ['Low appetite', 'Standing still for long periods', 'Slow approach to food']
    }
  });

  const sultan = await Animal.create({
    name: 'Sultan',
    species: 'African Lion',
    enclosure: savannahDeck2._id,
    sex: 'male',
    dietNotes: 'Raw meat portion based on diet plan.',
    behaviorBaseline: {
      normalActivity: 'Rests after morning feeding and patrols before noon.',
      normalFeeding: 'Usually finishes 80-100% of meat portion.',
      normalSocialBehavior: 'Responsive to pride activity.',
      warningSigns: ['No appetite', 'Isolation', 'Unusual aggression']
    }
  });

  const bimo = await Animal.create({
    name: 'Bimo',
    species: 'Sun Conure',
    enclosure: aviaryNorth._id,
    sex: 'unknown',
    dietNotes: 'Pellets, fruit, and vegetables.',
    behaviorBaseline: {
      normalActivity: 'Moves between upper perches and vocalizes during keeper rounds.',
      normalFeeding: 'Usually eats pellets and fruit in daylight.',
      normalSocialBehavior: 'Responsive to flock activity.',
      warningSigns: ['Low perch movement', 'Quiet behavior', 'No feeding']
    }
  });

  await User.updateOne(
    { _id: keeper._id },
    { assignedZones: [zone1._id, zone4._id], assignedEnclosures: [savannahDeck1._id, savannahDeck2._id, aviaryNorth._id] }
  );

  const task1 = await Task.create({
    title: 'Browse rack photo evidence',
    description: 'Upload browse rack photo and note if Kito approached the station.',
    taskType: 'evidence',
    priority: 'warning',
    status: 'submitted',
    dueDate: new Date('2026-07-28T08:50:00'),
    assignedTo: keeper._id,
    createdBy: supervisor._id,
    animal: kito._id,
    enclosure: savannahDeck1._id,
    zone: zone1._id,
    feedItem: 'Acacia browse station',
    keeperNote: 'Browse rack refilled and Kito approached after keeper moved back.',
    submittedAt: new Date('2026-07-28T09:15:00'),
    approvalHistory: [
      { action: 'created', by: supervisor._id, comment: 'Assigned from daily task plan.' },
      { action: 'submitted', by: keeper._id, comment: 'Evidence submitted for review.' }
    ]
  });

  const task2 = await Task.create({
    title: 'Feeding confirmation - Sultan',
    description: 'Confirm full portion served and record leftover amount.',
    taskType: 'feeding',
    priority: 'normal',
    status: 'supervisor_approved',
    dueDate: new Date('2026-07-28T08:00:00'),
    assignedTo: keeper._id,
    createdBy: supervisor._id,
    animal: sultan._id,
    enclosure: savannahDeck2._id,
    zone: zone1._id,
    feedItem: 'Raw meat 6kg',
    keeperNote: 'Ate full portion; no leftover.',
    submittedAt: new Date('2026-07-28T08:20:00'),
    supervisorApprovedAt: new Date('2026-07-28T08:40:00'),
    approvalHistory: [
      { action: 'created', by: supervisor._id },
      { action: 'submitted', by: keeper._id },
      { action: 'approved_by_supervisor', by: supervisor._id }
    ]
  });

  await Evidence.create({
    task: task1._id,
    note: 'Browse rack refilled and Kito approached after keeper moved back.',
    status: 'submitted',
    submittedBy: keeper._id,
    submittedAt: new Date('2026-07-28T09:15:00'),
    files: [
      {
        fileType: 'photo',
        fileName: 'kito-browse-rack.jpg',
        url: 'https://example.com/uploads/kito-browse-rack.jpg',
        uploadedBy: keeper._id
      },
      {
        fileType: 'pdf',
        fileName: 'keeper-evidence-report.pdf',
        url: 'https://example.com/uploads/keeper-evidence-report.pdf',
        uploadedBy: keeper._id
      }
    ]
  });

  await Comment.create({
    task: task1._id,
    author: supervisor._id,
    message: 'Please confirm if this needs a vet opinion before approval.',
    mentions: [manager._id],
    visibility: 'supervisor_manager'
  });

  await MentionThread.create({
    subject: 'Question about Kito browse evidence',
    task: task1._id,
    createdBy: supervisor._id,
    participants: [supervisor._id, manager._id],
    status: 'waiting_reply',
    messages: [
      {
        author: supervisor._id,
        message: '@Tommy Wilken can you confirm if this evidence is enough before I approve it?'
      }
    ]
  });

  await CalendarReminder.create({
    title: 'Weight check - Bimo',
    description: 'Routine weight check reminder from calendar.',
    animal: bimo._id,
    enclosure: aviaryNorth._id,
    zone: zone4._id,
    assignedTo: keeper._id,
    createdBy: supervisor._id,
    startAt: new Date('2026-07-28T11:00:00'),
    repeat: 'every_2_weeks',
    createsTask: true
  });

  await Notification.create({
    recipient: manager._id,
    title: 'New mention',
    message: 'M. Khalid mentioned you on Kito browse evidence.',
    type: 'mention',
    task: task1._id
  });

  console.log('Database seeded successfully.');
  console.log('Test users:');
  console.log('keeper@zooops.local / Password123');
  console.log('supervisor@zooops.local / Password123');
  console.log('manager@zooops.local / Password123');
  console.log('admin@zooops.local / Password123');

  process.exit(0);
}

seed().catch((error) => {
  console.error(error);
  process.exit(1);
});
