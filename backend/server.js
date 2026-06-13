const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const multer = require('multer');
const { exec } = require('child_process');
const path = require('path');
const fs = require('fs');
const csv = require('csv-parser');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const Groq = require('groq-sdk');

// Import Auth Components
const User = require('./models/User');
const verifyToken = require('./middleware/auth');

const app = express();

const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:5173',
  process.env.FRONTEND_URL
].filter(Boolean);

app.use(cors({
  origin: function(origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  }
}));
app.use(express.json());

const uploadDir = path.join(__dirname, 'uploads');
// Ensure uploads folder exists
if (!fs.existsSync(uploadDir)){
    fs.mkdirSync(uploadDir);
}

// Set up Multer for file uploads with absolute path
const upload = multer({ dest: uploadDir });

const JWT_SECRET = process.env.JWT_SECRET || '3108aaa4149998a0de6c764510cd7ec1c9fc60827545d68530ff4fe86bb37ad1';

// MongoDB Connection
const MONGO_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/loanDB';
mongoose.connect(MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true
}).then(() => console.log("Connected to MongoDB"))
  .catch(err => console.error("MongoDB connection error:", err));

// Mongoose Schemas
const loanSchema = new mongoose.Schema({
    Loan_ID: String,
    ApplicantIncome: Number,
    CoapplicantIncome: Number,
    LoanAmount: Number,
    Loan_Amount_Term: Number,
    Loan_Status: String,
    Gender: String,
    Married: String,
    Dependents: String,
    Education: String,
    Self_Employed: String,
    Credit_History: Number,
    Property_Area: String
});
const Loan = mongoose.model('Loan', loanSchema);

const CleaningStatSchema = new mongoose.Schema({
    totalUploaded: Number,
    recordsAfterCleaning: Number,
    duplicatesRemoved: Number
});
const CleaningStat = mongoose.model('CleaningStat', CleaningStatSchema);


// ==========================================
// AUTHENTICATION ENDPOINTS
// ==========================================

// POST /auth/register
app.post('/auth/register', async (req, res) => {
    try {
        const { email, password } = req.body;
        
        if (!(email && password)) {
            return res.status(400).json({ error: 'Email and password are required' });
        }

        const oldUser = await User.findOne({ email: email.toLowerCase() });
        if (oldUser) {
            return res.status(409).json({ error: 'User already exists. Please login.' });
        }

        // Hash password with bcrypt
        const encryptedPassword = await bcrypt.hash(password, 10);
        
        const user = await User.create({
            email: email.toLowerCase(),
            password: encryptedPassword,
        });

        res.status(201).json({ message: 'User created successfully', email: user.email });
    } catch (err) {
        console.error("Registration Error:", err);
        res.status(500).json({ error: 'Registration failed' });
    }
});

// POST /auth/login
app.post('/auth/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!(email && password)) {
            return res.status(400).json({ error: 'Email and password are required' });
        }

        const user = await User.findOne({ email: email.toLowerCase() });

        // Verify user exists and password is correct
        if (user && (await bcrypt.compare(password, user.password))) {
            const token = jwt.sign(
                { user_id: user._id, email },
                JWT_SECRET,
                { expiresIn: '2h' }
            );

            return res.status(200).json({ token, email });
        }
        res.status(400).json({ error: 'Invalid Credentials' });
    } catch (err) {
        console.error("Login Error:", err);
        res.status(500).json({ error: 'Login failed' });
    }
});


// ==========================================
// CORE API ENDPOINTS
// ==========================================

// 1. Upload CSV, trigger Python, store in MongoDB (Remains Public)
app.post('/api/upload', upload.single('file'), (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
    }

    const inputCsv = req.file.path;
    const outputCsv = path.join(__dirname, 'uploads', `cleaned_${req.file.filename}.csv`);
    const pythonScript = path.join(__dirname, 'scripts', 'data_processing.py');

    const command = `python "${pythonScript}" "${inputCsv}" "${outputCsv}"`;
    exec(command, (error, stdout, stderr) => {
        if (error) {
            console.error(`Python Execution Error: ${error.message}\nStderr: ${stderr}`);
            return res.status(500).json({ error: 'Data processing failed', details: stderr || error.message });
        }

        let cleaningStats = { totalUploaded: 0, recordsAfterCleaning: 0, duplicatesRemoved: 0 };
        try {
            const statsMatch = stdout.match(/__STATS__(.*?)__STATS__/);
            if (statsMatch && statsMatch[1]) {
                cleaningStats = JSON.parse(statsMatch[1]);
            }
        } catch (e) {
            console.error("Error parsing stats");
        }

        const results = [];
        fs.createReadStream(outputCsv)
            .pipe(csv())
            .on('data', (data) => {
                results.push({
                    Loan_ID: data.Loan_ID || '',
                    ApplicantIncome: parseFloat(data.ApplicantIncome) || 0,
                    CoapplicantIncome: parseFloat(data.CoapplicantIncome) || 0,
                    LoanAmount: parseFloat(data.LoanAmount) || 0,
                    Loan_Amount_Term: parseFloat(data.Loan_Amount_Term) || 360,
                    Loan_Status: data.Loan_Status || '',
                    Gender: data.Gender || '',
                    Married: data.Married || '',
                    Dependents: data.Dependents || '',
                    Education: data.Education || '',
                    Self_Employed: data.Self_Employed || '',
                    Credit_History: data.Credit_History !== undefined && data.Credit_History !== '' ? parseInt(data.Credit_History) : null,
                    Property_Area: data.Property_Area || ''
                });
            })
            .on('end', async () => {
                try {
                    await Loan.deleteMany({});
                    await Loan.insertMany(results);
                    
                    await CleaningStat.deleteMany({});
                    await CleaningStat.create(cleaningStats);

                    fs.unlinkSync(inputCsv);
                    fs.unlinkSync(outputCsv);
                    
                    res.json({ 
                        message: 'Data processed and saved successfully', 
                        recordsProcessed: results.length,
                        totalBefore: cleaningStats.totalUploaded,
                        totalAfter: cleaningStats.recordsAfterCleaning,
                        duplicatesRemoved: cleaningStats.duplicatesRemoved
                    });
                } catch (dbError) {
                    console.error("DB Save Error:", dbError);
                    res.status(500).json({ error: 'Database save failed', details: dbError.message });
                }
            });
    });
});

// 2. Get Statistics (Protected with verifyToken middleware)
app.get('/api/stats', verifyToken, async (req, res) => {
    try {
        const totalApplications = await Loan.countDocuments();
        const approved = await Loan.countDocuments({ Loan_Status: 'Approved' });
        const rejected = await Loan.countDocuments({ Loan_Status: 'Rejected' });

        const aggregation = await Loan.aggregate([
            {
                $group: {
                    _id: null,
                    avgIncome: { $avg: "$ApplicantIncome" },
                    avgLoanAmount: { $avg: "$LoanAmount" }
                }
            }
        ]);

        const avgIncome = aggregation.length > 0 ? aggregation[0].avgIncome : 0;
        const avgLoanAmount = aggregation.length > 0 ? aggregation[0].avgLoanAmount : 0;

        res.json({
            totalApplications,
            approved,
            rejected,
            avgIncome,
            avgLoanAmount
        });
    } catch (error) {
        console.error("Stats Error:", error);
        res.status(500).json({ error: 'Failed to fetch statistics' });
    }
});

// 3. Get Data for Charts
app.get('/api/data', async (req, res) => {
    try {
        const data = await Loan.find({});
        res.json(data);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch data', details: error.message });
    }
});

// 4. Get Cleaning Stats
app.get('/api/cleaning-stats', async (req, res) => {
    try {
        const stat = await CleaningStat.findOne();
        res.json(stat || { totalUploaded: 0, recordsAfterCleaning: 0, duplicatesRemoved: 0 });
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch cleaning stats', details: error.message });
    }
});

// 5. Get AI Insights (Phase 3)
app.get('/api/insights', async (req, res) => {
    try {
        // Market Comparison
        const marketAgg = await Loan.aggregate([
            {
                $group: {
                    _id: null,
                    avgIncome: { $avg: "$ApplicantIncome" },
                    avgLoan: { $avg: "$LoanAmount" },
                    totalApproved: {
                        $sum: { $cond: [{ $eq: ["$Loan_Status", "Approved"] }, 1, 0] }
                    },
                    totalCount: { $sum: 1 }
                }
            }
        ]);
        
        const marketStats = marketAgg[0] || { avgIncome: 0, avgLoan: 0, totalApproved: 0, totalCount: 1 };
        const approvalRate = (marketStats.totalApproved / marketStats.totalCount) * 100;

        // High Risk Detectors (Credit History = 0 and Loan > avg)
        const highRiskProfiles = await Loan.find({
            Loan_Status: "Rejected",
            Credit_History: 0,
            LoanAmount: { $gt: marketStats.avgLoan }
        }).limit(5).lean();

        // Recommendations (Similar to approved loans, high income, low loan)
        const recommendedProfiles = await Loan.find({
            Loan_Status: "Approved",
            ApplicantIncome: { $gt: marketStats.avgIncome },
            Credit_History: 1
        }).sort({ ApplicantIncome: -1 }).limit(3).lean();

        res.json({
            marketComparison: {
                avgIncome: marketStats.avgIncome,
                avgLoan: marketStats.avgLoan,
                approvalRate: approvalRate
            },
            highRiskProfiles,
            recommendedProfiles
        });
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch insights', details: error.message });
    }
});

// ==========================================
// AI REPORT GENERATION (Phase 4)
// ==========================================
app.post('/api/ai/generate-report', verifyToken, async (req, res) => {
    try {
        const { prompt } = req.body;
        
        // 1. Gather Context
        const totalApplications = await Loan.countDocuments();
        const approved = await Loan.countDocuments({ Loan_Status: 'Approved' });
        const rejected = await Loan.countDocuments({ Loan_Status: 'Rejected' });
        
        const marketAgg = await Loan.aggregate([
            {
                $group: {
                    _id: null,
                    avgIncome: { $avg: "$ApplicantIncome" },
                    avgLoan: { $avg: "$LoanAmount" }
                }
            }
        ]);
        const avgIncome = marketAgg.length ? Math.round(marketAgg[0].avgIncome) : 0;
        const avgLoan = marketAgg.length ? Math.round(marketAgg[0].avgLoan) : 0;
        
        const highRisk = await Loan.countDocuments({ Loan_Status: "Rejected", Credit_History: 0 });

        const context = `
        Current Portfolio Statistics:
        - Total Applications: ${totalApplications}
        - Approved: ${approved}
        - Rejected: ${rejected}
        - Approval Rate: ${((approved/totalApplications)*100).toFixed(1)}%
        - Average Income: $${avgIncome}
        - Average Loan: $${avgLoan}k
        - High-Risk Anomalies Detected: ${highRisk}
        `;

        const groqApiKey = process.env.GROQ_API_KEY;

        if (groqApiKey) {
            // Use real Groq API
            const groq = new Groq({ apiKey: groqApiKey });
            const completion = await groq.chat.completions.create({
                messages: [
                    {
                        role: "system",
                        content: "You are a senior financial analyst and underwriting assistant. Write a concise, professional executive summary based on the provided portfolio statistics. Use markdown. Keep it under 200 words. Highlight anomalies and give actionable recommendations."
                    },
                    {
                        role: "user",
                        content: `Here is the current portfolio data:\n${context}\n\nUser Request: ${prompt || 'Generate a standard executive summary.'}`
                    }
                ],
                model: "llama3-8b-8192", // Using a fast, free groq model
            });
            return res.json({ report: completion.choices[0]?.message?.content || "Failed to generate." });
        } else {
            // Fallback Mock Generation
            // Simulate processing time
            await new Promise(resolve => setTimeout(resolve, 1500));
            const mockReport = `
### 📊 Executive Portfolio Summary

**Portfolio Health:** The current approval rate sits at **${((approved/totalApplications)*100).toFixed(1)}%** across ${totalApplications} applications. This is within normal parameters for this quarter.

**Financial Averages:**
- Applicant Income: **$${avgIncome.toLocaleString()}**
- Requested Loan Amount: **$${avgLoan.toLocaleString()}k**

#### ⚠️ Anomalies & High-Risk Alerts
Our anomaly detection engine has flagged **${highRisk}** applications. These individuals requested above-average loan amounts but possessed a **0** credit history score. These were correctly classified as **Rejected** by our ML pipeline.

#### 💡 Actionable Recommendations
1. **Automated Flagging**: Consider implementing a hard-stop rule for any applicant with $0 credit history requesting >$${Math.round(avgLoan * 1.5)}k.
2. **Review Cohort**: Underwriting should manually review the ${highRisk} rejected applications to ensure no false positives occurred due to missing data.

*(Note: This is a simulated report. To use live GenAI, please provide a \`GROQ_API_KEY\` in your .env file.)*
            `;
            return res.json({ report: mockReport.trim() });
        }

    } catch (error) {
        console.error("AI Report Generation Error:", error);
        res.status(500).json({ error: 'Failed to generate AI report', details: error.message });
    }
});

// 6. Clear Database Data
app.post('/api/clear', async (req, res) => {
    try {
        await Loan.deleteMany({});
        await CleaningStat.deleteMany({});
        res.json({ message: 'Database cleared successfully' });
    } catch (error) {
        res.status(500).json({ error: 'Failed to clear database', details: error.message });
    }
});

// 5. Download Cleaned Data
app.get('/download', async (req, res) => {
    try {
        const data = await Loan.find({}).lean();
        if (data.length === 0) {
            return res.status(404).json({ error: 'No data available to download' });
        }
        
        // Convert JSON to CSV manually
        const headers = [
            'Loan_ID', 'Gender', 'Married', 'Dependents', 'Education', 
            'Self_Employed', 'ApplicantIncome', 'CoapplicantIncome', 
            'LoanAmount', 'Loan_Amount_Term', 'Credit_History', 
            'Property_Area', 'Loan_Status'
        ];
        const csvRows = [];
        csvRows.push(headers.join(','));
        
        for (const row of data) {
            const values = headers.map(header => {
                const val = row[header];
                return val !== undefined && val !== null ? val : '';
            });
            csvRows.push(values.join(','));
        }
        
        const csvString = csvRows.join('\n');
        
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename="cleaned_data.csv"');
        res.status(200).send(csvString);
    } catch (error) {
        console.error("Download Error:", error);
        res.status(500).json({ error: 'Failed to generate CSV download' });
    }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Backend server running on port ${PORT}`);
});
