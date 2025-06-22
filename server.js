require('dotenv').config();
const express = require('express');
const nodemailer = require('nodemailer');
const cors = require('cors');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors({ origin: '*' }));

app.use(bodyParser.json());

// Connexion à MongoDB avec Mongoose
mongoose.connect(process.env.DB_URI)
  .then(() => console.log('MongoDB connecté !'))
  .catch((err) => console.error('Erreur de connexion MongoDB:', err));

// Définition d'un schema pour stocker les messages de contact
const messageSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true },
  message: { type: String, required: true },
  date: { type: Date, default: Date.now }
});

// Création du modèle
const Message = mongoose.model('Message', messageSchema);

// Route racine
app.get('/', (req, res) => {
  res.send('Bienvenue sur mon API backend pour le formulaire de contact !');
});

// Transporteur SMTP Nodemailer
const transporter = nodemailer.createTransport({
  service: 'gmail', // ou autre service SMTP
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// Route POST pour recevoir le formulaire
app.post('/contact', async (req, res) => {
  const { name, email, message } = req.body;

  if (!name || !email || !message) {
    return res.status(400).json({ error: 'Tous les champs sont obligatoires.' });
  }

  try {
    // Enregistrer le message dans la base MongoDB
    const newMessage = new Message({ name, email, message });
    await newMessage.save();

    // Préparer l'email
    const mailOptions = {
      from: email,
      to: process.env.EMAIL_USER,
      subject: `Nouveau message de ${name} via le formulaire contact`,
      text: message,
      html: `
        <p><strong>Nom:</strong> ${name}</p>
        <p><strong>Email:</strong> ${email}</p>
        <p><strong>Message:</strong><br/>${message.replace(/\n/g, '<br/>')}</p>
      `,
    };

    // Envoyer l'email
    transporter.sendMail(mailOptions, (error, info) => {
      if (error) {
        console.error(error);
        return res.status(500).json({ error: "Erreur lors de l’envoi du mail." });
      }
      res.json({ message: 'Message envoyé et sauvegardé avec succès !' });
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur serveur.' });
  }
});

app.listen(PORT, () => {
  console.log(`Serveur démarré sur le port ${PORT}`);
});
