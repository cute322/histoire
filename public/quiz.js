const quizData = [ /* نفس أسئلتك السابقة، لا داعي للتغيير هنا */
    { question: "ما هو الاسم القديم لمدينة شرشال خلال العهد الروماني؟", a: "هيبون", b: "تيمقاد", c: "قيصرية", d: "لبدة", correct: "c" },
    { question: "من أسّس مدينة قيصرية؟", a: "الملك جوبا الأول", b: "الملك جوبا الثاني", c: "أغسطس قيصر", d: "الإمبراطور تراجان", correct: "b" },
    { question: "ما نوع الزخرفة المشهورة في فسيفساء شرشال؟", a: "زخرفة هندسية مجردة", b: "زخرفة كتابية", c: "مشاهد صيد وحياة يومية", d: "زخرفة نباتية فقط", correct: "c" },
    { question: "ما هو أهم مصدر للمياه القديمة المكتشف قرب شرشال؟", a: "قنوات رومانية", b: "نبع طبيعي", c: "سد حجري", d: "بئر إسلامي", correct: "a" },
    { question: "من هو الملك النوميدي الذي جعل شرشال عاصمة؟", a: "ماسينيسا", b: "يوغرطة", c: "جوبا الثاني", d: "بوكوس الأول", correct: "c" },
    { question: "إلى أي مملكة كانت تنتمي شرشال في العهد الروماني؟", a: "الإمبراطورية البيزنطية", b: "إمبراطورية قرطاج", c: "مملكة موريتانيا القيصرية", d: "مملكة نوميديا", correct: "c" },
    { question: "لماذا كانت شرشال مهمة للإمبراطورية الرومانية؟", a: "مركز زراعي", b: "قاعدة عسكرية", c: "ميناء تجاري ومركز ثقافي", d: "مدينة دينية فقط", correct: "c" },
    { question: "ما اسم زوجة جوبا الثاني التي كانت ذات أصل ملكي؟", a: "كليوباترا سيليني", b: "دروسيلّا", c: "جوليا دومنا", d: "زنوبيا", correct: "a" },
    { question: "ما الحدث الذي ساهم في تراجع أهمية شرشال في العصور الوسطى؟", a: "زلزال مدمر", b: "غزو الفينيقيين", c: "انسحاب الرومان وقطع طرق التجارة", d: "جفاف", correct: "c" }
];

// استدعاء العناصر من HTML (الكود المتبقي من هنا متوافق مع HTML السابق)
const quizContainer = document.querySelector('.quiz-container');
const quiz = document.getElementById('quiz-content');
const quizBody = document.getElementById('quiz-body');
const questionEl = document.getElementById('question');
const answerEls = document.querySelectorAll('.answer');
const labelEls = { a: document.getElementById('a_label'), b: document.getElementById('b_label'), c: document.getElementById('c_label'), d: document.getElementById('d_label') };
const optionTexts = { a: document.getElementById('a_text'), b: document.getElementById('b_text'), c: document.getElementById('c_text'), d: document.getElementById('d_text') };
const progressBar = document.getElementById('progressBar');
const questionCounter = document.getElementById('question-counter');

const params = new URLSearchParams(window.location.search);
const userName = params.get('name') || "باحث مجهول";
let currentQuiz = 0;
let score = 0;
let submittedAnswers = [];
let processing = false;

function loadQuiz() {
    processing = false;
    for (const key in labelEls) {
        labelEls[key].classList.remove('correct', 'incorrect');
        labelEls[key].style.pointerEvents = 'auto';
    }
    answerEls.forEach(el => el.checked = false);

    const currentQuizData = quizData[currentQuiz];
    questionEl.innerText = currentQuizData.question;
    for (const key in optionTexts) {
        optionTexts[key].innerText = currentQuizData[key];
    }
    updateProgressBar();
    if(quizBody) quizBody.classList.remove('fading-out');
}

function updateProgressBar() {
    if(!questionCounter || !progressBar) return;
    questionCounter.innerText = `السؤال ${currentQuiz + 1} / ${quizData.length}`;
    const progressPercent = ((currentQuiz + 1) / quizData.length) * 100;
    progressBar.style.width = `${progressPercent}%`;
}

answerEls.forEach(answerEl => {
    answerEl.addEventListener('click', (e) => {
        if (processing) return;
        processing = true;
        
        const selectedId = e.target.id;
        const currentQuizData = quizData[currentQuiz];
        const correctId = currentQuizData.correct;
        const isCorrect = selectedId === correctId;
        
        for (const key in labelEls) {
            labelEls[key].style.pointerEvents = 'none';
        }

        labelEls[correctId].classList.add('correct');
        if (!isCorrect) labelEls[selectedId].classList.add('incorrect');

        if (isCorrect) score++;
        
        submittedAnswers.push({ question: currentQuizData.question, selectedAnswer: currentQuizData[selectedId], correctAnswer: currentQuizData[correctId], isCorrect: isCorrect });

        setTimeout(() => {
            if(quizBody) quizBody.classList.add('fading-out');
            setTimeout(() => {
                currentQuiz++;
                if (currentQuiz < quizData.length) {
                    loadQuiz();
                } else {
                    showFinalResults();
                }
            }, 400);
        }, 2000);
    });
});

async function showFinalResults() {
    const resultData = { name: userName, score, totalQuestions: quizData.length, answers: submittedAnswers };
    try { await fetch('/submit-quiz', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(resultData) });
    } catch (error) { console.error("فشل في إرسال النتائج:", error); }
    
    // *** التصميم الجديد لشاشة النتائج ***
    quizContainer.innerHTML = `
        <div class="final-result">
            <h2>نتائج التنقيب</h2>
            <p>أحسنت أيها الباحث ${userName}! هذه هي خلاصة رحلتك:</p>
            <div class="result-medallion">
                <span>${score}/${quizData.length}</span>
            </div>
            <p>كل قطعة أثرية اكتشفتها هي خطوة نحو فهم أعمق لتاريخنا العظيم.</p>
            <button onclick="location.href = '/'">القيام برحلة جديدة</button>
        </div>
    `;
}

// Initial Load, check if we are on the quiz page
if (document.body.contains(quiz)) {
    loadQuiz();
}