// --- START OF FILE script.js ---

document.addEventListener('DOMContentLoaded', () => {
    // --- Khởi tạo Telegram SDK ---
    const tg = window.Telegram.WebApp;
    tg.ready();
    tg.expand();
    console.log("Telegram WebApp SDK Initialized.");

    // --- Lấy các element DOM cần thiết ---
	const usernameDisplay = document.getElementById('user-info-username');
    const pointsDisplay = document.getElementById('user-info-points');
    const gameContainer = document.querySelector('.game-container');
    const backgroundImage = document.querySelector('.background-image');
    const targetBalls = document.querySelectorAll('.target-ball');
    const shootButton = document.getElementById('shoot-button'); // Nút KICK (bóng trắng)
    const loadingText = document.getElementById('loading-text');
    const errorDisplay = document.getElementById('error-display');
	// *** THÊM: Lấy element nhạc nền ***
    const backgroundMusic = document.getElementById('background-music');
    console.log("DOM Elements selected.");
	
	

    // --- Biến lưu trữ cấu hình và trạng thái game ---
    let appConfig = null;
    let isProcessing = false;
    let effectInterval = null;
	let finalTargetPercentages = []; // Mảng lưu trữ % mục tiêu cuối cùng
	let hasUserInteracted = false; // *** THÊM BIẾN CỜ ***
	let currentPoints = 0; // <<< KHAI BÁO currentPoints ở phạm vi ngoài
	
    const effectDuration = 5000; // Thời gian hiển thị "Phân tích..." (5 giây)
    const intervalTime = 100;    // Thời gian cập nhật % (100ms)
    const highlightDelay = 300;  // Độ trễ trước khi highlight bóng thắng (ms)
    const minPercentageDifference = 10; // Chênh lệch % tối thiểu BẮT BUỘC
    const maxPercentage = 94; // Tỷ lệ % tối đa (nhỏ hơn 95)
	// Lưu trữ style box-shadow để dễ dùng lại
    const glowingBoxShadowStyle = '0 0 2.5vmin 1.2vmin yellow';
	// *** THÊM: Tạo đối tượng Audio ***
    let kickSound = null;
    let goalSound = null;
    try {
        kickSound = new Audio('sounds/kick.mp3'); // Đường dẫn tới file âm thanh kick
        goalSound = new Audio('sounds/goal.mp3'); // Đường dẫn tới file âm thanh kết quả
        // Tùy chọn: preload âm thanh (có thể không cần thiết với file nhỏ)
        // kickSound.preload = 'auto';
        // goalSound.preload = 'auto';
        console.log("Audio objects created.");
    } catch (e) {
        console.error("Error creating Audio objects:", e);
        // Không cần chặn game nếu chỉ là lỗi âm thanh
    }
    // *** KẾT THÚC THÊM ***
	
	
	console.log("URL Params Received:", { userId, username, points: urlParams.get('points') }); // Log để kiểm tra
	console.log("Parsed User Data:", { userId, username, currentPoints });

    // --- Hàm tải cấu hình (SỬA ĐỔI ĐỂ PHÁT NHẠC NỀN) ---
    async function loadConfig() {
        console.log("Attempting to load config_webapp.json...");
        try {
            const response = await fetch('config_webapp.json');
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            appConfig = await response.json();
            console.log("App configuration loaded:", appConfig);

            // *** THÊM: Bắt đầu phát nhạc nền sau khi config tải xong ***
            //if (backgroundMusic) {
                // Đặt âm lượng nhỏ hơn (ví dụ: 30%)
            //    backgroundMusic.volume = 0.3;
                // Thử phát nhạc, bắt lỗi nếu trình duyệt chặn autoplay
            //    backgroundMusic.play().then(() => {
            //        console.log("Background music playback started.");
            //    }).catch(error => {
            //        console.warn("Background music autoplay was blocked by the browser:", error);
                    // Ở đây bạn có thể hiện một nút "Play Music" cho người dùng
                    // Hoặc bạn có thể thử phát lại nhạc sau lần nhấn KICK đầu tiên
             //   });
            //}
            // *** KẾT THÚC THÊM ***

            if (backgroundImage.complete && backgroundImage.naturalHeight !== 0) {
                console.log("Background image already complete. Calculating initial positions with loaded config.");
                requestAnimationFrame(() => {
                    calculatePositions();
                    setTimeout(calculatePositions, 50);
                });
            }
        } catch (error) {
            console.error("Could not load app configuration:", error);
            showError("Lỗi tải cấu hình ứng dụng. Vui lòng thử lại.");
            if (shootButton) shootButton.disabled = true;
        }
    }
	console.log("User data from URL:", { userId, username, currentPoints });
	// Cập nhật hiển thị
    // Cập nhật hiển thị
	
	
    // --- Hàm tính toán vị trí (giữ nguyên) ---
    function calculatePositions() {
        if (!appConfig || !appConfig.coordinates) {
            console.warn("App config not loaded yet, cannot calculate positions.");
            return;
        }
        const coordsConfig = appConfig.coordinates;
        const imgRect = backgroundImage.getBoundingClientRect();
        if (imgRect.width === 0 || imgRect.height === 0) { return; }
        console.log("Recalculating positions based on Image Rect:", imgRect);
        targetBalls.forEach((ball, index) => {
            const ballId = `ball${index + 1}`;
            if (coordsConfig[ballId]) {
                const [xP, yP, wP, hP] = coordsConfig[ballId];
                ball.style.width = `${imgRect.width * wP}px`;
                ball.style.height = `${imgRect.height * hP}px`;
                ball.style.top = `${imgRect.height * yP}px`;
                if (ballId === 'ball3' && coordsConfig.ball3[0] > 0.4 && coordsConfig.ball3[0] < 0.6) {
                    ball.style.left = `${imgRect.width * xP}px`; ball.style.transform = 'translateX(-50%)';
                } else {
                    ball.style.left = `${imgRect.width * xP}px`; ball.style.transform = 'none';
                }
            } else { console.warn(`Coordinates for ${ballId} not found in config.`); }
        });
        if (coordsConfig.shootBtn) {
            const [xP, yP, wP, hP] = coordsConfig.shootBtn;
            shootButton.style.left = `${imgRect.width * xP}px`; shootButton.style.top = `${imgRect.height * yP}px`;
            shootButton.style.width = `${imgRect.width * wP}px`; shootButton.style.height = `${imgRect.height * hP}px`;
        } else { console.warn(`Coordinates for shootBtn not found in config.`); }
        if (coordsConfig.loading) {
            const [xP, yP, wP, hP] = coordsConfig.loading;
            loadingText.style.left = '50%'; loadingText.style.top = '50%';
            loadingText.style.transform = 'translate(-50%, -50%)';
            loadingText.style.maxWidth = `${imgRect.width * wP}px`;
        } else { console.warn(`Coordinates for loading not found in config.`); }
        console.log("Position calculation complete.");
    }

    // --- Hàm Debounce (giữ nguyên) ---
    function debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }
    const debouncedCalculatePositions = debounce(calculatePositions, 150);

    // --- Gắn Event Listeners (giữ nguyên) ---
    backgroundImage.addEventListener('load', () => {
        console.log("Event: Background image finished loading.");
        if (appConfig) {
            calculatePositions();
            setTimeout(calculatePositions, 50);
        } else {
            console.log("Config not ready yet, waiting for loadConfig to finish.");
        }
     });
    window.addEventListener('resize', debouncedCalculatePositions);

    // --- Gọi hàm tải cấu hình (giữ nguyên) ---
    loadConfig();
	
	// *** 2. LẤY THAM SỐ VÀ GÁN GIÁ TRỊ CHO currentPoints ***
	const urlParams = new URLSearchParams(window.location.search);
	const userId = urlParams.get('userId');
	const username = urlParams.get('username'); // Đã được decode tự động bởi get()
	currentPoints = parseInt(urlParams.get('points')) || 0; // Chuyển sang số, mặc định là 0
	console.log("URL Params Received:", { userId, username, points: urlParams.get('points') });
    console.log("Parsed User Data:", { userId, username, currentPoints });
    if (usernameDisplay) {
		 // DecodeURIComponent là không cần thiết nếu dùng urlParams.get()
		 usernameDisplay.textContent = username || 'DEMO';
	} else {
		 console.error("Element with ID 'user-info-username' not found.");
	}
	if (pointsDisplay) {
		 pointsDisplay.textContent = `${currentPoints} điểm`;
	} else {
		 console.error("Element with ID 'user-info-points' not found.");
	}
	if (currentPoints <= 0) {
        if(shootButton) shootButton.disabled = true;
        console.log("Initial points are 0. KICK button disabled.");
        // Có thể hiển thị thông báo ban đầu nếu muốn
        showError("Bạn đã hết điểm. Vui lòng quay lại bot.");
    } else {
         if(shootButton) shootButton.disabled = false;
    }
    // Hàm tính toán và điều chỉnh tỷ lệ % TRƯỚC KHI animation bắt đầu
    function calculateAndAdjustPercentages() {
        console.log("Calculating and adjusting target percentages...");
        let initialPercentages = [];
        for (let i = 0; i < targetBalls.length; i++) {
            // Tạo giá trị ngẫu nhiên ban đầu
            initialPercentages.push(Math.floor(Math.random() * (maxPercentage + 1))); // 0 đến maxPercentage
        }
        console.log("Initial random percentages:", initialPercentages);

        let ballData = initialPercentages.map((perc, index) => ({ index, perc }));
        ballData.sort((a, b) => b.perc - a.perc); // Sắp xếp giảm dần

        // Điều chỉnh để đảm bảo khoảng cách
        for (let i = 1; i < ballData.length; i++) {
            let currentBall = ballData[i];
            let previousBall = ballData[i-1];
            let diff = previousBall.perc - currentBall.perc;
            if (diff < minPercentageDifference) {
                let newPerc = Math.max(0, previousBall.perc - minPercentageDifference - Math.floor(Math.random() * 3));
                ballData[i].perc = newPerc;
            }
        }
        console.log("Adjusted sorted data:", JSON.stringify(ballData));

        // Tạo mảng kết quả cuối cùng theo đúng thứ tự index gốc
        let finalTargets = new Array(targetBalls.length);
        ballData.forEach(data => {
            finalTargets[data.index] = data.perc;
        });
        console.log("Final target percentages calculated:", finalTargets);
        return finalTargets;
    }


    // Xử lý khi nhấn nút KICK
    shootButton.addEventListener('click', () => {
        console.log("KICK button clicked.");
		// *** KIỂM TRA ĐIỂM ĐẦU TIÊN ***
        if (currentPoints <= 0) {
             showError("Bạn đã hết điểm. Vui lòng quay lại bot và xác nhận đã nạp.");
             console.log("KICK clicked but points are 0.");
             // Đảm bảo nút bị vô hiệu hóa
             if(shootButton) shootButton.disabled = true;
             return; // Không làm gì cả
        }
        // *** KẾT THÚC KIỂM TRA ĐIỂM ***

        if (!appConfig) { showError("Cấu hình chưa sẵn sàng, vui lòng đợi giây lát."); return; }
        if (isProcessing) { console.log("Already processing."); return; }

        hideError();
        isProcessing = true;
        shootButton.disabled = true;
		// *** THÊM: Thêm class để bắt đầu làm mờ chữ KICK ***
        shootButton.classList.add('kicking');
        // *** KẾT THÚC THÊM ***
        // *** THÊM: Phát nhạc nền ở lần tương tác đầu tiên ***
        if (!hasUserInteracted && backgroundMusic) {
            console.log("First user interaction, attempting to play background music.");
            backgroundMusic.volume = 0.3; // Đặt âm lượng
            backgroundMusic.play().then(() => {
                console.log("Background music playback started after interaction.");
                hasUserInteracted = true; // Đánh dấu đã tương tác
            }).catch(error => {
                // Lỗi này ít xảy ra hơn sau khi đã có tương tác, nhưng vẫn bắt để đề phòng
                console.warn("Background music play failed even after interaction:", error);
            });
        }
        // *** KẾT THÚC THÊM ***
		// *** THÊM: Phát âm thanh KICK ***
        if (kickSound) {
            kickSound.currentTime = 0; // Tua về đầu để phát lại nếu cần
            kickSound.play().catch(e => console.warn("Kick sound play failed:", e)); // Bắt lỗi nếu trình duyệt chặn
            console.log("Kick sound played.");
        }
        // *** KẾT THÚC THÊM ***
		// *** BƯỚC MỚI: Xóa hiệu ứng phát sáng của lượt chơi TRƯỚC ***
        console.log("Clearing previous round's glow effect.");
        targetBalls.forEach(ball => {
        //    ball.classList.remove('glowing-final');
			ball.style.boxShadow = 'none'; // Xóa trực tiếp style
            ball.style.zIndex = ''; // Reset z-index về mặc định
        });
        // *** KẾT THÚC BƯỚC MỚI ***
		loadingText.textContent = "Phân tích...";
        loadingText.classList.remove('hidden');
        console.log("Processing started. Analyzing displayed.");

        // **B1: Tính toán và lưu trữ tỷ lệ mục tiêu cuối cùng**
        finalTargetPercentages = calculateAndAdjustPercentages();

        // **B2: Reset giao diện bóng về 0% và xóa hiệu ứng cũ**
        targetBalls.forEach(ball => {
            //ball.classList.remove('glowing-final');
            ball.classList.add('active');
            ball.querySelector('.percentage').textContent = '0%'; // Bắt đầu từ 0
            ball.style.boxShadow = 'none';
        });
        console.log("Target balls reset to 0% for animation.");

        let elapsed = 0;
        let animationCompleteCount = 0; // Đếm số bóng đã hoàn thành animation
        console.log("Starting percentage animation towards targets...");

        // **B3: Bắt đầu hiệu ứng tăng % hướng tới mục tiêu**
        effectInterval = setInterval(() => {
            elapsed += intervalTime;
            animationCompleteCount = 0; // Reset bộ đếm mỗi interval

            targetBalls.forEach((ball, index) => {
                let percentageSpan = ball.querySelector('.percentage');
                let currentPercentage = parseInt(percentageSpan.textContent) || 0;
                let targetPercentage = finalTargetPercentages[index]; // Lấy mục tiêu cho bóng này

                // Chỉ tăng nếu chưa đạt mục tiêu
                if (currentPercentage < targetPercentage) {
                    // Tính bước tăng, không vượt quá mục tiêu
                    // Có thể làm bước tăng nhỏ hơn để mượt hơn
                    let increment = Math.min(Math.ceil((targetPercentage - currentPercentage) * 0.2) + 1, targetPercentage - currentPercentage); // Tăng ít nhất 1, hoặc 20% khoảng cách còn lại
                    // Hoặc bước tăng cố định: let increment = Math.min(3, targetPercentage - currentPercentage);
                    currentPercentage += increment;
                    percentageSpan.textContent = `${currentPercentage}%`;

                    // Hiệu ứng sáng nhẹ tạm thời
                    let brightness = 0.3 + (currentPercentage / maxPercentage) * 0.7;
                    ball.style.boxShadow = `0 0 1.5vmin 0.5vmin rgba(255, 255, 100, ${brightness})`;
                } else {
                    // Nếu đã đạt hoặc vượt mục tiêu (trường hợp target = 0)
                    percentageSpan.textContent = `${targetPercentage}%`; // Đảm bảo hiển thị đúng target cuối
                    if (ball.style.boxShadow !== 'none' && ball.style.boxShadow !== glowingBoxShadowStyle) { // Chỉ xóa nếu là shadow tạm thời
                       ball.style.boxShadow = 'none';
                    }
                    animationCompleteCount++;
                }
            });

            // **B4: Kiểm tra kết thúc animation**
            // Kết thúc nếu hết giờ HOẶC tất cả bóng đã đạt mục tiêu
            if (elapsed >= effectDuration || animationCompleteCount === targetBalls.length) {
				console.log("Animation duration reached or all targets met.");
				clearInterval(effectInterval);
				effectInterval = null;
				// Gọi hàm xử lý cuối cùng
                finishAnimationAndApplyHighlightStyle(); // Đổi tên hàm cho rõ
                // Gửi data và reset trạng thái ngay sau đó
                sendDataAndResetState();
            }
		}, intervalTime);
    });

    // **ĐỔI TÊN HÀM**: Chỉ xử lý animation, đảm bảo %, tìm người thắng và LẬP LỊCH highlight
    function finishAnimationAndApplyHighlightStyle() {
        console.log("Finishing animation, determining winner, scheduling highlight style...");

        let highestPercentage = -1;
        let winningBallIndex = -1;
        targetBalls.forEach((ball, index) => {
            const targetPerc = finalTargetPercentages[index];
            ball.querySelector('.percentage').textContent = `${targetPerc}%`;
            // Đảm bảo xóa hết shadow tạm thời TRƯỚC KHI áp dụng style mới
            if (ball.style.boxShadow !== 'none' && ball.style.boxShadow !== glowingBoxShadowStyle) {
               ball.style.boxShadow = 'none';
            }
            if (targetPerc > highestPercentage) {
                highestPercentage = targetPerc;
                winningBallIndex = index;
            }
        });

        console.log(`Final state determined: Winner index=${winningBallIndex}, Highest perc=${highestPercentage}%`);
        console.log(`Final percentages displayed: ${finalTargetPercentages.join(', ')}%`);

        // Lập lịch áp dụng style trực tiếp CHỈ cho bóng chiến thắng sau độ trễ
        if (winningBallIndex !== -1) {
             // Xóa style cũ trước khi đặt lịch (an toàn kép)
             targetBalls.forEach((ball, index) => {
                 if (index !== winningBallIndex) { // Chỉ xóa của bóng không thắng
                     ball.style.boxShadow = 'none';
                     ball.style.zIndex = '';
                 }
             });
            // Lập lịch áp style mới
            setTimeout(() => {
                if (targetBalls[winningBallIndex]) {
                    console.log(`Applying direct highlight style to ball ${winningBallIndex + 1}.`);
                    targetBalls[winningBallIndex].style.boxShadow = glowingBoxShadowStyle; // Đặt style trực tiếp
                    targetBalls[winningBallIndex].style.zIndex = '10'; // Đặt z-index trực tiếp
                    targetBalls[winningBallIndex].style.opacity = '1'; // Đảm bảo opacity là 1
					
					// *** THÊM: Phát âm thanh KẾT QUẢ ***
                    if (goalSound) {
                        goalSound.currentTime = 0; // Tua về đầu
                        goalSound.play().catch(e => console.warn("Goal sound play failed:", e));
                        console.log("Goal sound played.");
                    }
                    // *** KẾT THÚC THÊM ***
					
                } else { console.error(`Highlight Style Error: Element at index ${winningBallIndex} not found.`); }
            }, highlightDelay);
        } else {
            console.error("Could not determine winning ball index from final targets!");
            showError("Lỗi xác định kết quả cuối cùng.");
			resetForNextRound(false); // Gọi reset nhưng không giảm điểm
            return; // Dừng lại
        }
        // Hàm này KHÔNG gọi reset hay sendData
		sendDataAndResetState();
    }

    // **HÀM MỚI**: Gửi data và reset trạng thái
    function sendDataAndResetState() {
        console.log("Sending data and resetting state for next round...");
         // Gửi tín hiệu về cho Bot
        try {
            const dataToSend = "shoot_complete";
            tg.sendData(dataToSend);
            console.log("Data sent to Telegram bot:", dataToSend);
        } catch (error) {
            console.error("Error sending data via Telegram.sendData:", error);
            showError("Lỗi gửi kết quả về máy chủ.");
			resetForNextRound(false); // Gọi reset nhưng không giảm điểm (vì chưa chắc bot đã trừ)
        }
		if (currentPoints > 0) {
			currentPoints--; // Giảm bộ đếm điểm cục bộ
			if (pointsDisplay) pointsDisplay.textContent = `${currentPoints} điểm`;
			if (currentPoints <= 0) {
                if(shootButton) shootButton.disabled = true; // Vô hiệu hóa nếu hết điểm
                console.log("Points reached 0 after kick. KICK button disabled.");
                showError("Bạn đã hết điểm. Vui lòng quay lại bot."); // Thông báo hết điểm
            }
		}
        // Reset trạng thái cho lượt chơi tiếp theo
        resetForNextRound(true);
    }

    // --- Hàm Reset cho lượt chơi tiếp theo ---
    // Thêm tham số để biết có cần bật nút không (nếu điểm > 0)
    function resetForNextRound(kickSuccessful) {
        console.log(`Resetting state for next round. Kick successful: ${kickSuccessful}`);
        loadingText.classList.add('hidden');
        // Chỉ bật lại nút nếu lượt kick thành công VÀ điểm còn > 0
        if (kickSuccessful && currentPoints > 0 && shootButton) {
           shootButton.disabled = false;
        } else if (shootButton) {
           // Giữ nút disabled nếu kick không thành công hoặc hết điểm
           shootButton.disabled = true;
        }
        isProcessing = false;
        console.log("State reset complete. Ready for next kick (if points > 0).");
    }

    // --- Hàm hiển thị/ẩn lỗi (giữ nguyên) ---
    function showError(message) {
        if (errorDisplay) {
            errorDisplay.textContent = message;
            errorDisplay.classList.remove('hidden');
        }
        console.error("Error Displayed:", message);
    }
    function hideError() {
        if (errorDisplay && !errorDisplay.classList.contains('hidden')) {
            errorDisplay.classList.add('hidden');
        }
    }

    // --- Kết thúc Khởi tạo ---
    console.log("Penalty Shoot-Out Mini App script fully loaded and initialized.");
});
// --- END OF FILE script.js ---
