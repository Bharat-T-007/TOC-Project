/**
 * DFA Minimization Simulator 
 */

class DFA {
    constructor(states, alphabet, transitions, startState, finalStates) {
        this.states = states;
        this.alphabet = alphabet;
        this.transitions = transitions;
        this.startState = startState;
        this.finalStates = new Set(finalStates);
    }

    isFinal(state) {
        return this.finalStates.has(state);
    }

    getTransition(state, symbol) {
        return this.transitions[state][symbol];
    }
}

class MinimizationSimulator {
    constructor(dfa) {
        this.dfa = dfa;
        this.pairs = [];
        this.marked = new Map(); 
        this.history = []; 
        this.isComplete = false;
        
        this.initPairs();
    }

    initPairs() {
        const states = this.dfa.states;
        for (let i = 1; i < states.length; i++) {
            for (let j = 0; j < i; j++) {
                const p = states[i];
                const q = states[j];
                const key = this.getPairKey(p, q);
                this.pairs.push({ p, q, key });
                this.marked.set(key, { marked: false, reason: '', round: -1, string: '', dependency: null });
            }
        }
    }

    getPairKey(p, q) {
        return [p, q].sort().join(',');
    }

    // Capture state for history
    captureState() {
        const markedClone = new Map();
        this.marked.forEach((v, k) => markedClone.set(k, { ...v }));
        return markedClone;
    }

    *generateSteps() {
        // Round 0: Initial Marking
        for (const pair of this.pairs) {
            const pFinal = this.dfa.isFinal(pair.p);
            const qFinal = this.dfa.isFinal(pair.q);
            
            if (pFinal !== qFinal) {
                const reason = `States have different finality:<br>` +
                               `<span class="hl-p">${pair.p}</span> is <strong>${pFinal ? 'Final' : 'Non-Final'}</strong><br>` +
                               `<span class="hl-q">${pair.q}</span> is <strong>${qFinal ? 'Final' : 'Non-Final'}</strong>`;
                
                const detailedReason = `<span class="hl-p">${pair.p}</span> is ${pFinal ? 'Final' : 'Non-Final'}<br>` +
                                       `<span class="hl-q">${pair.q}</span> is ${qFinal ? 'Final' : 'Non-Final'}<br>` +
                                       `<span class="hl-res">Distinguishable by ε</span>`;
                
                const step = {
                    type: 'MARK_INITIAL',
                    pair,
                    reason,
                    detailedReason,
                    distinguishingString: 'ε',
                    round: 0,
                    stateBefore: this.captureState()
                };
                
                this.marked.set(pair.key, { 
                    marked: true, 
                    reason, 
                    round: 0, 
                    string: 'ε', 
                    dependency: null 
                });
                
                yield step;
            }
        }

        // Iterative Rounds
        let changed = true;
        let round = 1;
        while (changed) {
            changed = false;
            for (const pair of this.pairs) {
                if (this.marked.get(pair.key).marked) continue;

                for (const symbol of this.dfa.alphabet) {
                    const nextP = this.dfa.getTransition(pair.p, symbol);
                    const nextQ = this.dfa.getTransition(pair.q, symbol);
                    
                    if (nextP === nextQ) continue;

                    const nextKey = this.getPairKey(nextP, nextQ);
                    const nextMarked = this.marked.get(nextKey);

                    if (nextMarked && nextMarked.marked && nextMarked.round < round) {
                        const dStr = symbol + (nextMarked.string === 'ε' ? '' : nextMarked.string);
                        const reason = `Logical Deduction:<br>` +
                                       `Transitions on <strong class="hl-sym">${symbol}</strong> lead to pair <span class="hl-dep">(${nextKey})</span>.<br>` +
                                       `Since <span class="hl-dep">${nextKey}</span> is already marked, ` +
                                       `<span class="hl-res">(${pair.key})</span> is distinguishable.<br>` +
                                       `String: <code class="hl-str">'${dStr}'</code>`;

                        const detailedReason = `Input: <strong class="hl-sym">${symbol}</strong><hr>` +
                                               `δ(<span class="hl-p">${pair.p}</span>, ${symbol}) → <span class="hl-p-next">${nextP}</span><br>` +
                                               `δ(<span class="hl-q">${pair.q}</span>, ${symbol}) → <span class="hl-q-next">${nextQ}</span><hr>` +
                                               `Since (<span class="hl-dep">${nextKey}</span>) is marked,<br>` +
                                               `<span class="hl-res">(${pair.key}) is Distinguishable</span><br>` +
                                               `String: <code class="hl-str">'${dStr}'</code>`;
                        
                        const step = {
                            type: 'MARK_ITERATIVE',
                            pair,
                            symbol,
                            nextPair: { p: nextP, q: nextQ, key: nextKey },
                            reason,
                            detailedReason,
                            round,
                            distinguishingString: dStr,
                            stateBefore: this.captureState()
                        };

                        this.marked.set(pair.key, { 
                            marked: true, 
                            reason, 
                            round, 
                            string: dStr, 
                            dependency: nextKey 
                        });
                        
                        changed = true;
                        yield step;
                        break; 
                    }
                }
            }
            if (changed) round++;
        }

        this.isComplete = true;
        yield { type: 'COMPLETE', stateBefore: this.captureState() };
    }

    getEquivalenceClasses() {
        const states = this.dfa.states;
        const parent = {};
        states.forEach(s => parent[s] = s);

        const find = (i) => (parent[i] === i ? i : (parent[i] = find(parent[i])));
        const union = (i, j) => {
            const rI = find(i);
            const rJ = find(j);
            if (rI !== rJ) parent[rI] = rJ;
        };

        this.pairs.forEach(pair => {
            if (!this.marked.get(pair.key).marked) union(pair.p, pair.q);
        });

        const groups = {};
        states.forEach(s => {
            const root = find(s);
            if (!groups[root]) groups[root] = [];
            groups[root].push(s);
        });

        return Object.values(groups).map(g => g.sort());
    }
}

const UI = {
    elements: {
        statesInput: document.getElementById('states-input'),
        alphabetInput: document.getElementById('alphabet-input'),
        startState: document.getElementById('start-state'),
        finalStatesContainer: document.getElementById('final-states-container'),
        transitionHeader: document.getElementById('transition-header'),
        transitionBody: document.getElementById('transition-body'),
        startBtn: document.getElementById('start-btn'),
        
        simulatorSection: document.getElementById('simulator-section'),
        tableContainer: document.getElementById('triangular-table-container'),
        nextStepBtn: document.getElementById('next-step'),
        prevStepBtn: document.getElementById('prev-step'),
        autoPlayBtn: document.getElementById('auto-play'),
        resetBtn: document.getElementById('reset-sim'),
        speedSlider: document.getElementById('speed-slider'),
        
        focusPair: document.getElementById('focus-pair'),
        focusSymbol: document.getElementById('focus-symbol'),
        focusResult: document.getElementById('focus-result'),
        
        transPNext: document.querySelector('.p-next-blob'),
        transQNext: document.querySelector('.q-next-blob'),
        transPSrc: document.querySelector('.p-blob'),
        transQSrc: document.querySelector('.q-blob'),
        transSym: document.getElementById('trans-sym'),
        transSymQ: document.getElementById('trans-sym-q'),
        
        explanationText: document.getElementById('explanation-text'),
        iterationCount: document.getElementById('iteration-count'),
        markedCount: document.getElementById('marked-count'),
        totalPairs: document.getElementById('total-pairs'),
        
        resultSection: document.getElementById('result-section'),
        eqClassesDisplay: document.getElementById('eq-classes-display'),
        minimizedTableContainer: document.getElementById('minimized-table-container'),
        scrollTopBtn: document.getElementById('scroll-top')
    },

    state: {
        dfa: null,
        simulator: null,
        steps: [],
        currentStepIndex: -1,
        isPlaying: false,
        playTimeout: null
    },

    init() {
        const inputSection = document.getElementById('input-section');
        inputSection.addEventListener('input', () => this.elements.startBtn.disabled = false);
        inputSection.addEventListener('change', () => this.elements.startBtn.disabled = false);

        this.elements.statesInput.addEventListener('input', () => this.updateTransitionTable());
        this.elements.alphabetInput.addEventListener('input', () => this.updateTransitionTable());
        this.elements.startBtn.addEventListener('click', () => this.startSimulation());
        
        this.elements.nextStepBtn.addEventListener('click', () => this.nextStep());
        this.elements.prevStepBtn.addEventListener('click', () => this.prevStep());
        this.elements.autoPlayBtn.addEventListener('click', () => this.toggleAutoPlay());
        this.elements.resetBtn.addEventListener('click', () => this.resetSimulation());
        this.elements.scrollTopBtn.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
        
        this.updateTransitionTable();
    },

    updateTransitionTable() {
        const states = this.elements.statesInput.value.split(',').map(s => s.trim()).filter(s => s);
        const alphabet = this.elements.alphabetInput.value.split(',').map(s => s.trim()).filter(s => s);
        if (states.length === 0 || alphabet.length === 0) return;

        this.elements.startState.innerHTML = states.map(s => `<option value="${s}">${s}</option>`).join('');
        this.elements.finalStatesContainer.innerHTML = states.map(s => `
            <label class="checkbox-item"><input type="checkbox" name="final-state" value="${s}"> ${s}</label>
        `).join('');

        this.elements.transitionHeader.innerHTML = `<th>State</th>` + alphabet.map(a => `<th>${a}</th>`).join('');
        this.elements.transitionBody.innerHTML = states.map(s => `
            <tr>
                <td><strong>${s}</strong></td>
                ${alphabet.map(a => `<td><select class="transition-select" data-state="${s}" data-symbol="${a}">${states.map(ns => `<option value="${ns}">${ns}</option>`).join('')}</select></td>`).join('')}
            </tr>
        `).join('');
    },

    startSimulation() {
        const states = this.elements.statesInput.value.split(',').map(s => s.trim()).filter(s => s);
        const alphabet = this.elements.alphabetInput.value.split(',').map(s => s.trim()).filter(s => s);
        if (states.length < 2 || alphabet.length === 0) return alert("Invalid DFA configuration.");

        const transitions = {};
        document.querySelectorAll('.transition-select').forEach(sel => {
            if (!transitions[sel.dataset.state]) transitions[sel.dataset.state] = {};
            transitions[sel.dataset.state][sel.dataset.symbol] = sel.value;
        });

        this.state.dfa = new DFA(states, alphabet, transitions, this.elements.startState.value, 
            Array.from(document.querySelectorAll('input[name="final-state"]:checked')).map(cb => cb.value));
        
        this.state.simulator = new MinimizationSimulator(this.state.dfa);
        this.state.steps = Array.from(this.state.simulator.generateSteps());
        this.state.currentStepIndex = -1;
        
        this.elements.simulatorSection.classList.remove('hidden');
        this.elements.resultSection.classList.add('hidden');
        this.elements.startBtn.disabled = true;
        this.elements.totalPairs.textContent = this.state.simulator.pairs.length;
        
        this.renderTriangularTable();
        this.updateSimulationUI();
        this.elements.simulatorSection.scrollIntoView({ behavior: 'smooth' });
    },


    renderTriangularTable() {
        const states = this.state.dfa.states;
        let html = '<table class="tri-table">';
        for (let i = 1; i < states.length; i++) {
            html += `<tr><td class="tri-label-row">${states[i]}</td>`;
            for (let j = 0; j < i; j++) {
                const key = this.state.simulator.getPairKey(states[i], states[j]);
                html += `<td id="cell-${key}" class="tri-cell" data-key="${key}"></td>`;
            }
            html += '</tr>';
        }
        html += '<tr><td></td>' + states.slice(0, -1).map(s => `<td class="tri-label-col">${s}</td>`).join('') + '</tr></table>';
        this.elements.tableContainer.innerHTML = html;
        
        document.querySelectorAll('.tri-cell').forEach(cell => {
            cell.addEventListener('mouseenter', () => this.showTooltip(cell));
            cell.addEventListener('mouseleave', () => this.hideTooltip());
        });
    },

    nextStep() {
        if (this.state.currentStepIndex >= this.state.steps.length - 1) return;
        this.state.currentStepIndex++;
        this.updateSimulationUI();
    },

    prevStep() {
        if (this.state.currentStepIndex < 0) return;
        this.state.currentStepIndex--;
        this.updateSimulationUI();
    },

    updateSimulationUI() {
        const curStep = this.state.steps[this.state.currentStepIndex];
        const prevStep = this.state.currentStepIndex >= 0 ? this.state.steps[this.state.currentStepIndex] : null;
        
        // Restore state from simulator logic 
        const stateToApply = prevStep ? this.state.simulator.captureState() : null; 
       
        
        // Reset all visuals
        document.querySelectorAll('.tri-cell').forEach(c => {
            c.classList.remove('marked', 'marked-final', 'current-focus', 'dependency-focus', 'marked-animate');
            c.textContent = '';
        });

        // Re-apply marks up to current index
        let markedCount = 0;
        let lastRound = 0;
        for (let i = 0; i <= this.state.currentStepIndex; i++) {
            const step = this.state.steps[i];
            if (step.type === 'COMPLETE') continue;
            const cell = document.getElementById(`cell-${step.pair.key}`);
            cell.classList.add('marked');
            if (step.round === 0) cell.classList.add('marked-final');
            cell.textContent = step.round === 0 ? '❌' : '✘';
            markedCount++;
            lastRound = step.round;
        }

        // Highlight Current Step
        if (curStep && curStep.type !== 'COMPLETE') {
            const cell = document.getElementById(`cell-${curStep.pair.key}`);
            cell.classList.add('current-focus');
            cell.classList.add('marked-animate');
            
            this.elements.focusPair.textContent = curStep.pair.key;
            this.elements.focusSymbol.textContent = curStep.symbol || 'ε';
            this.elements.focusResult.textContent = 'MARKED';
            this.elements.explanationText.innerHTML = curStep.reason;
            
            // Transition Detail
            this.elements.transPSrc.textContent = curStep.pair.p;
            this.elements.transQSrc.textContent = curStep.pair.q;
            this.elements.transSym.textContent = curStep.symbol || 'ε';
            this.elements.transSymQ.textContent = curStep.symbol || 'ε';
            
            if (curStep.nextPair) {
                this.elements.transPNext.textContent = curStep.nextPair.p;
                this.elements.transQNext.textContent = curStep.nextPair.q;
                const depCell = document.getElementById(`cell-${curStep.nextPair.key}`);
                if (depCell) depCell.classList.add('dependency-focus');
            } else {
                this.elements.transPNext.textContent = '-';
                this.elements.transQNext.textContent = '-';
            }
        } else if (curStep && curStep.type === 'COMPLETE') {
            this.handleCompletion();
        } else {
            this.elements.explanationText.textContent = "Initial state. Click 'Next' to start.";
            this.elements.focusPair.textContent = '-';
            this.elements.focusSymbol.textContent = '-';
            this.elements.focusResult.textContent = '-';
            
            this.elements.transPSrc.textContent = '-';
            this.elements.transQSrc.textContent = '-';
            this.elements.transSym.textContent = '-';
            this.elements.transSymQ.textContent = '-';
            this.elements.transPNext.textContent = '-';
            this.elements.transQNext.textContent = '-';
        }

        this.elements.markedCount.textContent = markedCount;
        this.elements.iterationCount.textContent = lastRound;
        this.elements.prevStepBtn.disabled = this.state.currentStepIndex < 0;
        this.elements.nextStepBtn.disabled = this.state.currentStepIndex >= this.state.steps.length - 1;
    },

    toggleAutoPlay() {
        this.state.isPlaying = !this.state.isPlaying;
        this.elements.autoPlayBtn.textContent = this.state.isPlaying ? '⏸ Pause' : '▶ Auto Play';
        if (this.state.isPlaying) this.autoLoop();
        else clearTimeout(this.state.playTimeout);
    },

    autoLoop() {
        if (!this.state.isPlaying) return;
        if (this.state.currentStepIndex >= this.state.steps.length - 1) return this.toggleAutoPlay();
        this.nextStep();
        const speed = 2100 - parseInt(this.elements.speedSlider.value); // Faster = High value, low delay
        this.state.playTimeout = setTimeout(() => this.autoLoop(), speed);
    },

    resetSimulation() {
        clearTimeout(this.state.playTimeout);
        this.state.isPlaying = false;
        this.elements.autoPlayBtn.textContent = '▶ Auto Play';
        
        this.state.currentStepIndex = -1;
        this.updateSimulationUI();
        
        this.elements.resultSection.classList.add('hidden');
        this.elements.simulatorSection.scrollIntoView({ behavior: 'smooth' });
    },

    handleCompletion() {
        this.elements.resultSection.classList.remove('hidden');
        const eq = this.state.simulator.getEquivalenceClasses();
        const { minimizedDFA, mapping } = this.generateMinDFA(eq);
        
        // Render Conversion Table
        const mappingContainer = document.getElementById('state-conversion-container');
        if (mappingContainer) {
            mappingContainer.innerHTML = `<table class="mapping-table">
                <thead><tr><th>New State</th><th>Original States</th></tr></thead>
                <tbody>${mapping.map(m => {
                    const isStart = m.new === minimizedDFA.startState;
                    return `<tr><td><span class="mapping-new ${isStart ? 'start-state-hl' : ''}">${isStart ? '➜ ' : ''}${m.new}</span></td><td><span class="mapping-old">${m.old}</span></td></tr>`;
                }).join('')}</tbody>
            </table>`;
        }
        
        this.renderGraph('minimized-graph', minimizedDFA);
        this.renderMinTable(minimizedDFA);
        setTimeout(() => this.elements.resultSection.scrollIntoView({ behavior: 'smooth' }), 500);
    },

    generateMinDFA(eq) {
        const charMap = {};
        const mapping = [];
        const names = eq.map((g, index) => {
            const letter = `s${index}`; 
            g.forEach(s => charMap[s] = letter);
            mapping.push({ new: letter, old: `{${g.join(', ')}}` });
            return letter;
        });

        const trans = {};
        names.forEach((letter, i) => {
            trans[letter] = {};
            this.state.dfa.alphabet.forEach(a => {
                const nextOrig = this.state.dfa.getTransition(eq[i][0], a);
                trans[letter][a] = charMap[nextOrig];
            });
        });

        const startState = charMap[this.state.dfa.startState];
        const finalStates = eq
            .filter(g => this.state.dfa.isFinal(g[0]))
            .map(g => charMap[g[0]]);

        return { 
            minimizedDFA: new DFA(names, this.state.dfa.alphabet, trans, startState, finalStates),
            mapping: mapping
        };
    },

    renderGraph(id, dfa) {
        const container = document.getElementById(id);
        if (container) container.innerHTML = ''; // Force clear

        const els = dfa.states.map(s => ({ 
            data: { 
                id: s, 
                label: s, 
                final: dfa.isFinal(s) ? 'yes' : 'no',
                start: s === dfa.startState ? 'yes' : 'no'
            } 
        }));

        // Robust consolidation
        const edgeData = {};
        dfa.states.forEach(s => {
            dfa.alphabet.forEach(a => {
                const target = dfa.getTransition(s, a);
                const key = `${s}_to_${target}`;
                if (!edgeData[key]) edgeData[key] = { source: s, target: target, symbols: [] };
                if (!edgeData[key].symbols.includes(a)) edgeData[key].symbols.push(a);
            });
        });

        const stateRank = {};
        dfa.states.forEach((s, idx) => stateRank[s] = idx);

        console.log("--- GRAPH RENDER DEBUG ---");
        Object.values(edgeData).forEach(edge => {
            const edgeId = `e-${edge.source}-${edge.target}`;
            console.log(`Mapping Transition Edge: [${edge.source}] --(${edge.symbols.join(', ')})--> [${edge.target}] | ID: ${edgeId}`);
            
            let classes = edge.source === edge.target ? 'loop-edge' : 'straight-edge';

            els.push({ 
                data: { 
                    id: edgeId, 
                    source: edge.source, 
                    target: edge.target, 
                    label: edge.symbols.join(', ')
                },
                classes: classes
            });
        });
        console.log("--------------------------");
        
        cytoscape({
            container: container,
            elements: els,
            style: [
                { 
                  selector: 'node', 
                  style: { 
                    'label': 'data(label)', 
                    'background-color': '#fff', 
                    'border-color': '#4f46e5', 
                    'border-width': 2, 
                    'text-valign': 'center', 
                    'color': '#1e293b',
                    'font-size': '14px',
                    'font-weight': 'bold',
                    'width': 45,
                    'height': 45,
                    'box-shadow': '0 4px 6px -1px rgb(0 0 0 / 0.1)'
                  } 
                },
                { 
                    selector: 'node[start="yes"]', 
                    style: { 
                      'background-color': '#fffbeb',
                      'border-color': '#f59e0b',
                      'border-width': 4
                    } 
                },
                { 
                  selector: 'node[final="yes"]', 
                  style: { 
                    'border-color': '#10b981', 
                    'border-width': 5,
                    'border-style': 'double' 
                  } 
                },
                { 
                  selector: 'edge', 
                  style: { 
                    'label': 'data(label)', 
                    'width': 2, 
                    'line-color': '#94a3b8', 
                    'target-arrow-shape': 'triangle', 
                    'target-arrow-color': '#94a3b8',
                    'font-size': '11px',
                    'font-weight': 'bold',
                    'text-background-color': '#ffffff',
                    'text-background-opacity': 1,
                    'text-background-padding': '3px',
                    'edge-text-rotation': 'autorotate'
                  } 
                },
                {
                  selector: 'edge.straight-edge',
                  style: {
                    'curve-style': 'bezier',
                    'control-point-step-size': 40
                  }
                },
                {
                  selector: 'edge.loop-edge',
                  style: {
                    'curve-style': 'bezier',
                    'loop-direction': '-45deg',
                    'loop-sweep': '90deg'
                  }
                }
            ],
            layout: { 
                name: 'dagre',
                rankDir: 'LR',
                align: 'UL',
                nodeSep: 60,
                edgeSep: 40,
                rankSep: 100,
                padding: 30,
                animate: true
            }
        });
    },

    renderMinTable(dfa) {
        this.elements.minimizedTableContainer.innerHTML = `<table class="min-table"><thead><tr><th>Group</th>${dfa.alphabet.map(a => `<th>${a}</th>`).join('')}</tr></thead><tbody>` + 
            dfa.states.map(s => {
                const isStart = s === dfa.startState;
                return `<tr><td>${isStart ? '➜ ' : ''}${s}${dfa.isFinal(s) ? '*' : ''}</td>${dfa.alphabet.map(a => `<td>${dfa.getTransition(s, a)}</td>`).join('')}</tr>`;
            }).join('') + `</tbody></table>`;
    },

    showTooltip(cell) {
        const key = cell.dataset.key;
        // Search in history for the specific step that marked this
        const step = this.state.steps.find(s => s.pair && s.pair.key === key && this.state.steps.indexOf(s) <= this.state.currentStepIndex);
        if (step) {
            const tip = document.createElement('div');
            tip.id = 'dynamic-tooltip';
            tip.innerHTML = `<strong>${key}</strong><hr>${step.detailedReason || step.reason}`;
            document.body.appendChild(tip);
            const rect = cell.getBoundingClientRect();
            tip.style.left = `${rect.left + window.scrollX + 60}px`;
            tip.style.top = `${rect.top + window.scrollY}px`;
        }
    },

    hideTooltip() {
        const t = document.getElementById('dynamic-tooltip');
        if (t) t.remove();
    }
};

// Tooltip Styles
const s = document.createElement('style');
s.textContent = `
    #dynamic-tooltip { position: absolute; background: white; border: 1px solid #e2e8f0; padding: 10px; border-radius: 8px; box-shadow: var(--shadow-lg); z-index: 1000; font-size: 0.8rem; pointer-events: none; max-width: 250px; border-left: 4px solid var(--primary); }
    .hl-p { color: var(--primary); font-weight: bold; }
    .hl-q { color: var(--accent); font-weight: bold; }
    .hl-res { color: var(--danger); font-weight: 800; display: block; margin-top: 5px; }
    .hl-sym { color: var(--warning); }
    .hl-p-next, .hl-q-next { font-style: italic; text-decoration: underline; }
    .hl-dep { color: #f97316; font-weight: bold; }
    .hl-str { color: #8b5cf6; background: #f5f3ff; padding: 2px 4px; border-radius: 4px; border: 1px solid #ddd6fe; }
    .eq-class-tag { display: inline-block; background: #f0fdf4; color: #166534; padding: 4px 12px; border-radius: 20px; border: 1px solid #bbf7d0; margin: 4px; font-weight: 600; }
    .min-table { width: 100%; border-collapse: collapse; margin-top: 10px; }
    .min-table th, .min-table td { border: 1px solid var(--border); padding: 8px; text-align: left; }
    .min-table th { background: #f8fafc; font-size: 0.8rem; }
`;
document.head.appendChild(s);

UI.init();
