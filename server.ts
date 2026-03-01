import express from "express";
import { createServer as createViteServer } from "vite";
import Database from "better-sqlite3";
import path from "path";
import { fileURLToPath } from "url";
import ExcelJS from "exceljs";

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

  CREATE TABLE IF NOT EXISTS settlements (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    member_id INTEGER NOT NULL,
    amount REAL NOT NULL,
    type TEXT NOT NULL, -- 'Refund' or 'Payment'
    handled_by INTEGER,
    date_handled TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(member_id) REFERENCES members(id),
    FOREIGN KEY(handled_by) REFERENCES users(id)
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
  insertUser.run("Admin President", "President", null);
  insertUser.run("Admin VP", "Vice President", null);
  insertUser.run("Admin Secretary", "Secretary", null);
  insertUser.run("Admin Treasurer", "Treasurer", null);
  console.log("Seeded initial admin users with NULL passcodes for setup.");
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API Routes
  app.use('/api', (req, res, next) => {
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    next();
  });
  
  // Auth
  app.post("/api/login", (req, res) => {
    const { passcode } = req.body;

    // Check if system needs setup (any admin has null passcode)
    const pendingSetup = db.prepare("SELECT count(*) as count FROM users WHERE passcode IS NULL AND role != 'Member'").get() as { count: number };
    
    if (pendingSetup.count > 0) {
        // If passcode is empty, allow access as Setup Admin
        if (!passcode) {
             return res.json({ 
                 success: true, 
                 user: { id: 0, name: "System Setup", role: "SuperAdmin" },
                 needsSetup: true 
             });
        }
    }

    const user = db.prepare("SELECT * FROM users WHERE passcode = ? AND is_active = 1").get(passcode);
    if (user) {
      res.json({ success: true, user });
    } else {
      res.status(401).json({ success: false, message: "Invalid passcode" });
    }
  });

  // Users (Admins)
  app.get("/api/users", (req, res) => {
    const users = db.prepare("SELECT id, name, role, passcode FROM users WHERE role != 'Member' ORDER BY id").all();
    // We return passcode status (null or not) but maybe not the actual passcode for security?
    // For setup purposes, we might need to know which ones are null.
    // Let's return full object for simplicity in this trusted internal app, or mask it.
    // Actually, the frontend needs to know if passcode is null to show "Set Passcode" vs "Change Passcode".
    res.json(users);
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
    try {
      const adminId = req.headers['x-admin-id'];
      const adminName = req.headers['x-admin-name'];

      // Prevent deletion if member has payments to avoid FOREIGN KEY constraint failed
      const paymentsCount = db.prepare("SELECT count(*) as count FROM payments WHERE member_id = ?").get(req.params.id) as { count: number };
      if (paymentsCount.count > 0) {
        return res.status(400).json({ success: false, message: "Cannot delete member with existing payment records." });
      }

      db.prepare("DELETE FROM members WHERE id = ?").run(req.params.id);
      
      if (adminId) {
          db.prepare("INSERT INTO audit_logs (user_id, user_name, action, details) VALUES (?, ?, ?, ?)").run(adminId, adminName, "Delete Member", `Deleted member ID: ${req.params.id}`);
      }
      
      res.json({ success: true });
    } catch (error: any) {
      console.error("Error deleting member:", error);
      res.status(500).json({ success: false, message: "Internal server error" });
    }
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

  // Settlements
  app.get("/api/settlements", (req, res) => {
    const settlements = db.prepare(`
      SELECT s.*, u.name as admin_name
      FROM settlements s
      LEFT JOIN users u ON s.handled_by = u.id
      ORDER BY s.date_handled DESC
    `).all();
    res.json(settlements);
  });

  app.post("/api/settlements", (req, res) => {
    const { member_id, amount, type, admin_id, admin_name } = req.body;
    const stmt = db.prepare("INSERT INTO settlements (member_id, amount, type, handled_by) VALUES (?, ?, ?, ?)");
    const info = stmt.run(member_id, amount, type, admin_id);

    db.prepare("INSERT INTO audit_logs (user_id, user_name, action, details) VALUES (?, ?, ?, ?)").run(admin_id, admin_name, "Record Settlement", `Recorded ${type} of ${amount} for member ID ${member_id}`);

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

  app.delete("/api/expenses/:id", (req, res) => {
    const adminId = req.headers['x-admin-id'];
    const adminName = req.headers['x-admin-name'];

    const expense = db.prepare("SELECT * FROM expenses WHERE id = ?").get(req.params.id) as any;
    if (!expense) return res.status(404).json({ success: false, message: "Expense not found" });

    db.prepare("DELETE FROM expenses WHERE id = ?").run(req.params.id);

    if (adminId) {
        db.prepare("INSERT INTO audit_logs (user_id, user_name, action, details) VALUES (?, ?, ?, ?)").run(adminId, adminName, "Delete Expense", `Deleted expense: ${expense.item_name} (${expense.total_cost})`);
    }

    res.json({ success: true });
  });

  app.delete("/api/payments/:id", (req, res) => {
    const adminId = req.headers['x-admin-id'];
    const adminName = req.headers['x-admin-name'];

    const payment = db.prepare("SELECT * FROM payments WHERE id = ?").get(req.params.id) as any;
    if (!payment) return res.status(404).json({ success: false, message: "Payment not found" });

    const member = db.prepare("SELECT name FROM members WHERE id = ?").get(payment.member_id) as any;
    const memberName = member ? member.name : 'Unknown Member';

    db.prepare("DELETE FROM payments WHERE id = ?").run(req.params.id);

    if (adminId) {
        db.prepare("INSERT INTO audit_logs (user_id, user_name, action, details) VALUES (?, ?, ?, ?)").run(adminId, adminName, "Revert Payment", `Reverted payment of ${payment.amount_paid} for ${memberName}`);
    }

    res.json({ success: true });
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

    // Allow update if current passcode is NULL (initial setup)
    if (user.passcode !== null && user.passcode !== currentPasscode) {
      return res.json({ success: false, message: "Incorrect current passcode." });
    }

    db.prepare("UPDATE users SET passcode = ? WHERE id = ?").run(newPasscode, userId);

    db.prepare("INSERT INTO audit_logs (user_id, user_name, action, details) VALUES (?, ?, ?, ?)").run(userId, user.name, "Change Passcode", "Updated personal passcode");

    res.json({ success: true });
  });

  app.get("/api/reports/excel", async (req, res) => {
    try {
      res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
      res.set('Pragma', 'no-cache');
      res.set('Expires', '0');
      
      const workbook = new ExcelJS.Workbook();
      workbook.creator = 'EIM Fund Manager';
      workbook.lastModifiedBy = 'System';
      workbook.created = new Date();
      workbook.modified = new Date();

      // --- Summary Sheet ---
      const summarySheet = workbook.addWorksheet('Summary');
      summarySheet.columns = [
        { header: 'Metric', key: 'metric', width: 30 },
        { header: 'Value', key: 'value', width: 20 },
      ];
      
      const totalCollected = db.prepare("SELECT SUM(amount_paid) as total FROM payments").get() as { total: number };
      const totalSpent = db.prepare("SELECT SUM(total_cost) as total FROM expenses").get() as { total: number };
      const balance = (totalCollected.total || 0) - (totalSpent.total || 0);

      summarySheet.addRow({ metric: 'Total Collected', value: totalCollected.total || 0 });
      summarySheet.addRow({ metric: 'Total Spent', value: totalSpent.total || 0 });
      summarySheet.addRow({ metric: 'Current Balance', value: balance });
      summarySheet.addRow({ metric: 'Report Generated At', value: new Date().toLocaleString("en-PH", { timeZone: "Asia/Manila" }) });

      // --- Members Sheet ---
      const membersSheet = workbook.addWorksheet('Members');
      membersSheet.columns = [
        { header: 'ID', key: 'id', width: 10 },
        { header: 'Name', key: 'name', width: 30 },
        { header: 'Student ID', key: 'student_id', width: 20 },
        { header: 'Contact Info', key: 'contact_info', width: 25 },
        { header: 'Status', key: 'status', width: 15 },
      ];
      const members = db.prepare("SELECT * FROM members").all();
      members.forEach((m: any) => membersSheet.addRow(m));

      // --- Contributions Sheet ---
      const contributionsSheet = workbook.addWorksheet('Contributions');
      contributionsSheet.columns = [
        { header: 'ID', key: 'id', width: 10 },
        { header: 'Title', key: 'title', width: 30 },
        { header: 'Purpose', key: 'purpose', width: 40 },
        { header: 'Amount/Person', key: 'amount_per_person', width: 15 },
        { header: 'Due Date', key: 'due_date', width: 15 },
        { header: 'Created By', key: 'created_by', width: 15 },
        { header: 'Created At', key: 'created_at', width: 20 },
      ];
      const contributions = db.prepare("SELECT * FROM contributions").all();
      contributions.forEach((c: any) => contributionsSheet.addRow(c));

      // Fetch payments early so it can be used in the matrix
      const payments = db.prepare("SELECT * FROM payments").all();

      // --- Member Contributions Matrix Sheet ---
      const matrixSheet = workbook.addWorksheet('Member Contributions');
      
      const matrixColumns: any[] = [
        { header: 'Member Name', key: 'member_name', width: 30 }
      ];
      
      contributions.forEach((c: any) => {
        matrixColumns.push({ header: c.title, key: `contrib_${c.id}`, width: 20 });
      });
      
      matrixColumns.push({ header: 'Total Paid', key: 'total_paid', width: 20 });
      
      matrixSheet.columns = matrixColumns;

      members.forEach((m: any) => {
        const rowData: any = { member_name: m.name };
        let totalPaid = 0;
        
        contributions.forEach((c: any) => {
          const memberPayments = payments.filter((p: any) => p.member_id === m.id && p.contribution_id === c.id);
          const amountPaid = memberPayments.reduce((sum: number, p: any) => sum + p.amount_paid, 0);
          rowData[`contrib_${c.id}`] = amountPaid;
          totalPaid += amountPaid;
        });
        
        rowData.total_paid = totalPaid;
        matrixSheet.addRow(rowData);
      });

      // Add a summary row at the bottom of the matrix
      const summaryRowData: any = { member_name: 'TOTAL COLLECTED' };
      let grandTotal = 0;
      contributions.forEach((c: any) => {
        const totalForContrib = payments.filter((p: any) => p.contribution_id === c.id).reduce((sum: number, p: any) => sum + p.amount_paid, 0);
        summaryRowData[`contrib_${c.id}`] = totalForContrib;
        grandTotal += totalForContrib;
      });
      summaryRowData.total_paid = grandTotal;
      const summaryRow = matrixSheet.addRow(summaryRowData);
      summaryRow.font = { bold: true };

      // --- Payments Sheet ---
      const paymentsSheet = workbook.addWorksheet('Payments');
      paymentsSheet.columns = [
        { header: 'ID', key: 'id', width: 10 },
        { header: 'Contribution ID', key: 'contribution_id', width: 15 },
        { header: 'Member ID', key: 'member_id', width: 15 },
        { header: 'Amount Paid', key: 'amount_paid', width: 15 },
        { header: 'Received By', key: 'received_by', width: 15 },
        { header: 'Date Paid', key: 'date_paid', width: 20 },
      ];
      payments.forEach((p: any) => paymentsSheet.addRow(p));

      // --- Expenses Sheet ---
      const expensesSheet = workbook.addWorksheet('Expenses');
      expensesSheet.columns = [
        { header: 'ID', key: 'id', width: 10 },
        { header: 'Item Name', key: 'item_name', width: 30 },
        { header: 'Category', key: 'category', width: 20 },
        { header: 'Specification', key: 'specification', width: 25 },
        { header: 'Quantity', key: 'quantity', width: 10 },
        { header: 'Price/Unit', key: 'price_per_unit', width: 15 },
        { header: 'Total Cost', key: 'total_cost', width: 15 },
        { header: 'Purchased By', key: 'purchased_by', width: 15 },
        { header: 'Date Purchased', key: 'date_purchased', width: 20 },
      ];
      const expenses = db.prepare("SELECT * FROM expenses").all();
      expenses.forEach((e: any) => expensesSheet.addRow(e));

      // --- Settlements Sheet ---
      const settlementsSheet = workbook.addWorksheet('Settlements');
      settlementsSheet.columns = [
        { header: 'ID', key: 'id', width: 10 },
        { header: 'Member ID', key: 'member_id', width: 15 },
        { header: 'Amount', key: 'amount', width: 15 },
        { header: 'Type', key: 'type', width: 15 },
        { header: 'Handled By', key: 'handled_by', width: 15 },
        { header: 'Date Handled', key: 'date_handled', width: 20 },
      ];
      const settlements = db.prepare("SELECT * FROM settlements").all();
      settlements.forEach((s: any) => settlementsSheet.addRow(s));

      // --- Audit Logs Sheet ---
      const logsSheet = workbook.addWorksheet('Audit Logs');
      logsSheet.columns = [
        { header: 'ID', key: 'id', width: 10 },
        { header: 'User ID', key: 'user_id', width: 10 },
        { header: 'User Name', key: 'user_name', width: 20 },
        { header: 'Action', key: 'action', width: 25 },
        { header: 'Details', key: 'details', width: 50 },
        { header: 'Timestamp', key: 'timestamp', width: 20 },
      ];
      const logs = db.prepare("SELECT * FROM audit_logs ORDER BY timestamp DESC").all();
      logs.forEach((l: any) => logsSheet.addRow(l));

      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', 'attachment; filename=EIM_Fund_Report.xlsx');

      await workbook.xlsx.write(res);
      res.end();
    } catch (error) {
      console.error("Error generating Excel report:", error);
      res.status(500).send("Error generating report");
    }
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
