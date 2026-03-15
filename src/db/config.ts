// src/db/config.ts
import { defineDb, defineTable, column } from 'astro:db';

const Clubs = defineTable({
  columns: {
    id: column.text({ primaryKey: true }),
    name: column.text(),
    description: column.text(),
    dues: column.number(), // For Stripe
  }
});

export default defineDb({
  tables: { Clubs },
});