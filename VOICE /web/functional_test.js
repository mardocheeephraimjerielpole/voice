// Script de test fonctionnel complet pour VoiceControl Pro
(function(){
    const logEl = () => document.getElementById('log');
    const summaryEl = () => document.getElementById('summaryContent');
    let testResults = [];

    function appendLog(s, type = 'info'){
        const pre = logEl();
        const time = new Date().toLocaleTimeString();
        const color = type === 'error' ? '#ff4757' : 
                     type === 'success' ? '#00ff88' : 
                     type === 'warning' ? '#ff9500' : '#00d4ff';
        
        pre.innerHTML += `<div style="margin:5px 0; color:${color}">[${time}] ${s}</div>`;
        pre.scrollTop = pre.scrollHeight;
    }

    function updateSummary(){
        const total = testResults.length;
        const passed = testResults.filter(r => r.status === 'success').length;
        const failed = testResults.filter(r => r.status === 'error').length;
        
        summaryEl().innerHTML = `
            <div style="display:grid; grid-template-columns:repeat(3,1fr); gap:20px; margin-top:10px;">
                <div style="text-align:center">
                    <div style="font-size:24px; color:#00d4ff">${total}</div>
                    <div style="font-size:12px; color:#a0a0c0">Tests totaux</div>
                </div>
                <div style="text-align:center">
                    <div style="font-size:24px; color:#00ff88">${passed}</div>
                    <div style="font-size:12px; color:#a0a0c0">Réussis</div>
                </div>
                <div style="text-align:center">
                    <div style="font-size:24px; color:#ff4757">${failed}</div>
                    <div style="font-size:12px; color:#a0a0c0">Échoués</div>
                </div>
            </div>
        `;
    }

    // Tests à exécuter
    const tests = [
        { 
            name: 'Présentation', 
            utterance: 'ok voice présente toi', 
            expect: 'introduce',
            description: 'L\'application se présente'
        },
        { 
            name: 'Ouvrir Zoom', 
            utterance: 'ok voice ouvre zoom', 
            expect: 'open-app',
            description: 'Ouvre l\'application Zoom'
        },
        { 
            name: 'Organiser réunion', 
            utterance: 'ok voice organise une réunion demain à 10h', 
            expect: 'schedule-meeting',
            description: 'Organise une réunion dans le calendrier'
        },
        { 
            name: 'Ouvrir Mail', 
            utterance: 'ok voice ouvre mon mail', 
            expect: 'open-mail',
            description: 'Ouvre la boîte mail'
        },
        { 
            name: 'Prise contrôle', 
            utterance: 'ok voice prends le contrôle', 
            expect: 'take-control',
            description: 'Active le contrôle complet'
        },
        { 
            name: 'Capture écran', 
            utterance: 'ok voice screenshot', 
            expect: 'screenshot',
            description: 'Prend une capture d\'écran'
        },
        { 
            name: 'Navigation retour', 
            utterance: 'ok voice retour', 
            expect: 'back',
            description: 'Navigation retour'
        },
        { 
            name: 'Navigation accueil', 
            utterance: 'ok voice accueil', 
            expect: 'home',
            description: 'Retour à l\'accueil'
        },
        { 
            name: 'Volume plus', 
            utterance: 'ok voice volume plus', 
            expect: 'volume-up',
            description: 'Augmente le volume'
        },
        { 
            name: 'Statut micro', 
            utterance: 'ok voice micro status', 
            expect: 'mic-status',
            description: 'Vérifie le statut du micro'
        },
        { 
            name: 'Test fonctionnalités', 
            utterance: 'ok voice test fonctionnalités', 
            expect: 'test-features',
            description: 'Lance le test complet des fonctionnalités'
        }
    ];

    // Exécuter un test spécifique
    async function runTest(testIndex) {
        const t = tests[testIndex];
        const testCard = document.querySelector(`[data-test="${t.expect}"]`) || 
                        document.querySelectorAll('.test-card')[testIndex];
        
        if (testCard) {
            testCard.classList.remove('success', 'error');
        }
        
        appendLog(`🔍 Test ${testIndex+1}: ${t.name}`, 'info');
        appendLog(`   Commande: "${t.utterance}"`, 'info');
        appendLog(`   Attendu: ${t.expect}`, 'info');
        
        try {
            // Simuler la commande
            VoiceControlApp.processVoiceCommand(t.utterance, 0.96);
            
            // Vérifier si la commande a été reconnue
            const cleaned = t.utterance.toLowerCase()
                .replace(VoiceControlApp.state.hotword, '')
                .trim();
            
            const matched = VoiceControlApp.findMatchingCommand(cleaned);
            
            if (matched && matched.action === t.expect) {
                appendLog(`   ✅ SUCCÈS: Commande reconnue (${matched.action})`, 'success');
                
                testResults.push({
                    name: t.name,
                    status: 'success',
                    command: t.utterance,
                    action: matched.action
                });
                
                if (testCard) {
                    testCard.classList.add('success');
                }
            } else {
                appendLog(`   ❌ ÉCHEC: Commande non reconnue ou incorrecte`, 'error');
                appendLog(`      Reçu: ${matched ? matched.action : 'aucun'}`, 'error');
                
                testResults.push({
                    name: t.name,
                    status: 'error',
                    command: t.utterance,
                    expected: t.expect,
                    received: matched ? matched.action : 'aucun'
                });
                
                if (testCard) {
                    testCard.classList.add('error');
                }
            }
            
        } catch (error) {
            appendLog(`   💥 ERREUR: ${error.message}`, 'error');
            
            testResults.push({
                name: t.name,
                status: 'error',
                command: t.utterance,
                error: error.message
            });
            
            if (testCard) {
                testCard.classList.add('error');
            }
        }
        
        updateSummary();
        
        // Pause entre les tests
        return new Promise(resolve => setTimeout(resolve, 2000));
    }

    // Exécuter tous les tests
    async function runAllTests() {
        if (!window.VoiceControlApp) {
            appendLog('❌ VoiceControlApp non chargé. Assurez-vous que script.js est présent.', 'error');
            return;
        }
        
        appendLog('🚀 Démarrage des tests VoiceControl Pro...', 'info');
        appendLog('📋 ' + tests.length + ' tests à exécuter', 'info');
        
        testResults = [];
        
        // Activer le mode test
        VoiceControlApp.state.settings.voiceFeedback = false;
        VoiceControlApp.state.settings.soundEffects = false;
        
        for (let i = 0; i < tests.length; i++) {
            await runTest(i);
        }
        
        appendLog('✅ Tous les tests sont terminés', 'success');
        
        // Restaurer les paramètres
        VoiceControlApp.state.settings.voiceFeedback = true;
        VoiceControlApp.state.settings.soundEffects = true;
        
        // Afficher le rapport final
        const successCount = testResults.filter(r => r.status === 'success').length;
        const successRate = Math.round((successCount / tests.length) * 100);
        
        appendLog(`📊 RAPPORT FINAL: ${successCount}/${tests.length} tests réussis (${successRate}%)`, 
                  successRate > 70 ? 'success' : 'warning');
    }

    // Exécuter un test spécifique depuis le grid
    function runSpecificTest(testType) {
        const testMap = {
            'introduce': 0,
            'zoom': 1,
            'meeting': 2,
            'mail': 3,
            'control': 4,
            'screenshot': 5,
            'navigation': 6,
            'full': function() { runAllTests(); }
        };
        
        if (testType === 'full') {
            testMap.full();
        } else if (testMap[testType] !== undefined) {
            runTest(testMap[testType]);
        }
    }

    // Test de contrôle avancé
    async function runControlTest() {
        appendLog('🎮 Test de contrôle avancé...', 'info');
        
        // Activer le contrôle complet
        VoiceControlApp.activateFullControl();
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        // Tester les fonctionnalités avancées
        const advancedTests = [
            { action: 'enableMouseControl', name: 'Contrôle souris' },
            { action: 'showVirtualKeyboard', name: 'Clavier virtuel' },
            { action: 'showTaskManager', name: 'Gestionnaire tâches' }
        ];
        
        for (const test of advancedTests) {
            appendLog(`   Testing: ${test.name}...`, 'info');
            VoiceControlApp[test.action]();
            await new Promise(resolve => setTimeout(resolve, 2000));
        }
        
        appendLog('✅ Test contrôle avancé terminé', 'success');
    }

    // Bind UI
    document.addEventListener('DOMContentLoaded', () => {
        document.getElementById('runAllBtn').addEventListener('click', runAllTests);
        
        document.getElementById('clearBtn').addEventListener('click', () => {
            document.getElementById('log').innerHTML = 'Prêt pour exécution des tests...';
            document.getElementById('summaryContent').innerHTML = 'Prêt pour les tests...';
            testResults = [];
            
            // Réinitialiser les cartes de test
            document.querySelectorAll('.test-card').forEach(card => {
                card.classList.remove('success', 'error');
            });
        });
        
        document.getElementById('testControlBtn').addEventListener('click', runControlTest);
        
        // Tests individuels depuis les cartes
        document.querySelectorAll('.test-card').forEach(card => {
            card.addEventListener('click', () => {
                const testType = card.dataset.test;
                runSpecificTest(testType);
            });
        });

        // Auto-run tests when URL contains ?run
        try {
            if (window.location && window.location.search && window.location.search.indexOf('run') !== -1) {
                setTimeout(() => {
                    document.getElementById('runAllBtn').click();
                }, 1000);
            }
        } catch (e) {
            // ignore
        }
    });
})();