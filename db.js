// LOCALSTORAGE DATABASE ENGINE (FREE ZERO-CONFIG AUTH & DATA PERSISTENCE)
const DB_STORAGE_KEYS = {
  USERS: 'grace_db_users',
  SESSION: 'grace_db_session',
  STATE_PREFIX: 'grace_db_state_'
};

class GraceDatabase {
  constructor() {
    this.init();
  }

  init() {
    if (!localStorage.getItem(DB_STORAGE_KEYS.USERS)) {
      localStorage.setItem(DB_STORAGE_KEYS.USERS, JSON.stringify([]));
    }
  }

  getUsers() {
    return JSON.parse(localStorage.getItem(DB_STORAGE_KEYS.USERS) || '[]');
  }

  saveUsers(users) {
    localStorage.setItem(DB_STORAGE_KEYS.USERS, JSON.stringify(users));
  }

  // SIGN UP USER
  signUp(name, email, password) {
    const users = this.getUsers();
    const existing = users.find(u => u.email.toLowerCase() === email.toLowerCase());
    if (existing) {
      throw new Error('An account with this email address already exists.');
    }

    const newUser = {
      id: 'usr_' + Date.now(),
      name,
      email: email.toLowerCase(),
      password, // Note: In production cloud DBs, passwords are hashed
      createdAt: new Date().toISOString()
    };

    users.push(newUser);
    this.saveUsers(users);

    // Auto create default user finance state
    this.saveUserData(newUser.id, {
      income: { annualGross: 0, sideHustle: 0, other: 0 },
      expenses: [],
      events: []
    });

    this.setSession(newUser);
    return newUser;
  }

  // LOGIN USER
  login(email, password) {
    const users = this.getUsers();
    const user = users.find(u => u.email.toLowerCase() === email.toLowerCase() && u.password === password);
    if (!user) {
      throw new Error('Invalid email or password.');
    }
    this.setSession(user);
    return user;
  }

  // SESSION MANAGEMENT
  setSession(user) {
    localStorage.setItem(DB_STORAGE_KEYS.SESSION, JSON.stringify({
      userId: user.id,
      name: user.name,
      email: user.email
    }));
  }

  getCurrentUser() {
    const sessionStr = localStorage.getItem(DB_STORAGE_KEYS.SESSION);
    return sessionStr ? JSON.parse(sessionStr) : null;
  }

  logout() {
    localStorage.removeItem(DB_STORAGE_KEYS.SESSION);
  }

  // USER FINANCE DATA PERSISTENCE
  getUserData(userId) {
    const dataStr = localStorage.getItem(DB_STORAGE_KEYS.STATE_PREFIX + userId);
    return dataStr ? JSON.parse(dataStr) : null;
  }

  saveUserData(userId, data) {
    localStorage.setItem(DB_STORAGE_KEYS.STATE_PREFIX + userId, JSON.stringify(data));
  }
}

// Global Database Instance
window.db = new GraceDatabase();
