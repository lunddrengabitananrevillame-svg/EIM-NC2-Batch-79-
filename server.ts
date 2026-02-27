import express from "express";
import { createServer as createViteServer } from "vite";
import Database from "better-sqlite3";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const db = new Database("eim_fund.db");

// Initialize Database
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    role TEXT NOT NULL, -- 'President', 'Vice President', 'Secretary', 'Treasurer', 'Member'
    passcode TEXT, -- Only for admins
    is_active INTEGER DEFAULT 1
  );

  CREATE TABLE IF NOT EXISTS members (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    student_id TEXT,
    contact_info TEXT,
    status TEXT DEFAULT 'Active' -- 'Active', 'Inactive'
  );

  CREATE TABLE IF NOT EXISTS contributions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    purpose TEXT,
    amount_per_person REAL NOT NULL,
    due_date TEXT,
    created_by INTEGER,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(created_by) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS payments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    contribution_id INTEGER NOT NULL,
    member_id INTEGER NOT NULL,
    amount_paid REAL NOT NULL,
    received_by INTEGER,
    date_paid TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(contribution_id) REFERENCES contributions(id),
    FOREIGN KEY(member_id) REFERENCES members(id),
    FOREIGN KEY(received_by) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS expenses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    item_name TEXT NOT NULL,
    category TEXT, -- 'Tool', 'Wire', 'Component', 'Equipment', 'Other'
    specification TEXT,
    quantity INTEGER NOT NULL,
    price_per_unit REAL NOT NULL,
    total_cost REAL NOT NULL,
    purchased_by INTEGER,
    date_purchased TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(purchased_by) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS audit_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    user_name TEXT,
    action TEXT NOT NULL,
    details TEXT,
    timestamp TEXT DEFAULT CURRENT_TIMESTAMP
  );
`);

// Seed initial admin users if not exist
const userCount = db.prepare("SELECT count(*) as count FROM users WHERE role != 'Member'").get() as { count: number };
if (userCount.count === 0) {
  const insertUser = db.prepare("INSERT INTO users (name, role, passcode) VALUES (?, ?, ?)");
  insertUser.run("Admin President", "President", "1111");
  insertUser.run("Admin VP", "Vice President", "2222");
  insertUser.run("Admin Secretary", "Secretary", "3333");
  insertUser.run("Admin Treasurer", "Treasurer", "4444");
  console.log("Seeded initial admin users.");
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API Routes
  
  // Auth
  app.post("/api/login", (req, res) => {
    const { passcode } = req.body;
    const user = db.prepare("SELECT * FROM users WHERE passcode = ? AND is_active = 1").get(passcode);
    if (user) {
      res.json({ success: true, user });
    } else {
      res.status(401).json({ success: false, message: "Invalid passcode" });
    }
  });

  // Members
  app.get("/api/members", (req, res) => {
    const members = db.prepare("SELECT * FROM members ORDER BY name").all();
    res.json(members);
  });

  app.post("/api/members", (req, res) => {
    const { name, student_id, contact_info, admin_id, admin_name } = req.body;
    const stmt = db.prepare("INSERT INTO members (name, student_id, contact_info) VALUES (?, ?, ?)");
    const info = stmt.run(name, student_id, contact_info);
    
    // Audit Log
    db.prepare("INSERT INTO audit_logs (user_id, user_name, action, details) VALUES (?, ?, ?, ?)").run(admin_id, admin_name, "Add Member", `Added member: ${name}`);
    
    res.json({ id: info.lastInsertRowid });
  });

  app.put("/api/members/:id", (req, res) => {
    const { name, student_id, contact_info, admin_id, admin_name } = req.body;
    const stmt = db.prepare("UPDATE members SET name = ?, student_id = ?, contact_info = ? WHERE id = ?");
    stmt.run(name, student_id, contact_info, req.params.id);

    // Audit Log
    db.prepare("INSERT INTO audit_logs (user_id, user_name, action, details) VALUES (?, ?, ?, ?)").run(admin_id, admin_name, "Edit Member", `Edited member ID: ${req.params.id}`);

    res.json({ success: true });
  });

  app.delete("/api/members/:id", (req, res) => {
    const { admin_id, admin_name } = req.body; // Pass admin info in body for delete too? Or headers. For simplicity, assume body or query.
    // Actually DELETE usually doesn't have body in some clients, but express supports it. Let's use query params or headers for admin info if needed, or just body.
    // For simplicity, let's assume the frontend sends a JSON body even with DELETE, or we use a POST for 'delete-action'.
    // Standard REST: DELETE /api/members/:id. We need to know WHO did it.
    // Let's use a custom header 'x-admin-id' and 'x-admin-name' for simplicity in this project.
    
    const adminId = req.headers['x-admin-id'];
    const adminName = req.headers['x-admin-name'];

    db.prepare("DELETE FROM members WHERE id = ?").run(req.params.id);
    
    if (adminId) {
        db.prepare("INSERT INTO audit_logs (user_id, user_name, action, details) VALUES (?, ?, ?, ?)").run(adminId, adminName, "Delete Member", `Deleted member ID: ${req.params.id}`);
    }
    
    res.json({ success: true });
  });

  // Contributions
  app.get("/api/contributions", (req, res) => {
    const contributions = db.prepare("SELECT * FROM contributions ORDER BY created_at DESC").all();
    res.json(contributions);
  });

  app.post("/api/contributions", (req, res) => {
    const { title, purpose, amount_per_person, due_date, admin_id, admin_name } = req.body;
    const stmt = db.prepare("INSERT INTO contributions (title, purpose, amount_per_person, due_date, created_by) VALUES (?, ?, ?, ?, ?)");
    const info = stmt.run(title, purpose, amount_per_person, due_date, admin_id);

    db.prepare("INSERT INTO audit_logs (user_id, user_name, action, details) VALUES (?, ?, ?, ?)").run(admin_id, admin_name, "Add Contribution", `Added contribution: ${title}`);

    res.json({ id: info.lastInsertRowid });
  });

  app.delete("/api/contributions/:id", (req, res) => {
    const adminId = req.headers['x-admin-id'];
    const adminName = req.headers['x-admin-name'];

    // Delete associated payments first
    db.prepare("DELETE FROM payments WHERE contribution_id = ?").run(req.params.id);
    
    // Delete contribution
    db.prepare("DELETE FROM contributions WHERE id = ?").run(req.params.id);

    if (adminId) {
        db.prepare("INSERT INTO audit_logs (user_id, user_name, action, details) VALUES (?, ?, ?, ?)").run(adminId, adminName, "Delete Contribution", `Deleted contribution ID: ${req.params.id}`);
    }

    res.json({ success: true });
  });

  // Payments
  app.get("/api/payments", (req, res) => {
    const payments = db.prepare(`
      SELECT p.*, m.name as member_name, c.title as contribution_title 
      FROM payments p 
      JOIN members m ON p.member_id = m.id 
      JOIN contributions c ON p.contribution_id = c.id 
      ORDER BY p.date_paid DESC
    `).all();
    res.json(payments);
  });

  app.get("/api/payments/contribution/:id", (req, res) => {
      const payments = db.prepare(`
        SELECT p.*, m.name as member_name, u.name as admin_name
        FROM payments p
        JOIN members m ON p.member_id = m.id
        LEFT JOIN users u ON p.received_by = u.id
        WHERE p.contribution_id = ?
      `).all(req.params.id);
      res.json(payments);
  });

  app.post("/api/payments", (req, res) => {
    const { contribution_id, member_id, amount_paid, admin_id, admin_name } = req.body;
    const stmt = db.prepare("INSERT INTO payments (contribution_id, member_id, amount_paid, received_by) VALUES (?, ?, ?, ?)");
    const info = stmt.run(contribution_id, member_id, amount_paid, admin_id);

    db.prepare("INSERT INTO audit_logs (user_id, user_name, action, details) VALUES (?, ?, ?, ?)").run(admin_id, admin_name, "Record Payment", `Recorded payment of ${amount_paid} for member ID ${member_id}`);

    res.json({ id: info.lastInsertRowid });
  });

  // Expenses
  app.get("/api/expenses", (req, res) => {
    const expenses = db.prepare(`
      SELECT e.*, u.name as admin_name
      FROM expenses e
      LEFT JOIN users u ON e.purchased_by = u.id
      ORDER BY e.date_purchased DESC
    `).all();
    res.json(expenses);
  });

  app.post("/api/expenses", (req, res) => {
    const { item_name, category, specification, quantity, price_per_unit, total_cost, admin_id, admin_name } = req.body;
    const stmt = db.prepare("INSERT INTO expenses (item_name, category, specification, quantity, price_per_unit, total_cost, purchased_by) VALUES (?, ?, ?, ?, ?, ?, ?)");
    const info = stmt.run(item_name, category, specification, quantity, price_per_unit, total_cost, admin_id);

    db.prepare("INSERT INTO audit_logs (user_id, user_name, action, details) VALUES (?, ?, ?, ?)").run(admin_id, admin_name, "Add Expense", `Added expense: ${item_name} (${total_cost})`);

    res.json({ id: info.lastInsertRowid });
  });

  // Audit Logs
  app.get("/api/logs", (req, res) => {
    const logs = db.prepare("SELECT * FROM audit_logs ORDER BY timestamp DESC LIMIT 100").all();
    res.json(logs);
  });

  // Dashboard Stats
  app.get("/api/stats", (req, res) => {
    const totalCollected = db.prepare("SELECT SUM(amount_paid) as total FROM payments").get() as { total: number };
    const totalSpent = db.prepare("SELECT SUM(total_cost) as total FROM expenses").get() as { total: number };
    
    res.json({
      totalCollected: totalCollected.total || 0,
      totalSpent: totalSpent.total || 0,
      balance: (totalCollected.total || 0) - (totalSpent.total || 0)
    });
  });

  app.post("/api/settings/change-passcode", (req, res) => {
    const { userId, currentPasscode, newPasscode } = req.body;

    const user = db.prepare("SELECT * FROM users WHERE id = ?").get(userId) as any;

    if (!user) {
      return res.json({ success: false, message: "User not found." });
    }

    if (user.passcode !== currentPasscode) {
      return res.json({ success: false, message: "Incorrect current passcode." });
    }

    db.prepare("UPDATE users SET passcode = ? WHERE id = ?").run(newPasscode, userId);

    db.prepare("INSERT INTO audit_logs (user_id, user_name, action, details) VALUES (?, ?, ?, ?)").run(userId, user.name, "Change Passcode", "Updated personal passcode");

    res.json({ success: true });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
