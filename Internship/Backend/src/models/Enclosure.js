const mongoose = require('mongoose');

const enclosureSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true
    },
    zone: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Zone',
      required: true
    },
    type: {
      type: String,
      trim: true
    },
    status: {
      type: String,
      enum: ['active', 'maintenance', 'closed'],
      default: 'active'
    },
    notes: {
      type: String,
      trim: true
    }
  },
  { timestamps: true }
);

enclosureSchema.index({ name: 1, zone: 1 }, { unique: true });

module.exports = mongoose.model('Enclosure', enclosureSchema);
