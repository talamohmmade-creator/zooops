const { Zone, Enclosure } = require('../models');

const defaultLocations = [
  { name: 'Zone 1', description: 'Zone 1 animal operations', enclosures: ['Enclosure 1A', 'Enclosure 1B'] },
  { name: 'Zone 2', description: 'Zone 2 animal operations', enclosures: ['Enclosure 2A', 'Enclosure 2B'] },
  { name: 'Zone 3', description: 'Zone 3 animal operations', enclosures: ['Enclosure 3A', 'Enclosure 3B'] },
  { name: 'Zone 4', description: 'Zone 4 animal operations', enclosures: ['Enclosure 4A', 'Enclosure 4B'] }
];

async function ensureDefaultLocations() {
  for (const location of defaultLocations) {
    const zone = await Zone.findOneAndUpdate(
      { name: location.name },
      { $setOnInsert: { name: location.name, description: location.description } },
      { upsert: true, new: true }
    );
    await Promise.all(location.enclosures.map((name) => Enclosure.updateOne(
      { name, zone: zone._id },
      { $setOnInsert: { name, zone: zone._id, type: 'General', status: 'active' } },
      { upsert: true }
    )));
  }
}

module.exports = ensureDefaultLocations;
