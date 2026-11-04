import mongoose from 'mongoose';

export async function connectDB() {
  const uri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/partnerpulse';
  mongoose.set('strictQuery', true);
  try {
    await mongoose.connect(uri, { serverSelectionTimeoutMS: 5000 });
    console.log(`MongoDB connected: ${mongoose.connection.host}/${mongoose.connection.name}`);
    // Drop indexes left behind by older versions of the schema (e.g. a unique deliveryNumber),
    // which would otherwise reject new records as "already in use".
    for (const name of mongoose.modelNames()) {
      try {
        const dropped = await mongoose.model(name).syncIndexes();
        if (dropped.length) console.log(`Removed stale ${name} indexes: ${dropped.join(', ')}`);
      } catch (e) {
        console.warn(`Could not sync ${name} indexes: ${e.message}`);
      }
    }
  } catch (err) {
    console.error('\nCould not reach MongoDB at', uri);
    console.error('Start the MongoDB service (or open Compass and connect) and try again.\n');
    throw err;
  }
}
