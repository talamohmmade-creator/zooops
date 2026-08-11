const mongoose = require('mongoose');

const behaviorBaselineSchema = new mongoose.Schema(
  {
    normalActivity: String,
    normalFeeding: String,
    normalSocialBehavior: String,
    warningSigns: [String]
  },
  { _id: false }
);

const animalSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true
    },
    species: {
      type: String,
      required: true,
      trim: true
    },
    enclosure: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Enclosure',
      required: true
    },
    dateOfBirth: Date,
    sex: {
      type: String,
      enum: ['male', 'female', 'unknown'],
      default: 'unknown'
    },
    dietNotes: String,
    medicalNotes: String,
    behaviorBaseline: behaviorBaselineSchema,
    active: {
      type: Boolean,
      default: true
    }
  },
  { timestamps: true }
);

animalSchema.index({ name: 1, enclosure: 1 });

module.exports = mongoose.model('Animal', animalSchema);
