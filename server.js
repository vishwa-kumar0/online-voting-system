
const express = require('express');
const cors = require('cors');
const { MongoClient, ObjectId } = require('mongodb');

const app = express();
const PORT = 5000;

// MongoDB Connection
const PRIMARY_MONGODB_URI = process.env.MONGODB_URI || '';
const DEFAULT_LOCAL_MONGODB_URI = 'mongodb://127.0.0.1:27017/voting-system';
let db;

const reportUri = uri => uri.startsWith('mongodb+srv') ? 'mongodb+srv://<REDACTED>' : uri;

const connectMongo = async (uri) => {
    const client = new MongoClient(uri, {
        serverSelectionTimeoutMS: 5000,
        socketTimeoutMS: 45000,
        heartbeatFrequencyMS: 10000,
    });
    await client.connect();
    db = client.db('voting-system');
    console.log(`MongoDB connected using: ${reportUri(uri)}`);
};

const connectDB = async () => {
    let attemptedUri = PRIMARY_MONGODB_URI || DEFAULT_LOCAL_MONGODB_URI;
    console.log('Trying to connect to MongoDB using:', reportUri(attemptedUri));

    try {
        await connectMongo(attemptedUri);
    } catch (error) {
        console.error(`Failed to connect using ${reportUri(attemptedUri)}:`, error.message || error);

        if (attemptedUri !== DEFAULT_LOCAL_MONGODB_URI) {
            console.log('Falling back to local MongoDB:', DEFAULT_LOCAL_MONGODB_URI);
            try {
                await connectMongo(DEFAULT_LOCAL_MONGODB_URI);
            } catch (fallbackError) {
                console.error('Local MongoDB fallback failed:', fallbackError.message || fallbackError);
                process.exit(1);
            }
        } else {
            process.exit(1);
        }
    }

    // start server once DB is connected
    app.listen(PORT, () => {
        console.log(`Server running on http://localhost:${PORT}`);
    });
};

connectDB();

// Middleware
app.use(cors());
app.use(express.json());


// POST /voters - Register a voter
app.post('/voters', async (req, res) => {
    try {
        const { name, email } = req.body;

        // Validate input
        if (!name || !email) {
            return res.status(400).json({ message: 'Name and email are required' });
        }

        // Check if voter already exists
        const existing = await db.collection('voters').findOne({ email: email.toLowerCase() });
        if (existing) {
            return res.status(400).json({ message: 'Voter with this email already registered' });
        }

        // Create new voter
        const newVoter = {
            name: name.trim(),
            email: email.toLowerCase().trim(),
            hasVoted: false,
            createdAt: new Date()
        };

        const result = await db.collection('voters').insertOne(newVoter);

        res.status(201).json({
            message: 'Voter registered successfully',
            voter: {
                id: result.insertedId,
                name: newVoter.name,
                email: newVoter.email,
                hasVoted: newVoter.hasVoted
            }
        });
    } catch (error) {
        console.error('Error registering voter:', error);
        res.status(500).json({ message: 'Server error during registration' });
    }
});

// POST /vote - Cast a vote
app.post('/vote', async (req, res) => {
    try {
        const { email, candidate } = req.body;

        // Validate input
        if (!email || !candidate) {
            return res.status(400).json({ message: 'Email and candidate are required' });
        }

        // Find voter
        const voter = await db.collection('voters').findOne({ email: email.toLowerCase() });
        if (!voter) {
            return res.status(404).json({ message: 'Voter not found. Please register first.' });
        }

        // Check if voter has already voted
        if (voter.hasVoted) {
            return res.status(400).json({ message: 'You have already voted' });
        }

        // Create and save the vote
        const newVote = {
            voterId: voter._id,
            candidate: candidate.trim(),
            timestamp: new Date()
        };

        await db.collection('votes').insertOne(newVote);

        // Mark voter as having voted
        await db.collection('voters').updateOne(
            { _id: voter._id },
            { $set: { hasVoted: true } }
        );

        res.json({ message: `Vote for ${candidate} recorded successfully!` });
    } catch (error) {
        console.error('Error casting vote:', error);
        res.status(500).json({ message: 'Server error during voting' });
    }
});

// GET /results - Get voting results
app.get('/results', async (req, res) => {
    try {
        // Use MongoDB aggregation to count votes by candidate
        const results = await db.collection('votes').aggregate([
            {
                $group: {
                    _id: '$candidate',
                    votes: { $sum: 1 }
                }
            },
            {
                $sort: { votes: -1 } // Sort by vote count descending
            }
        ]).toArray();

        // Convert to the expected format
        const resultsArray = results.map(result => ({
            name: result._id,
            votes: result.votes
        }));

        res.json(resultsArray);
    } catch (error) {
        console.error('Error getting results:', error);
        res.status(500).json({ message: 'Server error retrieving results' });
    }
});


// GET /candidates - Return static candidate list
app.get('/candidates', async (req, res) => {
    const staticCandidates = [
        { name: 'Candidate A', value: 'candidateA' },
        { name: 'Candidate B', value: 'candidateB' },
        { name: 'Candidate C', value: 'candidateC' }
    ];

    if (!db) {
        return res.json({ candidates: staticCandidates, votes: [] });
    }

    try {
        const aggregatedVotes = await db.collection('votes').aggregate([
            { $group: { _id: '$candidate', votes: { $sum: 1 } } }
        ]).toArray();

        const voteMap = aggregatedVotes.reduce((acc, item) => {
            acc[item._id] = item.votes;
            return acc;
        }, {});

        const enhanced = staticCandidates.map(candidate => ({
            ...candidate,
            votes: voteMap[candidate.value] || 0
        }));

        res.json({ candidates: enhanced });
    } catch (error) {
        console.error('Error getting candidates:', error);
        res.status(500).json({ message: 'Server error retrieving candidates' });
    }
});

// ===== ADMIN CRUD OPERATIONS =====

// GET /admin/voters - Get all voters
app.get('/admin/voters', async (req, res) => {
    try {
        const voters = await db.collection('voters').find().sort({ createdAt: -1 }).toArray();
        res.json(voters);
    } catch (error) {
        console.error('Error getting voters:', error);
        res.status(500).json({ message: 'Server error retrieving voters' });
    }
});

// GET /admin/votes - Get all votes
app.get('/admin/votes', async (req, res) => {
    try {
        const votes = await db.collection('votes').find().sort({ timestamp: -1 }).toArray();
        res.json(votes);
    } catch (error) {
        console.error('Error getting votes:', error);
        res.status(500).json({ message: 'Server error retrieving votes' });
    }
});

// UPDATE /admin/voters/:email - Update voter information
app.put('/admin/voters/:email', async (req, res) => {
    try {
        const email = req.params.email.toLowerCase();
        const { name, newEmail } = req.body;

        const voter = await db.collection('voters').findOne({ email });
        if (!voter) {
            return res.status(404).json({ message: 'Voter not found' });
        }

        const updateData = {};
        if (name) updateData.name = name.trim();
        
        if (newEmail && newEmail.toLowerCase() !== email) {
            const existingWithNewEmail = await db.collection('voters').findOne({ email: newEmail.toLowerCase() });
            if (existingWithNewEmail) {
                return res.status(400).json({ message: 'Email already in use' });
            }
            updateData.email = newEmail.toLowerCase().trim();
        }

        await db.collection('voters').updateOne(
            { email },
            { $set: updateData }
        );

        const updatedVoter = await db.collection('voters').findOne(newEmail ? { email: newEmail.toLowerCase() } : { email });
        res.json({ message: 'Voter updated successfully', voter: updatedVoter });
    } catch (error) {
        console.error('Error updating voter:', error);
        res.status(500).json({ message: 'Server error updating voter' });
    }
});

// DELETE /admin/voters/:email - Delete a voter
app.delete('/admin/voters/:email', async (req, res) => {
    try {
        const email = req.params.email.toLowerCase();

        const voter = await db.collection('voters').findOne({ email });
        if (!voter) {
            return res.status(404).json({ message: 'Voter not found' });
        }

        // Delete the voter
        await db.collection('voters').deleteOne({ _id: voter._id });

        // Also delete their vote if they voted
        await db.collection('votes').deleteOne({ voterId: voter._id });

        res.json({ message: 'Voter deleted successfully', voter });
    } catch (error) {
        console.error('Error deleting voter:', error);
        res.status(500).json({ message: 'Server error deleting voter' });
    }
});

// DELETE /admin/votes/:email - Delete votes by voter email
app.delete('/admin/votes/:email', async (req, res) => {
    try {
        const email = req.params.email.toLowerCase();

        const voter = await db.collection('voters').findOne({ email });
        if (!voter) {
            return res.status(404).json({ message: 'Voter not found' });
        }

        const vote = await db.collection('votes').findOne({ voterId: voter._id });
        if (!vote) {
            return res.status(404).json({ message: 'No vote found for this voter' });
        }

        await db.collection('votes').deleteOne({ _id: vote._id });
        
        // Reset voter's hasVoted flag
        await db.collection('voters').updateOne(
            { _id: voter._id },
            { $set: { hasVoted: false } }
        );

        res.json({ message: 'Vote deleted successfully', vote });
    } catch (error) {
        console.error('Error deleting vote:', error);
        res.status(500).json({ message: 'Server error deleting vote' });
    }
});

// DELETE /admin/reset - Clear all data
app.delete('/admin/reset', async (req, res) => {
    try {
        await db.collection('voters').deleteMany({});
        await db.collection('votes').deleteMany({});
        res.json({ message: 'All data cleared successfully' });
    } catch (error) {
        console.error('Error clearing data:', error);
        res.status(500).json({ message: 'Server error clearing data' });
    }
});
