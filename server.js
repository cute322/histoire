const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const fs = require('fs');
const path = require('path');

// 1. إعداد الخادم والتطبيقات
const app = express();
const server = http.createServer(app); // نستخدم خادم http لدعمه للـ WebSocket
const wss = new WebSocket.Server({ server }); // نربط WebSocket بنفس الخادم

const PORT = process.env.PORT || 3000;

// 2. إعدادات Express (Middleware)
app.use(express.json()); // للسماح بقراءة بيانات JSON من الطلبات
app.use(express.static('public')); // لاستضافة كل الملفات في مجلد 'public'

// 3. إدارة اتصالات صفحة التحكم (Admin Page)
const adminClients = new Set();

wss.on('connection', (ws) => {
    console.log('مراقب جديد انضم (صفحة التحكم).');
    adminClients.add(ws); // إضافة الاتصال الجديد إلى قائمة المراقبين

    ws.on('close', () => {
        console.log('مراقب غادر.');
        adminClients.delete(ws); // إزالة الاتصال عند إغلاق الصفحة
    });
});

// 4. دوال مساعدة لقراءة وكتابة النتائج من ملف JSON
const resultsFilePath = path.join(__dirname, 'results.json');

const readResults = () => {
    if (!fs.existsSync(resultsFilePath)) {
        return [];
    }
    const data = fs.readFileSync(resultsFilePath, 'utf-8');
    // التأكد من أن الملف ليس فارغًا قبل محاولة تحليله
    return data.length > 0 ? JSON.parse(data) : [];
};

const writeResults = (data) => {
    fs.writeFileSync(resultsFilePath, JSON.stringify(data, null, 2));
};

// 5. دالة لإرسال التحديثات الفورية لكل المراقبين
function broadcastNewResult(newResult) {
    for (const client of adminClients) {
        // التأكد من أن الاتصال لا يزال مفتوحًا قبل الإرسال
        if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify(newResult));
        }
    }
}

// ==========================================================
// ==              نقاط النهاية (API Endpoints)              ==
// ==========================================================

// مسار لاستقبال نتائج الكويز من المستخدمين
app.post('/submit-quiz', (req, res) => {
    try {
        const newResult = {
            ...req.body,
            submissionDate: new Date().toLocaleString('ar-DZ', { timeZone: 'Africa/Algiers' })
        };
        const allResults = readResults();
        allResults.push(newResult);
        writeResults(allResults);

        // إرسال النتيجة الجديدة فوراً لكل من يراقب صفحة التحكم
        broadcastNewResult(newResult);

        res.status(200).json({ message: "تم تسجيل نتيجتك بنجاح!" });
    } catch (error) {
        console.error("Error in /submit-quiz:", error);
        res.status(500).json({ message: "حدث خطأ أثناء حفظ النتيجة." });
    }
});

// مسار لجلب كل النتائج المسجلة (لأول تحميل لصفحة التحكم)
app.get('/admin-results', (req, res) => {
    res.status(200).json(readResults());
});

// مسار لجلب الإحصائيات المجمعة للأسئلة
app.get('/stats', (req, res) => {
    try {
        const allResults = readResults();
        const questionStats = {};

        // تجميع البيانات
        for (const result of allResults) {
            if (!result.answers) continue;
            for (const answer of result.answers) {
                const question = answer.question;
                if (!questionStats[question]) {
                    questionStats[question] = {
                        question: question,
                        correctAnswer: answer.correctAnswer,
                        totalAttempts: 0,
                        correctAttempts: 0,
                        options: {}
                    };
                }
                const stats = questionStats[question];
                stats.totalAttempts++;
                if (answer.isCorrect) {
                    stats.correctAttempts++;
                }
                const selected = answer.selectedAnswer;
                stats.options[selected] = (stats.options[selected] || 0) + 1;
            }
        }

        // تحويل الكائن إلى مصفوفة وإرسالها
        const statsArray = Object.values(questionStats);
        res.status(200).json(statsArray);
    } catch (error) {
        console.error("Error in /stats:", error);
        res.status(500).json({ message: "حدث خطأ أثناء حساب الإحصائيات." });
    }
});


// 6. تشغيل الخادم
server.listen(PORT, () => {
    console.log(`===================================================`);
    console.log(`  الخادم يعمل الآن على http://localhost:${PORT}`);
    console.log(`===================================================`);
    console.log(`🔗 رابط الكويز للمستخدمين: http://localhost:${PORT}`);
    console.log(`📊 رابط سجل النتائج: http://localhost:${PORT}/admin.html`);
    console.log(`📈 رابط صفحة الإحصائيات: http://localhost:${PORT}/stats.html`);
    console.log(`===================================================`);
});