// src/services/indexedDB.js
let db = null;

export function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open("FiangonanaDB", 40);
    request.onerror = () => reject("Erreur DB");
    request.onsuccess = (e) => {
      db = e.target.result;
      resolve(db);
    };
    request.onupgradeneeded = (e) => {
      const dbUp = e.target.result;
      const oldVersion = e.oldVersion;
      
      if (oldVersion < 37) {
        if (dbUp.objectStoreNames.contains("gl_entries")) dbUp.deleteObjectStore("gl_entries");
        if (dbUp.objectStoreNames.contains("expenses")) dbUp.deleteObjectStore("expenses");
        if (dbUp.objectStoreNames.contains("monthly_reports")) dbUp.deleteObjectStore("monthly_reports");
        if (dbUp.objectStoreNames.contains("month_frais")) dbUp.deleteObjectStore("month_frais");
      }
      
      if (!dbUp.objectStoreNames.contains("months")) dbUp.createObjectStore("months", { keyPath: "id" });
      if (!dbUp.objectStoreNames.contains("gl_entries")) {
        const glStore = dbUp.createObjectStore("gl_entries", { keyPath: "id", autoIncrement: true });
        glStore.createIndex("eglise", "eglise");
      }
      if (!dbUp.objectStoreNames.contains("expenses")) {
        const expStore = dbUp.createObjectStore("expenses", { keyPath: "id", autoIncrement: true });
        expStore.createIndex("eglise", "eglise");
      }
      if (!dbUp.objectStoreNames.contains("monthly_reports")) {
        const repStore = dbUp.createObjectStore("monthly_reports", { keyPath: "monthId" });
        repStore.createIndex("eglise", "eglise");
      }
      if (!dbUp.objectStoreNames.contains("members_stats")) dbUp.createObjectStore("members_stats", { keyPath: "memberName" });
      if (!dbUp.objectStoreNames.contains("church_config")) dbUp.createObjectStore("church_config", { keyPath: "id" });
      if (!dbUp.objectStoreNames.contains("month_frais")) {
        const fraisStore = dbUp.createObjectStore("month_frais", { keyPath: "monthId" });
        fraisStore.createIndex("eglise", "eglise");
      }
      if (!dbUp.objectStoreNames.contains("users")) {
        const userStore = dbUp.createObjectStore("users", { keyPath: "id", autoIncrement: true });
        userStore.createIndex("email", "email", { unique: true });
        userStore.createIndex("niveau", "niveau");
      }
      if (!dbUp.objectStoreNames.contains("user_logs")) {
        const logStore = dbUp.createObjectStore("user_logs", { keyPath: "id", autoIncrement: true });
        logStore.createIndex("userId", "userId");
        logStore.createIndex("date", "date");
      }
    };
  });
}

export async function getDB() {
  if (!db) await openDB();
  return db;
}

// ---------- Mois ----------
export async function initMonths() {
  const database = await getDB();
  const store = database.transaction("months", "readwrite").objectStore("months");
  const allMonths = await new Promise(res => {
    const req = store.getAll();
    req.onsuccess = () => res(req.result);
  });
  for (let m of allMonths) {
    if (m.id.startsWith("2025")) {
      await new Promise(res => {
        const req = store.delete(m.id);
        req.onsuccess = () => res();
      });
    }
  }
  const needed = ["2026-01", "2026-02", "2026-03"];
  for (let m of needed) {
    const exists = allMonths.some(e => e.id === m);
    if (!exists) {
      await new Promise(res => {
        const req = store.add({ id: m, name: m });
        req.onsuccess = () => res();
      });
    }
  }
  const months2026 = await new Promise(res => {
    const req = store.getAll();
    req.onsuccess = () => res(req.result.filter(m => m.id.startsWith("2026")));
  });
  return months2026;
}

export async function getMonths() {
  const database = await getDB();
  const all = await new Promise(res => {
    const req = database.transaction("months").objectStore("months").getAll();
    req.onsuccess = () => res(req.result);
  });
  return all.filter(m => m.id.startsWith("2026"));
}

// ---------- Configuration église ----------
export async function loadChurchConfig() {
  const database = await getDB();
  const config = await new Promise(res => {
    const req = database.transaction("church_config").objectStore("church_config").get("main");
    req.onsuccess = () => res(req.result);
  });
  return config || { district: "ANTSAHATANTERAKA", church: "", code: "" };
}

export async function saveChurchConfig(config) {
  const database = await getDB();
  await new Promise((resolve, reject) => {
    const tx = database.transaction("church_config", "readwrite");
    const req = tx.objectStore("church_config").put({ id: "main", ...config });
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
    tx.onerror = () => reject(tx.error);
  });
}

// ---------- Frais ----------
export async function getFrais(monthId, eglise) {
  const database = await getDB();
  const data = await new Promise(res => {
    const req = database.transaction("month_frais").objectStore("month_frais").get(monthId);
    req.onsuccess = () => res(req.result);
  });
  return (data && data.eglise === eglise) ? data.frais : 0;
}

export async function setFrais(monthId, eglise, frais) {
  const database = await getDB();
  await new Promise((resolve, reject) => {
    const tx = database.transaction("month_frais", "readwrite");
    const req = tx.objectStore("month_frais").put({ monthId, eglise, frais });
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
    tx.onerror = () => reject(tx.error);
  });
  await computeAndSaveMonthlyReports(monthId, eglise);
}

// ---------- Entrées GL ----------
export async function getGLEntries(monthId, eglise, sabbathIndex = null) {
  const database = await getDB();
  const all = await new Promise(res => {
    const req = database.transaction("gl_entries").objectStore("gl_entries").getAll();
    req.onsuccess = () => res(req.result);
  });
  return all.filter(e => e.monthId === monthId && e.eglise === eglise && (sabbathIndex === null || e.sabbathIndex === sabbathIndex));
}

export async function saveGLEntries(monthId, eglise, sabbathIndex, entries) {
  const database = await getDB();
  
  // 1. Supprimer les anciennes entrées dans une transaction
  await new Promise(async (resolve, reject) => {
    const tx = database.transaction("gl_entries", "readwrite");
    const store = tx.objectStore("gl_entries");
    // Récupérer les IDs à supprimer
    const existing = await new Promise(res => {
      const req = store.getAll();
      req.onsuccess = () => res(req.result.filter(e => e.monthId === monthId && e.eglise === eglise && e.sabbathIndex === sabbathIndex));
      req.onerror = () => reject(req.error);
    });
    // Supprimer chaque entrée
    for (let old of existing) {
      store.delete(old.id);
    }
    // Attendre la fin de la transaction
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  
  // 2. Ajouter les nouvelles entrées dans une nouvelle transaction
  await new Promise(async (resolve, reject) => {
    const tx = database.transaction("gl_entries", "readwrite");
    const store = tx.objectStore("gl_entries");
    for (let entry of entries) {
      const newEntry = { ...entry, eglise };
      store.add(newEntry);
    }
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  
  // 3. Mettre à jour le rapport mensuel
  await computeAndSaveMonthlyReports(monthId, eglise);
}

// ---------- Dépenses ----------
export async function getExpenses(monthId, eglise) {
  const database = await getDB();
  const all = await new Promise(res => {
    const req = database.transaction("expenses").objectStore("expenses").getAll();
    req.onsuccess = () => res(req.result);
  });
  return all.filter(e => e.monthId === monthId && e.eglise === eglise);
}

export async function addExpense(expense) {
  const database = await getDB();
  await new Promise((resolve, reject) => {
    const tx = database.transaction("expenses", "readwrite");
    const store = tx.objectStore("expenses");
    const req = store.add(expense);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
    tx.onerror = () => reject(tx.error);
  });
  await computeAndSaveMonthlyReports(expense.monthId, expense.eglise);
}

export async function updateExpense(id, updates) {
  const database = await getDB();
  let exp;
  await new Promise((resolve, reject) => {
    const tx = database.transaction("expenses", "readonly");
    const store = tx.objectStore("expenses");
    const req = store.get(id);
    req.onsuccess = () => { exp = req.result; resolve(); };
    req.onerror = () => reject(req.error);
    tx.onerror = () => reject(tx.error);
  });
  if (exp) {
    Object.assign(exp, updates);
    await new Promise((resolve, reject) => {
      const tx = database.transaction("expenses", "readwrite");
      const store = tx.objectStore("expenses");
      const req = store.put(exp);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
      tx.onerror = () => reject(tx.error);
    });
    await computeAndSaveMonthlyReports(exp.monthId, exp.eglise);
  }
}

export async function deleteExpense(id, monthId, eglise) {
  const database = await getDB();
  await new Promise((resolve, reject) => {
    const tx = database.transaction("expenses", "readwrite");
    const store = tx.objectStore("expenses");
    const req = store.delete(id);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
    tx.onerror = () => reject(tx.error);
  });
  await computeAndSaveMonthlyReports(monthId, eglise);
}

// ---------- Rapports mensuels ----------
export async function getMonthlyReport(monthId, eglise) {
  const database = await getDB();
  const all = await new Promise(res => {
    const req = database.transaction("monthly_reports").objectStore("monthly_reports").getAll();
    req.onsuccess = () => res(req.result);
  });
  return all.find(r => r.monthId === monthId && r.eglise === eglise) || null;
}

export async function getAllMonthlyReportsForEglise(eglise) {
  const database = await getDB();
  const all = await new Promise(res => {
    const req = database.transaction("monthly_reports").objectStore("monthly_reports").getAll();
    req.onsuccess = () => res(req.result);
  });
  return all.filter(r => r.eglise === eglise);
}

export async function updateReportField(monthId, eglise, field, value) {
  const database = await getDB();
  let report = await getMonthlyReport(monthId, eglise);
  if (!report) {
    report = {
      monthId,
      eglise,
      perSabbath: {},
      totalA: 0,
      totalB: 0,
      totalExpenses: 0,
      balanceChurch: 0,
      sabbathDates: ["", "", "", "", ""]
    };
  }
  report[field] = value;
  await new Promise((resolve, reject) => {
    const tx = database.transaction("monthly_reports", "readwrite");
    const store = tx.objectStore("monthly_reports");
    const req = store.put(report);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
    tx.onerror = () => reject(tx.error);
  });
}

export async function updateSabbathDate(monthId, eglise, sabbathIndex, date) {
  const database = await getDB();
  let report = await getMonthlyReport(monthId, eglise);
  if (!report) {
    report = {
      monthId,
      eglise,
      perSabbath: {},
      totalA: 0,
      totalB: 0,
      totalExpenses: 0,
      balanceChurch: 0,
      sabbathDates: ["", "", "", "", ""]
    };
  }
  if (!report.sabbathDates) report.sabbathDates = ["", "", "", "", ""];
  report.sabbathDates[sabbathIndex - 1] = date;
  await new Promise((resolve, reject) => {
    const tx = database.transaction("monthly_reports", "readwrite");
    const store = tx.objectStore("monthly_reports");
    const req = store.put(report);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
    tx.onerror = () => reject(tx.error);
  });
}

async function computeAndSaveMonthlyReports(monthId, eglise) {
  const database = await getDB();
  
  // Lire toutes les entrées GL
  const glStore = database.transaction("gl_entries", "readonly").objectStore("gl_entries");
  const allEntries = await new Promise(res => {
    const req = glStore.getAll();
    req.onsuccess = () => res(req.result.filter(e => e.monthId === monthId && e.eglise === eglise));
  });

  let perSabbath = {
    1: { f1: 0, f2: 0, f3: 0, f4: 0, f5: 0, f6: 0, f7: 0, f8: 0, b9: 0, b10: 0 },
    2: { f1: 0, f2: 0, f3: 0, f4: 0, f5: 0, f6: 0, f7: 0, f8: 0, b9: 0, b10: 0 },
    3: { f1: 0, f2: 0, f3: 0, f4: 0, f5: 0, f6: 0, f7: 0, f8: 0, b9: 0, b10: 0 },
    4: { f1: 0, f2: 0, f3: 0, f4: 0, f5: 0, f6: 0, f7: 0, f8: 0, b9: 0, b10: 0 },
    5: { f1: 0, f2: 0, f3: 0, f4: 0, f5: 0, f6: 0, f7: 0, f8: 0, b9: 0, b10: 0 }
  };
  let membersMap = new Map();

  for (let ent of allEntries) {
    let s = ent.sabbathIndex;
    if (!perSabbath[s]) perSabbath[s] = { f1: 0, f2: 0, f3: 0, f4: 0, f5: 0, f6: 0, f7: 0, f8: 0, b9: 0, b10: 0 };
    perSabbath[s].f1 += ent.f1 || 0;
    perSabbath[s].f2 += ent.f2 || 0;
    perSabbath[s].f3 += ent.f3 || 0;
    perSabbath[s].f4 += ent.f4 || 0;
    perSabbath[s].f5 += ent.f5 || 0;
    perSabbath[s].f6 += ent.f6 || 0;
    perSabbath[s].f7 += ent.f7 || 0;
    perSabbath[s].f8 += ent.f8 || 0;
    perSabbath[s].b9 += ent.b9 || 0;
    perSabbath[s].b10 += ent.b10 || 0;
    if (ent.memberName && (ent.f1 || 0) > 0) {
      let key = ent.memberName.trim();
      let data = membersMap.get(key) || { count: 0, total: 0, lastMonth: "" };
      data.count++;
      data.total += ent.f1;
      if (monthId > data.lastMonth) data.lastMonth = monthId;
      membersMap.set(key, data);
    }
  }

  let totalA = 0, totalB = 0;
  for (let s = 1; s <= 5; s++) {
    let p = perSabbath[s] || { f1: 0, f2: 0, f3: 0, f4: 0, f5: 0, f6: 0, f7: 0, f8: 0, b9: 0, b10: 0 };
    totalA += p.f1 + p.f2 + p.f3 + p.f4 + p.f5 + p.f6 + p.f7 + p.f8;
    totalB += p.b9 + p.b10;
  }

  // Dépenses
  const expenseStore = database.transaction("expenses", "readonly").objectStore("expenses");
  const expenses = await new Promise(res => {
    const req = expenseStore.getAll();
    req.onsuccess = () => res(req.result.filter(e => e.monthId === monthId && e.eglise === eglise));
  });
  let totalExpenses = expenses.reduce((s, e) => s + (e.amount || 0), 0);

  // Ancien rapport
  const oldReport = await getMonthlyReport(monthId, eglise);
  const sabbathDates = (oldReport && oldReport.sabbathDates) ? oldReport.sabbathDates : ["", "", "", "", ""];
  const saramPandefasana = oldReport?.saramPandefasana || 0;
  const dateVersementFME = oldReport?.dateVersementFME || "";
  const rosiaNum = oldReport?.rosiaNum || "";
  const bokyBe = oldReport?.bokyBe || "";
  const rapano = oldReport?.rapano || "";
  const tatitra = oldReport?.tatitra || "";
  const dateFanamarihana = oldReport?.dateFanamarihana || "";
  const caisseFME = oldReport?.caisseFME || "";
  const chequeRef = oldReport?.chequeRef || "";
  const dateCheque = oldReport?.dateCheque || "";
  const soraBolaDate = oldReport?.soraBolaDate || "";
  const soraBolaMontant = oldReport?.soraBolaMontant || 0;
  const soraBolaLettres = oldReport?.soraBolaLettres || "";
  const soraBolaSignataire = oldReport?.soraBolaSignataire || "";

  const report = {
    monthId,
    eglise,
    perSabbath,
    totalA,
    totalB,
    totalExpenses,
    balanceChurch: totalB - totalExpenses,
    sabbathDates,
    saramPandefasana,
    dateVersementFME,
    rosiaNum,
    bokyBe,
    rapano,
    tatitra,
    dateFanamarihana,
    caisseFME,
    chequeRef,
    dateCheque,
    soraBolaDate,
    soraBolaMontant,
    soraBolaLettres,
    soraBolaSignataire
  };

  // Sauvegarder le rapport
  await new Promise((resolve, reject) => {
    const tx = database.transaction("monthly_reports", "readwrite");
    const store = tx.objectStore("monthly_reports");
    const req = store.put(report);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
    tx.onerror = () => reject(tx.error);
  });

  // Mettre à jour les stats membres
  await new Promise(async (resolve, reject) => {
    const tx = database.transaction("members_stats", "readwrite");
    const store = tx.objectStore("members_stats");
    for (let [member, data] of membersMap.entries()) {
      let existing = await new Promise(res => {
        const req = store.get(member);
        req.onsuccess = () => res(req.result);
        req.onerror = () => reject(req.error);
      });
      if (existing) {
        existing.totalTithe += data.total;
        existing.participations += data.count;
        existing.lastMonth = data.lastMonth;
        store.put(existing);
      } else {
        store.put({
          memberName: member,
          totalTithe: data.total,
          participations: data.count,
          lastMonth: data.lastMonth
        });
      }
    }
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function getMembersStats() {
  const database = await getDB();
  return await new Promise(res => {
    const req = database.transaction("members_stats").objectStore("members_stats").getAll();
    req.onsuccess = () => res(req.result);
  });
}

// ---------- Utilitaires ----------
export function formatMonthYear(monthId) {
  if (!monthId) return "";
  const [year, month] = monthId.split('-');
  const monthNames = ["Janvier", "Février", "Mars", "Avril", "Mai", "Juin", "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"];
  return `${monthNames[parseInt(month, 10) - 1]} ${year}`;
}

export function nombreEnLettres(n) {
  let num = Number(n);
  if (isNaN(num) || num < 0) return "zéro";
  if (num === 0) return "zéro";

  const unite = ["", "un", "deux", "trois", "quatre", "cinq", "six", "sept", "huit", "neuf", "dix", "onze", "douze", "treize", "quatorze", "quinze", "seize", "dix-sept", "dix-huit", "dix-neuf"];
  const dizaine = ["", "dix", "vingt", "trente", "quarante", "cinquante", "soixante", "soixante-dix", "quatre-vingt", "quatre-vingt-dix"];

  function convertLessThanThousand(num) {
    if (num === 0) return "";
    if (isNaN(num) || num < 0) return "";
    if (num < 20) return unite[num];
    if (num < 100) {
      let d = Math.floor(num / 10);
      let u = num % 10;
      if (d === 7 || d === 9) {
        let base = d === 7 ? "soixante-" : "quatre-vingt-";
        let reste = num - (d === 7 ? 60 : 80);
        return base + convertLessThanThousand(reste);
      } else {
        let base = dizaine[d];
        if (u === 0) return base;
        if (d === 8) return base + "-" + unite[u];
        return base + "-" + unite[u];
      }
    }
    let c = Math.floor(num / 100);
    let r = num % 100;
    let cent = c === 1 ? "cent" : unite[c] + "-cent";
    if (r === 0) return cent + (c > 1 ? "s" : "");
    return cent + "-" + convertLessThanThousand(r);
  }

  function convert(num) {
    if (num < 1000) return convertLessThanThousand(num);
    if (num < 1000000) {
      let milliers = Math.floor(num / 1000);
      let reste = num % 1000;
      let milliersStr = milliers === 1 ? "mille" : convertLessThanThousand(milliers) + "-mille";
      if (reste === 0) return milliersStr;
      return milliersStr + "-" + convertLessThanThousand(reste);
    }
    let millions = Math.floor(num / 1000000);
    let reste = num % 1000000;
    let millionsStr = convertLessThanThousand(millions) + "-million" + (millions > 1 ? "s" : "");
    if (reste === 0) return millionsStr;
    return millionsStr + "-" + convert(reste);
  }
  return convert(num);
}

export function escapeHtml(str) {
  if (!str) return '';
  return str.replace(/[&<>]/g, function (m) {
    if (m === '&') return '&amp;';
    if (m === '<') return '&lt;';
    if (m === '>') return '&gt;';
    return m;
  });
}

// ---------- Gestion utilisateurs ----------
export async function getAdminUser() {
  const database = await getDB();
  const all = await getAllUsers();
  return all.find(u => u.niveau === 1 && u.fonction === 'Admin');
}

export async function getAllUsers() {
  const database = await getDB();
  const tx = database.transaction("users", "readonly");
  const store = tx.objectStore("users");
  return await new Promise(res => {
    const req = store.getAll();
    req.onsuccess = () => res(req.result);
  });
}

export async function addUser(user) {
  const database = await getDB();
  const newUser = { 
    ...user, 
    photo: user.photo || "",
    adresse: user.adresse || "",
    contact: user.contact || ""
  };
  const id = await new Promise((resolve, reject) => {
    const tx = database.transaction("users", "readwrite");
    const store = tx.objectStore("users");
    const req = store.add(newUser);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
    tx.onerror = () => reject(tx.error);
  });
  return id;
}

export async function updateUser(user) {
  const database = await getDB();
  await new Promise((resolve, reject) => {
    const tx = database.transaction("users", "readwrite");
    const store = tx.objectStore("users");
    const req = store.put(user);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
    tx.onerror = () => reject(tx.error);
  });
}

export async function deleteUser(id) {
  const database = await getDB();
  await new Promise((resolve, reject) => {
    const tx = database.transaction("users", "readwrite");
    const store = tx.objectStore("users");
    const req = store.delete(id);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
    tx.onerror = () => reject(tx.error);
  });
}

export async function authenticateUser(identifier, password) {
  const database = await getDB();
  const all = await getAllUsers();
  return all.find(u => 
    (u.email === identifier || u.nom === identifier) && 
    u.motDePasse === password
  ) || null;
}

export async function changePassword(userId, newPassword) {
  const database = await getDB();
  const tx = database.transaction("users", "readwrite");
  const store = tx.objectStore("users");
  const user = await new Promise(res => {
    const req = store.get(userId);
    req.onsuccess = () => res(req.result);
  });
  if (user) {
    user.motDePasse = newPassword;
    await new Promise(res => {
      const req = store.put(user);
      req.onsuccess = () => res();
    });
  }
  await tx.done;
}

export async function updateUserPhoto(userId, photoDataURL) {
  const database = await getDB();
  const tx = database.transaction("users", "readwrite");
  const store = tx.objectStore("users");
  const user = await new Promise(res => {
    const req = store.get(userId);
    req.onsuccess = () => res(req.result);
  });
  if (user) {
    user.photo = photoDataURL;
    await new Promise(res => {
      const req = store.put(user);
      req.onsuccess = () => res();
    });
  }
  await tx.done;
}

export async function updateUserPassword(userId, newPassword) {
  return changePassword(userId, newPassword);
}

export async function initUsers() {
  const adminExists = await getAdminUser();
  if (!adminExists) {
    await addUser({
      nom: 'ADMIN',
      prenom: '',
      email: 'admin@eglise.com',
      motDePasse: 'RH André',
      eglise: '',
      district: '',
      federation: '',
      fonction: 'Admin',
      niveau: 1,
      photo: '',
      adresse: '',
      contact: ''
    });
  }
}

// ---------- Logs de connexion ----------
export async function addUserLog(userId, userName, userFonction) {
  const database = await getDB();
  await new Promise((resolve, reject) => {
    const tx = database.transaction("user_logs", "readwrite");
    const store = tx.objectStore("user_logs");
    const req = store.add({
      userId,
      userName,
      userFonction,
      date: new Date().toISOString(),
      timestamp: Date.now()
    });
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
    tx.onerror = () => reject(tx.error);
  });
}

export async function getUserLogs() {
  const database = await getDB();
  const logs = await new Promise(res => {
    const req = database.transaction("user_logs").objectStore("user_logs").getAll();
    req.onsuccess = () => res(req.result);
  });
  logs.sort((a,b) => b.timestamp - a.timestamp);
  return logs;
}

export async function getUniqueVisitorsCount() {
  const logs = await getUserLogs();
  const uniqueUsers = new Set(logs.map(l => l.userId));
  return uniqueUsers.size;
}

export async function getVisitsPerUser() {
  const logs = await getUserLogs();
  const visits = {};
  for (let log of logs) {
    const key = `${log.userId}_${log.userName}`;
    visits[key] = (visits[key] || 0) + 1;
  }
  return visits;
}

// ---------- Requêtes par district / fédération ----------
export async function getAllMonthlyReportsByDistrict(district) {
  const database = await getDB();
  const all = await new Promise(res => {
    const req = database.transaction("monthly_reports").objectStore("monthly_reports").getAll();
    req.onsuccess = () => res(req.result);
  });
  const users = await getAllUsers();
  const eglisesInDistrict = users.filter(u => u.district === district && u.eglise).map(u => u.eglise);
  return all.filter(r => eglisesInDistrict.includes(r.eglise));
}

export async function getAllMonthlyReportsByFederation(federation) {
  const database = await getDB();
  const all = await new Promise(res => {
    const req = database.transaction("monthly_reports").objectStore("monthly_reports").getAll();
    req.onsuccess = () => res(req.result);
  });
  const users = await getAllUsers();
  const eglisesInFederation = users.filter(u => u.federation === federation && u.eglise).map(u => u.eglise);
  return all.filter(r => eglisesInFederation.includes(r.eglise));
}

export async function getAllEglisesByDistrict(district) {
  const users = await getAllUsers();
  return [...new Set(users.filter(u => u.district === district && u.eglise).map(u => u.eglise))];
}

export async function getAllEglisesByFederation(federation) {
  const users = await getAllUsers();
  return [...new Set(users.filter(u => u.federation === federation && u.eglise).map(u => u.eglise))];
}

// ========== NOUVELLES FONCTIONS POUR RAPPORT ANNUEL ET RECAP FEDERATION ==========

/**
 * Récupère tous les rapports mensuels d'une église pour une année donnée
 * @param {string} eglise - Nom de l'église
 * @param {string} year - Année (ex: "2026")
 * @returns {Promise<Array>} Liste des rapports mensuels
 */
export async function getYearlyReportsForEglise(eglise, year) {
  const database = await getDB();
  const tx = database.transaction("monthly_reports", "readonly");
  const store = tx.objectStore("monthly_reports");
  const allReports = await new Promise(res => {
    const req = store.getAll();
    req.onsuccess = () => res(req.result);
  });
  return allReports.filter(r => r.eglise === eglise && r.monthId.startsWith(year));
}

/**
 * Récupère la liste des églises appartenant à une fédération donnée (via les utilisateurs)
 * @param {string} federation - Code de la fédération (ex: "FMC")
 * @returns {Promise<string[]>} Liste des noms d'églises
 */
export async function getChurchesByFederation(federation) {
  const allUsers = await getAllUsers();
  const eglises = [...new Set(allUsers.filter(u => u.federation === federation && u.eglise).map(u => u.eglise))];
  return eglises;
}

/**
 * Récupère tous les rapports mensuels d'une fédération pour une année et optionnellement un mois
 * @param {string} federation - Code de la fédération
 * @param {string} year - Année (ex: "2026")
 * @param {string} month - Mois optionnel (ex: "03" pour Mars)
 * @returns {Promise<Array>} Liste des rapports filtrés
 */
export async function getFederationReports(federation, year, month = '') {
  const eglises = await getChurchesByFederation(federation);
  const database = await getDB();
  const tx = database.transaction("monthly_reports", "readonly");
  const store = tx.objectStore("monthly_reports");
  const allReports = await new Promise(res => {
    const req = store.getAll();
    req.onsuccess = () => res(req.result);
  });
  let filtered = allReports.filter(r => eglises.includes(r.eglise) && r.monthId.startsWith(year));
  if (month) {
    filtered = filtered.filter(r => r.monthId === `${year}-${month}`);
  }
  return filtered;
}