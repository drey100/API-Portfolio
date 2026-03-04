require('dotenv').config();
const express    = require('express');
const nodemailer = require('nodemailer');
const cors       = require('cors');
const mongoose   = require('mongoose');
const path       = require('path');

const app  = express();
const PORT = process.env.PORT || 5000;

// ─────────────────────────────────────────
// Middleware
// ─────────────────────────────────────────
app.use(cors({ origin: '*' }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ─────────────────────────────────────────
// Fichiers statiques
// server.js est dans backend/
// les HTML sont dans ../public/
// ─────────────────────────────────────────
const publicDir = path.join(__dirname, '..', 'public');
app.use(express.static(publicDir));

app.get('/', (req, res) => {
  res.sendFile(path.join(publicDir, 'portfolio.html'));
});

app.get('/dashboard', (req, res) => {
  res.sendFile(path.join(publicDir, 'dashboard.html'));
});

// ─────────────────────────────────────────
// MongoDB — OPTIONNEL
// ─────────────────────────────────────────
let Message = null;

if (process.env.DB_URI) {
  mongoose.connect(process.env.DB_URI)
    .then(() => {
      console.log('MongoDB connecte !');
      const messageSchema = new mongoose.Schema({
        name:    { type: String, required: true, trim: true },
        email:   { type: String, required: true, trim: true, lowercase: true },
        subject: { type: String, required: true, trim: true },
        message: { type: String, required: true, trim: true },
        date:    { type: Date, default: Date.now }
      });
      Message = mongoose.model('Message', messageSchema);
    })
    .catch((err) => {
      console.warn('MongoDB non connecte :', err.message);
    });
} else {
  console.warn('DB_URI absent - MongoDB desactive (facultatif).');
}

// ─────────────────────────────────────────
// Nodemailer — OPTIONNEL
// ─────────────────────────────────────────
let transporter = null;

if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
  transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });
  console.log('Email configure pour :', process.env.EMAIL_USER);
} else {
  console.warn('EMAIL_USER/EMAIL_PASS absents - email desactive (facultatif).');
}

// ─────────────────────────────────────────
// Route POST /contact
// ─────────────────────────────────────────
app.post('/contact', async (req, res) => {
  const { name, email, subject, message } = req.body;

  if (!name || !email || !subject || !message) {
    return res.status(400).json({ error: 'Tous les champs sont obligatoires.' });
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({ error: 'Adresse email invalide.' });
  }

  const results = { saved: false, emailed: false };

  // 1. Sauvegarde MongoDB
  if (Message) {
    try {
      await new Message({ name, email, subject, message }).save();
      results.saved = true;
      console.log('Message de ' + name + ' sauvegarde en base.');
    } catch (err) {
      console.warn('Erreur MongoDB :', err.message);
    }
  }

  // 2. Envoi email
  if (transporter) {
    try {
      await transporter.sendMail({
        from:    '"' + name + '" <' + process.env.EMAIL_USER + '>',
        replyTo: email,
        to:      process.env.EMAIL_USER,
        subject: '[Portfolio] ' + subject + ' - message de ' + name,
        text:    'Nom: ' + name + '\nEmail: ' + email + '\nSujet: ' + subject + '\n\nMessage:\n' + message,
        html:    '<div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;"><div style="background:#d4af64;padding:20px 30px;"><h2 style="color:#000;margin:0;">Nouveau message - Portfolio</h2></div><div style="padding:30px;"><p><strong>Nom :</strong> ' + name + '</p><p><strong>Email :</strong> ' + email + '</p><p><strong>Sujet :</strong> ' + subject + '</p><hr/><p>' + message.replace(/\n/g, '<br/>') + '</p></div></div>',
      });
      results.emailed = true;
      console.log('Email envoye pour ' + name);
    } catch (err) {
      console.warn('Erreur email :', err.message);
    }
  }

  return res.status(200).json({
    message: 'Message recu avec succes !',
    saved:   results.saved,
    emailed: results.emailed,
  });
});

// ─────────────────────────────────────────
// Demarrage
// ─────────────────────────────────────────
app.listen(PORT, () => {
  console.log('\n====================================');
  console.log('  Serveur demarre !');
  console.log('====================================');
  console.log('  Portfolio  : http://localhost:' + PORT + '/');
  console.log('  Dashboard  : http://localhost:' + PORT + '/dashboard');
  console.log('  API        : http://localhost:' + PORT + '/contact');
  console.log('------------------------------------');
  console.log('  MongoDB : ' + (process.env.DB_URI     ? 'configure' : 'non configure'));
  console.log('  Email   : ' + (process.env.EMAIL_USER ? 'configure' : 'non configure'));
  console.log('====================================\n');
});