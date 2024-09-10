const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const { app } = require('electron');

class Database {
  constructor() {
    const dbPath = path.join(app.getPath('userData'), 'pressthat.db');
    this.db = new sqlite3.Database(dbPath);
    this.init();
  }

  init() {
    this.db.serialize(() => {
      this.db.run(`CREATE TABLE IF NOT EXISTS credentials (
        id INTEGER PRIMARY KEY,
        siteUrl TEXT,
        username TEXT,
        password TEXT
      )`);

      this.db.run(`CREATE TABLE IF NOT EXISTS posts (
        id INTEGER PRIMARY KEY,
        wp_id INTEGER,
        title TEXT,
        content TEXT,
        excerpt TEXT,
        status TEXT,
        date TEXT
      )`);
    });
  }

  saveCredentials(siteUrl, username, password) {
    return new Promise((resolve, reject) => {
      this.db.run(`INSERT OR REPLACE INTO credentials (id, siteUrl, username, password) VALUES (1, ?, ?, ?)`,
        [siteUrl, username, password],
        (err) => {
          if (err) reject(err);
          else resolve();
        }
      );
    });
  }

  getCredentials() {
    return new Promise((resolve, reject) => {
      this.db.get(`SELECT * FROM credentials WHERE id = 1`, (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });
  }

  savePosts(posts) {
    const stmt = this.db.prepare(`INSERT OR REPLACE INTO posts (wp_id, title, content, excerpt, status, date) VALUES (?, ?, ?, ?, ?, ?)`);
    posts.forEach(post => {
      stmt.run(post.id, post.title.rendered, post.content.rendered, post.excerpt.rendered, post.status, post.date);
    });
    stmt.finalize();
  }

  getPosts() {
    return new Promise((resolve, reject) => {
      this.db.all(`SELECT * FROM posts`, (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
  }
}

module.exports = new Database();