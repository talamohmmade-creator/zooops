const { Zone, Enclosure, Animal } = require('../models');

const defaultLocations = [
  { name: 'Zone 1', description: 'Zone 1 animal operations', enclosures: [
    { name: 'Enclosure 1A', animals: [{ name: 'Kito', species: 'Reticulated Giraffe' }] },
    { name: 'Enclosure 1B', animals: [{ name: 'Sultan', species: 'African Lion' }] }
  ] },
  { name: 'Zone 2', description: 'Zone 2 animal operations', enclosures: [
    { name: 'Enclosure 2A', animals: [{ name: 'Maya', species: 'Asian Elephant' }] },
    { name: 'Enclosure 2B', animals: [{ name: 'Rafi', species: 'White Rhinoceros' }] }
  ] },
  { name: 'Zone 3', description: 'Zone 3 animal operations', enclosures: [
    { name: 'Enclosure 3A', animals: [{ name: 'Luna', species: 'Arabian Oryx' }] },
    { name: 'Enclosure 3B', animals: [{ name: 'Nala', species: 'Cheetah' }] }
  ] },
  { name: 'Zone 4', description: 'Zone 4 animal operations', enclosures: [
    { name: 'Enclosure 4A', animals: [{ name: 'Bimo', species: 'Sun Conure' }] },
    { name: 'Enclosure 4B', animals: [{ name: 'Omar', species: 'Hamadryas Baboon' }] }
  ] }
];

async function ensureDefaultLocations() {
  for (const location of defaultLocations) {
    const zone = await Zone.findOneAndUpdate(
      { name: location.name },
      { $setOnInsert: { name: location.name, description: location.description } },
      { upsert: true, new: true }
    );
    for (const enclosureData of location.enclosures) {
      const enclosure = await Enclosure.findOneAndUpdate(
        { name: enclosureData.name, zone: zone._id },
        { $setOnInsert: { name: enclosureData.name, zone: zone._id, type: 'General', status: 'active' } },
        { upsert: true, new: true }
      );
      await Promise.all(enclosureData.animals.map((animal) => Animal.updateOne(
        { name: animal.name, enclosure: enclosure._id },
        { $setOnInsert: { ...animal, enclosure: enclosure._id, active: true } },
        { upsert: true }
      )));
    }
  }
}

module.exports = ensureDefaultLocations;
