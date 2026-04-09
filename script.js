const allKeys = [
    { en: 'Q', ko: 'ㅂ' }, { en: 'W', ko: 'ㅈ' }, { en: 'E', ko: 'ㄷ' }, { en: 'R', ko: 'ㄱ' }, { en: 'T', ko: 'ㅅ' },
    { en: 'Y', ko: 'ㅛ' }, { en: 'U', ko: 'ㅕ' }, { en: 'I', ko: 'ㅑ' }, { en: 'O', ko: 'ㅐ' }, { en: 'P', ko: 'ㅔ' },
    { en: 'A', ko: 'ㅁ' }, { en: 'S', ko: 'ㄴ' }, { en: 'D', ko: 'ㅇ' }, { en: 'F', ko: 'ㄹ' }, { en: 'G', ko: 'ㅎ' },
    { en: 'H', ko: 'ㅗ' }, { en: 'J', ko: 'ㅓ' }, { en: 'K', ko: 'ㅏ' }, { en: 'L', ko: 'ㅣ' },
    { en: 'Z', ko: 'ㅋ' }, { en: 'X', ko: 'ㅌ' }, { en: 'C', ko: 'ㅊ' }, { en: 'V', ko: 'ㅍ' }, { en: 'B', ko: 'ㅠ' },
    { en: 'N', ko: 'ㅜ' }, { en: 'M', ko: 'ㅡ' }
];

const plate = document.getElementById('keyboard-plate');
const storage = document.getElementById('keycap-storage');
const statusMsg = document.getElementById('status-message');

function showMessage(text, color) {
    statusMsg.innerText = text;
    statusMsg.style.color = color;
}

function createKeycapHTML(key) {
    return `<span class="label-en" style="pointer-events:none;">${key.en}</span>
            <span class="label-ko" style="pointer-events:none;">${key.ko}</span>`;
}

function startGame(level) {
    plate.innerHTML = '';
    storage.innerHTML = '';
    let displayKeys = []; // 화면에 그릴 키들
    let targetKeys = [];  // 맞춰야 할 키들

    if (level === 1) {
        // 1단계: 전체 키보드 보여주되, N개만 구멍 뚫기
        const count = parseInt(document.getElementById('hole-count').value) || 5;
        const holes = [...allKeys].sort(() => Math.random() - 0.5).slice(0, count).map(k => k.en);
        displayKeys = allKeys.map(k => ({ ...k, isEmpty: holes.includes(k.en) }));
        showMessage(`${count}개의 키캡을 맞춰보세요!`, "#3498db");
    } 
    else if (level === 2) {
        // 2단계: 랜덤하게 연속된 9~10개만 추출해서 한 줄로 보여주기
        const startIdx = Math.floor(Math.random() * (allKeys.length - 9));
        const selectedChunk = allKeys.slice(startIdx, startIdx + 9);
        displayKeys = selectedChunk.map(k => ({ ...k, isEmpty: true }));
        
        // CSS 그리드 강제 조정 (한 줄로 보이게)
        plate.style.gridTemplateColumns = `repeat(${selectedChunk.length}, 70px)`;
        showMessage(`나타난 ${selectedChunk.length}개의 위치를 맞춰보세요!`, "#3498db");
    } 
    else if (level === 3) {
        // 3단계: 전체 키보드 보여주되, 전부 구멍 뚫기
        displayKeys = allKeys.map(k => ({ ...k, isEmpty: true }));
        plate.style.gridTemplateColumns = `repeat(10, 70px)`; // 그리드 복구
        showMessage(`전체 키보드를 완성하세요!`, "#f1c40f");
    }

    // 키보드 판 그리기
    displayKeys.forEach(key => {
        const slot = document.createElement('div');
        slot.classList.add('key-slot');
        slot.dataset.answer = key.en;

        if (key.isEmpty) {
            slot.classList.add('empty');
            slot.addEventListener('dragover', e => e.preventDefault());
            slot.addEventListener('dragenter', e => slot.classList.add('over'));
            slot.addEventListener('dragleave', e => slot.classList.remove('over'));
            slot.addEventListener('drop', handleDrop);
            targetKeys.push(key);
        } else {
            slot.classList.add('filled');
            const cap = document.createElement('div');
            cap.classList.add('keycap');
            cap.style.cursor = 'default';
            cap.innerHTML = createKeycapHTML(key);
            slot.appendChild(cap);
        }
        plate.appendChild(slot);
    });

    // 보관함에 랜덤 섞어서 배치
    targetKeys.sort(() => Math.random() - 0.5).forEach(key => {
        const keycap = document.createElement('div');
        keycap.classList.add('keycap');
        keycap.draggable = true;
        keycap.id = `key-${key.en}`;
        keycap.innerHTML = createKeycapHTML(key);
        keycap.addEventListener('dragstart', e => {
            e.dataTransfer.setData('text/plain', e.target.id);
        });
        storage.appendChild(keycap);
    });
}

function handleDrop(e) {
    e.preventDefault();
    this.classList.remove('over');
    
    const keycapId = e.dataTransfer.getData('text/plain');
    const keycap = document.getElementById(keycapId);
    if (!keycap) return;

    const droppedKeyEn = keycapId.split('-')[1];
    
    if (this.dataset.answer === droppedKeyEn) {
        this.appendChild(keycap);
        keycap.draggable = false;
        keycap.style.cursor = 'default';
        this.classList.remove('empty');
        this.classList.add('filled');
        showMessage("정답입니다! 👏", "#2ecc71");
        checkWin();
    } else {
        showMessage("위치가 틀렸습니다! ❌", "#e74c3c");
    }
}

function checkWin() {
    if (storage.querySelectorAll('.keycap').length === 0) {
        showMessage("🎉 미션 완료! 다음 단계에 도전해 보세요!", "#2ecc71");
    }
}

window.onload = () => startGame(1);