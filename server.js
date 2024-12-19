const express = require('express')
const bodyParser = require('body-parser')
const { initializeApp, cert } = require('firebase-admin/app')
const { getFirestore } = require('firebase-admin/firestore')
const app = express()
const PORT = process.env.PORT || 3000

// Initialize Firebase Admin SDK
const serviceAccount = require('./firebasecreds.json') // Replace with your Firebase Admin SDK key

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
