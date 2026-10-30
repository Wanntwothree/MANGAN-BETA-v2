(function (global) {
  "use strict";

  const currentUserKey = "demoCurrentUser";
  const usersKey = "demoUsers";
  const favoritesPrefix = "favorites_";
  const resetPrefix = "demoReset_";

  function storage() {
    try {
      return global.localStorage;
    } catch {
      return null;
    }
  }

  function read(key, fallback) {
    try {
      const raw = storage()?.getItem(key);
      if (!raw) return fallback;
      const parsed = JSON.parse(raw);
      return parsed ?? fallback;
    } catch {
      return fallback;
    }
  }

  function write(key, value) {
    try {
      storage()?.setItem(key, JSON.stringify(value));
    } catch {
      // Storage can be unavailable in private mode; demo state then stays in memory only.
    }
  }

  function remove(key) {
    try {
      storage()?.removeItem(key);
    } catch {
      // Ignore storage failures.
    }
  }

  function normalizeEmail(value) {
    return String(value || "").trim().toLowerCase();
  }

  function safeUser(user) {
    return {
      id: user.id,
      name: String(user.name || "").trim(),
      email: normalizeEmail(user.email),
      role: user.role || "user"
    };
  }

  function getCurrentUser() {
    const user = read(currentUserKey, null);
    if (!user || typeof user !== "object" || !user.email) return null;
    return safeUser(user);
  }

  function setCurrentUser(user) {
    if (!user || !user.email) return null;
    const safe = safeUser(user);
    write(currentUserKey, safe);
    return safe;
  }

  function clearCurrentUser() {
    remove(currentUserKey);
  }

  function getUsers() {
    const users = read(usersKey, []);
    return Array.isArray(users) ? users : [];
  }

  function saveUsers(users) {
    write(usersKey, users);
  }

  function registerLocal({ name, email, password, role }) {
    const normalizedName = String(name || "").trim();
    const normalizedEmail = normalizeEmail(email);
    if (!normalizedName) throw new Error("Enter your name.");
    if (!normalizedEmail) throw new Error("Enter a valid email address.");
    const users = getUsers();
    if (users.some((user) => normalizeEmail(user.email) === normalizedEmail)) {
      throw new Error("An account already uses that email.");
    }
    const user = {
      id: `local-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      name: normalizedName,
      email: normalizedEmail,
      password: String(password || ""),
      role: ["user", "owner"].includes(role) ? role : "user"
    };
    users.push(user);
    saveUsers(users);
    return setCurrentUser(user);
  }

  function loginLocal({ email, password }) {
    const normalizedEmail = normalizeEmail(email);
    const user = getUsers().find((candidate) => normalizeEmail(candidate.email) === normalizedEmail);
    if (!user || user.password !== String(password || "")) {
      throw new Error("Email or password is incorrect.");
    }
    return setCurrentUser(user);
  }

  function favoriteKey(email) {
    return `${favoritesPrefix}${normalizeEmail(email)}`;
  }

  function getFavoriteIds(email) {
    if (!normalizeEmail(email)) return new Set();
    const values = read(favoriteKey(email), []);
    return new Set((Array.isArray(values) ? values : []).map(Number).filter(Number.isFinite));
  }

  function setFavoriteIds(email, ids) {
    if (!normalizeEmail(email)) return new Set();
    const values = [...new Set([...ids].map(Number).filter(Number.isFinite))];
    write(favoriteKey(email), values);
    return new Set(values);
  }

  function clearFavorites(email) {
    if (normalizeEmail(email)) remove(favoriteKey(email));
  }

  function requestPasswordReset(email) {
    const normalizedEmail = normalizeEmail(email);
    const user = getUsers().find((candidate) => normalizeEmail(candidate.email) === normalizedEmail);
    if (!user) return null;
    const code = String(Math.floor(Math.random() * 1_000_000)).padStart(6, "0");
    write(`${resetPrefix}${normalizedEmail}`, { code, expiresAt: Date.now() + 10 * 60 * 1000 });
    return code;
  }

  function resetPassword({ email, code, password }) {
    const normalizedEmail = normalizeEmail(email);
    const record = read(`${resetPrefix}${normalizedEmail}`, null);
    if (!record || record.expiresAt <= Date.now() || record.code !== String(code || "")) {
      throw new Error("That reset code expired or is incorrect.");
    }
    const users = getUsers();
    const index = users.findIndex((candidate) => normalizeEmail(candidate.email) === normalizedEmail);
    if (index < 0) throw new Error("No local demo account uses that email.");
    users[index].password = String(password || "");
    saveUsers(users);
    remove(`${resetPrefix}${normalizedEmail}`);
    return true;
  }

  global.ManganStore = {
    clearCurrentUser,
    clearFavorites,
    favoriteKey,
    getCurrentUser,
    getFavoriteIds,
    loginLocal,
    registerLocal,
    requestPasswordReset,
    resetPassword,
    setCurrentUser,
    setFavoriteIds
  };
})(window);
