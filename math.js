window.addEventListener('load', function () {

    var correctAnswer;
    var recognitionTimeout;
    var spokenText;
    var questionText;
    var responseTimeout; // Timeout for user response
    var countdownInterval; // Interval for countdown timer
    var countdownDuration = 6; // Set the countdown duration (in seconds)
    let recognitionActive = false; // Track the state of recognition

    // Khởi tạo SpeechRecognition để nhận diện giọng nói
    const recognition = new webkitSpeechRecognition() || new SpeechRecognition();

    // Cấu hình recognition
    recognition.continuous = true; // Không nhận diện liên tục
    recognition.interimResults = false; // Không nhận kết quả tạm thời
    recognition.lang = 'vi-VN';

    // Tạo Konva Stage và Layer
    var stage = new Konva.Stage({
        container: 'konva-canvas',
        width: window.innerWidth,
        height: window.innerHeight
    });

    var equationText = new Konva.Text({
        x: stage.width() / 2,
        y: stage.height() / 2 - 60,
        text: 'Đang tải...',
        fontSize: 40,
        fontFamily: 'Calibri',
        fill: 'black',
        align: 'center'
    });

    var feedbackText = new Konva.Text({
        x: stage.width() / 2,
        y: stage.height() / 2 + 20,
        text: '',
        fontSize: 20,
        fontFamily: 'Calibri',
        fill: 'blue',
        align: 'center'
    });

    var countdownText = new Konva.Text({
        x: stage.width() / 2,
        y: stage.height() / 2 + 80,
        text: '',
        fontSize: 24,
        fontFamily: 'Calibri',
        fill: 'red',
        align: 'center',
        visible: false  // Hidden initially
    });

    var layer = new Konva.Layer();
    stage.add(layer);

    layer.add(equationText);
    layer.add(feedbackText);
    layer.add(countdownText);

    layer.draw();

    function stopRecognition() {
        recognition.stop(); // Stop recognition after timeout
        recognitionActive = false; // Reset the recognition state
    }

    // Hàm tạo phép tính
    function generateEquation() {
        console.log("Generate Equation");
        stopRecognition();

        // Clear feedback text
        questionText = "";
        spokenText = "";
        feedbackText.text('');
        countdownText.text('');
        countdownText.visible(false);
        layer.draw();

        // Clear any existing response timeout and countdown interval
        clearTimeout(responseTimeout);
        clearInterval(countdownInterval);

        // Generate Random Equation
        const resultRandom = generateRandomEquation();

        // Tính toán đáp án
        correctAnswer = eval(resultRandom.equation);

        // Cập nhật văn bản trên canvas
        questionText = getQuestionText(resultRandom.equation);
        equationText.text(questionText);
        equationText.x((stage.width() - equationText.getClientRect().width) / 2);
        feedbackText.x((stage.width() - feedbackText.getClientRect().width) / 2);
        layer.draw();

        // Đọc phép tính
        speakEquation(resultRandom.text);
    }

    function generateRandomEquation() {
        let num1 = 1;
        let num2 = 2;
        while (num1 < num2) {
            num1 = Math.floor(Math.random() * 10); // Số thứ nhất
            num2 = Math.floor(Math.random() * 10); // Số thứ hai
        }
    
        // Chọn phép toán ngẫu nhiên
        const operation = Math.random() > 0.5 ? '+' : '-';
        let equation, text;
    
        if (operation === '+') {
            equation = `${num1} + ${num2}`;
            text = `${num1} cộng ${num2} bằng bao nhiêu ?`;
        } else {
            equation = `${num1} - ${num2}`;
            text = `${num1} trừ ${num2} bằng bao nhiêu ?`;
        }
    
        return { equation, text };
    }

    function getQuestionText(equation) {
        return ('Câu hỏi: ' + equation + " = ?");
    }

    function replaceAnswerText(answerVal) {
        return questionText.replace("?", answerVal);
    }

    function speakEquation(equation) {
        var utteranceSpeak = new SpeechSynthesisUtterance(equation);
        utteranceSpeak.lang = 'vi-VN';

        updateFeedbackText('Speak Equation, chuẩn bị hỏi.');

        // Dùng setTimeout để chắc chắn sự kiện được kích hoạt
        setTimeout(() => { window.speechSynthesis.speak(utteranceSpeak);}, 2000);

        // Lắng nghe sự kiện "start" khi bắt đầu đọc
        utteranceSpeak.onstart = function () {
            updateFeedbackText('Đang đọc câu hỏi...');
        };

        // ** Automatically start speech recognition after question is spoken **
        utteranceSpeak.onend = function () {
            startSpeechRecognition();  // Bắt đầu nhận diện giọng nói khi đọc xong
        };
    }

    function speakResult(text) {
        var utteranceResult = new SpeechSynthesisUtterance();
        utteranceResult.text = text;
        utteranceResult.lang = 'vi-VN';
        window.speechSynthesis.speak(utteranceResult);

        // ** Automatically start speech recognition after question is spoken **
        utteranceResult.onend = function () {
            // Dùng setTimeout để chắc chắn sự kiện được kích hoạt
            setTimeout(() => {
                console.log("setTimeout, speakResult")
               generateEquation();
            }, 1000);
        };
    }

    // Ensure you are handling the recognition events correctly
    recognition.onend = function () {
        console.log('onend, Recognition đã dừng.');
        clearInterval(countdownInterval);  // Clear the countdown interval
        countdownText.visible(false);  // Hide countdown after recognition ends
        layer.draw();
        //updateFeedbackText("onend, Recognition đã dừng.");
    };

    recognition.onresult = function (event) {
        console.log("onresult");
        // Clear the timeout and countdown if user answers before the time limit
        clearTimeout(responseTimeout);
        clearInterval(countdownInterval);
        countdownText.visible(false);  // Hide the countdown after answer 

        if (event.results.length > 0) {
            //spokenText = event.results[0][0].transcript;
            spokenText = event.results[0][0].transcript; // Lấy kết quả cuối cùng
        } else {
            spokenText= "";
            updateFeedbackText("Không có kết quả.");
            console.log('Không có kết quả.');
        }

        updateFeedbackText("onresult::" + spokenText);
    };

    recognition.onnomatch = () => {
        console.log('onnomatch, Không nhận diện được giọng nói.');
        updateFeedbackText('Không nhận diện được giọng nói.' + spokenText);
    };

    recognition.onaudiostart = () => {
        updateFeedbackText('onaudiostart, Đọc lớn kết quả ?');
    };

    recognition.onspeechend = function () {
        console.log('onspeechend, Người dùng ngừng nói.');
       // updateFeedbackText('onspeechend, đã ngừng nói:' + spokenText);
    };

    function updateFeedbackText(text) {
        feedbackText.text(text);
        feedbackText.x((stage.width() - feedbackText.getClientRect().width) / 2);
        layer.draw();
    }
    function processResult() {
        try {
            updateFeedbackText("Spoken Text::" + spokenText);
            let text = "";
            if (spokenText.length > 0) {
                var spokenNumber = keepNumbersAndSigns(spokenText);
                if (spokenNumber && parseInt(spokenNumber) === correctAnswer) {
                    text = `Đúng, là ${spokenNumber}`;
                } else {
                    text = `Sai, Bạn nói: ${spokenNumber}, đúng là: ${correctAnswer}`;
                }
            }  else {
                text = `Không trả lời à, bằng ${correctAnswer} nhé`;
            }
            updateFeedbackText(text);
            speakResult(text);
        } catch (error) {
            console.log("Có lỗi xảy ra:", error.message);
            alert(error.message);
            speakResult(error.message);
        }
    }

    recognition.onerror = function (event) {
        updateFeedbackText('onerror, Không nhận diện giọng nói!');
        speakResult('Bỏ qua, câu tiếp theo.');
        generateEquation();
    };

    recognition.onstart = function () {
        console.log('onstart, Recognition đã bắt đầu.');
        // Start countdown only after recognition starts
        startCountdown(countdownDuration);
    };

// ** Start speech recognition without user clicking **
function startSpeechRecognition() {

    updateFeedbackText("start, startSpeechRecognition");
           
        // Check if the recognition object is initialized
        if (recognition) {
            // Start recognition only if it's not already active
            if (!recognitionActive) {
                recognitionActive = true; // Set recognition state to active
                recognition.start(); // Start listening for speech
            
                // Start a timeout for user response (e.g., 15 seconds)
                responseTimeout = setTimeout(() => {
                    updateFeedbackText("responseTimeout, startSpeechRecognition");
                    stopRecognition();
                    setTimeout(() => { processResult();}, 1500);
                }, countdownDuration * 1000); // countdownDuration * 1000 Set the timeout to duration (in seconds)
            } else {
                console.warn("Recognition is already active.");
            }
        } else {
            // If recognition is not available, provide feedback
            updateFeedbackText("Nhận diện giọng nói không khả dụng.");
        }

    }

    // ** Countdown Function **
    function startCountdown(duration) {
        var remainingTime = duration;
        countdownText.text(`Thời gian còn lại: ${remainingTime} giây`);
        countdownText.x((stage.width() - countdownText.getClientRect().width) / 2);
        countdownText.visible(true);  // Ensure countdown is visible
        layer.draw();
    
        countdownInterval = setInterval(() => {
            remainingTime--;
            countdownText.text(`Thời gian còn lại: ${remainingTime} giây`);
            countdownText.x((stage.width() - countdownText.getClientRect().width) / 2);
            layer.draw();
    
            if (remainingTime <= 0) {
                clearInterval(countdownInterval);  // Stop countdown when time is up
                countdownText.visible(false);  // Hide countdown
            }
        }, 1000); // Update countdown every second
    }
    

    // Khởi động chương trình
    generateEquation();

    // Đảm bảo canvas tự động điều chỉnh kích thước khi thay đổi kích thước cửa sổ
    window.addEventListener('resize', function () {
        stage.width(window.innerWidth);
        stage.height(window.innerHeight);
        equationText.x((stage.width() - equationText.getClientRect().width) / 2);
        feedbackText.x((stage.width() - feedbackText.getClientRect().width) / 2);
        countdownText.x((stage.width() - countdownText.getClientRect().width) / 2);
        layer.draw();
    });

        // Zoom In button
    $('#reboot-app').on('click', function () {
        generateEquation();
    });
});

function keepNumbersAndSigns(text) {
    const numbersMap = {
        "không": 0,
        "một": 1,
        "hai": 2,
        "hài": 2,
        "ba": 3,
        "bà": 3,
        "bốn": 4,
        "bún": 4,
        "năm": 5,
        "sáu": 6,
        "bảy": 7,
        "tám": 8,
        "chín": 9,
        "chính": 9,
        "mười": 10,
        "mười một": 11,
        "mười hai": 12,
        "hai mươi": 20,
        "ba mươi": 30,
        "bốn mươi": 40,
        "năm mươi": 50,
        "sáu mươi": 60,
        "bảy mươi": 70,
        "tám mươi": 80,
        "chín mươi": 90
    };

    if (text) {
        // Convert text to lowercase and split by spaces
        let words = text.toLowerCase().split(' ');

        // Convert each word using the numbersMap
        let convertedText = words.map(word => numbersMap[word] !== undefined ? numbersMap[word] : word).join(' ');

        // Filter out non-numeric characters, keeping digits and signs
        return convertedText.replace(/[^0-9+-]/g, '');
    }
    return ''; // Return an empty string if the input is null or empty
}
