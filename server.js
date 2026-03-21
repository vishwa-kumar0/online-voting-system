const express = require('express');
const cors = require('cors');

const app = express();
const PORT = 5000;

// Middleware
app.use(cors());
app.use(express.json());

// In-memory storage (you can replace with a database later)
let voters = [];
let votes = [];


// POST /voters - Register a voter
app.post('/voters', (req, res) => {
    const { name, email } = req.body;

    // Validate input
    if (!name || !email) {
        return res.status(400).json({ message: 'Name and email are required' });
    }

    // Check if voter already exists
    const existingVoter = voters.find(voter => voter.email === email);
    if (existingVoter) {
        return res.status(400).json({ message: 'Voter with this email already registered' });
    }

    // Add new voter
    const newVoter = { id: voters.length + 1, name, email, hasVoted: false };
    voters.push(newVoter);

    res.status(201).json({ message: 'Voter registered successfully', voter: newVoter });
});

// POST /vote - Cast a vote
app.post('/vote', (req, res) => {
    const { email, candidate } = req.body;

    // Validate input
    if (!email || !candidate) {
        return res.status(400).json({ message: 'Email and candidate are required' });
    }

    // Find voter
    const voter = voters.find(v => v.email === email);
    if (!voter) {
        return res.status(404).json({ message: 'Voter not found. Please register first.' });
    }

    // Check if voter has already voted
    if (voter.hasVoted) {
        return res.status(400).json({ message: 'You have already voted' });
    }

    // Record the vote
    votes.push({ voterId: voter.id, candidate, timestamp: new Date() });

    // Mark voter as having voted
    voter.hasVoted = true;

    res.json({ message: `Vote for ${candidate} recorded successfully!` });
});

// GET /results - Get voting results
app.get('/results', (req, res) => {
    // Count votes for each candidate
    const results = {};
    votes.forEach(vote => {
        results[vote.candidate] = (results[vote.candidate] || 0) + 1;
    });

    // Convert to array format for frontend
    const resultsArray = Object.entries(results).map(([name, votes]) => ({
        name,
        votes
    }));

    res.json(resultsArray);
});

// ===== ADMIN CRUD OPERATIONS =====

// GET /admin/voters - Get all voters
app.get('/admin/voters', (req, res) => {
    res.json(voters);
});

// GET /admin/votes - Get all votes
app.get('/admin/votes', (req, res) => {
    res.json(votes);
});

// UPDATE /admin/voters/:email - Update voter information
app.put('/admin/voters/:email', (req, res) => {
    const email = req.params.email;
    const { name, newEmail } = req.body;

    const voter = voters.find(v => v.email === email);
    if (!voter) {
        return res.status(404).json({ message: 'Voter not found' });
    }

    if (name) voter.name = name;
    if (newEmail && newEmail !== email) {
        const existingWithNewEmail = voters.find(v => v.email === newEmail);
        if (existingWithNewEmail) {
            return res.status(400).json({ message: 'Email already in use' });
        }
        voter.email = newEmail;
    }

    res.json({ message: 'Voter updated successfully', voter });
});

// DELETE /admin/voters/:email - Delete a voter
app.delete('/admin/voters/:email', (req, res) => {
    const email = req.params.email;
    const voterIndex = voters.findIndex(v => v.email === email);

    if (voterIndex === -1) {
        return res.status(404).json({ message: 'Voter not found' });
    }

    const deletedVoter = voters.splice(voterIndex, 1)[0];

    // Also delete their vote if they voted
    const voteIndex = votes.findIndex(v => v.voterId === deletedVoter.id);
    if (voteIndex !== -1) {
        votes.splice(voteIndex, 1);
    }

    res.json({ message: 'Voter deleted successfully', voter: deletedVoter });
});

// DELETE /admin/votes/:email - Delete votes by voter email
app.delete('/admin/votes/:email', (req, res) => {
    const email = req.params.email;
    const voter = voters.find(v => v.email === email);

    if (!voter) {
        return res.status(404).json({ message: 'Voter not found' });
    }

    const voteIndex = votes.findIndex(v => v.voterId === voter.id);
    if (voteIndex === -1) {
        return res.status(404).json({ message: 'No vote found for this voter' });
    }

    const deletedVote = votes.splice(voteIndex, 1)[0];
    voter.hasVoted = false;

    res.json({ message: 'Vote deleted successfully', vote: deletedVote });
});

// DELETE /admin/reset - Clear all data
app.delete('/admin/reset', (req, res) => {
    voters = [];
    votes = [];
    res.json({ message: 'All data cleared successfully' });
});

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
