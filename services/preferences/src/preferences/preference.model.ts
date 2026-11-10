import { Schema, model } from 'mongoose';

export interface Preference {
  _id: string;
  optedOut: boolean;
  updatedAt: Date;
}

const preferenceSchema = new Schema<Preference>(
  {
    _id: { type: String, required: true },
    optedOut: { type: Boolean, required: true, default: false },
  },
  {
    versionKey: false,
    collection: 'preferences',
    timestamps: { createdAt: false, updatedAt: true },
  },
);

export const PreferenceModel = model<Preference>('Preference', preferenceSchema);
