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
    /* Loop Hint Style */
    .loop-hint-badge {
        display: inline-block;
        background: rgba(255, 0, 157, 0.15);
        color: #ff009d;
        font-size: 0.75rem;
        padding: 2px 6px;
        border-radius: 4px;
        border: 1px solid rgba(255, 0, 157, 0.3);
        margin-left: 8px;
        vertical-align: middle;
    }
`;
document.head.appendChild(style);

// --- KOD ŞABLONLARI ---
const templates = {
    // PYTHON
    python: `import sys

def main():
    print("Merhaba Dunya! (Python)")
    
    # Ornek girdi alma:
    # isim = input("Adiniz nedir? ")
    # print(f"Merhaba {isim}")

if __name__ == "__main__":
    main()`,

    // JAVA (Bizim Fixlediğimiz Sürüm)
    java: `import java.util.Scanner;
public class Main {
    public static void main(String[] args) {
        Scanner input = new Scanner(System.in);
        
        System.out.println("Dunyaya mesajiniz nedir?");
        String mesaj = input.nextLine();
           
        System.out.println("Mesajiniz iletildi: " + mesaj);
        
    }
}`,

    // JAVASCRIPT
    javascript: `console.log("Merhaba Dünya! (NodeJS)");
    
// Not: NodeJS ortaminda calisir.
// Girdi almak icin 'readline' modulu kullanilir.`,

    // C#
    csharp: `using System;

public class Program {
    public static void Main() {
        Console.WriteLine("Merhaba Dünya! (C#)");
        
        // Console.Write("Bir sayi girin: ");
        // string girdi = Console.ReadLine();
        // Console.WriteLine("Girdiniz: " + girdi);
    }
}`,

    // C++
    cpp: `#include <iostream>

int main() {
    std::cout << "Merhaba Dünya! (C++)" << std::endl;
    return 0;
}`,

    // GO
    go: `package main
import "fmt"

func main() {
    fmt.Println("Merhaba Dünya! (Go)")
}`,

    // TYPESCRIPT
    typescript: `const message: string = "Merhaba Dünya! (TS)";
console.log(message);`
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
    // 1. EDITÖRÜ OLUŞTUR
    editor = monaco.editor.create(document.getElementById('editor-container'), {
        value: templates.java, // Varsayılan Java ile başla
        language: 'java',
        theme: 'vs-dark',
        automaticLayout: true,
        minimap: { enabled: false },
        fontSize: 14,
        fontFamily: "'JetBrains Mono', monospace",
        scrollBeyondLastLine: false,
    });

    // 2. DİL DEĞİŞTİRME DİNLEYİCİSİ (FIX BURADA!)
    // Dil seçicisine 'change' olayı ekliyoruz. Değişince changeLanguage çalışacak.
    const langSelector = document.getElementById('languageSelector');
    if (langSelector) {
        langSelector.addEventListener('change', changeLanguage);
    }

    // 3. KOMUTLAR VE DİĞER AYARLAR
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter, function() {
        initiateExecution();
    });
    
    editor.onDidChangeCursorPosition((e) => {
        const satir = e.position.lineNumber;
        const sutun = e.position.column;
        const yaziAlani = document.getElementById('cursorPos') || document.querySelector('.status-bar-right span') || document.querySelector('.footer span');
        if (yaziAlani) {
            yaziAlani.innerText = `Ln ${satir}, Col ${sutun}`;
        }
    });
    
    document.getElementById('suggestionToggle')?.addEventListener('click', toggleSuggestions);
});

// --- CORE LOGIC: ADVANCED PARSER ---

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

/**
 * PROFESYONEL KOD ANALİZ MOTORU v6.0 (Ghost Input Fix)
 */
function analyzeCodeStructure(code) {
    let cleanCode = code
        .replace(/\/\*[\s\S]*?\*\//g, '') 
        .replace(/\/\/.*$/gm, '');

    const lines = cleanCode.split('\n');
    const inputs = [];
    let matrixStructure = null;
    let matrixVarName = null;
    
    let scannerVarName = "input"; 
    const scannerMatch = cleanCode.match(/Scanner\s+(\w+)\s*=\s*new\s+Scanner/);
    if (scannerMatch) scannerVarName = scannerMatch[1];

    const strictInputRegex = new RegExp(
        `(\\b${scannerVarName}\\.(next|nextInt|nextDouble|nextLine|nextBoolean)\\b)` + 
        `|(\\bConsole\\.ReadLine\\b)` + 
        `|(\\binput\\s*\\()` +           
        `|(\\bcin\\s*>>)` +              
        `|(\\bfmt\\.Scan)`               
    );

    const printRegex = /(?:print|Write|console\.log|fmt\.Print|System\.out\.print)(?:ln|f)?\s*\((.*)\)/;
    let lastPrint = null; 
    
    const matrixDeclRegex = /(?:int|double|String)\s*\[\s*\]\s*\[\s*\]\s*(\w+)\s*=\s*new\s+\w+\s*\[\s*(\d+)\s*\](?:\s*\[\s*(\d+)\s*\])?/;
    const matrixMatch = code.match(matrixDeclRegex);
    
    if (matrixMatch) {
         matrixVarName = matrixMatch[1]; 
         matrixStructure = {
            type: matrixMatch[3] ? "2D" : "1D", 
            rowRef: matrixMatch[2],
            colRef: matrixMatch[3],
            rows: parseInt(matrixMatch[2]), 
            cols: matrixMatch[3] ? parseInt(matrixMatch[3]) : 0
         };
    } else {
        const arrayRegex = /new\s+\w+\s*\[\s*(\d+)\s*\](?:\s*\[\s*(\d+)\s*\])?/;
        const arrayMatch = code.match(arrayRegex);
        if (arrayMatch) {
            matrixStructure = {
                type: arrayMatch[2] ? "2D" : "1D",
                rowRef: arrayMatch[1],
                colRef: arrayMatch[2],
                rows: parseInt(arrayMatch[1]), 
                cols: arrayMatch[2] ? parseInt(arrayMatch[2]) : 0
            };
        }
    }

    let currentBraceLevel = 0; 
    let loopStack = []; 

    for (let i = 0; i < lines.length; i++) {
        let line = lines[i].trim();
        if (!line) continue;

        const openBraces = (line.match(/\{/g) || []).length;
        const closeBraces = (line.match(/\}/g) || []).length;
        const isLoopStart = /^(?:for|while|do)\b/.test(line);

        if (isLoopStart) {
            loopStack.push(currentBraceLevel + 1);
        }

        const pMatch = line.match(printRegex);
        if (pMatch) {
            let rawContent = pMatch[1];
            const quoteMatch = rawContent.match(/"([^"]+)"/);
            
            if (quoteMatch && quoteMatch[1].length > 1) {
                lastPrint = quoteMatch[1].replace(/[:=]/g, '').trim();
            } else {
                let content = rawContent.replace(/["';+]/g, '').trim();
                content = content.replace(/\(.*?\)/g, '');
                if (content.length > 0) lastPrint = content.trim();
            }
        }

        if (strictInputRegex.test(line)) {
            const isNextLine = line.includes("nextLine");
            const hasAssignment = line.includes("=");
            if (isNextLine && !hasAssignment && !line.includes("print")) {
                lastPrint = null; 
                continue; 
            }

            const assignMatch = line.match(/(?:int|String|double|float|var|char|boolean)?\s*(\w+|(?:\w+\[.*?\]))\s*=/);
            let varName = assignMatch ? assignMatch[1] : null;
            if (varName && varName.includes("[")) varName = varName.split("[")[0]; 
            
            if (matrixStructure && matrixStructure.rows > 0) {
                if (varName && varName === matrixVarName) {
                    lastPrint = null;
                    continue; 
                }
                if (!varName && loopStack.length > 0 && currentBraceLevel >= loopStack[loopStack.length-1]) {
                    lastPrint = null;
                    continue;
                }
            }

            let label = lastPrint;
            if (!label || label.length < 2) {
                label = varName ? (varName + " Değeri") : "Girdi";
            }

            const isInLoop = loopStack.length > 0 && currentBraceLevel + openBraces >= loopStack[loopStack.length - 1];

            inputs.push({
                id: inputs.length,
                label: label, 
                isDimension: false, 
                isLoopInput: isInLoop, 
                ref: varName,
                value: "" 
            });

            lastPrint = null; 
        }

        currentBraceLevel += (openBraces - closeBraces);

        if (loopStack.length > 0 && currentBraceLevel < loopStack[loopStack.length - 1]) {
            loopStack.pop();
        }
    }
    
    return { inputs, matrixStructure };
}

// --- WIZARD UI LOGIC ---

function openInputWizard() {
    setupModal("GİRDİ SİHİRBAZI", "Program çalıştırılmadan önce veriler toplanıyor.");
    
    const toggleContainer = document.querySelector('.input-mode-toggle');
    if(toggleContainer) toggleContainer.style.display = 'none';

    renderStage1();
    showModal();
}

function renderFooterButtons(primaryText, primaryAction, showBack = false) {
    let footer = document.querySelector('.modal-footer');
    if (!footer) {
        const modalContent = document.querySelector('.modal-content') || document.getElementById('inputModal');
        footer = document.createElement('div');
        footer.className = 'modal-footer';
        modalContent.appendChild(footer);
    }
    footer.innerHTML = '';
    
    const cancelBtn = document.createElement('button');
    cancelBtn.className = 'neon-btn-secondary'; 
    cancelBtn.innerText = 'İPTAL';
    cancelBtn.onclick = closeModal;
    
    if (showBack) {
        const backBtn = document.createElement('button');
        backBtn.className = 'neon-btn-secondary';
        backBtn.innerText = '← GERİ';
        backBtn.onclick = () => { renderStage1(); };
        footer.appendChild(backBtn);
    }

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
    
    const hasInputs = wizardState.configData.length > 0;
    const hasFixedMatrix = wizardState.structure && wizardState.structure.rows > 0;
    
    if (!hasInputs && hasFixedMatrix) {
        const info = document.createElement('div');
        info.className = 'wizard-step-info';
        info.innerHTML = `<strong>Aşama 1/2:</strong> Hazırlık`;
        container.appendChild(info);

        const msg = document.createElement('div');
        msg.style.cssText = "padding: 20px; text-align: center; color: #aaa;";
        msg.innerHTML = "📝 Bu bölümde girilecek veri yok.<br>Matris tablosunu oluşturmak için devam ediniz.";
        container.appendChild(msg);

        renderFooterButtons("DEVAM ET (TABLO OLUŞTUR)", () => { renderStage2(); }, false);
        return;
    }

    const info = document.createElement('div');
    info.className = 'wizard-step-info';
    info.innerHTML = `<strong>Aşama 1/2:</strong> Değişken Tanımları & Veri Girişi`;
    container.appendChild(info);
    
    if (hasInputs) {
        wizardState.configData.forEach((item, index) => {
            const div = document.createElement('div');
            div.className = 'input-group';
            
            const defaultValue = item.value || '';
            let placeholderText = "Cevabınızı buraya yazın...";
            let loopHint = "";

            if (item.isDimension) {
                placeholderText = "Örn: 3 (Tablo Boyutu)";
            } else if (item.isLoopInput) {
                placeholderText = "DÖNGÜ: Değerleri birer boşluk ara ile girin (Örn: Ali Veli Ayşe)";
                loopHint = `<span class="loop-hint-badge">DÖNGÜ (Liste)</span>`;
            }

            div.innerHTML = `
                <label class="input-label">
                    ${index+1}. ${item.label} 
                    ${item.isDimension ? '<span style="color:#00ff9d; font-weight:bold; margin-left:5px;">(Tablo Boyutu)</span>' : ''}
                    ${loopHint}
                </label>
                <input type="text" class="modal-input stage1-input" 
                       data-index="${index}" 
                       data-ref="${item.ref || ''}"
                       data-is-loop="${item.isLoopInput}"
                       value="${defaultValue}" 
                       placeholder="${placeholderText}">
            `;
            container.appendChild(div);
        });
        
        setTimeout(() => {
            const inputs = container.querySelectorAll('.stage1-input');
            inputs.forEach((input, idx) => {
                input.onkeydown = (e) => {
                    if (e.key === "Enter") {
                        e.preventDefault(); 
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
    } 

    const btnText = hasFixedMatrix ? "DEVAM ET (TABLO OLUŞTUR)" : "GÖNDER VE ÇALIŞTIR";
    renderFooterButtons(btnText, handleStage1Submit, false); 
}

function handleStage1Submit() {
    const inputs = document.querySelectorAll('.stage1-input');
    let configPayload = "";
    
    let loopBuffer = []; 

    const flushLoopBuffer = () => {
        if (loopBuffer.length === 0) return "";
        let result = "";
        const maxLen = Math.max(...loopBuffer.map(arr => arr.length));
        for (let i = 0; i < maxLen; i++) {
            loopBuffer.forEach(arr => {
                if (i < arr.length) {
                    result += arr[i] + "\n"; 
                }
            });
        }
        loopBuffer = []; 
        return result;
    };

    if (inputs.length > 0) {
        inputs.forEach(inp => {
            const val = inp.value.trim();
            const idx = parseInt(inp.dataset.index);
            const isLoop = inp.dataset.isLoop === "true";
            
            if (wizardState.configData[idx]) {
                wizardState.configData[idx].value = val;
            }

            if (isLoop) {
                const items = val.split(/\s+/).filter(x => x.length > 0);
                loopBuffer.push(items);
            } else {
                configPayload += flushLoopBuffer();
                configPayload += val + "\n";
            }
        });
        configPayload += flushLoopBuffer();
    }

    wizardState.finalPayloadParts.config = configPayload;

    if (wizardState.structure && wizardState.structure.rows > 0) {
        renderStage2();
    } else {
        submitFinalInput();
    }
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

    generateGridUI(container, s.layers || 1, s.rows, s.cols, s.type);
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
    const lang = document.getElementById('languageSelector').value;
    monaco.editor.setModelLanguage(editor.getModel(), lang);
    if(templates[lang]) {
        editor.setValue(templates[lang]);
    }
}

function showToast(msg) {
    const t = document.getElementById('toast');
    t.innerText = msg;
    t.classList.add('show');
    setTimeout(() => t.classList.remove('show'), 3000);
}

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
