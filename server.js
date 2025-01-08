const express = require('express')
const bodyParser = require('body-parser')
const { initializeApp, cert } = require('firebase-admin/app')
const { getFirestore } = require('firebase-admin/firestore')
const cors = require('cors'); // Import cors middleware
const app = express()
const PORT = process.env.PORT || 3000

// Configure CORS options
const corsOptions = {
  origin: ['http://localhost:3000', 'https://wedding-invite-78ed0.web.app'], // Add your frontend URLs here
  methods: 'GET,POST,DELETE', // Allow specific methods
  allowedHeaders: ['Content-Type', 'Authorization'], // Allow specific headers
}

// Apply CORS middleware
app.use(cors(corsOptions));
// Initialize Firebase Admin SDK
const serviceAccount = {
  type: process.env.type,
  project_id: process.env.project_id,
  private_key_id: process.env.private_key_id,
  private_key: process.env.private_key.replace(/\\n/g, '\n'), // Replace escaped newlines for private key
  client_email: process.env.client_email,
  client_id: process.env.client_id,
  auth_uri: process.env.auth_uri,
  token_uri: process.env.token_uri,
  auth_provider_x509_cert_url: process.env.auth_provider_x509_cert_url,
  client_x509_cert_url: process.env.client_x509_cert_url,
  universe_domain: process.env.universe_domain,
}
initializeApp({
  credential: cert(serviceAccount),
})

const db = getFirestore()

app.use(bodyParser.json())
app.use(express.static('public')) // Serve the frontend files

// Endpoint to submit an entry
app.post('/submit', async (req, res) => {
  const { name, phone, location, event1, event2 } = req.body

  if (!name || !phone || !location || isNaN(event1) || isNaN(event2)) {
    return res.json({ success: false, message: 'All fields are required!' })
  }

  const uniqueId = `${name}-${phone}` // Use name and phone as unique identifiers
  const inviteRef = db.collection('invites').doc(uniqueId)

  try {
    const doc = await inviteRef.get()

    if (doc.exists) {
      res.json({ success: false, message: 'Duplicate entry not allowed!' })
    } else {
      await inviteRef.set({
        name,
        phone,
        location,
        event1,
        event2,
        timestamp: new Date(),
      })
      res.json({ success: true, message: 'Invite submitted successfully!' })
    }
  } catch (error) {
    console.error('Error writing to Firestore:', error)
    res.json({ success: false, message: 'An error occurred!' })
  }
})

// Endpoint to fetch all entries
app.get('/invites', async (req, res) => {
  try {
    const invitesSnapshot = await db.collection('invites').get()
    const entries = []

    invitesSnapshot.forEach((doc) => {
      entries.push({ id: doc.id, ...doc.data() })
    })

    // sort the entries by timestamp newest to oldest
    entries.sort((a, b) => b.timestamp - a.timestamp)

    res.json({ success: true, entries })
  } catch (error) {
    console.error('Error fetching entries from Firestore:', error)
    res.json({
      success: false,
      message: 'An error occurred while fetching entries!',
    })
  }
})

// Endpoint to delete an entry by ID
app.delete('/delete/:id', async (req, res) => {
  const { id } = req.params

  try {
    const inviteRef = db.collection('invites').doc(id)
    const doc = await inviteRef.get()

    if (!doc.exists) {
      res.json({ success: false, message: 'Entry not found!' })
    } else {
      await inviteRef.delete()
      res.json({ success: true, message: 'Entry deleted successfully!' })
    }
  } catch (error) {
    console.error('Error deleting entry from Firestore:', error)
    res.json({
      success: false,
      message: 'An error occurred while deleting the entry!',
    })
  }
})

app.listen(PORT, () =>
  console.log(`Server running on http://localhost:${PORT}`)
)
