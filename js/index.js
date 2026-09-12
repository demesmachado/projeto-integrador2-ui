/* index.js — lógica da página de entrada (termos de uso + login) */
(function () {
  'use strict';

  let papelSelecionado = 'paciente';

  const ROTULOS = {
    paciente: { titulo: 'Entrar como paciente', descricao: 'Use o e-mail e a senha cadastrados pelo seu profissional ou administrador.' },
    profissional: { titulo: 'Entrar como profissional', descricao: 'Use o e-mail e a senha fornecidos pela administração da sua organização.' },
    admin: { titulo: 'Entrar como administrador', descricao: 'Use o e-mail e a senha definidos pelo Super Administrador.' },
    superadmin: { titulo: 'Entrar como Super Admin', descricao: 'Acesso ao controle geral do sistema Saúde Digital.' }
  };

  function configurarTermos() {
    const modal = document.getElementById('modal-termos');
    const jaViu = window.localStorage.getItem(window.DB.CHAVES.termosVistos);
    if (!jaViu) App.abrirModal('modal-termos');

    function marcarComoVisto() {
      window.localStorage.setItem(window.DB.CHAVES.termosVistos, 'true');
      App.fecharModal('modal-termos');
    }

    document.getElementById('aceitar-termos').addEventListener('click', marcarComoVisto);
    document.getElementById('fechar-termos').addEventListener('click', marcarComoVisto);
    document.getElementById('link-termos').addEventListener('click', function () {
      App.abrirModal('modal-termos');
    });
    modal.addEventListener('cancel', function () {
      window.localStorage.setItem(window.DB.CHAVES.termosVistos, 'true');
    });
  }

  function configurarAbas() {
    const abas = document.querySelectorAll('.aba-papel');
    abas.forEach(function (aba) {
      aba.addEventListener('click', function () {
        abas.forEach(function (a) { a.classList.remove('ativo'); });
        aba.classList.add('ativo');
        papelSelecionado = aba.dataset.papel;
        document.getElementById('titulo-login').textContent = ROTULOS[papelSelecionado].titulo;
        document.getElementById('descricao-login').textContent = ROTULOS[papelSelecionado].descricao;
        document.getElementById('aviso-conta-teste').hidden = papelSelecionado !== 'superadmin';
        esconderErro();
      });
    });
  }

  function mostrarErro(mensagem) {
    const el = document.getElementById('mensagem-erro');
    el.textContent = mensagem;
    el.hidden = false;
  }

  function esconderErro() {
    document.getElementById('mensagem-erro').hidden = true;
  }

  function configurarFormulario() {
    const form = document.getElementById('formulario-login');
    const botao = document.getElementById('botao-entrar');

    form.addEventListener('submit', async function (evento) {
      evento.preventDefault();
      esconderErro();
      const email = document.getElementById('campo-email').value.trim();
      const senha = document.getElementById('campo-senha').value;
      if (!email || !senha) {
        mostrarErro('Informe e-mail e senha.');
        return;
      }

      botao.disabled = true;
      botao.textContent = 'Entrando...';
      try {
        const resultado = await window.DB.Auth.login(papelSelecionado, email, senha);
        if (!resultado.ok) {
          mostrarErro(resultado.erro);
          return;
        }
        window.DB.Sessao.definir(resultado.sessao);
        window.location.href = window.App.caminhoDashboard(resultado.sessao.papel);
      } finally {
        botao.disabled = false;
        botao.textContent = 'Entrar';
      }
    });
  }

  (async function iniciar() {
    await window.DB.inicializar();
    const sessao = window.DB.Sessao.obter();
    if (sessao) {
      window.location.href = window.App.caminhoDashboard(sessao.papel);
      return;
    }
    configurarTermos();
    configurarAbas();
    configurarFormulario();
  })();
})();
