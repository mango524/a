/**
 * main.js
 * 포즈 인식과 게임 로직을 초기화하고 서로 연결하는 진입점
 *
 * PoseEngine, GameEngine, Stabilizer를 조합하여 애플리케이션을 구동
 * 지뢰찾기 모드 추가
 */

// 전역 변수
let poseEngine;
let gameEngine;
let minesweeper;
let stabilizer;
let ctx;
let labelContainer;

let currentGameMode = null; // 'fruit' or 'mine'

/**
 * 애플리케이션 초기화 (페이지 로드 시)
 */
async function init() {
  // 1. 캔버스 설정
  const canvas = document.getElementById("canvas");
  // CSS에서 500px로 설정했으므로 내부 해상도도 맞춰줌 (선명도 위해)
  canvas.width = 500;
  canvas.height = 500;
  ctx = canvas.getContext("2d");

  // 2. 이벤트 리스너 (지뢰찾기용 클릭)
  canvas.addEventListener('mousedown', handleCanvasClick);

  console.log("App Initialized. Waiting for game selection.");
}

// 초기화 함수 호출
init();

/**
 * 게임 선택 함수
 * @param {string} gameType - 'fruit' | 'mine'
 */
function selectGame(gameType) {
  currentGameMode = gameType;

  // UI 전환
  document.getElementById('selection-screen').classList.add('hidden');

  if (gameType === 'fruit') {
    startFruitGame();
  } else if (gameType === 'mine') {
    startMinesweeper();
  }
}

async function startFruitGame() {
  document.querySelector('h1').innerText = "Catch Fruit Game";
  document.querySelector('.button-container').style.display = 'flex';
  document.getElementById('label-container').style.display = 'flex';
  document.getElementById('minesweeper-controls').classList.add('hidden'); // Hide mine controls

  const startBtn = document.getElementById("startBtn");
  const stopBtn = document.getElementById("stopBtn");
  startBtn.disabled = true;

  try {
    // 1. PoseEngine 초기화 (TM 모델)
    // 캔버스 크기를 500x500으로 맞춰서 초기화
    poseEngine = new PoseEngine("./my_model/");
    // PoseEngine 내부 웹캠 크기는 500으로 설정
    const { maxPredictions, webcam } = await poseEngine.init({
      size: 500,
      flip: true
    });

    // 2. Stabilizer 초기화
    stabilizer = new PredictionStabilizer({
      threshold: 0.5,
      smoothingFrames: 3
    });

    // 3. GameEngine 초기화
    gameEngine = new GameEngine();

    // 4. Label Container 설정
    labelContainer = document.getElementById("label-container");
    labelContainer.innerHTML = "";
    for (let i = 0; i < maxPredictions; i++) {
      labelContainer.appendChild(document.createElement("div"));
    }

    // 5. PoseEngine 콜백 설정
    poseEngine.setPredictionCallback(handlePrediction);
    poseEngine.setDrawCallback(drawPose);

    // 6. 시작
    poseEngine.start();
    if (gameEngine) gameEngine.start();

    stopBtn.disabled = false;
  } catch (error) {
    console.error("초기화 중 오류 발생:", error);
    alert("카메라를 사용할 수 없거나 모델 로딩에 실패했습니다.");
    startBtn.disabled = false;
  }
}

function startMinesweeper() {
  document.querySelector('h1').innerText = "Minesweeper (9x9)";
  document.querySelector('.button-container').style.display = 'none'; // 버튼 숨김
  document.getElementById('label-container').style.display = 'none'; // 라벨 숨김
  document.getElementById('minesweeper-controls').classList.remove('hidden'); // Show mine controls

  // 지뢰찾기 인스턴스 생성 및 시작
  minesweeper = new Minesweeper();
  minesweeper.init();

  // 게임 루프 시작 (렌더링용)
  loopMinesweeper();
}

/**
 * 지뢰찾기 모드 설정 (REVEAL / FLAG)
 */
function setMineMode(mode) {
  if (minesweeper) {
    minesweeper.setMode(mode);

    // 버튼 스타일 업데이트
    document.getElementById('btn-reveal').classList.toggle('active', mode === 'REVEAL');
    document.getElementById('btn-flag').classList.toggle('active', mode === 'FLAG');
  }
}
window.setMineMode = setMineMode;

/**
 * 지뢰찾기 렌더링 루프
 */
function loopMinesweeper() {
  if (currentGameMode !== 'mine') return;

  if (minesweeper) {
    minesweeper.render(ctx);
  }
  requestAnimationFrame(loopMinesweeper);
}

/**
 * 캔버스 클릭 핸들러 (지뢰찾기용)
 */
function handleCanvasClick(event) {
  if (currentGameMode !== 'mine' || !minesweeper) return;

  const rect = event.target.getBoundingClientRect();
  const x = event.clientX - rect.left;
  const y = event.clientY - rect.top;

  // 캔버스 스케일링 고려 (CSS 크기와 실제 크기가 다를 경우)
  // 현재는 둘 다 500px로 맞춤.

  minesweeper.handleClick(x, y);
}


/**
 * 애플리케이션 중지 (공통)
 */
function stop() {
  if (currentGameMode === 'fruit') {
    if (poseEngine) poseEngine.stop();
    if (gameEngine) gameEngine.stop();
    if (stabilizer) stabilizer.reset();
  }

  // 지뢰찾기는 별도 stop 없음 (필요 시 추가)

  const startBtn = document.getElementById("startBtn");
  const stopBtn = document.getElementById("stopBtn");
  if (startBtn) startBtn.disabled = false;
  if (stopBtn) stopBtn.disabled = true;
}

// 전역 stop 함수
window.stop = stop;
window.init = () => { /* 이미 페이지 로드 시 init 실행됨, 버튼용 함수는 startFruitGame 내부 로직으로 대체됨 */ };

/**
 * 예측 결과 처리 콜백 (Fruit Game)
 */
function handlePrediction(predictions, pose) {
  const stabilized = stabilizer.stabilize(predictions);

  for (let i = 0; i < predictions.length; i++) {
    const classPrediction =
      predictions[i].className + ": " + predictions[i].probability.toFixed(2);
    labelContainer.childNodes[i].innerHTML = classPrediction;
  }

  const maxPredictionDiv = document.getElementById("max-prediction");
  maxPredictionDiv.innerHTML = stabilized.className || "감지 중...";

  if (gameEngine && gameEngine.isGameActive && stabilized.className) {
    gameEngine.onPoseDetected(stabilized.className);
  }
}

/**
 * 포즈 그리기 콜백 (Fruit Game)
 */
function drawPose(pose) {
  if (poseEngine.webcam && poseEngine.webcam.canvas) {
    ctx.drawImage(poseEngine.webcam.canvas, 0, 0, 500, 500); // 500x500으로 그리기

    if (pose) {
      const minPartConfidence = 0.5;
      tmPose.drawKeypoints(pose.keypoints, minPartConfidence, ctx);
      tmPose.drawSkeleton(pose.keypoints, minPartConfidence, ctx);
    }
  }

  if (gameEngine && (gameEngine.isGameActive || gameEngine.isGameOver)) {
    gameEngine.render(ctx);
  }
}
