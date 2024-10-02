window.addEventListener('load', function () {

    // Tạo Konva Stage và Layer
    var stage = new Konva.Stage({
        container: 'konva-canvas',
        width: window.innerWidth,
        height: window.innerHeight
    });

    var layer = new Konva.Layer();
    stage.add(layer);

    var equationText = new Konva.Text({
        x: stage.width() / 2,
        y: stage.height() / 2 - 60,
        text: 'Đang tải...',
        fontSize: 30,
        fontFamily: 'Calibri',
        fill: 'black',
        align: 'center'
    });

    var feedbackText = new Konva.Text({
        x: stage.width() / 2,
        y: stage.height() / 2 + 20,
        text: '',
        fontSize: 30,
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

    layer.add(equationText);
    layer.add(feedbackText);
    layer.add(countdownText);

    layer.draw();

    var correctAnswer;
    var recognitionTimeout;
    var spokenText;
    var questionText;
    var responseTimeout; // Timeout for user response
    var countdownInterval; // Interval for countdown timer
    var countdownDuration = 10; // Set the countdown duration (in seconds)
    let recognitionActive = false; // Track the state of recognition

    // Hàm tạo phép tính
    function generateEquation() {
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

        // Generate random numbers ensuring no negative results
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

        // Tính toán đáp án
        correctAnswer = eval(equation);

        // Cập nhật văn bản trên canvas
        questionText = getQuestionText(equation);
        equationText.text(questionText);
        equationText.x((stage.width() - equationText.getClientRect().width) / 2);
        feedbackText.x((stage.width() - feedbackText.getClientRect().width) / 2);
        layer.draw();

        // Đọc phép tính
        speakEquation(text);
    }

    function getQuestionText(equation) {
        return ('Câu hỏi: ' + equation + " = ?");
    }

    function replaceAnswerText(answerVal) {
        return questionText.replace("?", answerVal);
    }

    function speakEquation(equation) {
        var utterance = new SpeechSynthesisUtterance();
        utterance.text = equation;
        utterance.lang = 'vi-VN';
        window.speechSynthesis.speak(utterance);

        // Lắng nghe sự kiện "start" khi bắt đầu đọc
        utterance.onstart = function () {
            feedbackText.text('Đang đọc câu hỏi...');
            feedbackText.x((stage.width() - feedbackText.getClientRect().width) / 2);
            layer.draw();
        };

        // ** Automatically start speech recognition after question is spoken **
        utterance.onend = function () {
            startSpeechRecognition();  // Bắt đầu nhận diện giọng nói khi đọc xong
        };
    }

    function speakResult(text) {
        var utterance = new SpeechSynthesisUtterance();
        utterance.text = text;
        utterance.lang = 'vi-VN';
        window.speechSynthesis.speak(utterance);

        // Sau khi phản hồi kết thúc, tạo câu hỏi mới sau 1 giây
        utterance.onend = function () {
            console.log("speakResult, utterance.onend");
        };
    }

    // Khởi tạo SpeechRecognition để nhận diện giọng nói
    const recognition = new webkitSpeechRecognition() || new SpeechRecognition();

    // Cấu hình recognition
    recognition.continuous = true; // Không nhận diện liên tục
    recognition.interimResults = false; // Không nhận kết quả tạm thời
    recognition.lang = 'vi-VN';

    // Ensure you are handling the recognition events correctly
    recognition.onend = function () {
        console.log('Recognition đã dừng.');
        clearInterval(countdownInterval);  // Clear the countdown interval
        countdownText.visible(false);  // Hide countdown after recognition ends
        layer.draw();
    };

    recognition.onresult = function (event) {
        console.log("onresult");
        // Clear the timeout and countdown if user answers before the time limit
        clearTimeout(responseTimeout);
        clearInterval(countdownInterval);
        countdownText.visible(false);  // Hide the countdown after answer

        if (event.results.length > 0) {
            //spokenText = event.results[0][0].transcript;
            spokenText = event.results[0][event.results.length - 1].transcript; // Lấy kết quả cuối cùng
            var answerFullText = replaceAnswerText(spokenText);
            equationText.text(answerFullText);
            equationText.x((stage.width() - equationText.getClientRect().width) / 2);
            processResult();
        } else {
            console.log('Không có kết quả.');
        }
    };

    recognition.onnomatch = () => {
        console.log('Không nhận diện được giọng nói.');
    };

    recognition.onaudiostart = () => {
        feedbackText.text('Đọc lớn kết quả ?');
        feedbackText.x((stage.width() - feedbackText.getClientRect().width) / 2);
        layer.draw();
    };

    recognition.onspeechend = function () {
        console.log('Người dùng ngừng nói.');
    };

    function processResult() {
        if (spokenText.length > 0) {
            var spokenNumber = keepNumbersAndSigns(spokenText);
            if (spokenNumber && parseInt(spokenNumber) === correctAnswer) {
                feedbackText.text('Đúng! Kết quả là: ' + spokenNumber);
                speakResult('Đúng rồi, bằng ' + correctAnswer);
            } else {
                feedbackText.text(`Sai! Bạn nói: ${spokenNumber}, đúng là: ${correctAnswer}`);
                speakResult('Sai, đúng phải là ' + correctAnswer);
            }
            feedbackText.x((stage.width() - feedbackText.getClientRect().width) / 2);
            layer.draw();
            setTimeout(generateEquation, 2000);
        } else {
            generateEquation();
        }
    }

    recognition.onerror = function (event) {
        feedbackText.text('Không nhận diện giọng nói!');
        feedbackText.x((stage.width() - feedbackText.getClientRect().width) / 2);
        layer.draw();
        speakResult('Bỏ qua, câu tiếp theo.');
        generateEquation();
    };

    recognition.onstart = function () {
        console.log('Recognition đã bắt đầu.');
        // Start countdown only after recognition starts
        startCountdown(countdownDuration);
        layer.draw();
    };

// ** Start speech recognition without user clicking **
function startSpeechRecognition() {
            //feedbackText.text("Nhấn vào micro.");
            //feedbackText.x((stage.width() - feedbackText.getClientRect().width) / 2);
            
            // Start recognition only if it's not already active
        // Check if the recognition object is initialized
        if (recognition) {
            // Start recognition only if it's not already active
            if (!recognitionActive) {
                recognitionActive = true; // Set recognition state to active
                recognition.start(); // Start listening for speech

                // Set up event handlers for recognition
                recognition.onresult = function(event) {
                    // Handle the speech result
                    spokenText = event.results[0][event.results.length - 1].transcript; // Lấy kết quả cuối cùng
                    var answerFullText = replaceAnswerText(spokenText);
                    equationText.text(answerFullText);
                    equationText.x((stage.width() - equationText.getClientRect().width) / 2);
                    processResult();
                };

                recognition.onerror = function(event) {
                    // Handle any errors during recognition
                    console.error("Speech recognition error detected: " + event.error);
                    feedbackText.text("Lỗi nhận diện giọng nói. Vui lòng thử lại.");
                    feedbackText.x((stage.width() - feedbackText.getClientRect().width) / 2);
                    layer.draw();
                    recognitionActive = false; // Reset the recognition state
                    setTimeout(generateEquation, 2000); // Move to the next question after an error
                };

                // Start a timeout for user response (e.g., 15 seconds)
                responseTimeout = setTimeout(() => {
                    recognition.stop(); // Stop recognition after timeout
                    recognitionActive = false; // Reset the recognition state
                    feedbackText.text("Thua, sang câu khác.");
                    feedbackText.x((stage.width() - feedbackText.getClientRect().width) / 2);
                    layer.draw();
                    speakResult("Không trả lời. Hỏi câu tiếp.");
                    setTimeout(generateEquation, 2000); // Generate a new question after 2 seconds
                }, countdownDuration * 1000); // Set the timeout to duration (in seconds)
            } else {
                console.warn("Recognition is already active.");
            }
        } else {
            // If recognition is not available, provide feedback
            feedbackText.text("Nhận diện giọng nói không khả dụng.");
            feedbackText.x((stage.width() - feedbackText.getClientRect().width) / 2);
            layer.draw();
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
