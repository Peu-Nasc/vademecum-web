// Abre e fecha o menu no telemóvel
window.toggleMenuMobile = function() {
    document.getElementById('sidebarMenu').classList.toggle('aberta');
    document.getElementById('menuOverlay').classList.toggle('ativa');
};

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
// IMPORT CORRIGIDO COM O getDoc INCLUÍDO:
import { getFirestore, collection, addDoc, getDocs, getDoc, deleteDoc, doc, query, where, orderBy } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "AIzaSyA42NDFJyf6dVGjKNVQGIypxQw-PMhc1ec",
    authDomain: "vade-mecum-digital-bc76b.firebaseapp.com",
    projectId: "vade-mecum-digital-bc76b",
    storageBucket: "vade-mecum-digital-bc76b.firebasestorage.app",
    messagingSenderId: "898854887053",
    appId: "1:898854887053:web:c424cf7dba13ade3bf8cc4"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

let modoLogin = true;
let usuarioLogado = null;
let pesquisaAtual = { lei: '', termo: '', leiSeca: '', explicacaoIA: '', banca: '' };

onAuthStateChanged(auth, (user) => {
    if (user) {
        usuarioLogado = user;
        document.getElementById('telaAuth').style.display = 'none';
        document.getElementById('telaApp').style.display = 'flex';
        window.renderizarCaderno();
    
        if (!localStorage.getItem('boogApresentado')) {
            setTimeout(() => {
                document.getElementById('boogWelcomeModal').style.display = 'flex';
                localStorage.setItem('boogApresentado', 'true'); 
            }, 500); 
        }
    } else {
        usuarioLogado = null;
        document.getElementById('telaApp').style.display = 'none';
        document.getElementById('telaAuth').style.display = 'flex';
    }
});

// === ANIMAÇÃO DO BOOG NA SENHA ===
const senhaInputBox = document.getElementById('senhaInput');
const boogLoginImg = document.getElementById('boogLoginImg');

senhaInputBox.addEventListener('focus', () => {
    boogLoginImg.src = 'boogtapandoosolhos.jpg'; 
    boogLoginImg.classList.add('animating');
    setTimeout(() => boogLoginImg.classList.remove('animating'), 150);
});

senhaInputBox.addEventListener('blur', () => {
    boogLoginImg.src = 'DandoOla.jpg'; 
    boogLoginImg.classList.add('animating');
    setTimeout(() => boogLoginImg.classList.remove('animating'), 150);
});

window.alternarModoAuth = function() {
    modoLogin = !modoLogin;
    const titulo = document.getElementById('authTitulo');
    const subtitulo = document.getElementById('authSubtitulo');
    const botao = document.getElementById('authBotao');
    const trocaTexto = document.getElementById('authTrocaTexto');
    
    const nomeInput = document.getElementById('nomeInput');
    const senhaInput = document.getElementById('senhaInput');

    if (modoLogin) {
        titulo.innerText = "Bem-vindo(a)";
        subtitulo.innerText = "Acesse seu ambiente de estudos.";
        botao.innerText = "Entrar";
        trocaTexto.innerHTML = 'Não tem uma conta? <span onclick="alternarModoAuth()">Solicitar acesso</span>';
        
        nomeInput.style.display = 'none';
        senhaInput.style.display = 'block'; 
    } else {
        titulo.innerText = "Assinar o Vade Mecum";
        subtitulo.innerText = "Preencha para solicitar seu acesso exclusivo.";
        botao.innerText = "Enviar para WhatsApp";
        trocaTexto.innerHTML = 'Já tem uma conta? <span onclick="alternarModoAuth()">Faça Login</span>';
        
        nomeInput.style.display = 'block'; 
        senhaInput.style.display = 'none'; 
    }
};

window.processarAuth = async function() {
    const email = document.getElementById('emailInput').value;
    const senha = document.getElementById('senhaInput').value;
    const nome = document.getElementById('nomeInput').value;

    if (modoLogin) {
        if(!email || !senha) return alert("Preencha e-mail e senha para entrar.");
        try {
            await signInWithEmailAndPassword(auth, email, senha);
        } catch (error) { 
            alert("Acesso negado. Verifique se o seu e-mail e senha estão corretos ou solicite acesso."); 
        }
    } else {
        if(!nome || !email) return alert("Por favor, preencha o seu nome e e-mail.");
        const seuNumeroWhatsApp = "5575981701297"; 
        const mensagem = `Olá, Pedro! Tenho interesse em assinar o Vade Mecum Digital.%0A%0A*Meus dados:*%0A- Nome: ${nome}%0A- E-mail: ${email}%0A%0AComo funciona o pagamento e a liberação do acesso?`;
        const linkWhatsapp = `https://wa.me/${seuNumeroWhatsApp}?text=${mensagem}`;
        window.open(linkWhatsapp, '_blank');
        alternarModoAuth();
    }
};

window.fazerLogout = function() { signOut(auth); };

window.realizarPesquisa = async function() {
    const searchInput = document.getElementById('searchInput').value;
    const lawSelect = document.getElementById('lawSelect');
    const nomeLei = lawSelect.options[lawSelect.selectedIndex].text;
    const siglaLei = lawSelect.value;
    
    // Captura a banca selecionada
    const bancaEscolhida = document.getElementById('selectBanca').value;
    
    const resultsArea = document.getElementById('resultsArea');
    const loading = document.getElementById('loading');
    const textoLoading = document.getElementById('textoLoading');
    
    if(!searchInput) return;

    resultsArea.style.display = 'none';
    loading.style.display = 'block';
    
    textoLoading.innerText = "Professor Boog está vasculhando a legislação...";
    setTimeout(() => { textoLoading.innerText = "Traduzindo o juridiquês..."; }, 3500);

    try {
        const resposta = await fetch('https://vademecum-api.onrender.com/api/buscar', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                termo: searchInput, 
                lei: siglaLei,
                banca: bancaEscolhida
            })
        });

        const dados = await resposta.json();

        if (dados.sucesso) {
            let tituloBusca = searchInput;
            if(dados.artigo_identificado) {
                tituloBusca = `${searchInput} (Art. ${dados.artigo_identificado})`;
            }

            const leiFinal = dados.nome_lei_corrigido || nomeLei;
            document.getElementById('tituloLeiOficial').innerText = leiFinal;
            
            if(dados.menu_correto) {
                document.getElementById('lawSelect').value = dados.menu_correto;
            }

            let leiFormatada = dados.lei_seca.replace(/[ \t]+/g, ' ').replace(/\n\s*\n/g, '\n\n').trim();
            document.getElementById('leiSeca').innerHTML = '<div style="white-space: pre-wrap; text-align: justify; line-height: 1.7; padding: 10px;">' + leiFormatada + '</div>';
            
            document.getElementById('explicacaoIA').innerHTML = marked.parse(dados.explicacao_ia);

            pesquisaAtual = { 
                lei: leiFinal, 
                termo: tituloBusca, 
                leiSeca: dados.lei_seca, 
                explicacaoIA: dados.explicacao_ia,
                banca: bancaEscolhida 
            };

            loading.style.display = 'none';
            resultsArea.style.display = 'grid';
        } else {
            alert("Aviso: " + dados.erro);
            loading.style.display = 'none';
        }
    } catch (erro) {
        console.error("Erro:", erro);
        alert("Erro ao comunicar com o servidor. Tente novamente.");
        loading.style.display = 'none';
    }
};

window.salvarNoCaderno = async function() {
    if (!usuarioLogado) return;
    try {
        await addDoc(collection(db, "cadernos"), {
            uid: usuarioLogado.uid, 
            lei: pesquisaAtual.lei, 
            termo: pesquisaAtual.termo,
            leiSeca: pesquisaAtual.leiSeca, 
            explicacaoIA: pesquisaAtual.explicacaoIA,
            banca: pesquisaAtual.banca,
            dataSalvamento: new Date()
        });
        alert('Salvo no Caderno Digital!');
        window.renderizarCaderno();
    } catch (e) { alert("Erro ao salvar."); }
};

window.navegarMenu = function(tela) {
    const sidebar = document.getElementById('sidebarMenu');
    if(sidebar && sidebar.classList.contains('aberta')) {
        window.toggleMenuMobile();
    }
    document.getElementById('sessaoBusca').style.display = tela === 'busca' ? 'block' : 'none';
    document.getElementById('sessaoCaderno').style.display = tela === 'caderno' ? 'block' : 'none';
    document.getElementById('menuBusca').classList.toggle('active', tela === 'busca');
    document.getElementById('menuCaderno').classList.toggle('active', tela === 'caderno');
    
    if(tela === 'caderno') {
        window.renderizarCaderno();
        if (!localStorage.getItem('boogTutorialCadernoVisto')) {
            setTimeout(() => {
                document.getElementById('boogTutorialCadernoModal').style.display = 'flex';
                localStorage.setItem('boogTutorialCadernoVisto', 'true');
            }, 200); 
        }
    }
    
    if(tela === 'busca' && !localStorage.getItem('boogTutorialBuscaVisto') && localStorage.getItem('boogApresentado')) {
        setTimeout(() => {
            document.getElementById('boogTutorialBuscaModal').style.display = 'flex';
            localStorage.setItem('boogTutorialBuscaVisto', 'true');
        }, 200);
    }
};

window.renderizarCaderno = async function() {
    if (!usuarioLogado) return;
    const listaCaderno = document.getElementById('listaCaderno');
    try {
        const q = query(collection(db, "cadernos"), where("uid", "==", usuarioLogado.uid));
        const querySnapshot = await getDocs(q);
        document.getElementById('contadorCaderno').innerText = querySnapshot.size;
        listaCaderno.innerHTML = ''; 
        if (querySnapshot.empty) return listaCaderno.innerHTML = '<p>Seu caderno está vazio.</p>';

        querySnapshot.forEach((docSnap) => {
            const item = docSnap.data();
            
            const tagBanca = item.banca ? `<span class="tag tag-ia" style="margin-left: 10px; font-size: 0.7rem;">${item.banca}</span>` : '';

            listaCaderno.innerHTML += `
                <div class="item-caderno" id="doc-${docSnap.id}">
                        <h3>
                            <span style="display: flex; align-items: center; flex-wrap: wrap; gap: 8px;">
                                ${item.lei} - ${item.termo} ${tagBanca}
                            </span>
                            <div style="display: flex; gap: 8px; margin-top: 10px;">
                                <button style="background: var(--brand-primary); color: white; border: none; padding: 8px 12px; border-radius: 8px; cursor: pointer; font-weight: 600; font-size: 0.9rem;" onclick="iniciarTreino('${docSnap.id}')">🧠 Treinar</button>
                                <button class="btn-excluir" onclick="removerDoCaderno('${docSnap.id}')">Excluir</button>
                            </div>
                        </h3>
                    <details style="margin: 15px 0; cursor: pointer; color: var(--brand-primary); font-weight: 600;">
                        <summary>Ler Lei Original</summary>
                        <div style="margin-top: 10px; padding: 15px; background: #f8fafc; border-radius: 8px; color: #475569; font-weight: 400;">${item.leiSeca.replace(/\n/g, '<br>')}</div>
                    </details>
                    <div style="border-top: 1px solid #e2e8f0; padding-top: 15px;">${marked.parse(item.explicacaoIA)}</div>
                </div>`;
        });
    } catch (e) { listaCaderno.innerHTML = '<p>Erro ao carregar caderno.</p>'; }
};

window.removerDoCaderno = async function(docId) {
    try {
        await deleteDoc(doc(db, "cadernos", docId));
        document.getElementById(`doc-${docId}`).remove();
        document.getElementById('contadorCaderno').innerText = parseInt(document.getElementById('contadorCaderno').innerText) - 1;
    } catch (e) { alert("Erro ao excluir."); }
};

window.fecharPopUp = function(modalId) {
    const modal = document.getElementById(modalId);
    modal.style.opacity = '0';
    setTimeout(() => { 
        modal.style.display = 'none'; 
        modal.style.opacity = '1'; 
    }, 300);
};

window.fecharBoogModal = function() {
    const modal = document.getElementById('boogWelcomeModal');
    modal.style.opacity = '0';
    setTimeout(() => { 
        modal.style.display = 'none'; 
        if (!localStorage.getItem('boogTutorialBuscaVisto')) {
            document.getElementById('boogTutorialBuscaModal').style.display = 'flex';
            localStorage.setItem('boogTutorialBuscaVisto', 'true');
        }
    }, 300); 
};

// ==================== LÓGICA DO TREINAMENTO BOOG ====================
let flashcardsAtuais = [];
let perguntaAtualIndex = 0;

window.iniciarTreino = async function(docId) {
    document.getElementById('boogTreinoModal').style.display = 'flex';
    document.getElementById('areaTreinoConteudo').style.display = 'none';
    document.getElementById('treinoStatus').innerText = "O Professor Boog está a preparar a sua prova... 🐶⌛";
    
    try {
        const docRef = doc(db, "cadernos", docId);
        const docSnap = await getDoc(docRef);
        const item = docSnap.data();

        const resposta = await fetch('https://vademecum-api.onrender.com/api/treino', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                termo: item.termo, 
                lei_seca: item.leiSeca,
                banca: item.banca || 'Concurso Público'
            })
        });

        const dados = await resposta.json();

        if(dados.sucesso && dados.flashcards.length > 0) {
            flashcardsAtuais = dados.flashcards;
            perguntaAtualIndex = 0;
            renderizarPergunta();
        } else {
            alert("Erro ao gerar o treino. O servidor pode estar ocupado.");
            fecharPopUp('boogTreinoModal');
        }
    } catch (e) {
        console.error(e);
        alert("Falha de conexão com a API.");
        fecharPopUp('boogTreinoModal');
    }
};

window.renderizarPergunta = function() {
    document.getElementById('areaTreinoConteudo').style.display = 'block';
    document.getElementById('feedbackTreino').style.display = 'none';
    document.getElementById('treinoStatus').innerText = `Pergunta ${perguntaAtualIndex + 1} de ${flashcardsAtuais.length}`;
    
    const card = flashcardsAtuais[perguntaAtualIndex];
    document.getElementById('perguntaTexto').innerText = card.pergunta;
    
    const opcoesContainer = document.getElementById('opcoesContainer');
    opcoesContainer.innerHTML = '';
    
    card.opcoes.forEach((opcao, index) => {
        const btn = document.createElement('button');
        btn.innerText = opcao;
        btn.style.cssText = "text-align: left; padding: 14px; border: 2px solid var(--border-light); border-radius: 10px; background: var(--surface-color); color: var(--text-main); font-weight: 500; font-size: 1rem; cursor: pointer; transition: 0.2s;";
        
        btn.onmouseover = () => { if(!btn.disabled) btn.style.borderColor = "var(--brand-primary)"; };
        btn.onmouseout = () => { if(!btn.disabled) btn.style.borderColor = "var(--border-light)"; };
        
        btn.onclick = () => verificarResposta(index, btn, card);
        opcoesContainer.appendChild(btn);
    });
};

window.verificarResposta = function(indexSelecionado, btnClicado, card) {
    const botoes = document.getElementById('opcoesContainer').children;
    for(let b of botoes) { b.disabled = true; b.style.opacity = '0.6'; b.style.cursor = 'default'; }
    
    const feedback = document.getElementById('feedbackTreino');
    const explicacaoTexto = document.getElementById('explicacaoBoogTexto');
    
    btnClicado.style.opacity = '1';
    feedback.style.display = 'block';

    if(indexSelecionado === card.correta) {
        btnClicado.style.borderColor = '#10b981';
        btnClicado.style.backgroundColor = '#ecfdf5';
        feedback.style.backgroundColor = '#ecfdf5';
        feedback.style.color = '#047857';
        explicacaoTexto.innerHTML = `<strong>✅ Au au! Acertou em cheio!</strong><br><br>${card.explicacao_boog}`;
    } else {
        btnClicado.style.borderColor = '#ef4444';
        btnClicado.style.backgroundColor = '#fef2f2';
        botoes[card.correta].style.opacity = '1';
        botoes[card.correta].style.borderColor = '#10b981';
        botoes[card.correta].style.backgroundColor = '#ecfdf5';
        
        feedback.style.backgroundColor = '#fef2f2';
        feedback.style.color = '#b91c1c';
        explicacaoTexto.innerHTML = `<strong>❌ Errado! Mas não desanime, veja a resposta:</strong><br><br>${card.explicacao_boog}`;
    }
    
    const btnProx = document.getElementById('btnProximaPergunta');
    if(perguntaAtualIndex === flashcardsAtuais.length - 1) {
        btnProx.innerText = "Finalizar Treino 🏆";
        btnProx.style.background = "#10b981"; 
    } else {
        btnProx.innerText = "Próxima Pergunta ➔";
        btnProx.style.background = "var(--brand-primary)";
    }
};

window.proximaPergunta = function() {
    if(perguntaAtualIndex < flashcardsAtuais.length - 1) {
        perguntaAtualIndex++;
        renderizarPergunta();
    } else {
        fecharPopUp('boogTreinoModal');
    }
};