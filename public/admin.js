document.addEventListener('DOMContentLoaded', () => {
    const resultsContainer = document.getElementById('results-container');

    function createUserTable(result) {
        let tableHTML = `
            <div class="user-result-card">
                <div class="user-info">
                    <h3>${result.name}</h3>
                    <span>النتيجة: ${result.score}/${result.totalQuestions}</span>
                    <small>${result.submissionDate || ''}</small>
                </div>
                <table class="results-table">
                    <thead>
                        <tr>
                            <th>السؤال</th>
                            <th>إجابته</th>
                            <th>الإجابة الصحيحة</th>
                        </tr>
                    </thead>
                    <tbody>`;
        if (result.answers && result.answers.length > 0) {
            result.answers.forEach(answer => {
                tableHTML += `
                    <tr>
                        <td>${answer.question}</td>
                        <td class="${answer.isCorrect ? 'correct-text' : 'incorrect-text'}">${answer.selectedAnswer}</td>
                        <td>${answer.correctAnswer}</td>
                    </tr>`;
            });
        }
        tableHTML += `</tbody></table></div>`;
        return tableHTML;
    }

    function loadInitialResults() {
        fetch('/admin-results')
            .then(response => response.json())
            .then(results => {
                if (results.length > 0) {
                    resultsContainer.innerHTML = '';
                    results.reverse().forEach(result => {
                        resultsContainer.innerHTML += createUserTable(result);
                    });
                }
            })
            .catch(error => {
                console.error("فشل في جلب النتائج الأولية:", error);
                resultsContainer.innerHTML = '<p>حدث خطأ أثناء تحميل النتائج.</p>';
            });
    }

    function connectWebSocket() {
        const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const ws = new WebSocket(`${wsProtocol}//${window.location.host}`);

        ws.onopen = () => console.log('تم الاتصال بالخادم لمراقبة النتائج.');
        
        ws.onmessage = (event) => {
            const newResult = JSON.parse(event.data);
            const newUserTable = createUserTable(newResult);
            const noResultsMsg = resultsContainer.querySelector('p');
            if (noResultsMsg) noResultsMsg.remove();
            resultsContainer.insertAdjacentHTML('afterbegin', newUserTable);
        };

        ws.onclose = () => {
            console.log('انقطع الاتصال، سيتم محاولة إعادة الاتصال بعد 3 ثواني.');
            setTimeout(connectWebSocket, 3000);
        };

        ws.onerror = (error) => {
            console.error('خطأ في WebSocket:', error);
            ws.close();
        };
    }

    loadInitialResults();
    connectWebSocket();
});