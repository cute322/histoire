document.addEventListener('DOMContentLoaded', () => {
    const statsContainer = document.getElementById('stats-container');

    fetch('/stats')
        .then(response => response.json())
        .then(statsData => {
            if (statsData.length === 0) {
                statsContainer.innerHTML = '<p>لا توجد بيانات كافية لعرض الإحصائيات.</p>';
                return;
            }

            statsContainer.innerHTML = ''; // مسح رسالة التحميل

            statsData.forEach(stat => {
                const statCard = document.createElement('div');
                statCard.className = 'stat-card';
                
                let optionsHTML = '';
                // ترتيب الخيارات لعرض الإجابة الصحيحة أولاً
                const sortedOptions = Object.keys(stat.options).sort((a, b) => {
                    if (a === stat.correctAnswer) return -1;
                    if (b === stat.correctAnswer) return 1;
                    return stat.options[b] - stat.options[a];
                });
                
                sortedOptions.forEach(optionText => {
                    const count = stat.options[optionText];
                    const percentage = ((count / stat.totalAttempts) * 100).toFixed(1);
                    const isCorrect = optionText === stat.correctAnswer;
                    
                    optionsHTML += `
                        <div class="stat-option">
                            <div class="stat-info">
                                <span class="stat-option-text ${isCorrect ? 'correct-text' : ''}">${optionText}</span>
                                <span class="stat-percentage">${percentage}%</span>
                            </div>
                            <div class="stat-progress-container">
                                <div class="stat-progress-bar ${isCorrect ? 'correct' : 'incorrect'}" style="width: ${percentage}%"></div>
                            </div>
                        </div>
                    `;
                });

                statCard.innerHTML = `
                    <h3>${stat.question}</h3>
                    <div class="options-container">
                        ${optionsHTML}
                    </div>
                `;
                statsContainer.appendChild(statCard);
            });
        })
        .catch(error => {
            console.error('فشل في جلب الإحصائيات:', error);
            statsContainer.innerHTML = '<p>حدث خطأ أثناء تحميل الإحصائيات.</p>';
        });
});