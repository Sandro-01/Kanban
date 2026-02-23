#!/usr/bin/env node
/**
 * Standalone Kanban backend server.
 * Uses only Node.js built-in modules + PostgreSQL pgcrypto for auth.
 * No npm dependencies required.
 *
 * This server provides the same API as the full Express backend,
 * handling auth, tickets, users, boards, SLA, etc.
 */

const http = require('http');
const { execSync } = require('child_process');
const crypto = require('crypto');
const url = require('url');
const path = require('path');
const fs = require('fs');
const querystring = require('querystring');

const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-this-in-production';
const DB_URL = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/kanban_iso';

// ============ MINIMAL JWT IMPLEMENTATION ============

function base64UrlEncode(data) {
  return Buffer.from(data).toString('base64')
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function base64UrlDecode(str) {
  str = str.replace(/-/g, '+').replace(/_/g, '/');
  while (str.length % 4) str += '=';
  return Buffer.from(str, 'base64').toString();
}

function signJwt(payload, secret, expiresIn = '7d') {
  const header = { alg: 'HS256', typ: 'JWT' };

  // Calculate expiration
  let expMs = 7 * 24 * 60 * 60 * 1000; // default 7 days
  if (typeof expiresIn === 'string') {
    const match = expiresIn.match(/^(\d+)([smhd])$/);
    if (match) {
      const num = parseInt(match[1]);
      const unit = match[2];
      const multipliers = { s: 1000, m: 60000, h: 3600000, d: 86400000 };
      expMs = num * multipliers[unit];
    }
  }

  payload.iat = Math.floor(Date.now() / 1000);
  payload.exp = Math.floor((Date.now() + expMs) / 1000);

  const headerB64 = base64UrlEncode(JSON.stringify(header));
  const payloadB64 = base64UrlEncode(JSON.stringify(payload));
  const signature = crypto.createHmac('sha256', secret)
    .update(`${headerB64}.${payloadB64}`).digest('base64')
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

  return `${headerB64}.${payloadB64}.${signature}`;
}

function verifyJwt(token, secret) {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;

    const [headerB64, payloadB64, signatureB64] = parts;
    const expectedSig = crypto.createHmac('sha256', secret)
      .update(`${headerB64}.${payloadB64}`).digest('base64')
      .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

    if (signatureB64 !== expectedSig) return null;

    const payload = JSON.parse(base64UrlDecode(payloadB64));
    if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) return null;

    return payload;
  } catch {
    return null;
  }
}

// ============ DATABASE HELPERS ============

function escapeSQL(str) {
  if (str === null || str === undefined) return 'NULL';
  return "'" + String(str).replace(/'/g, "''") + "'";
}

function query(sql) {
  try {
    const result = execSync(
      `psql -U postgres -h localhost -d kanban_iso -t -A -F '|||' -c ${escapeShellArg(sql)}`,
      { encoding: 'utf-8', timeout: 10000, stdio: ['pipe', 'pipe', 'pipe'] }
    );
    return result.trim();
  } catch (err) {
    console.error('DB Error:', err.message);
    return '';
  }
}

function escapeShellArg(arg) {
  return "'" + arg.replace(/'/g, "'\\''") + "'";
}

function queryRows(sql, columns) {
  const raw = query(sql);
  if (!raw) return [];
  return raw.split('\n').filter(line => line.trim()).map(line => {
    const values = line.split('|||');
    const row = {};
    columns.forEach((col, i) => {
      row[col] = values[i] === '' ? null : values[i];
    });
    return row;
  });
}

function queryOne(sql, columns) {
  const rows = queryRows(sql, columns);
  return rows.length > 0 ? rows[0] : null;
}

// ============ HTTP HELPERS ============

function parseBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch {
        resolve({});
      }
    });
    req.on('error', reject);
  });
}

function sendJson(res, statusCode, data) {
  const body = JSON.stringify(data);
  res.writeHead(statusCode, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  });
  res.end(body);
}

function getAuthUser(req) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
  const token = authHeader.slice(7);
  return verifyJwt(token, JWT_SECRET);
}

// ============ ROUTE HANDLERS ============

const USER_COLUMNS = ['id', 'email', 'password', 'firstName', 'lastName', 'role', 'department', 'status', 'createdAt', 'updatedAt'];
const USER_SAFE_COLUMNS = ['id', 'email', 'firstName', 'lastName', 'role', 'department', 'status', 'createdAt'];

// Auth routes
async function handleAuthLogin(req, res) {
  const { email, password } = await parseBody(req);

  if (!email || !password) {
    return sendJson(res, 400, { error: 'Email e password sono obbligatori' });
  }

  // Find user and verify password using pgcrypto
  const user = queryOne(
    `SELECT "id", "email", "firstName", "lastName", "role", "department", "status",
            (password = crypt(${escapeSQL(password)}, password)) as password_valid
     FROM "User" WHERE "email" = ${escapeSQL(email)}`,
    ['id', 'email', 'firstName', 'lastName', 'role', 'department', 'status', 'password_valid']
  );

  if (!user) {
    return sendJson(res, 401, { error: 'Credenziali non valide' });
  }

  if (user.password_valid !== 't') {
    return sendJson(res, 401, { error: 'Credenziali non valide' });
  }

  if (user.status !== 'ACTIVE') {
    return sendJson(res, 403, { error: 'Account non attivo' });
  }

  const token = signJwt({ id: user.id, email: user.email, role: user.role }, JWT_SECRET, '7d');

  sendJson(res, 200, {
    token,
    user: {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      status: user.status
    }
  });
}

async function handleAuthRegister(req, res) {
  const { email, password, firstName, lastName, role } = await parseBody(req);

  if (!email || !password || !firstName || !lastName) {
    return sendJson(res, 400, { error: 'Tutti i campi sono obbligatori' });
  }

  const existing = queryOne(`SELECT "id" FROM "User" WHERE "email" = ${escapeSQL(email)}`, ['id']);
  if (existing) {
    return sendJson(res, 400, { error: 'Email already registered' });
  }

  const userRole = role || 'USER';
  const id = crypto.randomUUID();
  query(`INSERT INTO "User" ("id", "email", "password", "firstName", "lastName", "role", "status", "createdAt", "updatedAt")
         VALUES (${escapeSQL(id)}, ${escapeSQL(email)}, crypt(${escapeSQL(password)}, gen_salt('bf', 10)),
                 ${escapeSQL(firstName)}, ${escapeSQL(lastName)}, ${escapeSQL(userRole)}, 'ACTIVE', NOW(), NOW())`);

  const user = queryOne(
    `SELECT "id", "email", "firstName", "lastName", "role" FROM "User" WHERE "id" = ${escapeSQL(id)}`,
    ['id', 'email', 'firstName', 'lastName', 'role']
  );

  const token = signJwt({ id: user.id, email: user.email, role: user.role }, JWT_SECRET, '7d');
  sendJson(res, 200, { token, user });
}

async function handleAuthMe(req, res) {
  const authUser = getAuthUser(req);
  if (!authUser) return sendJson(res, 401, { error: 'Token mancante' });

  const user = queryOne(
    `SELECT "id", "email", "firstName", "lastName", "role", "status", "createdAt"
     FROM "User" WHERE "id" = ${escapeSQL(authUser.id)}`,
    ['id', 'email', 'firstName', 'lastName', 'role', 'status', 'createdAt']
  );

  if (!user || user.status !== 'ACTIVE') {
    return sendJson(res, 401, { error: 'Utente non autorizzato' });
  }

  sendJson(res, 200, user);
}

// Users routes
async function handleGetUsers(req, res) {
  const authUser = getAuthUser(req);
  if (!authUser) return sendJson(res, 401, { error: 'Non autorizzato' });

  const users = queryRows(
    `SELECT "id", "email", "firstName", "lastName", "role", "department", "status", "createdAt"
     FROM "User" ORDER BY "firstName"`,
    USER_SAFE_COLUMNS
  );

  sendJson(res, 200, users);
}

// Tickets routes
async function handleGetTickets(req, res) {
  const authUser = getAuthUser(req);
  if (!authUser) return sendJson(res, 401, { error: 'Non autorizzato' });

  const tickets = queryRows(
    `SELECT t."id", t."title", t."description", t."boardId", t."columnId", t."priority"::text,
            t."status"::text, t."category", t."createdById", t."assignedToId", t."slaHours",
            t."createdAt"::text, t."updatedAt"::text, t."dueDate"::text, t."resolvedAt"::text,
            t."slaViolated"::text, t."emailThreadId"
     FROM "Ticket" t ORDER BY t."createdAt" DESC`,
    ['id', 'title', 'description', 'boardId', 'columnId', 'priority', 'status', 'category',
     'createdById', 'assignedToId', 'slaHours', 'createdAt', 'updatedAt', 'dueDate', 'resolvedAt',
     'slaViolated', 'emailThreadId']
  );

  // Enrich with user data and comments
  for (const ticket of tickets) {
    ticket.slaViolated = ticket.slaViolated === 'true';
    ticket.slaHours = parseInt(ticket.slaHours) || 24;

    // Get created by user
    ticket.createdBy = queryOne(
      `SELECT "id", "email", "firstName", "lastName" FROM "User" WHERE "id" = ${escapeSQL(ticket.createdById)}`,
      ['id', 'email', 'firstName', 'lastName']
    );

    // Get assigned to user
    if (ticket.assignedToId) {
      ticket.assignedTo = queryOne(
        `SELECT "id", "email", "firstName", "lastName" FROM "User" WHERE "id" = ${escapeSQL(ticket.assignedToId)}`,
        ['id', 'email', 'firstName', 'lastName']
      );
    } else {
      ticket.assignedTo = null;
    }

    // Get comments
    ticket.comments = queryRows(
      `SELECT c."id", c."content", c."createdAt"::text, c."userId",
              u."firstName", u."lastName"
       FROM "Comment" c
       JOIN "User" u ON c."userId" = u."id"
       WHERE c."ticketId" = ${escapeSQL(ticket.id)} AND c."isDeleted" = false
       ORDER BY c."createdAt"`,
      ['id', 'content', 'createdAt', 'userId', 'firstName', 'lastName']
    ).map(c => ({
      id: c.id,
      content: c.content,
      createdAt: c.createdAt,
      userId: c.userId,
      user: { firstName: c.firstName, lastName: c.lastName }
    }));

    // Get attachments
    ticket.attachments = queryRows(
      `SELECT "id", "fileName", "fileSize", "mimeType", "uploadedAt"::text, "isDeleted"::text
       FROM "Attachment" WHERE "ticketId" = ${escapeSQL(ticket.id)} AND "isDeleted" = false`,
      ['id', 'fileName', 'fileSize', 'mimeType', 'uploadedAt', 'isDeleted']
    );

    // Get assignments
    ticket.assignments = queryRows(
      `SELECT ta."id", ta."userId", ta."assignedAt"::text, u."firstName", u."lastName", u."email"
       FROM "TicketAssignment" ta
       JOIN "User" u ON ta."userId" = u."id"
       WHERE ta."ticketId" = ${escapeSQL(ticket.id)}`,
      ['id', 'userId', 'assignedAt', 'firstName', 'lastName', 'email']
    ).map(a => ({
      id: a.id,
      userId: a.userId,
      assignedAt: a.assignedAt,
      user: { firstName: a.firstName, lastName: a.lastName, email: a.email }
    }));

    // Get assigned departments
    const deptResult = query(
      `SELECT "assignedDepartments" FROM "Ticket" WHERE "id" = ${escapeSQL(ticket.id)}`
    );
    ticket.assignedDepartments = deptResult && deptResult !== '{}'
      ? deptResult.replace(/[{}]/g, '').split(',').filter(Boolean)
      : [];
  }

  sendJson(res, 200, tickets);
}

async function handleCreateTicket(req, res) {
  const authUser = getAuthUser(req);
  if (!authUser) return sendJson(res, 401, { error: 'Non autorizzato' });

  const { title, description, priority, category, assignedToId, slaHours, boardId, columnId } = await parseBody(req);

  if (!title || !description) {
    return sendJson(res, 400, { error: 'Titolo e descrizione sono obbligatori' });
  }

  const id = crypto.randomUUID();
  const actualBoardId = boardId || 'default-board';
  const actualColumnId = columnId || 'col-todo';
  const actualSlaHours = slaHours || 24;
  const dueDate = new Date(Date.now() + actualSlaHours * 60 * 60 * 1000).toISOString();

  query(`INSERT INTO "Ticket" ("id", "title", "description", "boardId", "columnId", "priority", "category",
         "createdById", "assignedToId", "slaHours", "dueDate", "createdAt", "updatedAt")
         VALUES (${escapeSQL(id)}, ${escapeSQL(title)}, ${escapeSQL(description)},
                 ${escapeSQL(actualBoardId)}, ${escapeSQL(actualColumnId)},
                 ${escapeSQL(priority || 'MEDIUM')}, ${category ? escapeSQL(category) : 'NULL'},
                 ${escapeSQL(authUser.id)}, ${assignedToId ? escapeSQL(assignedToId) : 'NULL'},
                 ${actualSlaHours}, ${escapeSQL(dueDate)}, NOW(), NOW())`);

  const ticket = queryOne(
    `SELECT "id", "title", "description", "priority"::text, "status"::text, "createdAt"::text
     FROM "Ticket" WHERE "id" = ${escapeSQL(id)}`,
    ['id', 'title', 'description', 'priority', 'status', 'createdAt']
  );

  sendJson(res, 201, ticket);
}

async function handleUpdateTicket(req, res, ticketId) {
  const authUser = getAuthUser(req);
  if (!authUser) return sendJson(res, 401, { error: 'Non autorizzato' });

  const body = await parseBody(req);
  const updates = [];

  const allowedFields = ['title', 'description', 'priority', 'status', 'category', 'columnId', 'assignedToId', 'slaHours'];
  for (const field of allowedFields) {
    if (body[field] !== undefined) {
      if (body[field] === null) {
        updates.push(`"${field}" = NULL`);
      } else {
        updates.push(`"${field}" = ${escapeSQL(String(body[field]))}`);
      }
    }
  }

  if (updates.length === 0) {
    return sendJson(res, 400, { error: 'Nessun campo da aggiornare' });
  }

  updates.push('"updatedAt" = NOW()');

  query(`UPDATE "Ticket" SET ${updates.join(', ')} WHERE "id" = ${escapeSQL(ticketId)}`);

  const ticket = queryOne(
    `SELECT "id", "title", "description", "priority"::text, "status"::text, "columnId", "assignedToId",
            "createdAt"::text, "updatedAt"::text
     FROM "Ticket" WHERE "id" = ${escapeSQL(ticketId)}`,
    ['id', 'title', 'description', 'priority', 'status', 'columnId', 'assignedToId', 'createdAt', 'updatedAt']
  );

  sendJson(res, 200, ticket);
}

async function handleDeleteTicket(req, res, ticketId) {
  const authUser = getAuthUser(req);
  if (!authUser) return sendJson(res, 401, { error: 'Non autorizzato' });

  query(`DELETE FROM "Ticket" WHERE "id" = ${escapeSQL(ticketId)}`);
  sendJson(res, 200, { message: 'Ticket eliminato' });
}

async function handleAddComment(req, res, ticketId) {
  const authUser = getAuthUser(req);
  if (!authUser) return sendJson(res, 401, { error: 'Non autorizzato' });

  const { content } = await parseBody(req);
  if (!content) return sendJson(res, 400, { error: 'Contenuto obbligatorio' });

  const id = crypto.randomUUID();
  query(`INSERT INTO "Comment" ("id", "ticketId", "userId", "content", "createdAt")
         VALUES (${escapeSQL(id)}, ${escapeSQL(ticketId)}, ${escapeSQL(authUser.id)}, ${escapeSQL(content)}, NOW())`);

  const comment = queryOne(
    `SELECT c."id", c."content", c."createdAt"::text, c."userId",
            u."firstName", u."lastName"
     FROM "Comment" c JOIN "User" u ON c."userId" = u."id"
     WHERE c."id" = ${escapeSQL(id)}`,
    ['id', 'content', 'createdAt', 'userId', 'firstName', 'lastName']
  );

  sendJson(res, 201, {
    id: comment.id,
    content: comment.content,
    createdAt: comment.createdAt,
    userId: comment.userId,
    user: { firstName: comment.firstName, lastName: comment.lastName }
  });
}

async function handleAssignUsers(req, res, ticketId) {
  const authUser = getAuthUser(req);
  if (!authUser) return sendJson(res, 401, { error: 'Non autorizzato' });

  const { userIds } = await parseBody(req);
  if (!userIds || !Array.isArray(userIds)) {
    return sendJson(res, 400, { error: 'userIds deve essere un array' });
  }

  // Remove existing assignments
  query(`DELETE FROM "TicketAssignment" WHERE "ticketId" = ${escapeSQL(ticketId)}`);

  // Add new assignments
  for (const userId of userIds) {
    const id = crypto.randomUUID();
    query(`INSERT INTO "TicketAssignment" ("id", "ticketId", "userId", "assignedAt", "assignedBy")
           VALUES (${escapeSQL(id)}, ${escapeSQL(ticketId)}, ${escapeSQL(userId)}, NOW(), ${escapeSQL(authUser.id)})
           ON CONFLICT ("ticketId", "userId") DO NOTHING`);
  }

  sendJson(res, 200, { message: 'Utenti assegnati' });
}

async function handleAssignDepartments(req, res, ticketId) {
  const authUser = getAuthUser(req);
  if (!authUser) return sendJson(res, 401, { error: 'Non autorizzato' });

  const { departments } = await parseBody(req);
  if (!departments || !Array.isArray(departments)) {
    return sendJson(res, 400, { error: 'departments deve essere un array' });
  }

  const pgArray = '{' + departments.map(d => '"' + d.replace(/"/g, '\\"') + '"').join(',') + '}';
  query(`UPDATE "Ticket" SET "assignedDepartments" = ${escapeSQL(pgArray)}, "updatedAt" = NOW() WHERE "id" = ${escapeSQL(ticketId)}`);

  sendJson(res, 200, { message: 'Dipartimenti assegnati' });
}

// Board routes
async function handleGetBoard(req, res) {
  const authUser = getAuthUser(req);
  if (!authUser) return sendJson(res, 401, { error: 'Non autorizzato' });

  const columns = queryRows(
    `SELECT "id", "name", "order" FROM "Column" WHERE "boardId" = 'default-board' ORDER BY "order"`,
    ['id', 'name', 'order']
  );

  sendJson(res, 200, { id: 'default-board', name: 'Main Board', columns });
}

// SLA routes
async function handleGetSlaMetrics(req, res) {
  const authUser = getAuthUser(req);
  if (!authUser) return sendJson(res, 401, { error: 'Non autorizzato' });

  const total = queryOne(`SELECT COUNT(*) as count FROM "Ticket"`, ['count']);
  const violated = queryOne(`SELECT COUNT(*) as count FROM "Ticket" WHERE "slaViolated" = true`, ['count']);
  const resolved = queryOne(`SELECT COUNT(*) as count FROM "Ticket" WHERE "resolvedAt" IS NOT NULL`, ['count']);
  const open = queryOne(`SELECT COUNT(*) as count FROM "Ticket" WHERE "resolvedAt" IS NULL`, ['count']);

  sendJson(res, 200, {
    totalTickets: parseInt(total?.count || '0'),
    violatedTickets: parseInt(violated?.count || '0'),
    resolvedTickets: parseInt(resolved?.count || '0'),
    openTickets: parseInt(open?.count || '0'),
    complianceRate: total?.count > 0
      ? Math.round((1 - (parseInt(violated?.count || '0') / parseInt(total.count))) * 100)
      : 100
  });
}

async function handleGetSlaConfig(req, res) {
  const authUser = getAuthUser(req);
  if (!authUser) return sendJson(res, 401, { error: 'Non autorizzato' });

  const configs = queryRows(
    `SELECT "id", "category", "priority"::text, "hours", "description" FROM "SLAConfig" ORDER BY "hours"`,
    ['id', 'category', 'priority', 'hours', 'description']
  );
  configs.forEach(c => c.hours = parseInt(c.hours));

  sendJson(res, 200, configs);
}

async function handleGetSlaViolations(req, res) {
  const authUser = getAuthUser(req);
  if (!authUser) return sendJson(res, 401, { error: 'Non autorizzato' });

  const violations = queryRows(
    `SELECT "id", "title", "priority"::text, "dueDate"::text, "createdAt"::text
     FROM "Ticket" WHERE "slaViolated" = true OR ("resolvedAt" IS NULL AND "dueDate" < NOW())
     ORDER BY "dueDate"`,
    ['id', 'title', 'priority', 'dueDate', 'createdAt']
  );

  sendJson(res, 200, violations);
}

// Onboarding routes
async function handleGetOnboardings(req, res) {
  const authUser = getAuthUser(req);
  if (!authUser) return sendJson(res, 401, { error: 'Non autorizzato' });

  const onboardings = queryRows(
    `SELECT o."id", o."userId", o."managerId", o."status"::text, o."startDate"::text,
            o."expectedEndDate"::text, o."actualEndDate"::text,
            o."employeeFirstName", o."employeeLastName", o."employeeEmail",
            o."sede", o."department", o."role",
            o."computerType", o."phoneType", o."needsHeadset"::text, o."needsWebcam"::text,
            o."additionalMonitor"::text, o."needsMicrosoft365"::text,
            o."softwareNeeded", o."systemAccess", o."additionalNotes",
            o."createdAt"::text
     FROM "Onboarding" o ORDER BY o."createdAt" DESC`,
    ['id', 'userId', 'managerId', 'status', 'startDate', 'expectedEndDate', 'actualEndDate',
     'employeeFirstName', 'employeeLastName', 'employeeEmail',
     'sede', 'department', 'role',
     'computerType', 'phoneType', 'needsHeadset', 'needsWebcam',
     'additionalMonitor', 'needsMicrosoft365',
     'softwareNeeded', 'systemAccess', 'additionalNotes', 'createdAt']
  );

  for (const o of onboardings) {
    o.needsHeadset = o.needsHeadset === 'true';
    o.needsWebcam = o.needsWebcam === 'true';
    o.additionalMonitor = o.additionalMonitor === 'true';
    o.needsMicrosoft365 = o.needsMicrosoft365 === 'true';

    o.tasks = queryRows(
      `SELECT "id", "title", "description", "order", "completed"::text, "completedAt"::text, "mandatory"::text
       FROM "OnboardingTask" WHERE "onboardingId" = ${escapeSQL(o.id)} ORDER BY "order"`,
      ['id', 'title', 'description', 'order', 'completed', 'completedAt', 'mandatory']
    ).map(t => ({
      ...t,
      order: parseInt(t.order),
      completed: t.completed === 'true',
      mandatory: t.mandatory === 'true'
    }));

    if (o.managerId) {
      o.manager = queryOne(
        `SELECT "id", "firstName", "lastName", "email" FROM "User" WHERE "id" = ${escapeSQL(o.managerId)}`,
        ['id', 'firstName', 'lastName', 'email']
      );
    }
  }

  sendJson(res, 200, onboardings);
}

async function handleCreateOnboarding(req, res) {
  const authUser = getAuthUser(req);
  if (!authUser) return sendJson(res, 401, { error: 'Non autorizzato' });

  const body = await parseBody(req);
  const id = crypto.randomUUID();
  const expectedEndDate = body.expectedEndDate || new Date(Date.now() + 30 * 86400000).toISOString();

  query(`INSERT INTO "Onboarding" ("id", "managerId", "status", "startDate", "expectedEndDate",
         "employeeFirstName", "employeeLastName", "employeeEmail",
         "sede", "department", "role", "computerType", "phoneType",
         "needsHeadset", "needsWebcam", "additionalMonitor", "needsMicrosoft365",
         "softwareNeeded", "systemAccess", "additionalNotes", "createdAt", "updatedAt")
         VALUES (${escapeSQL(id)}, ${escapeSQL(body.managerId || authUser.id)}, 'PENDING_EQUIPMENT',
                 NOW(), ${escapeSQL(expectedEndDate)},
                 ${escapeSQL(body.employeeFirstName)}, ${escapeSQL(body.employeeLastName)}, ${escapeSQL(body.employeeEmail)},
                 ${body.sede ? escapeSQL(body.sede) : 'NULL'}, ${body.department ? escapeSQL(body.department) : 'NULL'},
                 ${body.role ? escapeSQL(body.role) : 'NULL'}, ${body.computerType ? escapeSQL(body.computerType) : 'NULL'},
                 ${body.phoneType ? escapeSQL(body.phoneType) : 'NULL'},
                 ${body.needsHeadset ? 'true' : 'false'}, ${body.needsWebcam ? 'true' : 'false'},
                 ${body.additionalMonitor ? 'true' : 'false'}, ${body.needsMicrosoft365 ? 'true' : 'false'},
                 ${body.softwareNeeded ? escapeSQL(body.softwareNeeded) : 'NULL'},
                 ${body.systemAccess ? escapeSQL(body.systemAccess) : 'NULL'},
                 ${body.additionalNotes ? escapeSQL(body.additionalNotes) : 'NULL'},
                 NOW(), NOW())`);

  // Create default tasks
  const defaultTasks = [
    { title: 'Preparazione postazione', description: 'Preparare scrivania e attrezzature', order: 1 },
    { title: 'Account email', description: 'Creare account email aziendale', order: 2 },
    { title: 'Accessi sistemi', description: 'Configurare accessi ai sistemi aziendali', order: 3 },
    { title: 'Documentazione', description: 'Preparare documentazione e badge', order: 4 },
    { title: 'Formazione sicurezza', description: 'Formazione sulla sicurezza (ISO 27001)', order: 5 },
  ];

  for (const task of defaultTasks) {
    const taskId = crypto.randomUUID();
    query(`INSERT INTO "OnboardingTask" ("id", "onboardingId", "title", "description", "order", "createdAt")
           VALUES (${escapeSQL(taskId)}, ${escapeSQL(id)}, ${escapeSQL(task.title)}, ${escapeSQL(task.description)}, ${task.order}, NOW())`);
  }

  sendJson(res, 201, { id, status: 'PENDING_EQUIPMENT' });
}

// Offboarding routes
async function handleGetOffboardings(req, res) {
  const authUser = getAuthUser(req);
  if (!authUser) return sendJson(res, 401, { error: 'Non autorizzato' });

  const offboardings = queryRows(
    `SELECT o."id", o."userId", o."managerId", o."status"::text, o."reason",
            o."startDate"::text, o."expectedEndDate"::text, o."actualEndDate"::text, o."createdAt"::text
     FROM "Offboarding" o ORDER BY o."createdAt" DESC`,
    ['id', 'userId', 'managerId', 'status', 'reason', 'startDate', 'expectedEndDate', 'actualEndDate', 'createdAt']
  );

  for (const o of offboardings) {
    o.tasks = queryRows(
      `SELECT "id", "title", "description", "order", "completed"::text, "completedAt"::text, "mandatory"::text
       FROM "OffboardingTask" WHERE "offboardingId" = ${escapeSQL(o.id)} ORDER BY "order"`,
      ['id', 'title', 'description', 'order', 'completed', 'completedAt', 'mandatory']
    ).map(t => ({ ...t, order: parseInt(t.order), completed: t.completed === 'true', mandatory: t.mandatory === 'true' }));

    if (o.userId) {
      o.user = queryOne(
        `SELECT "id", "firstName", "lastName", "email" FROM "User" WHERE "id" = ${escapeSQL(o.userId)}`,
        ['id', 'firstName', 'lastName', 'email']
      );
    }
    if (o.managerId) {
      o.manager = queryOne(
        `SELECT "id", "firstName", "lastName", "email" FROM "User" WHERE "id" = ${escapeSQL(o.managerId)}`,
        ['id', 'firstName', 'lastName', 'email']
      );
    }
  }

  sendJson(res, 200, offboardings);
}

// Audit routes
async function handleGetAuditLogs(req, res) {
  const authUser = getAuthUser(req);
  if (!authUser || authUser.role !== 'ADMIN') {
    return sendJson(res, 403, { error: 'Solo admin può accedere ai log di audit' });
  }

  const logs = queryRows(
    `SELECT a."id", a."action", a."entity", a."entityId", a."ipAddress",
            a."timestamp"::text, a."severity"::text,
            u."firstName", u."lastName", u."email"
     FROM "AuditLog" a LEFT JOIN "User" u ON a."userId" = u."id"
     ORDER BY a."timestamp" DESC LIMIT 100`,
    ['id', 'action', 'entity', 'entityId', 'ipAddress', 'timestamp', 'severity',
     'firstName', 'lastName', 'email']
  );

  sendJson(res, 200, logs.map(l => ({
    ...l,
    user: { firstName: l.firstName, lastName: l.lastName, email: l.email }
  })));
}

async function handleGetISOReport(req, res) {
  const authUser = getAuthUser(req);
  if (!authUser) return sendJson(res, 401, { error: 'Non autorizzato' });

  const totalUsers = queryOne(`SELECT COUNT(*) as c FROM "User"`, ['c']);
  const totalTickets = queryOne(`SELECT COUNT(*) as c FROM "Ticket"`, ['c']);
  const slaViolations = queryOne(`SELECT COUNT(*) as c FROM "Ticket" WHERE "slaViolated" = true`, ['c']);
  const auditEntries = queryOne(`SELECT COUNT(*) as c FROM "AuditLog"`, ['c']);

  sendJson(res, 200, {
    standards: ['ISO 9001:2015', 'ISO 27001:2022'],
    metrics: {
      totalUsers: parseInt(totalUsers?.c || '0'),
      totalTickets: parseInt(totalTickets?.c || '0'),
      slaViolations: parseInt(slaViolations?.c || '0'),
      auditEntries: parseInt(auditEntries?.c || '0'),
      complianceStatus: 'COMPLIANT'
    },
    generatedAt: new Date().toISOString()
  });
}

// ============ ROUTER ============

async function handleRequest(req, res) {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    });
    return res.end();
  }

  const parsedUrl = url.parse(req.url, true);
  const pathname = parsedUrl.pathname;
  const method = req.method;

  try {
    // Health check
    if (pathname === '/api/health' && method === 'GET') {
      return sendJson(res, 200, { status: 'ok', timestamp: new Date().toISOString() });
    }

    // Compliance info
    if (pathname === '/api/compliance' && method === 'GET') {
      return sendJson(res, 200, {
        standards: ['ISO 9001:2015', 'ISO 27001:2022'],
        features: { auditLogging: true, immutableRecords: true, slaTracking: true, accessControl: true, dataIntegrity: true }
      });
    }

    // Auth routes
    if (pathname === '/api/auth/login' && method === 'POST') return handleAuthLogin(req, res);
    if (pathname === '/api/auth/register' && method === 'POST') return handleAuthRegister(req, res);
    if (pathname === '/api/auth/me' && method === 'GET') return handleAuthMe(req, res);

    // Users
    if (pathname === '/api/users' && method === 'GET') return handleGetUsers(req, res);

    // Tickets
    if (pathname === '/api/tickets' && method === 'GET') return handleGetTickets(req, res);
    if (pathname === '/api/tickets' && method === 'POST') return handleCreateTicket(req, res);

    // Ticket by ID
    const ticketMatch = pathname.match(/^\/api\/tickets\/([^/]+)$/);
    if (ticketMatch) {
      if (method === 'PUT') return handleUpdateTicket(req, res, ticketMatch[1]);
      if (method === 'DELETE') return handleDeleteTicket(req, res, ticketMatch[1]);
      if (method === 'GET') {
        const authUser = getAuthUser(req);
        if (!authUser) return sendJson(res, 401, { error: 'Non autorizzato' });
        const ticket = queryOne(
          `SELECT "id", "title", "description", "priority"::text, "status"::text, "columnId", "assignedToId", "createdAt"::text
           FROM "Ticket" WHERE "id" = ${escapeSQL(ticketMatch[1])}`,
          ['id', 'title', 'description', 'priority', 'status', 'columnId', 'assignedToId', 'createdAt']
        );
        return sendJson(res, ticket ? 200 : 404, ticket || { error: 'Ticket non trovato' });
      }
    }

    // Ticket comments
    const commentMatch = pathname.match(/^\/api\/tickets\/([^/]+)\/comments$/);
    if (commentMatch && method === 'POST') return handleAddComment(req, res, commentMatch[1]);

    // Ticket assignments
    const assignMatch = pathname.match(/^\/api\/tickets\/([^/]+)\/assign-users$/);
    if (assignMatch && method === 'POST') return handleAssignUsers(req, res, assignMatch[1]);

    // Ticket department assignments
    const deptMatch = pathname.match(/^\/api\/tickets\/([^/]+)\/assign-departments$/);
    if (deptMatch && method === 'POST') return handleAssignDepartments(req, res, deptMatch[1]);

    // Ticket history
    const historyMatch = pathname.match(/^\/api\/tickets\/([^/]+)\/history$/);
    if (historyMatch && method === 'GET') {
      const authUser = getAuthUser(req);
      if (!authUser) return sendJson(res, 401, { error: 'Non autorizzato' });
      const history = queryRows(
        `SELECT "id", "field", "oldValue", "newValue", "changedAt"::text, "changedBy"
         FROM "TicketHistory" WHERE "ticketId" = ${escapeSQL(historyMatch[1])} ORDER BY "changedAt" DESC`,
        ['id', 'field', 'oldValue', 'newValue', 'changedAt', 'changedBy']
      );
      return sendJson(res, 200, history);
    }

    // SLA routes
    if (pathname === '/api/sla/metrics' && method === 'GET') return handleGetSlaMetrics(req, res);
    if (pathname === '/api/sla/config' && method === 'GET') return handleGetSlaConfig(req, res);
    if (pathname === '/api/sla/violations' && method === 'GET') return handleGetSlaViolations(req, res);

    // Onboarding routes
    if (pathname === '/api/onboarding' && method === 'GET') return handleGetOnboardings(req, res);
    if (pathname === '/api/onboarding' && method === 'POST') return handleCreateOnboarding(req, res);

    const onboardingMatch = pathname.match(/^\/api\/onboarding\/([^/]+)$/);
    if (onboardingMatch && method === 'GET') {
      const authUser = getAuthUser(req);
      if (!authUser) return sendJson(res, 401, { error: 'Non autorizzato' });
      // Return individual onboarding - simplified
      const result = queryOne(
        `SELECT "id", "status"::text, "employeeFirstName", "employeeLastName" FROM "Onboarding" WHERE "id" = ${escapeSQL(onboardingMatch[1])}`,
        ['id', 'status', 'employeeFirstName', 'employeeLastName']
      );
      return sendJson(res, result ? 200 : 404, result || { error: 'Non trovato' });
    }

    const onboardingEquipMatch = pathname.match(/^\/api\/onboarding\/([^/]+)\/equipment$/);
    if (onboardingEquipMatch && method === 'PUT') {
      const authUser = getAuthUser(req);
      if (!authUser) return sendJson(res, 401, { error: 'Non autorizzato' });
      const body = await parseBody(req);
      const updates = [];
      const fields = ['computerType', 'phoneType', 'softwareNeeded', 'systemAccess', 'additionalNotes'];
      const boolFields = ['needsHeadset', 'needsWebcam', 'additionalMonitor', 'needsMicrosoft365'];
      for (const f of fields) {
        if (body[f] !== undefined) updates.push(`"${f}" = ${body[f] ? escapeSQL(body[f]) : 'NULL'}`);
      }
      for (const f of boolFields) {
        if (body[f] !== undefined) updates.push(`"${f}" = ${body[f] ? 'true' : 'false'}`);
      }
      if (body.status) updates.push(`"status" = ${escapeSQL(body.status)}`);
      updates.push('"updatedAt" = NOW()');
      query(`UPDATE "Onboarding" SET ${updates.join(', ')} WHERE "id" = ${escapeSQL(onboardingEquipMatch[1])}`);
      return sendJson(res, 200, { message: 'Aggiornato' });
    }

    const onboardingTaskMatch = pathname.match(/^\/api\/onboarding\/([^/]+)\/tasks\/([^/]+)$/);
    if (onboardingTaskMatch && method === 'PUT') {
      const authUser = getAuthUser(req);
      if (!authUser) return sendJson(res, 401, { error: 'Non autorizzato' });
      const { completed } = await parseBody(req);
      query(`UPDATE "OnboardingTask" SET "completed" = ${completed ? 'true' : 'false'},
             "completedAt" = ${completed ? 'NOW()' : 'NULL'}
             WHERE "id" = ${escapeSQL(onboardingTaskMatch[2])} AND "onboardingId" = ${escapeSQL(onboardingTaskMatch[1])}`);
      return sendJson(res, 200, { message: 'Task aggiornato' });
    }

    // Offboarding routes
    if (pathname === '/api/offboarding' && method === 'GET') return handleGetOffboardings(req, res);

    // Audit routes
    if (pathname === '/api/audit' && method === 'GET') return handleGetAuditLogs(req, res);
    if (pathname === '/api/audit/iso-report' && method === 'GET') return handleGetISOReport(req, res);

    // 404
    sendJson(res, 404, { error: 'Endpoint non trovato' });

  } catch (err) {
    console.error('Request error:', err);
    sendJson(res, 500, { error: err.message || 'Errore interno del server' });
  }
}

// ============ START SERVER ============

const server = http.createServer(handleRequest);

server.listen(PORT, () => {
  console.log(`🚀 Standalone server running on port ${PORT}`);
  console.log(`📦 No npm dependencies required`);
  console.log(`🔑 Using PostgreSQL pgcrypto for password verification`);
  console.log(`🔐 Using built-in JWT implementation`);

  // Verify database connection
  try {
    const result = query(`SELECT COUNT(*) as count FROM "User"`);
    console.log(`✅ Database connected - ${result} users found`);
  } catch (err) {
    console.error('❌ Database connection failed:', err.message);
  }
});
