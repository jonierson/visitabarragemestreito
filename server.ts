import express from "express";
import path from "path";
import fs from "fs";
import initSqlJs, { Database } from "sql.js";
import { createServer as createViteServer } from "vite";
import { createClient } from "@supabase/supabase-js";
import { Registration, Turma, DataVisita, VisitStats } from "./src/types";

const PORT = 3000;
const DB_FILE = path.join(process.cwd(), "registrations.json");
const SQLITE_DB_PATH = path.join(process.cwd(), "registrations.sqlite");
const MAX_SPOTS_PER_DATE = 38;
const ADMIN_PASSWORD = "30012015";

const SUPABASE_URL = process.env.SUPABASE_URL || "https://zrlcibersabcdobffvcx.supabase.co";
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || "sb_publishable__AmbfXLnrNZnCCFRQh3SyQ_2vKQfSsf";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

let db: Database;

function saveDbToDisk(): void {
  if (!db) return;
  try {
    const binaryArray = db.export();
    const buffer = Buffer.from(binaryArray);
    fs.writeFileSync(SQLITE_DB_PATH, buffer);
  } catch (err) {
    console.error("Error saving SQLite database to disk:", err);
  }
}

async function initDb(): Promise<Database> {
  const SQL = await initSqlJs();

  let fileBuffer: Buffer | null = null;
  if (fs.existsSync(SQLITE_DB_PATH)) {
    try {
      fileBuffer = fs.readFileSync(SQLITE_DB_PATH);
    } catch (e) {
      console.error("Error reading SQLite database file:", e);
    }
  }

  const database = fileBuffer ? new SQL.Database(fileBuffer) : new SQL.Database();

  database.run(`
    CREATE TABLE IF NOT EXISTS registrations (
      id TEXT PRIMARY KEY,
      nome TEXT NOT NULL,
      turma TEXT NOT NULL,
      dataVisita TEXT NOT NULL,
      createdAt TEXT NOT NULL
    );
  `);

  // Migrate existing data from registrations.json if present and table is empty
  try {
    const res = database.exec("SELECT COUNT(*) as count FROM registrations");
    const count = res[0] && res[0].values[0] ? (res[0].values[0][0] as number) : 0;
    if (count === 0 && fs.existsSync(DB_FILE)) {
      const data = fs.readFileSync(DB_FILE, "utf-8");
      const jsonRegs: Registration[] = JSON.parse(data);
      for (const reg of jsonRegs) {
        database.run(
          "INSERT OR IGNORE INTO registrations (id, nome, turma, dataVisita, createdAt) VALUES (?, ?, ?, ?, ?)",
          [reg.id, reg.nome, reg.turma, reg.dataVisita, reg.createdAt]
        );
      }
      console.log(`Migrated ${jsonRegs.length} registrations from registrations.json into SQLite database.`);
    }
  } catch (err) {
    console.error("Migration error:", err);
  }

  db = database;
  saveDbToDisk();
  return database;
}

function getLocalRegistrations(): Registration[] {
  if (!db) return [];
  try {
    const res = db.exec("SELECT id, nome, turma, dataVisita, createdAt FROM registrations ORDER BY datetime(createdAt) ASC");
    if (!res || res.length === 0) return [];
    const columns = res[0].columns;
    const values = res[0].values;

    return values.map((row) => {
      const reg: Record<string, any> = {};
      columns.forEach((col, idx) => {
        reg[col] = row[idx];
      });
      return reg as unknown as Registration;
    });
  } catch (err) {
    console.error("getLocalRegistrations error:", err);
    return [];
  }
}

function normalizeSupabaseRow(row: any): Registration {
  return {
    id: String(row.id),
    nome: String(row.nome || row.name || ""),
    turma: (row.turma || "3º BIOTEC") as Turma,
    dataVisita: (row.dataVisita || row.data_visita || row.datavisita || "15/08") as DataVisita,
    createdAt: String(row.createdAt || row.created_at || row.createdat || new Date().toISOString()),
  };
}

async function getAllRegistrations(): Promise<{ registrations: Registration[]; source: string }> {
  let supabaseRegs: Registration[] = [];
  let isSupabaseOk = false;

  try {
    const { data, error } = await supabase.from("registrations").select("*");
    if (!error && Array.isArray(data)) {
      supabaseRegs = data.map(normalizeSupabaseRow);
      isSupabaseOk = true;
    } else if (error) {
      console.warn("Supabase select notice/error:", error.message);
    }
  } catch (err) {
    console.warn("Supabase fetch exception:", err);
  }

  const localRegs = getLocalRegistrations();

  if (isSupabaseOk) {
    // Merge local SQLite registrations with Supabase registrations by ID
    // so locally registered items are never lost even if Supabase insert was rejected or delayed
    const map = new Map<string, Registration>();
    for (const r of localRegs) {
      if (r && r.id) map.set(r.id, r);
    }
    for (const r of supabaseRegs) {
      if (r && r.id) {
        map.set(r.id, r);
        // Keep local SQLite in sync
        if (db) {
          try {
            db.run(
              "INSERT OR REPLACE INTO registrations (id, nome, turma, dataVisita, createdAt) VALUES (?, ?, ?, ?, ?)",
              [r.id, r.nome, r.turma, r.dataVisita, r.createdAt]
            );
          } catch (e) {
            // ignore
          }
        }
      }
    }
    saveDbToDisk();

    const merged = Array.from(map.values()).sort(
      (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );

    return { registrations: merged, source: "Supabase Database" };
  }

  return { registrations: localRegs, source: "SQLite 3 (Local Backup)" };
}

function computeStats(registrations: Registration[]): VisitStats {
  const count15 = registrations.filter((r) => r.dataVisita === "15/08").length;
  const count29 = registrations.filter((r) => r.dataVisita === "29/08").length;

  const countBiotec = registrations.filter((r) => r.turma === "3º BIOTEC").length;
  const countAInfo = registrations.filter((r) => r.turma === "3º A INFO").length;
  const countBInfo = registrations.filter((r) => r.turma === "3º B INFO").length;

  return {
    capacities: {
      "15/08": {
        dataVisita: "15/08",
        totalLimit: MAX_SPOTS_PER_DATE,
        occupied: count15,
        available: Math.max(0, MAX_SPOTS_PER_DATE - count15),
        isFull: count15 >= MAX_SPOTS_PER_DATE,
      },
      "29/08": {
        dataVisita: "29/08",
        totalLimit: MAX_SPOTS_PER_DATE,
        occupied: count29,
        available: Math.max(0, MAX_SPOTS_PER_DATE - count29),
        isFull: count29 >= MAX_SPOTS_PER_DATE,
      },
    },
    totalRegistrations: registrations.length,
    byTurma: {
      "3º BIOTEC": countBiotec,
      "3º A INFO": countAInfo,
      "3º B INFO": countBInfo,
    },
    byData: {
      "15/08": count15,
      "29/08": count29,
    },
  };
}

async function startServer() {
  db = await initDb();

  const app = express();
  app.use(express.json());

  // API Endpoints
  app.get("/api/stats", async (req, res) => {
    const { registrations } = await getAllRegistrations();
    const stats = computeStats(registrations);
    res.json(stats);
  });

  app.get("/api/registrations", async (req, res) => {
    const { registrations, source } = await getAllRegistrations();
    res.json({
      registrations,
      stats: computeStats(registrations),
      dbEngine: source,
      supabaseConnected: source.includes("Supabase"),
    });
  });

  app.post("/api/register", async (req, res) => {
    try {
      const { nome, turma, dataVisita } = req.body || {};

      // Validate name
      if (!nome || typeof nome !== "string") {
        return res.status(400).json({ error: "O nome é obrigatório." });
      }

      const trimmedName = nome.trim().replace(/\s+/g, " ");
      const nameParts = trimmedName.split(" ").filter((p) => p.length >= 2);

      if (nameParts.length < 2) {
        return res.status(400).json({
          error: "Por favor, informe seu primeiro e último nome (pelo menos dois nomes).",
        });
      }

      // Validate turma
      const validTurmas: Turma[] = ["3º BIOTEC", "3º A INFO", "3º B INFO"];
      if (!turma || !validTurmas.includes(turma as Turma)) {
        return res.status(400).json({ error: "Selecione uma turma válida." });
      }

      // Validate dataVisita
      const validDatas: DataVisita[] = ["15/08", "29/08"];
      if (!dataVisita || !validDatas.includes(dataVisita as DataVisita)) {
        return res.status(400).json({ error: "Selecione uma data válida para a visita." });
      }

      const { registrations } = await getAllRegistrations();

      // Check capacity for chosen date
      const dateCount = registrations.filter((r) => r.dataVisita === dataVisita).length;
      if (dateCount >= MAX_SPOTS_PER_DATE) {
        return res.status(400).json({
          error: "Não há mais vagas para esta data.",
        });
      }

      // Check duplicate: same name (case insensitive) and same turma
      const isDuplicate = registrations.some(
        (r) =>
          r.nome.trim().toLowerCase() === trimmedName.toLowerCase() &&
          r.turma === turma
      );

      if (isDuplicate) {
        return res.status(400).json({
          error: `Já existe uma inscrição cadastrada para "${trimmedName}" na turma ${turma}.`,
        });
      }

      // Create registration
      const newRegistration: Registration = {
        id: "reg_" + Date.now() + "_" + Math.random().toString(36).substring(2, 7),
        nome: trimmedName,
        turma: turma as Turma,
        dataVisita: dataVisita as DataVisita,
        createdAt: new Date().toISOString(),
      };

      // Save to local SQLite
      if (db) {
        try {
          db.run(
            "INSERT INTO registrations (id, nome, turma, dataVisita, createdAt) VALUES (?, ?, ?, ?, ?)",
            [
              newRegistration.id,
              newRegistration.nome,
              newRegistration.turma,
              newRegistration.dataVisita,
              newRegistration.createdAt,
            ]
          );
          saveDbToDisk();
        } catch (sqErr) {
          console.error("Local SQLite insert error:", sqErr);
        }
      }

      // Insert into Supabase
      try {
        let { error } = await supabase.from("registrations").insert([
          {
            id: newRegistration.id,
            nome: newRegistration.nome,
            turma: newRegistration.turma,
            dataVisita: newRegistration.dataVisita,
            createdAt: newRegistration.createdAt,
          },
        ]);
        if (error) {
          // Fallback for snake_case column names
          const res2 = await supabase.from("registrations").insert([
            {
              id: newRegistration.id,
              nome: newRegistration.nome,
              turma: newRegistration.turma,
              data_visita: newRegistration.dataVisita,
              created_at: newRegistration.createdAt,
            },
          ]);
          if (res2.error) {
            // Fallback for lowercased column names
            await supabase.from("registrations").insert([
              {
                id: newRegistration.id,
                nome: newRegistration.nome,
                turma: newRegistration.turma,
                datavisita: newRegistration.dataVisita,
                createdat: newRegistration.createdAt,
              },
            ]);
          }
        }
      } catch (err) {
        console.warn("Supabase insert exception:", err);
      }

      const { registrations: updatedRegistrations } = await getAllRegistrations();
      const stats = computeStats(updatedRegistrations);

      return res.status(201).json({
        success: true,
        registration: newRegistration,
        stats,
      });
    } catch (err: any) {
      console.error("Error in /api/register:", err);
      return res.status(500).json({ error: err?.message || "Ocorreu um erro interno no servidor ao processar a inscrição." });
    }
  });

  app.post("/api/admin/login", (req, res) => {
    const { password } = req.body;
    if (password === ADMIN_PASSWORD) {
      return res.json({ success: true, message: "Acesso autorizado." });
    } else {
      return res.status(401).json({ error: "Senha incorreta. Tente novamente." });
    }
  });

  app.put("/api/admin/registrations/:id", async (req, res) => {
    const { password, dataVisita, turma, nome } = req.body;
    if (password !== ADMIN_PASSWORD) {
      return res.status(401).json({ error: "Não autorizado." });
    }

    const { id } = req.params;
    const { registrations } = await getAllRegistrations();

    const currentReg = registrations.find((r) => r.id === id);

    if (!currentReg) {
      return res.status(404).json({ error: "Inscrição não encontrada." });
    }

    let newDate = currentReg.dataVisita;
    let newTurma = currentReg.turma;
    let newNome = currentReg.nome;

    // If dataVisita is changing, check target date capacity
    if (dataVisita && dataVisita !== currentReg.dataVisita) {
      const validDatas: DataVisita[] = ["15/08", "29/08"];
      if (!validDatas.includes(dataVisita as DataVisita)) {
        return res.status(400).json({ error: "Data de visita inválida." });
      }
      const dateCount = registrations.filter((r) => r.dataVisita === dataVisita).length;
      if (dateCount >= MAX_SPOTS_PER_DATE) {
        return res.status(400).json({ error: `A data ${dataVisita} já atingiu o limite de ${MAX_SPOTS_PER_DATE} vagas.` });
      }
      newDate = dataVisita as DataVisita;
    }

    if (turma) {
      const validTurmas: Turma[] = ["3º BIOTEC", "3º A INFO", "3º B INFO"];
      if (validTurmas.includes(turma as Turma)) {
        newTurma = turma as Turma;
      }
    }

    if (nome && typeof nome === "string") {
      const trimmed = nome.trim().replace(/\s+/g, " ");
      if (trimmed.length > 0) {
        newNome = trimmed;
      }
    }

    // Update SQLite
    db.run(
      "UPDATE registrations SET nome = ?, turma = ?, dataVisita = ? WHERE id = ?",
      [newNome, newTurma, newDate, id]
    );
    saveDbToDisk();

    // Update Supabase
    try {
      const res1 = await supabase
        .from("registrations")
        .update({ nome: newNome, turma: newTurma, dataVisita: newDate })
        .eq("id", id);
      if (res1.error) {
        const res2 = await supabase
          .from("registrations")
          .update({ nome: newNome, turma: newTurma, data_visita: newDate })
          .eq("id", id);
        if (res2.error) {
          await supabase
            .from("registrations")
            .update({ nome: newNome, turma: newTurma, datavisita: newDate })
            .eq("id", id);
        }
      }
    } catch (err) {
      console.warn("Supabase update exception:", err);
    }

    const { registrations: updatedRegistrations } = await getAllRegistrations();

    return res.json({
      success: true,
      registrations: updatedRegistrations,
      stats: computeStats(updatedRegistrations),
    });
  });

  app.delete("/api/admin/registrations/:id", async (req, res) => {
    const { password } = req.body;
    if (password !== ADMIN_PASSWORD) {
      return res.status(401).json({ error: "Não autorizado." });
    }

    const { id } = req.params;

    // Delete SQLite
    db.run("DELETE FROM registrations WHERE id = ?", [id]);
    saveDbToDisk();

    // Delete Supabase
    try {
      await supabase.from("registrations").delete().eq("id", id);
    } catch (err) {
      console.warn("Supabase delete exception:", err);
    }

    const { registrations: updatedRegistrations } = await getAllRegistrations();
    return res.json({
      success: true,
      registrations: updatedRegistrations,
      stats: computeStats(updatedRegistrations),
    });
  });

  app.post("/api/admin/reset", async (req, res) => {
    const { password } = req.body;
    if (password !== ADMIN_PASSWORD) {
      return res.status(401).json({ error: "Não autorizado." });
    }

    // Reset SQLite
    db.run("DELETE FROM registrations");
    saveDbToDisk();

    // Reset Supabase
    try {
      await supabase.from("registrations").delete().neq("id", "0");
    } catch (err) {
      console.warn("Supabase reset exception:", err);
    }

    const { registrations: updatedRegistrations } = await getAllRegistrations();

    return res.json({
      success: true,
      registrations: updatedRegistrations,
      stats: computeStats(updatedRegistrations),
    });
  });

  // Vite development or static production fallback
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: process.env.DISABLE_HMR !== "true",
      },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Servidor rodando em http://localhost:${PORT}`);
  });
}

startServer();
