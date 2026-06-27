/**
 * Seed ~1000 test records for performance testing.
 *
 * Requires in .env:
 *   SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY  (Settings → API Keys → secret / service_role key)
 *
 * Run: npm run seed
 */

import { createClient } from "@supabase/supabase-js";

const OWNER_EMAIL = process.env.SEED_OWNER_EMAIL ?? "mohdshadab.552004@gmail.com";
const EMPLOYEE_COUNT = Number(process.env.SEED_EMPLOYEES ?? 100);
const CANDIDATE_COUNT = Number(process.env.SEED_CANDIDATES ?? 900);
const BATCH_SIZE = 100;
const CLEAR_FIRST = process.argv.includes("--clear");

const url = process.env.SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceKey) {
  console.error(
    "\nMissing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env\n" +
      "Add service role key from: Supabase Dashboard → Settings → API Keys → Secret keys\n",
  );
  process.exit(1);
}

const supabase = createClient(url, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const ROLES = ["Security Guard", "Housekeeping", "Driver", "Office Boy", "Supervisor", "Electrician", "Plumber"];
const CITIES = ["Mumbai", "Delhi", "Bangalore", "Pune", "Hyderabad", "Chennai", "Kolkata", "Ahmedabad"];
const DEPARTMENTS = ["Operations", "Admin", "Security", "Maintenance", "Logistics"];

function pick(arr, i) {
  return arr[i % arr.length];
}

async function findOwnerId() {
  const { data, error } = await supabase.auth.admin.listUsers({ perPage: 1000 });
  if (error) throw error;
  const user = data.users.find((u) => u.email?.toLowerCase() === OWNER_EMAIL.toLowerCase());
  if (!user) {
    throw new Error(`User not found: ${OWNER_EMAIL}. Sign up in the app first.`);
  }
  return user.id;
}

async function clearOwnerData(ownerId) {
  console.log("Clearing existing employees, candidates, job openings…");
  await supabase.from("salary_records").delete().eq("owner_id", ownerId);
  await supabase.from("employees").delete().eq("owner_id", ownerId);
  await supabase.from("candidates").delete().eq("owner_id", ownerId);
  await supabase.from("job_openings").delete().eq("owner_id", ownerId);
}

async function insertBatches(table, rows) {
  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const chunk = rows.slice(i, i + BATCH_SIZE);
    const { error } = await supabase.from(table).insert(chunk);
    if (error) throw new Error(`${table} batch ${i / BATCH_SIZE + 1}: ${error.message}`);
    process.stdout.write(`  ${table}: ${Math.min(i + BATCH_SIZE, rows.length)}/${rows.length}\r`);
  }
  console.log(`  ${table}: ${rows.length} rows inserted`);
}

function buildEmployees(ownerId) {
  return Array.from({ length: EMPLOYEE_COUNT }, (_, i) => {
    const n = i + 1;
    const city = pick(CITIES, i);
    return {
      owner_id: ownerId,
      employee_code: `EMP${String(n).padStart(4, "0")}`,
      full_name: `Test Employee ${n}`,
      email: `employee${n}@seed.test`,
      phone: `9198765${String(10000 + n).slice(-5)}`,
      position: pick(ROLES, i),
      department: pick(DEPARTMENTS, i),
      company: `Seed Corp ${(i % 10) + 1}`,
      joining_date: new Date(2023, i % 12, (i % 28) + 1).toISOString().slice(0, 10),
      base_salary: 12000 + (i % 50) * 500,
      bank_name: "HDFC Bank",
      bank_account_number: `50100${String(n).padStart(6, "0")}`,
      bank_ifsc: "HDFC0001234",
      bank_account_holder: `Test Employee ${n}`,
      status: i % 17 === 0 ? "inactive" : "active",
    };
  });
}

function buildCandidates(ownerId) {
  return Array.from({ length: CANDIDATE_COUNT }, (_, i) => {
    const n = i + 1;
    const city = pick(CITIES, i);
    const role = pick(ROLES, i);
    const current = 10000 + (i % 40) * 1000;
    return {
      owner_id: ownerId,
      full_name: `Test Candidate ${n}`,
      email: `candidate${n}@seed.test`,
      phone: `9191234${String(10000 + n).slice(-5)}`,
      job_role: role,
      description: `Experienced ${role.toLowerCase()} looking for work in ${city}. Seed record #${n}.`,
      current_salary: current,
      expected_salary: current + 2000 + (i % 10) * 500,
      current_location: city,
      preferred_locations: [city, pick(CITIES, i + 3)],
    };
  });
}

function buildJobOpenings(ownerId) {
  return Array.from({ length: 20 }, (_, i) => ({
    owner_id: ownerId,
    company_name: `Client Company ${i + 1}`,
    hr_name: `HR Manager ${i + 1}`,
    contact: `hr${i + 1}@client.test`,
    staff_position: pick(ROLES, i),
    staff_count: 5 + (i % 20),
    expected_salary: 15000 + i * 500,
    location: pick(CITIES, i),
    working_hours: "9 AM – 6 PM",
    bonus: i % 3 === 0 ? "Festival bonus" : null,
  }));
}

async function main() {
  console.log(`\nSeeding for: ${OWNER_EMAIL}`);
  console.log(`Target: ${EMPLOYEE_COUNT} employees + ${CANDIDATE_COUNT} candidates = ${EMPLOYEE_COUNT + CANDIDATE_COUNT} records\n`);

  const ownerId = await findOwnerId();
  console.log(`Owner ID: ${ownerId}\n`);

  if (CLEAR_FIRST) await clearOwnerData(ownerId);

  const employees = buildEmployees(ownerId);
  const candidates = buildCandidates(ownerId);
  const openings = buildJobOpenings(ownerId);

  console.log("Inserting employees…");
  await insertBatches("employees", employees);

  console.log("Inserting candidates…");
  await insertBatches("candidates", candidates);

  console.log("Inserting job openings…");
  await insertBatches("job_openings", openings);

  const { count: empCount } = await supabase
    .from("employees")
    .select("*", { count: "exact", head: true })
    .eq("owner_id", ownerId);
  const { count: candCount } = await supabase
    .from("candidates")
    .select("*", { count: "exact", head: true })
    .eq("owner_id", ownerId);

  console.log("\nDone!");
  console.log(`  Employees in DB: ${empCount}`);
  console.log(`  Candidates in DB: ${candCount}`);
  console.log("\nOpen http://localhost:8080 and test Employees / Candidates pages.\n");
}

main().catch((err) => {
  console.error("\nSeed failed:", err.message ?? err);
  process.exit(1);
});
