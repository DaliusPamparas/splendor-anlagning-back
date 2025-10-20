/**
 * Seed script for Maintenance Templates
 * 
 * SETUP:
 * 1. Go to http://localhost:1337/admin
 * 2. Login as admin
 * 3. Settings → API Tokens → Create new API Token
 * 4. Name: "Seed Script"
 * 5. Token type: Full Access
 * 6. Copy the token
 * 
 * RUN:
 * export STRAPI_API_TOKEN=your-token-here
 * node seed-maintenance-templates.js
 */

const templates = [
  {
    name: 'Oljebyte 250h',
    description: 'Standard oljebyte var 250 driftstimmar',
    category: 'oil',
    interval: {
      type: 'hours',
      everyHours: 250,
      thresholdHours: 50
    },
    default_tasks: [
      { id: 't-oil-1', title: 'Tappa ur motorolja', estimatedMinutes: 20 },
      { id: 't-oil-2', title: 'Byt oljefilter', estimatedMinutes: 10, requiredParts: [{ name: 'Oljefilter', quantity: 1 }] },
      { id: 't-oil-3', title: 'Fyll på ny olja', estimatedMinutes: 10, requiredParts: [{ name: 'Motorolja 5W-30', quantity: 5 }] },
      { id: 't-oil-4', title: 'Återställ servicelampa', estimatedMinutes: 5 },
    ],
    is_active: true,
  },
  {
    name: 'Hydraulikservice 1000h',
    description: 'Byt hydraulikfilter och kontrollera system',
    category: 'hydraulic',
    interval: {
      type: 'hours',
      everyHours: 1000,
      thresholdHours: 100
    },
    default_tasks: [
      { id: 't-hyd-1', title: 'Kontrollera hydrauliknivå', estimatedMinutes: 10 },
      { id: 't-hyd-2', title: 'Byt hydraulikfilter', estimatedMinutes: 20, requiredParts: [{ name: 'Hydraulikfilter', quantity: 1 }] },
      { id: 't-hyd-3', title: 'Provkör hydraulikfunktioner', estimatedMinutes: 15 },
    ],
    is_active: true,
  },
  {
    name: 'Årlig Inspektion',
    description: 'Full säkerhets- och funktionsinspektion (årlig)',
    category: 'inspection',
    interval: {
      type: 'time',
      everyDays: 365,
      thresholdDays: 30
    },
    default_tasks: [
      { id: 't-ins-1', title: 'Säkerhetsinspektion bromsar', estimatedMinutes: 20 },
      { id: 't-ins-2', title: 'Kontrollera styrning', estimatedMinutes: 15 },
      { id: 't-ins-3', title: 'Kontrollera belysning och elsystem', estimatedMinutes: 15 },
      { id: 't-ins-4', title: 'Däck & mönsterdjup', estimatedMinutes: 10 },
    ],
    is_active: true,
  },
  {
    name: 'Kylsystemservice',
    description: 'Kontroll och byte av kylarvätska',
    category: 'coolant',
    interval: {
      type: 'time',
      everyDays: 730,
      thresholdDays: 60
    },
    default_tasks: [
      { id: 't-cool-1', title: 'Kontrollera kylarvätska', estimatedMinutes: 10 },
      { id: 't-cool-2', title: 'Spola kylsystem', estimatedMinutes: 30 },
      { id: 't-cool-3', title: 'Fyll på ny kylarvätska', estimatedMinutes: 15, requiredParts: [{ name: 'Kylarvätska', quantity: 10 }] },
    ],
    is_active: true,
  },
  {
    name: 'Däckservice',
    description: 'Däckrotation och däcktryckskontroll',
    category: 'tires',
    interval: {
      type: 'hours',
      everyHours: 500,
      thresholdHours: 50
    },
    default_tasks: [
      { id: 't-tire-1', title: 'Kontrollera däcktryck', estimatedMinutes: 15 },
      { id: 't-tire-2', title: 'Rotera däck', estimatedMinutes: 45 },
      { id: 't-tire-3', title: 'Kontrollera mönsterdjup', estimatedMinutes: 10 },
    ],
    is_active: true,
  },
];

async function seedTemplates() {
  const STRAPI_URL = process.env.STRAPI_URL || 'http://localhost:1337';
  const STRAPI_TOKEN = process.env.STRAPI_API_TOKEN;

  if (!STRAPI_TOKEN) {
    console.error('❌ STRAPI_API_TOKEN not found in environment variables');
    console.log('');
    console.log('📝 HOW TO CREATE AN API TOKEN:');
    console.log('1. Go to http://localhost:1337/admin');
    console.log('2. Login as admin');
    console.log('3. Settings → API Tokens → Create new API Token');
    console.log('4. Name: "Seed Script"');
    console.log('5. Token type: Full Access');
    console.log('6. Token duration: Unlimited');
    console.log('7. Copy the token');
    console.log('');
    console.log('📝 THEN RUN:');
    console.log('export STRAPI_API_TOKEN=your-token-here');
    console.log('node seed-maintenance-templates.js');
    console.log('');
    process.exit(1);
  }

  console.log('🌱 Starting to seed maintenance templates...\n');

  for (const template of templates) {
    try {
      const response = await fetch(`${STRAPI_URL}/api/maintenancetemplates`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${STRAPI_TOKEN}`,
        },
        body: JSON.stringify({ data: template }),
      });

      if (response.ok) {
        const result = await response.json();
        console.log(`✅ Created template: ${template.name} (ID: ${result.data.id})`);
      } else {
        const error = await response.text();
        console.error(`❌ Failed to create template: ${template.name}`);
        console.error(`   Error: ${error}`);
      }
    } catch (error) {
      console.error(`❌ Error creating template: ${template.name}`);
      console.error(`   ${error.message}`);
    }
  }

  console.log('\n✨ Seeding completed!');
}

seedTemplates();

