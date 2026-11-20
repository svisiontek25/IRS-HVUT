import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import {
  AuditLog,
  BusinessEntity,
  FilingStatus,
  FormType,
  NotificationLog,
  ReturnFiling,
  SimulatorConfig,
  User,
  UserRole,
  Vehicle,
} from "../adapters/types";

function resolveDataDir(): string {
  if (process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME) {
    return path.join(os.tmpdir(), "irs-hvut-data");
  }
  const localDir = path.join(process.cwd(), "data");
  try {
    if (!fs.existsSync(localDir)) {
      fs.mkdirSync(localDir, { recursive: true });
    }
    fs.accessSync(localDir, fs.constants.W_OK);
    return localDir;
  } catch {
    return path.join(os.tmpdir(), "irs-hvut-data");
  }
}

const DATA_DIR = resolveDataDir();
const DB_PATH = path.join(DATA_DIR, "hvut-poc.db");

let dbInstance: DatabaseSync | null = null;

export function makeDisplayReturnId(formType: FormType, taxYear: string): string {
  const yr = (taxYear.split("-")[0] || "2026").slice(-2);
  const prefix =
    formType === "2290_ORIG"
      ? `F${yr}`
      : formType === "2290_AMEND"
        ? `A${yr}`
        : formType === "2290_VIN_CORR"
          ? `V${yr}`
          : `C${yr}`;
  const now = new Date();
  const mmdd = `${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}`;
  const suffix = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `${prefix}-${mmdd}-${suffix}`;
}

function ensureColumn(db: DatabaseSync, table: string, column: string, def: string) {
  const cols = db.prepare(`PRAGMA table_info(${table})`).all() as { name: string }[];
  if (!cols.some((c) => c.name === column)) {
    db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${def}`);
  }
}

export function getDb(): DatabaseSync {
  if (dbInstance) return dbInstance;
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  const db = new DatabaseSync(DB_PATH);
  try {
    db.exec("PRAGMA journal_mode = WAL;");
  } catch {
    // Fallback to default journal mode on read-only or ephemeral /tmp filesystems
  }
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT NOT NULL,
      name TEXT NOT NULL,
      role TEXT NOT NULL,
      mfa_enabled INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      metadata_json TEXT
    );

    CREATE TABLE IF NOT EXISTS businesses (
      id TEXT PRIMARY KEY,
      owner_user_id TEXT NOT NULL,
      ein TEXT NOT NULL,
      legal_name TEXT NOT NULL,
      name_control TEXT NOT NULL,
      dba TEXT,
      address_line1 TEXT NOT NULL,
      city TEXT NOT NULL,
      state TEXT NOT NULL,
      zip TEXT NOT NULL,
      signing_authority_name TEXT NOT NULL,
      signing_authority_title TEXT NOT NULL,
      phone TEXT NOT NULL,
      metadata_json TEXT
    );

    CREATE TABLE IF NOT EXISTS vehicles (
      id TEXT PRIMARY KEY,
      business_id TEXT NOT NULL,
      vin TEXT NOT NULL,
      unit_number TEXT,
      default_weight_category TEXT NOT NULL,
      is_logging INTEGER NOT NULL DEFAULT 0,
      is_agricultural INTEGER NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'ACTIVE'
    );

    CREATE TABLE IF NOT EXISTS filings (
      id TEXT PRIMARY KEY,
      business_id TEXT NOT NULL,
      form_type TEXT NOT NULL,
      tax_year TEXT NOT NULL,
      first_used_month INTEGER NOT NULL,
      address_change INTEGER NOT NULL DEFAULT 0,
      final_return INTEGER NOT NULL DEFAULT 0,
      amended_reason TEXT,
      status TEXT NOT NULL,
      irs_submission_id TEXT,
      mef_xml TEXT,
      rejection_code TEXT,
      rejection_message TEXT,
      pin_signature TEXT,
      total_tax_due REAL NOT NULL,
      total_credits REAL NOT NULL,
      net_tax_due REAL NOT NULL,
      created_at TEXT NOT NULL,
      submitted_at TEXT,
      accepted_at TEXT,
      payload_json TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS notifications (
      id TEXT PRIMARY KEY,
      filing_id TEXT,
      channel TEXT NOT NULL,
      recipient TEXT NOT NULL,
      subject TEXT NOT NULL,
      body TEXT NOT NULL,
      attachment_url TEXT,
      read INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS audit_logs (
      id TEXT PRIMARY KEY,
      actor_role TEXT NOT NULL,
      actor_name TEXT NOT NULL,
      action TEXT NOT NULL,
      entity_type TEXT NOT NULL,
      entity_id TEXT NOT NULL,
      details TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS simulator_config (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      mode TEXT NOT NULL,
      simulated_delay_ms INTEGER NOT NULL,
      forced_reject_code TEXT NOT NULL,
      efin TEXT NOT NULL,
      etin TEXT NOT NULL,
      software_id TEXT NOT NULL
    );
  `);

  ensureColumn(db, "users", "metadata_json", "TEXT");
  ensureColumn(db, "businesses", "metadata_json", "TEXT");

  dbInstance = db;
  seedIfEmpty(db);
  purgeSeededDummyData(db);
  return db;
}

function purgeSeededDummyData(db: DatabaseSync) {
  const dummyBizIds = [
    "biz-mike",
    "biz-basra",
    "biz-summit",
    "biz-logging",
    "biz-ag",
    "biz-cpa-1",
    "biz-cpa-2",
  ];
  const dummyUserIds = ["usr-owner", "usr-fleet", "usr-cpa", "usr-admin"];
  const bizPlaceholders = dummyBizIds.map(() => "?").join(",");
  const userPlaceholders = dummyUserIds.map(() => "?").join(",");

  db.prepare(
    `DELETE FROM notifications WHERE id = 'NOTIF-SEED-1' OR filing_id IN (SELECT id FROM filings WHERE business_id IN (${bizPlaceholders}))`,
  ).run(...dummyBizIds);
  db.prepare(
    `DELETE FROM filings WHERE business_id IN (${bizPlaceholders}) OR id IN ('FIL-2025-1001', 'FIL-2026-1106', 'FIL-2026-2001')`,
  ).run(...dummyBizIds);
  db.prepare(`DELETE FROM vehicles WHERE business_id IN (${bizPlaceholders})`).run(...dummyBizIds);
  db.prepare(`DELETE FROM businesses WHERE id IN (${bizPlaceholders}) OR owner_user_id IN (${userPlaceholders})`).run(
    ...dummyBizIds,
    ...dummyUserIds,
  );
  db.prepare(`DELETE FROM users WHERE id IN (${userPlaceholders})`).run(...dummyUserIds);
}

function seedIfEmpty(db: DatabaseSync) {
  const cfgRow = db.prepare("SELECT COUNT(*) as cnt FROM simulator_config").get() as { cnt: number };
  if (cfgRow.cnt === 0) {
    db.prepare(
      "INSERT INTO simulator_config (id, mode, simulated_delay_ms, forced_reject_code, efin, etin, software_id) VALUES (1, ?, ?, ?, ?, ?, ?)",
    ).run("AUTO_ACCEPT", 500, "F2290-001", "990001", "SIM01", "HVUT2290-V11");
  }
}

function saveFilingInternal(db: DatabaseSync, filing: ReturnFiling) {
  db.prepare(
    `INSERT OR REPLACE INTO filings (
      id, business_id, form_type, tax_year, first_used_month, address_change, final_return,
      amended_reason, status, irs_submission_id, mef_xml, rejection_code, rejection_message,
      pin_signature, total_tax_due, total_credits, net_tax_due, created_at, submitted_at, accepted_at, payload_json
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    filing.id,
    filing.businessId,
    filing.formType,
    filing.taxYear,
    filing.firstUsedMonth,
    filing.addressChange ? 1 : 0,
    filing.finalReturn ? 1 : 0,
    filing.amendedReason ?? null,
    filing.status,
    filing.irsSubmissionId ?? null,
    filing.mefXml ?? null,
    filing.rejectionCode ?? null,
    filing.rejectionMessage ?? null,
    filing.pinSignature ?? null,
    filing.totalTaxDue,
    filing.totalCredits,
    filing.netTaxDue,
    filing.createdAt,
    filing.submittedAt ?? null,
    filing.acceptedAt ?? null,
    JSON.stringify({
      displayReturnId: filing.displayReturnId,
      eFileMethod: filing.eFileMethod,
      thirdPartyAssigned: filing.thirdPartyAssigned,
      consentToDisclosure: filing.consentToDisclosure,
      priorYearSuspendedAllUnderLimit: filing.priorYearSuspendedAllUnderLimit,
      packageType: filing.packageType,
      additionalEmails: filing.additionalEmails,
      stampedPdfUrl: filing.stampedPdfUrl,
      submissionStatusDetails: filing.submissionStatusDetails,
      lines: filing.lines,
      serviceOrder: filing.serviceOrder,
      taxPayment: filing.taxPayment,
    }),
  );
}

function rowToFiling(row: Record<string, unknown>): ReturnFiling {
  const payload = JSON.parse(String(row.payload_json || "{}")) as {
    displayReturnId?: string;
    eFileMethod?: boolean;
    thirdPartyAssigned?: boolean;
    consentToDisclosure?: boolean;
    priorYearSuspendedAllUnderLimit?: boolean;
    packageType?: ReturnFiling["packageType"];
    additionalEmails?: string;
    stampedPdfUrl?: string;
    submissionStatusDetails?: string;
    lines?: ReturnFiling["lines"];
    serviceOrder?: ReturnFiling["serviceOrder"];
    taxPayment?: ReturnFiling["taxPayment"];
  };
  return {
    id: String(row.id),
    displayReturnId: payload.displayReturnId,
    businessId: String(row.business_id),
    formType: row.form_type as ReturnFiling["formType"],
    taxYear: String(row.tax_year),
    firstUsedMonth: Number(row.first_used_month),
    addressChange: Boolean(row.address_change),
    finalReturn: Boolean(row.final_return),
    eFileMethod: payload.eFileMethod ?? true,
    thirdPartyAssigned: payload.thirdPartyAssigned ?? false,
    consentToDisclosure: payload.consentToDisclosure ?? true,
    priorYearSuspendedAllUnderLimit: payload.priorYearSuspendedAllUnderLimit ?? false,
    packageType: payload.packageType,
    additionalEmails: payload.additionalEmails,
    amendedReason: row.amended_reason
      ? (String(row.amended_reason) as ReturnFiling["amendedReason"])
      : undefined,
    status: row.status as FilingStatus,
    irsSubmissionId: row.irs_submission_id ? String(row.irs_submission_id) : undefined,
    mefXml: row.mef_xml ? String(row.mef_xml) : undefined,
    rejectionCode: row.rejection_code ? String(row.rejection_code) : undefined,
    rejectionMessage: row.rejection_message ? String(row.rejection_message) : undefined,
    pinSignature: row.pin_signature ? String(row.pin_signature) : undefined,
    stampedPdfUrl: payload.stampedPdfUrl,
    submissionStatusDetails: payload.submissionStatusDetails,
    totalTaxDue: Number(row.total_tax_due),
    totalCredits: Number(row.total_credits),
    netTaxDue: Number(row.net_tax_due),
    createdAt: String(row.created_at),
    submittedAt: row.submitted_at ? String(row.submitted_at) : undefined,
    acceptedAt: row.accepted_at ? String(row.accepted_at) : undefined,
    lines: payload.lines ?? [],
    serviceOrder: payload.serviceOrder,
    taxPayment: payload.taxPayment,
  };
}

function rowToUser(r: Record<string, unknown>): User {
  const meta = JSON.parse(String(r.metadata_json || "{}")) as Partial<User>;
  return {
    id: String(r.id),
    email: String(r.email),
    name: String(r.name),
    firstName: meta.firstName,
    lastName: meta.lastName,
    phone: meta.phone,
    password: meta.password,
    role: r.role as UserRole,
    mfaEnabled: Boolean(r.mfa_enabled),
    createdAt: String(r.created_at),
  };
}

function rowToBusiness(r: Record<string, unknown>): BusinessEntity {
  const meta = JSON.parse(String(r.metadata_json || "{}")) as Partial<BusinessEntity>;
  return {
    id: String(r.id),
    ownerUserId: String(r.owner_user_id),
    ein: String(r.ein),
    legalName: String(r.legal_name),
    nameControl: String(r.name_control),
    dba: r.dba ? String(r.dba) : undefined,
    businessType: meta.businessType ?? "LLC",
    addressLine1: String(r.address_line1),
    roomSuite: meta.roomSuite,
    city: String(r.city),
    otherCity: meta.otherCity,
    state: String(r.state),
    country: meta.country ?? "US",
    zip: String(r.zip),
    cellNumber: meta.cellNumber,
    pocName: meta.pocName,
    pocEmail: meta.pocEmail,
    pocPhone: meta.pocPhone,
    signingAuthorityName: String(r.signing_authority_name),
    signingAuthorityTitle: String(r.signing_authority_title),
    signingAuthorityEmail: meta.signingAuthorityEmail,
    phone: String(r.phone),
    thirdPartyDesignee: meta.thirdPartyDesignee,
  };
}

export function listUsers(): User[] {
  const db = getDb();
  const rows = db.prepare("SELECT * FROM users").all() as Record<string, unknown>[];
  return rows.map(rowToUser);
}

export function createUser(user: User): User {
  const db = getDb();
  db.prepare(
    `INSERT OR REPLACE INTO users (id, email, name, role, mfa_enabled, created_at, metadata_json)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    user.id,
    user.email,
    user.name,
    user.role,
    user.mfaEnabled ? 1 : 0,
    user.createdAt,
    JSON.stringify({
      firstName: user.firstName,
      lastName: user.lastName,
      phone: user.phone,
      password: user.password,
    }),
  );
  return user;
}

export function listBusinesses(ownerUserId?: string): BusinessEntity[] {
  const db = getDb();
  const rows = (
    ownerUserId
      ? db.prepare("SELECT * FROM businesses WHERE owner_user_id = ?").all(ownerUserId)
      : db.prepare("SELECT * FROM businesses").all()
  ) as Record<string, unknown>[];
  return rows.map(rowToBusiness);
}

export function getBusinessById(id: string): BusinessEntity | null {
  const db = getDb();
  const row = db.prepare("SELECT * FROM businesses WHERE id = ?").get(id) as Record<string, unknown> | undefined;
  return row ? rowToBusiness(row) : null;
}

export function upsertBusiness(biz: BusinessEntity): BusinessEntity {
  const db = getDb();
  db.prepare(
    `INSERT OR REPLACE INTO businesses (
      id, owner_user_id, ein, legal_name, name_control, dba, address_line1, city, state, zip,
      signing_authority_name, signing_authority_title, phone, metadata_json
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    biz.id,
    biz.ownerUserId,
    biz.ein,
    biz.legalName,
    biz.nameControl,
    biz.dba ?? null,
    biz.addressLine1,
    biz.city,
    biz.state,
    biz.zip,
    biz.signingAuthorityName,
    biz.signingAuthorityTitle,
    biz.phone,
    JSON.stringify({
      businessType: biz.businessType,
      country: biz.country,
      roomSuite: biz.roomSuite,
      otherCity: biz.otherCity,
      cellNumber: biz.cellNumber,
      pocName: biz.pocName,
      pocEmail: biz.pocEmail,
      pocPhone: biz.pocPhone,
      signingAuthorityEmail: biz.signingAuthorityEmail,
      thirdPartyDesignee: biz.thirdPartyDesignee,
    }),
  );
  return biz;
}

export function listVehicles(businessId?: string): Vehicle[] {
  const db = getDb();
  const rows = (
    businessId
      ? db.prepare("SELECT * FROM vehicles WHERE business_id = ?").all(businessId)
      : db.prepare("SELECT * FROM vehicles").all()
  ) as Record<string, unknown>[];

  return rows.map((r) => ({
    id: String(r.id),
    businessId: String(r.business_id),
    vin: String(r.vin),
    unitNumber: r.unit_number ? String(r.unit_number) : undefined,
    defaultWeightCategory: String(r.default_weight_category) as Vehicle["defaultWeightCategory"],
    isLogging: Boolean(r.is_logging),
    isAgricultural: Boolean(r.is_agricultural),
    status: String(r.status) as Vehicle["status"],
  }));
}

export function upsertVehicle(veh: Vehicle): Vehicle {
  const db = getDb();
  db.prepare(
    `INSERT OR REPLACE INTO vehicles (id, business_id, vin, unit_number, default_weight_category, is_logging, is_agricultural, status)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    veh.id,
    veh.businessId,
    veh.vin,
    veh.unitNumber ?? null,
    veh.defaultWeightCategory,
    veh.isLogging ? 1 : 0,
    veh.isAgricultural ? 1 : 0,
    veh.status,
  );
  return veh;
}

export function listFilings(businessId?: string): ReturnFiling[] {
  const db = getDb();
  const rows = (
    businessId
      ? db.prepare("SELECT * FROM filings WHERE business_id = ? ORDER BY created_at DESC").all(businessId)
      : db.prepare("SELECT * FROM filings ORDER BY created_at DESC").all()
  ) as Record<string, unknown>[];
  return rows.map(rowToFiling);
}

export function getFilingById(id: string): ReturnFiling | null {
  const db = getDb();
  const row = db.prepare("SELECT * FROM filings WHERE id = ?").get(id) as Record<string, unknown> | undefined;
  return row ? rowToFiling(row) : null;
}

export function saveFiling(filing: ReturnFiling): ReturnFiling {
  const db = getDb();
  saveFilingInternal(db, filing);
  return filing;
}

export function getAcceptedVinsForBusinessTaxYear(
  businessId: string,
  taxYear: string,
  excludeFilingId?: string,
): string[] {
  const filings = listFilings(businessId).filter(
    (f) => f.taxYear === taxYear && f.status === "ACCEPTED" && f.id !== excludeFilingId,
  );
  const vins = new Set<string>();
  for (const f of filings) {
    for (const line of f.lines) {
      if (line.lineType === "TAXABLE" || line.lineType === "SUSPENDED") {
        vins.add(line.vin.toUpperCase());
      }
    }
  }
  return Array.from(vins);
}

export function getSimulatorConfig(): SimulatorConfig {
  const db = getDb();
  const row = db.prepare("SELECT * FROM simulator_config WHERE id = 1").get() as Record<string, unknown>;
  return {
    mode: row.mode as SimulatorConfig["mode"],
    simulatedDelayMs: Number(row.simulated_delay_ms),
    forcedRejectCode: String(row.forced_reject_code),
    efin: String(row.efin),
    etin: String(row.etin),
    softwareId: String(row.software_id),
  };
}

export function updateSimulatorConfig(partial: Partial<SimulatorConfig>): SimulatorConfig {
  const db = getDb();
  const current = getSimulatorConfig();
  const next = { ...current, ...partial };
  db.prepare(
    `UPDATE simulator_config
     SET mode = ?, simulated_delay_ms = ?, forced_reject_code = ?, efin = ?, etin = ?, software_id = ?
     WHERE id = 1`,
  ).run(next.mode, next.simulatedDelayMs, next.forcedRejectCode, next.efin, next.etin, next.softwareId);
  return next;
}

export function listNotifications(): NotificationLog[] {
  const db = getDb();
  const rows = db.prepare("SELECT * FROM notifications ORDER BY created_at DESC LIMIT 50").all() as Record<string, unknown>[];
  return rows.map((r) => ({
    id: String(r.id),
    filingId: r.filing_id ? String(r.filing_id) : undefined,
    channel: r.channel as NotificationLog["channel"],
    recipient: String(r.recipient),
    subject: String(r.subject),
    body: String(r.body),
    attachmentUrl: r.attachment_url ? String(r.attachment_url) : undefined,
    read: Boolean(r.read),
    createdAt: String(r.created_at),
  }));
}

export function addNotification(
  entry: Omit<NotificationLog, "id" | "read" | "createdAt">,
): NotificationLog {
  const db = getDb();
  const notif: NotificationLog = {
    ...entry,
    id: `NOTIF-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    read: false,
    createdAt: new Date().toISOString(),
  };
  db.prepare(
    `INSERT INTO notifications (id, filing_id, channel, recipient, subject, body, attachment_url, read, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    notif.id,
    notif.filingId ?? null,
    notif.channel,
    notif.recipient,
    notif.subject,
    notif.body,
    notif.attachmentUrl ?? null,
    0,
    notif.createdAt,
  );
  return notif;
}

export function markAllNotificationsRead() {
  const db = getDb();
  db.prepare("UPDATE notifications SET read = 1").run();
}

export function listAuditLogs(): AuditLog[] {
  const db = getDb();
  const rows = db.prepare("SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT 100").all() as Record<string, unknown>[];
  return rows.map((r) => ({
    id: String(r.id),
    actorRole: r.actor_role as UserRole,
    actorName: String(r.actor_name),
    action: String(r.action),
    entityType: String(r.entity_type),
    entityId: String(r.entity_id),
    details: String(r.details),
    createdAt: String(r.created_at),
  }));
}

export function addAuditLog(entry: Omit<AuditLog, "id" | "createdAt">) {
  const db = getDb();
  const id = `AUD-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
  const createdAt = new Date().toISOString();
  db.prepare(
    `INSERT INTO audit_logs (id, actor_role, actor_name, action, entity_type, entity_id, details, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(id, entry.actorRole, entry.actorName, entry.action, entry.entityType, entry.entityId, entry.details, createdAt);
}

export function resetAndReseedDatabase() {
  const db = getDb();
  db.exec(`
    DELETE FROM notifications;
    DELETE FROM audit_logs;
    DELETE FROM filings;
    DELETE FROM vehicles;
    DELETE FROM businesses;
    DELETE FROM users;
    DELETE FROM simulator_config;
  `);
  seedIfEmpty(db);
}
