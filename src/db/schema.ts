import { sqliteTable, integer, text, real } from "drizzle-orm/sqlite-core";

export const trainSnapshots = sqliteTable("train_snapshots", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  capturedAt: text("captured_at").notNull(),
  trainNo: text("train_no"),
  line: text("line"),
  origin: text("origin"),
  destination: text("destination"),
  lateMin: integer("late_min").notNull().default(0),
  status: text("status"),
});
