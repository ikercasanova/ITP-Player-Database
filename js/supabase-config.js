'use strict';

/* ═══════════════════════════════════════════════════════════════
   supabase-config.js — Supabase client initialization
═══════════════════════════════════════════════════════════════ */

const SUPABASE_URL = 'https://vnwjgmzckpmgjxzdwjmb.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZud2pnbXpja3BtZ2p4emR3am1iIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQxNzI0MzUsImV4cCI6MjA4OTc0ODQzNX0.NR-yRa2Mpzk3IkHie6hsoBhf4rTsYoXax2CDNNQCJ3o';

const supa = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
