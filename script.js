// --- CSS INJECTION (NEON UI & ANIMATIONS) ---
const style = document.createElement('style');
style.innerHTML = `
    .neon-btn-primary {
        background: #00ff9d !important; 
        color: #000 !important; 
        border: none !important; 
        padding: 10px 24px !important;
        font-family: 'JetBrains Mono', monospace;
        font-weight: 700 !important; 
        text-transform: uppercase;
        cursor: pointer; 
        border-radius: 4px;
        box-shadow: 0 0 10px rgba(0, 255, 157, 0.4);
        transition: all 0.3s ease;
    }
    .neon-btn-primary:hover { 
        box-shadow: 0 0 20px #00ff9d, 0 0 40px #00ff9d; 
        transform: translateY(-1px);
    }
    .neon-btn-secondary {
        background: transparent !important; 
        color: #fff !important; 
        border: 1px solid rgba(255,255,255,0.3) !important; 
        padding: 10px 20px !important;
        font-family: 'JetBrains Mono', monospace;
        cursor: pointer; 
        border-radius: 4px;
        transition: all 0.3s ease;
        opacity: 0.8;
    }
    .neon-btn-secondary:hover { 
        background: rgba(255,255,255,0.1) !important; 
        border-color: #fff !important;
        opacity: 1;
        box-shadow: 0 0 10px rgba(255,255,255,0.2);
    }
    .modal-footer {
        display: flex;
        justify-content: flex-end;
        gap: 12px;
        padding-top: 15px;
        border-top: 1px solid rgba(255,255,255,0.1);
        margin-top: 15px;
    }
`;
document.head.appendChild(style);

// --- KOD ŞABLONLARI ---
const templates = {
    python: `import sys\n\ndef main():\n    print("Merhaba Dünya!")\n\nif __name__ == "__main__":\n    main()`,
    java: `import java.util.Scanner;\n\npublic class Main {\n    public static void main(String[] args) {\n        Scanner scanner = new Scanner(System.in);\n        \n        // SENARYO: Boolean Testi\n        System.out.println("Gece Modu Acilsin mi? (true/false):");\n        boolean isNightMode = scanner.nextBoolean();\n\n        System.out.println("Hassasiyet Ayari (0.1 - 1.0):");\n        double sensitivity = scanner.nextDouble();\n\n        System.out.println("Matris Boyutu (n):");\n        int n = scanner.nextInt();\n        \n        int[][] ekran = new int[n][n];\n        System.out.println("Piksel Verileri:");\n        \n        for(int i=0; i<n; i++) {\n            for(int j=0; j<n; j++) {\n                ekran[i][j] = scanner.nextInt();\n            }\n        }\n        \n        System.out.println("Islem Tamam.");\n    }\n}`,
    javascript: `console.log("Merhaba Dünya! (NodeJS)");`,
    csharp: `using System;\n\npublic class Program {\n    public static void Main() {\n        Console.WriteLine("Merhaba Dünya! (C#)");\n    }\n}`,
    cpp: `#include <iostream>\n\nint main() {\n    std::cout << "Merhaba Dünya! (C++)" << std::endl;\n    return 0;\n}`,
    go: `package main\nimport "fmt"\n\nfunc main() {\n    fmt.Println("Merhaba Dünya! (Go)")\n}`,
    typescript: `const message: string = "Merhaba Dünya! (TS)";\nconsole.log(message);`
};

const apiLanguageMap = {
    python: { lang: 'python', version: '3.10.0' },
    java: { lang: 'java', version: '15.0.2' },
    javascript: { lang: 'javascript', version: '18.15.0' },
    csharp: { lang: 'csharp', version: '6.12.0' },
    cpp: { lang: 'c++', version: '10.2.0' },
    go: { lang: 'go', version: '1.16.2' },
    typescript: { lang: 'typescript', version: '5.0.3' }
};

let editor;
let areSuggestionsEnabled = true;

// Wizard State Management
let wizardState = {
    stage: 0, 
    configData: [], 
    structure: null, 
    finalPayloadParts: { config: "", grid: "" }
};

require.config({ paths: { 'vs': 'https://cdnjs.cloudflare.com/ajax/libs/monaco-editor/0.36.1/min/vs' }});

require(['vs/editor/editor.main'], function () {
    editor = monaco.editor.create(document.getElementById('editor-container'), {
        value: templates.java,
        language: 'java',
        theme: 'vs-dark',
        automaticLayout: true,
        fontSize: 14,
        fontFamily: 'JetBrains Mono',
        quickSuggestions: true,
        minimap: { enabled: true }, // GÜNCELLEME: Minimap (sağdaki küçük yazılar) açıldı
        cursorBlinking: "smooth",
        cursorSmoothCaretAnimation: "on"
    });

    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter, function() {
        initiateExecution();
    });
    
    // UI Listeners
    document.getElementById('suggestionToggle')?.addEventListener('click', toggleSuggestions);
    document.getElementById('themeToggle')?.addEventListener('click', toggleTheme);
    document.getElementById('languageSelector')?.addEventListener('change', changeLanguage);
});

// --- CORE LOGIC: PARSER (Fixed for False Positives) ---

function initiateExecution() {
    const code = editor.getValue();
    const needsInput = /Scanner|input\(|cin|ReadLine|fmt\.Scan/.test(code);

    if (!needsInput) {
        executeCode("");
        return;
    }

    const analysis = analyzeCodeStructure(code);
    
    wizardState = {
        stage: 0,
        configData: analysis.inputs, 
        structure: analysis.matrixStructure, 
        finalPayloadParts: { config: "", grid: "" }
    };

    openInputWizard();
}

function analyzeCodeStructure(code) {
    const lines = code.split('\n');
    const inputs = []; 
    let matrixStructure = null;
    
    let lastPrint = "Girdi Değeri:";
    const printRegex = /(?:print|Write)(?:ln)?\s*\(\s*["'](.*?)["']\s*\)/;
    const inputRegex = /(\.next|input\(|ReadLine|cin\s*>>|fmt\.Scan)/;
    
    // 1. Matris Yapısı
    const arrayRegex = /new\s+\w+\s*\[\s*(.*?)\s*\](?:\s*\[\s*(.*?)\s*\])?(?:\s*\[\s*(.*?)\s*\])?/;
    const arrayMatch = code.match(arrayRegex);

    let dimVars = new Set();
    if (arrayMatch) {
        let d1 = arrayMatch[1]?.trim(); 
        let d2 = arrayMatch[2]?.trim(); 
        let d3 = arrayMatch[3]?.trim(); 

        matrixStructure = {
            type: d3 ? "3D" : (d2 ? "2D" : "1D"),
            rowRef: d3 ? d2 : d1,
            colRef: d3 ? d3 : d2,
            layerRef: d3 ? d1 : null,
            rows: (d3 ? d2 : d1) && !isNaN(d3 ? d2 : d1) ? parseInt(d3 ? d2 : d1) : null,
            cols: (d3 ? d3 : d2) && !isNaN(d3 ? d3 : d2) ? parseInt(d3 ? d3 : d2) : null,
            layers: d3 && !isNaN(d1) ? parseInt(d1) : 1
        };

        [d1, d2, d3].forEach(d => { if (d && isNaN(d)) dimVars.add(d); });
    }

    // 2. Satır Analizi
    let braceLevel = 0; 

    for (let line of lines) {
        const cleanLine = line.trim();
        const openBraces = (line.match(/\{/g) || []).length;
        const closeBraces = (line.match(/\}/g) || []).length;
        
        if (cleanLine.startsWith("//") || cleanLine.startsWith("import") || cleanLine.startsWith("package")) continue;
        if (cleanLine.includes("new Scanner")) continue;
        if (cleanLine.includes("System.in")) continue;
        if (!cleanLine) continue;

        // Prompt Yakalama
        const pMatch = line.match(printRegex);
        if (pMatch) {
            const pText = pMatch[1].toLowerCase();
            if (matrixStructure && (pText.includes("matris") || pText.includes("dizi") || pText.includes("stok") || pText.includes("eleman"))) {
                lastPrint = null; 
            } else {
                lastPrint = pMatch[1];
            }
        }

        // Input Yakalama
        if (inputRegex.test(line)) {
            const isInsideLoop = /for\s*\(|while\s*\(/.test(line) || braceLevel > 2;

            if (isInsideLoop) {
                lastPrint = "Girdi Değeri:"; 
                continue; 
            }

            let label = lastPrint || "Girdi Değeri:";
            let isDim = false;
            let dimRef = null;

            // FIX: Label stringini kontrol etmeyi bıraktık.
            // Sadece kod satırında tam kelime olarak (int n =) geçiyor mu ona bakıyoruz.
            dimVars.forEach(v => {
                 const regex = new RegExp(`\\b${v}\\b`); 
                 // SADECE kod satırını kontrol et, label'ı değil!
                 if (regex.test(line)) {
                     isDim = true;
                     dimRef = v;
                 }
            });

            inputs.push({
                id: inputs.length,
                label: label,
                isDimension: isDim,
                ref: dimRef,
                value: "" 
            });
            lastPrint = "Girdi Değeri:"; 
        }

        braceLevel += (openBraces - closeBraces);
    }
    
    return { inputs, matrixStructure };
}

// --- WIZARD UI LOGIC ---

function openInputWizard() {
    setupModal("GİRDİ SİHİRBAZI", "Program çalıştırılmadan önce gerekli veriler toplanıyor.");
    
    const toggleContainer = document.querySelector('.input-mode-toggle');
    if(toggleContainer) toggleContainer.style.display = 'none';

    renderStage1();
}

/**
 * Modern Neon Footer Butonları
 */
function renderFooterButtons(primaryText, primaryAction, showBack = false) {
    let footer = document.querySelector('.modal-footer');
    if (!footer) {
        const modalContent = document.querySelector('.modal-content') || document.getElementById('inputModal');
        footer = document.createElement('div');
        footer.className = 'modal-footer';
        modalContent.appendChild(footer);
    }
    footer.innerHTML = '';
    
    // İptal Butonu
    const cancelBtn = document.createElement('button');
    cancelBtn.className = 'neon-btn-secondary'; 
    cancelBtn.innerText = 'İPTAL';
    cancelBtn.onclick = closeModal;
    
    // Geri Butonu
    if (showBack) {
        const backBtn = document.createElement('button');
        backBtn.className = 'neon-btn-secondary';
        backBtn.innerText = '← GERİ';
        backBtn.onclick = () => {
            renderStage1();
        };
        footer.appendChild(backBtn);
    }

    // Aksiyon Butonu (Neon)
    const actionBtn = document.createElement('button');
    actionBtn.className = 'neon-btn-primary';
    actionBtn.id = 'wizardActionBtn';
    actionBtn.innerText = primaryText;
    actionBtn.onclick = primaryAction;
    
    footer.appendChild(cancelBtn);
    footer.appendChild(actionBtn);
}

function renderStage1() {
    wizardState.stage = 0;
    const container = document.getElementById('dynamicInputs');
    container.innerHTML = '';
    
    const info = document.createElement('div');
    info.className = 'wizard-step-info';
    info.innerHTML = `<strong>Aşama 1/2:</strong> Değişken Tanımları & Boyutlar`;
    container.appendChild(info);

    const hasInputs = wizardState.configData.length > 0;
    const hasMatrix = !!wizardState.structure;

    if (!hasInputs && hasMatrix) {
        info.innerHTML += "<br><br><span style='opacity:0.8'>🔹 Bu program için ön tanımlı değişken (n, m vb.) gerekmiyor.<br>Tabloyu doldurmak için devam ediniz.</span>";
    } 
    else if (hasInputs) {
        wizardState.configData.forEach((item, index) => {
            const div = document.createElement('div');
            div.className = 'input-group';
            div.innerHTML = `
                <label class="input-label">
                    ${index+1}. ${item.label} 
                    ${item.isDimension ? '<span style="color:#00ff9d; font-weight:bold;">(Tablo Boyutu)</span>' : ''}
                </label>
                <input type="text" class="modal-input stage1-input" 
                       data-index="${index}" 
                       data-ref="${item.ref || ''}"
                       value="${item.value || ''}" 
                       placeholder="${item.isDimension ? 'Örn: 3' : 'Değer...'}">
            `;
            container.appendChild(div);
        });
        
        // ENTER TUŞU DESTEĞİ
        setTimeout(() => {
            const inputs = container.querySelectorAll('.stage1-input');
            inputs.forEach((input, idx) => {
                input.onkeydown = (e) => {
                    if (e.key === "Enter") {
                        e.preventDefault(); // Form submit engelle
                        if (idx < inputs.length - 1) {
                            inputs[idx+1].focus();
                        } else {
                            handleStage1Submit();
                        }
                    }
                };
            });
            if(inputs.length > 0) inputs[0].focus();
        }, 100);

    } else if (!hasInputs && !hasMatrix) {
        container.innerHTML = "<div class='log-error'>Girdi algılanamadı. Kodunuzu kontrol ediniz veya direkt çalıştırınız.</div>";
    }

    const btnText = hasMatrix ? "DEVAM ET (TABLO OLUŞTUR)" : "GÖNDER VE ÇALIŞTIR";
    renderFooterButtons(btnText, handleStage1Submit, false); // Geri butonu yok

    showModal();
}

function handleStage1Submit() {
    const inputs = document.querySelectorAll('.stage1-input');
    let configPayload = "";
    
    inputs.forEach(inp => {
        const val = inp.value.trim();
        const idx = parseInt(inp.dataset.index);
        
        if (wizardState.configData[idx]) {
            wizardState.configData[idx].value = val;
        }

        configPayload += val + "\n";
        
        const ref = inp.dataset.ref;
        if (ref && wizardState.structure) {
            if (wizardState.structure.rowRef === ref) wizardState.structure.rows = parseInt(val);
            if (wizardState.structure.colRef === ref) wizardState.structure.cols = parseInt(val);
            if (wizardState.structure.layerRef === ref) wizardState.structure.layers = parseInt(val);
        }
    });

    wizardState.finalPayloadParts.config = configPayload;

    if (wizardState.structure) {
        resolveStructureDimensions();
        
        if ((wizardState.structure.rows || 0) <= 0) {
            const fallbackRow = parseInt(wizardState.structure.rowRef);
            if (!isNaN(fallbackRow) && fallbackRow > 0) {
                 wizardState.structure.rows = fallbackRow;
                 if(!wizardState.structure.cols) wizardState.structure.cols = fallbackRow; 
            } else {
                 alert("Lütfen geçerli pozitif matris boyutları giriniz! (Kod analizi boyutları tespit edemedi)");
                 return;
            }
        }
        renderStage2();
    } else {
        submitFinalInput();
    }
}

function resolveStructureDimensions() {
    const s = wizardState.structure;
    if (!s.rows && !isNaN(s.rowRef)) s.rows = parseInt(s.rowRef);
    if (!s.cols && !isNaN(s.colRef)) s.cols = parseInt(s.colRef);
    if (!s.rows) s.rows = 0;
    if (!s.cols) s.cols = s.rows; 
    if (s.type === "3D" && !s.layers) s.layers = !isNaN(s.layerRef) ? parseInt(s.layerRef) : 1;
    if (s.type === "1D") { s.cols = s.rows; s.rows = 1; }
}

function renderStage2() {
    wizardState.stage = 1;
    const container = document.getElementById('dynamicInputs');
    container.innerHTML = '';
    
    const s = wizardState.structure;
    const info = document.createElement('div');
    info.className = 'wizard-step-info';
    info.innerHTML = `<strong>Aşama 2/2:</strong> Matris Verileri (${s.type}: ${s.layers||1}x${s.rows}x${s.cols})`;
    container.appendChild(info);

    const fb = document.getElementById('fallbackWrapper');
    if(fb) fb.style.display = 'none';

    generateGridUI(container, s.layers || 1, s.rows, s.cols, s.type);
    
    // Geri butonu AKTİF
    renderFooterButtons("ÇALIŞTIR", submitFinalInput, true);
}

function generateGridUI(container, layers, rows, cols, type) {
    const tableContainer = document.createElement('div');
    tableContainer.style.cssText = "max-height: 400px; overflow-y: auto; margin-top:10px;";
    const tableStyle = "width: 100%; border-collapse: separate; border-spacing: 4px; background: rgba(0,0,0,0.2); border-radius: 8px;";
    
    for (let l = 0; l < layers; l++) {
        if (type === "3D") {
            const h4 = document.createElement('h4');
            h4.innerText = `KATMAN ${l}`;
            tableContainer.appendChild(h4);
        }

        const table = document.createElement('table');
        table.style.cssText = tableStyle;

        for (let r = 0; r < rows; r++) {
            const tr = document.createElement('tr');
            for (let c = 0; c < cols; c++) {
                const td = document.createElement('td');
                const input = document.createElement('input');
                input.type = 'number';
                input.className = 'modal-input wizard-cell';
                input.value = "0";
                input.style.cssText = "text-align: center; min-width: 50px; border: 1px solid rgba(255,255,255,0.1);";
                input.onfocus = function() { this.select(); };
                input.onkeydown = (e) => handleGridNavigation(e, input);

                td.appendChild(input);
                tr.appendChild(td);
            }
            table.appendChild(tr);
        }
        tableContainer.appendChild(table);
    }
    container.appendChild(tableContainer);
}

function handleGridNavigation(e, currentInput) {
    if (e.key === "Enter") {
        e.preventDefault();
        const allInputs = [...document.querySelectorAll('.wizard-cell')];
        const index = allInputs.indexOf(currentInput);
        if (index < allInputs.length - 1) allInputs[index + 1].focus();
        else submitFinalInput();
    }
}

// --- SUBMISSION ---

window.submitFinalInput = function() {
    if (wizardState.stage === 1) {
        const inputs = document.querySelectorAll('.wizard-cell');
        const values = Array.from(inputs).map(inp => inp.value || "0");
        wizardState.finalPayloadParts.grid = values.join(" ");
    }

    let finalPayload = wizardState.finalPayloadParts.config.trim();
    if (wizardState.finalPayloadParts.grid) {
        finalPayload = finalPayload ? (finalPayload + "\n" + wizardState.finalPayloadParts.grid) : wizardState.finalPayloadParts.grid;
    }

    closeModal();
    executeCode(finalPayload);
}

// --- SYSTEM UTILS ---

function setupModal(title, desc) {
    document.querySelector('.title-text span:first-child').innerText = title;
    document.getElementById('modalDesc').innerText = desc;
    document.getElementById('dynamicInputs').innerHTML = '';
}

function showModal() {
    document.getElementById('inputModal').classList.add('active');
}

window.closeModal = function() {
    document.getElementById('inputModal').classList.remove('active');
}

window.runMatrixWizard = function() {
    initiateExecution();
}

async function executeCode(stdinData) {
    const btn = document.getElementById('runBtn');
    const outputDiv = document.getElementById('outputContent');
    const statusMsg = document.getElementById('statusMsg');
    const loadingDot = document.getElementById('loadingIndicator');
    const lang = document.getElementById('languageSelector').value;

    if(btn) btn.disabled = true;
    loadingDot.style.display = 'flex'; 
    statusMsg.innerText = "DERLENİYOR...";
    outputDiv.innerHTML = '';
    
    const config = apiLanguageMap[lang];
    const payload = {
        language: config.lang,
        version: config.version,
        files: [{ content: editor.getValue() }],
        stdin: stdinData || ""
    };

    try {
        const res = await fetch('https://emkc.org/api/v2/piston/execute', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        const data = await res.json();
        
        if (data.run) {
            const out = data.run.stdout || "";
            const err = data.run.stderr || "";
            
            if(out) outputDiv.innerHTML += `<div class="log-success" style="white-space: pre; overflow-x: auto; font-family: 'JetBrains Mono', monospace;">${out}</div>`;
            if(err) outputDiv.innerHTML += `<div class="log-error" style="white-space: pre;">${err}</div>`;
            
            outputDiv.innerHTML += `<div class="${data.run.code===0?'log-exit-success':'log-exit-error'}">\nExit Code: ${data.run.code}</div>`;
            statusMsg.innerText = data.run.code === 0 ? "BAŞARILI" : "HATA";
        }
    } catch (e) {
        outputDiv.innerHTML = `<div class="log-error">API Hatası: ${e.message}</div>`;
        statusMsg.innerText = "BAĞLANTI YOK";
    } finally {
        if(btn) btn.disabled = false;
        loadingDot.style.display = 'none';
        outputDiv.scrollTop = outputDiv.scrollHeight;
    }
}

// UI Helpers
function toggleSuggestions() {
    areSuggestionsEnabled = !areSuggestionsEnabled;
    editor.updateOptions({ quickSuggestions: areSuggestionsEnabled });
    document.getElementById('suggestionIcon').innerText = areSuggestionsEnabled ? '💡' : '⚫';
    showToast(areSuggestionsEnabled ? "Öneriler Açıldı" : "Öneriler Kapatıldı");
}

function toggleTheme() {
    document.body.classList.toggle('light-mode');
    const isLight = document.body.classList.contains('light-mode');
    monaco.editor.setTheme(isLight ? 'vs' : 'vs-dark');
    document.getElementById('themeIcon').innerText = isLight ? '☀️' : '🌙';
}

function changeLanguage() {
    const lang = this.value;
    monaco.editor.setModelLanguage(editor.getModel(), lang);
    editor.setValue(templates[lang]);
}

function showToast(msg) {
    const t = document.getElementById('toast');
    t.innerText = msg;
    t.classList.add('show');
    setTimeout(() => t.classList.remove('show'), 3000);
}

// Matrix Background
(function() {
    const c = document.getElementById('binaryBg');
    if(!c) return;
    const ctx = c.getContext('2d');
    let w = c.width = window.innerWidth;
    let h = c.height = window.innerHeight;
    const cols = Math.floor(w/20);
    const ypos = Array(cols).fill(0);
    window.addEventListener('resize', () => { w=c.width=window.innerWidth; h=c.height=window.innerHeight; });
    setInterval(() => {
        ctx.fillStyle = '#0001'; ctx.fillRect(0,0,w,h);
        ctx.fillStyle = '#0f0'; ctx.font = '15pt monospace';
        ypos.forEach((y,i) => {
            ctx.fillText(String.fromCharCode(Math.random()*128), i*20, y);
            ypos[i] = (y>100+Math.random()*10000) ? 0 : y+20;
        });
    }, 50);
})();