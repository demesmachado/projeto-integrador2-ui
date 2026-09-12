/**
 * aplicacao.js — camada de aplicação: sessão/guarda de rotas, layout
 * (topbar + sidebar), toasts, modais e formatação, usados em todas as páginas.
 */
(function (window) {
  'use strict';

  const NAV = {
    superadmin: {
      titulo: 'Super Administração',
      base: '../superadmin/',
      itens: [
        { href: 'dashboard.html', label: 'Painel', icone: '📊' },
        { href: 'organizacoes.html', label: 'Organizações', icone: '🏥' }
      ]
    },
    admin: {
      titulo: 'Administração',
      base: '../admin/',
      itens: [
        { href: 'dashboard.html', label: 'Painel', icone: '📊' },
        { href: 'profissionais.html', label: 'Profissionais', icone: '🩺' },
        { href: 'pacientes.html', label: 'Pacientes', icone: '🧑‍🤝‍🧑' }
      ]
    },
    profissional: {
      titulo: 'Área do Profissional',
      base: '../professional/',
      itens: [
        { href: 'dashboard.html', label: 'Painel', icone: '📊' },
        { href: 'agenda.html', label: 'Agenda', icone: '🗓️' },
        { href: 'pacientes.html', label: 'Pacientes', icone: '🧑‍🤝‍🧑' },
        { href: 'notificacoes.html', label: 'Notificações', icone: '🔔' },
        { href: 'conteudos.html', label: 'Conteúdos', icone: '🎬' }
      ]
    },
    paciente: {
      titulo: 'Minha Saúde',
      base: '../patient/',
      itens: [
        { href: 'dashboard.html', label: 'Painel', icone: '📊' },
        { href: 'agenda.html', label: 'Agenda', icone: '🗓️' },
        { href: 'historico.html', label: 'Histórico', icone: '📖' },
        { href: 'conteudos.html', label: 'Conteúdos', icone: '🎬' },
        { href: 'notificacoes.html', label: 'Notificações', icone: '🔔' }
      ]
    }
  };

  const RAIZ = '../../';

  function protegerPagina(papeisPermitidos) {
    const sessao = window.DB.Sessao.obter();
    if (!sessao || papeisPermitidos.indexOf(sessao.papel) === -1) {
      window.location.href = RAIZ + 'index.html';
      return null;
    }
    montarLayout(sessao);
    iniciarModais();
    return sessao;
  }

  function iniciarModais() {
    document.querySelectorAll('[data-abrir]').forEach(function (botao) {
      botao.addEventListener('click', function () {
        abrirModal(botao.dataset.abrir);
      });
    });
    document.querySelectorAll('[data-fechar]').forEach(function (botao) {
      botao.addEventListener('click', function () {
        fecharModal(botao.dataset.fechar);
      });
    });
  }

  function logout() {
    window.DB.Sessao.encerrar();
    window.location.href = RAIZ + 'index.html';
  }

  function caminhoDashboard(papel) {
    const mapa = {
      superadmin: 'pages/superadmin/dashboard.html',
      admin: 'pages/admin/dashboard.html',
      profissional: 'pages/professional/dashboard.html',
      paciente: 'pages/patient/dashboard.html'
    };
    return mapa[papel] || 'index.html';
  }

  function montarLayout(sessao) {
    const config = NAV[sessao.papel];
    const paginaAtual = window.location.pathname.split('/').pop();

    const topbar = document.getElementById('topbar');
    if (topbar) {
      topbar.innerHTML =
        '<button type="button" class="botao-menu" id="botao-alternar-menu" aria-label="Abrir menu">☰</button>' +
        '<div class="marca"><span class="marca-ponto"></span>Saúde Digital</div>' +
        '<div class="topbar-usuario">' +
        '<span class="topbar-usuario-nome">' + escaparHtml(sessao.nome) + '</span>' +
        '<span class="etiqueta etiqueta-papel">' + rotuloPapel(sessao.papel) + '</span>' +
        '<button type="button" class="botao botao-fantasma" id="botao-sair">Sair</button>' +
        '</div>';
      document.getElementById('botao-sair').addEventListener('click', logout);
      document.getElementById('botao-alternar-menu').addEventListener('click', function () {
        alternarMenuLateral();
      });
    }

    let backdrop = document.getElementById('sidebar-backdrop');
    if (!backdrop) {
      backdrop = document.createElement('div');
      backdrop.id = 'sidebar-backdrop';
      backdrop.className = 'sidebar-backdrop';
      document.body.appendChild(backdrop);
      backdrop.addEventListener('click', fecharMenuLateral);
    }

    const sidebar = document.getElementById('sidebar');
    if (sidebar && config) {
      let html = '<div class="sidebar-titulo">' + config.titulo + '</div><ul class="sidebar-lista">';
      config.itens.forEach(function (item) {
        const ativo = item.href === paginaAtual ? ' ativo' : '';
        html += '<li><a class="sidebar-link' + ativo + '" href="' + item.href + '">' +
          '<span class="sidebar-icone">' + item.icone + '</span>' + item.label + '</a></li>';
      });
      html += '</ul>';
      sidebar.innerHTML = html;
    }
  }

  function alternarMenuLateral() {
    document.getElementById('sidebar').classList.toggle('sidebar-aberta');
    document.getElementById('sidebar-backdrop').classList.toggle('sidebar-backdrop-visivel');
    document.body.classList.toggle('sem-scroll');
  }

  function fecharMenuLateral() {
    document.getElementById('sidebar').classList.remove('sidebar-aberta');
    document.getElementById('sidebar-backdrop').classList.remove('sidebar-backdrop-visivel');
    document.body.classList.remove('sem-scroll');
  }

  function rotuloPapel(papel) {
    return {
      superadmin: 'Super Admin',
      admin: 'Administrador',
      profissional: 'Profissional',
      paciente: 'Paciente'
    }[papel] || papel;
  }

  // ---------- toasts ----------

  function garantirToastContainer() {
    let container = document.getElementById('toast-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'toast-container';
      container.className = 'toast-container';
      document.body.appendChild(container);
    }
    return container;
  }

  function toast(mensagem, tipo) {
    const container = garantirToastContainer();
    const el = document.createElement('div');
    el.className = 'toast toast-' + (tipo || 'info');
    el.textContent = mensagem;
    container.appendChild(el);
    requestAnimationFrame(function () {
      el.classList.add('toast-visivel');
    });
    setTimeout(function () {
      el.classList.remove('toast-visivel');
      setTimeout(function () {
        el.remove();
      }, 300);
    }, 3800);
  }

  // ---------- modais (usa <dialog> nativo) ----------

  function abrirModal(id) {
    const dialogo = document.getElementById(id);
    if (dialogo && typeof dialogo.showModal === 'function') dialogo.showModal();
  }

  function fecharModal(id) {
    const dialogo = document.getElementById(id);
    if (dialogo && typeof dialogo.close === 'function') dialogo.close();
  }

  function confirmarExclusao(mensagem) {
    return window.confirm(mensagem || 'Tem certeza que deseja excluir este registro? Essa ação não pode ser desfeita.');
  }

  function confirmarAcao(mensagem) {
    return window.confirm(mensagem);
  }

  // ---------- formatação ----------

  function escaparHtml(texto) {
    const div = document.createElement('div');
    div.textContent = texto === undefined || texto === null ? '' : String(texto);
    return div.innerHTML;
  }

  function formatarData(isoData) {
    if (!isoData) return '—';
    const partes = isoData.split('-');
    if (partes.length !== 3) return isoData;
    return partes[2] + '/' + partes[1] + '/' + partes[0];
  }

  function formatarDataHora(isoDataHora) {
    if (!isoDataHora) return '—';
    const data = new Date(isoDataHora);
    if (isNaN(data.getTime())) return isoDataHora;
    const dia = String(data.getDate()).padStart(2, '0');
    const mes = String(data.getMonth() + 1).padStart(2, '0');
    const ano = data.getFullYear();
    const hora = String(data.getHours()).padStart(2, '0');
    const min = String(data.getMinutes()).padStart(2, '0');
    return dia + '/' + mes + '/' + ano + ' ' + hora + ':' + min;
  }

  function calcularIdade(isoData) {
    if (!isoData) return null;
    const nascimento = new Date(isoData + 'T00:00:00');
    if (isNaN(nascimento.getTime())) return null;
    const hoje = new Date();
    let idade = hoje.getFullYear() - nascimento.getFullYear();
    const aindaNaoFezAniversario =
      hoje.getMonth() < nascimento.getMonth() ||
      (hoje.getMonth() === nascimento.getMonth() && hoje.getDate() < nascimento.getDate());
    if (aindaNaoFezAniversario) idade--;
    return idade;
  }

  function calcularImc(pesoKg, alturaM) {
    const peso = parseFloat(pesoKg);
    const altura = parseFloat(alturaM);
    if (!peso || !altura) return null;
    const imc = peso / (altura * altura);
    return Math.round(imc * 10) / 10;
  }

  function classificarImc(imc) {
    if (imc === null || imc === undefined || isNaN(imc)) return null;
    if (imc < 18.5) return 'Abaixo do peso';
    if (imc < 25) return 'Peso normal';
    if (imc < 30) return 'Sobrepeso';
    return 'Obesidade';
  }

  // Faixas de referência simplificadas, apenas para fins de demonstração
  // (não substituem avaliação clínica profissional).
  function classificarIndicador(tipo, valor) {
    const v = parseFloat(valor);
    if (isNaN(v)) return null;
    if (tipo === 'bpm') {
      if (v >= 60 && v <= 80) return 'Ótimo';
      if ((v >= 50 && v < 60) || (v > 80 && v <= 100)) return 'Bom';
      if ((v >= 40 && v < 50) || (v > 100 && v <= 110)) return 'Regular';
      return 'Ruim';
    }
    if (tipo === 'glicemia') {
      if (v >= 70 && v <= 99) return 'Ótimo';
      if (v >= 100 && v <= 125) return 'Bom';
      if (v >= 126 && v <= 160) return 'Regular';
      return 'Ruim';
    }
    return null;
  }

  const STATUS_AGENDA = {
    disponivel: { rotulo: 'Disponível', classe: 'etiqueta-cinza' },
    solicitada: { rotulo: 'Aguardando confirmação', classe: 'etiqueta-amarela' },
    confirmada: { rotulo: 'Confirmada', classe: 'etiqueta-azul' },
    recusada: { rotulo: 'Recusada', classe: 'etiqueta-vermelha' },
    realizada: { rotulo: 'Realizada', classe: 'etiqueta-verde' },
    cancelada: { rotulo: 'Cancelada', classe: 'etiqueta-cinza' }
  };

  const TIPOS_NOTIFICACAO = {
    medicamento: { rotulo: 'Medicamento', icone: '💊', classe: 'etiqueta-verde' },
    consulta: { rotulo: 'Aviso de consulta', icone: '🗓️', classe: 'etiqueta-azul' },
    bemEstar: { rotulo: 'Bem-estar', icone: '💚', classe: 'etiqueta-amarela' }
  };

  function infoTipoNotificacao(tipo) {
    return TIPOS_NOTIFICACAO[tipo] || { rotulo: tipo, icone: '🔔', classe: 'etiqueta-cinza' };
  }

  const TIPOS_CONTEUDO = {
    documentario: { rotulo: 'Documentário', icone: '🎬' },
    curso: { rotulo: 'Curso', icone: '🎓' },
    livro: { rotulo: 'Livro', icone: '📖' },
    artigo: { rotulo: 'Artigo', icone: '📰' }
  };

  function infoTipoConteudo(tipo) {
    return TIPOS_CONTEUDO[tipo] || { rotulo: tipo, icone: '🔗' };
  }

  function etiquetaStatusAgenda(status) {
    const info = STATUS_AGENDA[status] || { rotulo: status, classe: 'etiqueta-cinza' };
    return '<span class="etiqueta ' + info.classe + '">' + info.rotulo + '</span>';
  }

  function classePorIndicador(rotulo) {
    return {
      Ótimo: 'indicador-otimo',
      Bom: 'indicador-bom',
      Regular: 'indicador-regular',
      Ruim: 'indicador-ruim'
    }[rotulo] || '';
  }

  window.App = {
    protegerPagina,
    iniciarModais,
    logout,
    caminhoDashboard,
    toast,
    abrirModal,
    fecharModal,
    confirmarExclusao,
    confirmarAcao,
    escaparHtml,
    formatarData,
    formatarDataHora,
    calcularIdade,
    calcularImc,
    classificarImc,
    classificarIndicador,
    classePorIndicador,
    etiquetaStatusAgenda,
    infoTipoNotificacao,
    infoTipoConteudo,
    rotuloPapel
  };
})(window);
