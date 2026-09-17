// /src/lib/harbour.js
export default class Harbour {
  constructor(lang = "en-US") {
    this.FQDN = "http://127.0.0.1:3000"; // updated port to match Express server
    this.HUB = `${this.FQDN}/v1/hub`;
    this.HEADERS = {
      'Accept-Language': lang,
      'Content-Type': 'application/json'
    };
  }

  // Register a new user
  async register({ username, email, password }) {
    const res = await fetch(`${this.HUB}/register`, {
      method: 'POST',
      headers: this.HEADERS,
      body: JSON.stringify({ username, email, password })
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Registration failed');

    return data;
  }

  // Login an existing user
  async login({ usernameOrEmail, password }) {
    const res = await fetch(`${this.HUB}/login`, {
      method: 'POST',
      headers: this.HEADERS,
      body: JSON.stringify({ usernameOrEmail, password })
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Login failed');

    return data;
  }

  // Optional: Forgot password
  async forgotPassword(email) {
    const res = await fetch(`${this.HUB}/forgot-password`, {
      method: 'POST',
      headers: this.HEADERS,
      body: JSON.stringify({ email })
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to send reset email');

    return data;
  }
}
