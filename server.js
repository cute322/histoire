const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const path = require('path');
const { Pool } = require('pg'); // ** جديد: استدعاء مكتبة قاعدة البيانات

// 1. إعداد الخادم والتطبيقات
const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

const PORT = process.env.PORT || 3000;
app.use(express.json());
app.use(express.static('public'));

// 2. الاتصال بقاعدة البيانات
// Render ستوفر رابط الاتصال تلقائيًا في متغير البيئة هذا
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.RENDER ? { rejectUnauthorized: false } : false,
});

// ** جديد: دالة لإنشاء الجدول في قاعدة البيانات عند بدء التشغيل
async function createTable() {
    const client = await pool.connect();
    try {
        await client.query(`
            CREATE TABLE IF NOT EXISTS results (
                id SERIAL PRIMARY KEY,
                name TEXT NOT NULL,
                score INTEGER NOT NULL,
                total_questions INTEGER NOT NULL,
                submission_date TIMESTAMPTZ DEFAULT NOW(),
                answers JSONB NOT NULL
            );
        `);
        console.log('جدول النتائج جاهز في قاعدة البيانات.');
    } catch (err) {
        console.error('خطأ في إنشاء الجدول:', err);
    } finally {
        client.release();
    }
}

// 3. إدارة اتصالات WebSocket
const adminClients = new Set();
wss.on('connection', (ws) => {
    adminClients.add(ws);
    ws.on('close', () => adminClients.delete(ws));
});

function broadcastNewResult(newResult) {
    for (const client of adminClients) {
        if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify(newResult));
        }
    }
}

// ==========================================================
// ==              نقاط النهاية (API Endpoints)              ==
// ==========================================================

// مسار لاستقبال وحفظ النتائج في قاعدة البيانات
app.post('/submit-quiz', async (req, res) => {
    try {
        const { name, score, totalQuestions, answers } = req.body;
        const result = await pool.query(
            'INSERT INTO results (name, score, total_questions, answers) VALUES ($1, $2, $3, $4) RETURNING *',
            [name, score, totalQuestions, JSON.stringify(answers)]
        );
        
        // إرسال النتيجة الجديدة (مع التاريخ من قاعدة البيانات) للتحديث الفوري
        broadcastNewResult(result.rows[0]);
        
        res.status(200).json({ message: "تم تسجيل نتيجتك بنجاح في قاعدة البيانات!" });
    } catch (error) {
        console.error("خطأ في حفظ النتيجة:", error);
        res.status(500).json({ message: "حدث خطأ أثناء حفظ النتيجة." });
    }
});

// مسار لجلب كل النتائج من قاعدة البيانات
app.get('/admin-results', async (req, res) => {
    try {
        const results = await pool.query('SELECT * FROM results ORDER BY submission_date DESC');
        res.status(200).json(results.rows);
    } catch (error) {
        console.error("خطأ في جلب النتائج:", error);
        res.status(500).json({ message: "حدث خطأ أثناء جلب النتائج." });
    }
});

// مسار الإحصائيات (يعمل بنفس الطريقة لكن يقرأ من قاعدة البيانات)
app.get('/stats', async (req, res) => {
    try {
        const results = await pool.query('SELECT answers FROM results');
        const allResults = results.rows.map(row => ({ answers: row.answers }));
        const questionStats = {};

        // منطق الحساب يبقى كما هو
        for (const result of allResults) {
            if (!result.answers) continue;
            for (const answer of result.answers) {
                const question = answer.question;
                if (!questionStats[question]) {
                    questionStats[question] = { question, correctAnswer: answer.correctAnswer, totalAttempts: 0, correctAttempts: 0, options: {} };
                }
                const stats = questionStats[question];
                stats.totalAttempts++;
                if (answer.isCorrect) stats.correctAttempts++;
                const selected = answer.selectedAnswer;
                stats.options[selected] = (stats.options[selected] || 0) + 1;
            }
        }
        res.status(200).json(Object.values(questionStats));
    } catch (error) {
        console.error("خطأ في حساب الإحصائيات:", error);
        res.status(500).json({ message: "حدث خطأ." });
    }
});

// 6. تشغيل الخادم وإنشاء الجدول
server.listen(PORT, () => {
    console.log(`الخادم يعمل الآن على http://localhost:${PORT}`);
    createTable(); // استدعاء دالة إنشاء الجدول عند بدء التشغيل
});