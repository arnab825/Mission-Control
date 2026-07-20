import mongoose, { Schema, Document } from "mongoose";

export interface ISpec {
  label: string;
  val: string;
}

export interface IArchitectureComponent extends Document {
  id: string; // The identifier, e.g. "parallel-hardware"
  num: string; // e.g. "01"
  iconName: string; // e.g. "Activity"
  title: string;
  subTitle: string;
  desc: string;
  specs: ISpec[];
  order: number;
}

const SpecSchema = new Schema<ISpec>({
  label: { type: String, required: true },
  val: { type: String, required: true },
});

const ArchitectureComponentSchema = new Schema<IArchitectureComponent>(
  {
    id: { type: String, required: true, unique: true, index: true },
    num: { type: String, required: true },
    iconName: { type: String, required: true },
    title: { type: String, required: true },
    subTitle: { type: String, required: true },
    desc: { type: String, required: true },
    specs: { type: [SpecSchema], default: [] },
    order: { type: Number, default: 0 },
  },
  { timestamps: true }
);

export default mongoose.models.ArchitectureComponent ||
  mongoose.model<IArchitectureComponent>("ArchitectureComponent", ArchitectureComponentSchema);
