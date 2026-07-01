async function createUser(userData) {
  const db = await openDb(); // votre fonction d'ouverture DB
  const { nom, prenom, eglise, district, federation, responsable, email, password, fonction, niveau, photo, adresse, contact, plain_password } = userData;
  const result = await db.run(
    `INSERT INTO users (nom, prenom, eglise, district, federation, responsable, email, password, plain_password, fonction, niveau, photo, adresse, contact)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [nom, prenom, eglise, district, federation, responsable, email, password, plain_password, fonction, niveau, photo, adresse, contact]
  );
  return result.lastID;
}