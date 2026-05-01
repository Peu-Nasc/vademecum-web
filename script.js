// Abre e fecha o menu no telemóvel
window.toggleMenuMobile = function() {
    document.getElementById('sidebarMenu').classList.toggle('aberta');
    document.getElementById('menuOverlay').classList.toggle('ativa');
};

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { getFirestore, collection, addDoc, getDocs, deleteDoc, doc, query, where, orderBy } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

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
                // Grava na memória para não mostrar de novo
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
    
    // NOVO: Captura a banca selecionada
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
                banca: bancaEscolhida // Enviando o foco pro Python
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

            // NOVO: Adiciona a banca na pesquisaAtual para ir para o Caderno
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
            banca: pesquisaAtual.banca, // Salvando o foco da banca
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
            
            // Adiciona a "Tag da Banca" se ela existir no Firebase
            const tagBanca = item.banca ? `<span class="tag tag-ia" style="margin-left: 10px; font-size: 0.7rem;">${item.banca}</span>` : '';

            listaCaderno.innerHTML += `
                <div class="item-caderno" id="doc-${docSnap.id}">
                    <h3>
                        <span>${item.lei} - ${item.termo} ${tagBanca}</span>
                        <button class="btn-excluir" onclick="removerDoCaderno('${docSnap.id}')">Excluir</button>
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