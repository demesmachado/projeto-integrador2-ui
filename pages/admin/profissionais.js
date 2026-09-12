/* profissionais.js (admin) */
(function () {
  const sessao = window.App.protegerPagina(['admin']);
  if (!sessao) return;

  const form = document.getElementById('formulario-profissional');
  const modal = document.getElementById('modal-profissional');
  let termoBusca = '';
  let criacaoConcluidaId = null;

  function pacientesDoProfissional(id) {
    return window.DB.Pacientes.listar({ organizationId: sessao.organizationId }).filter((p) => p.professionalId === id).length;
  }

  function render() {
    const todos = window.DB.Profissionais.listar({ organizationId: sessao.organizationId });
    const filtrados = todos.filter(function (p) {
      const alvo = termoBusca.toLowerCase();
      return !alvo || p.nome.toLowerCase().includes(alvo) || (p.especialidade || '').toLowerCase().includes(alvo);
    });

    const corpo = document.getElementById('corpo-tabela-profissionais');
    if (filtrados.length === 0) {
      corpo.innerHTML = '<tr><td colspan="7" class="tabela-vazia">Nenhum profissional encontrado.</td></tr>';
      return;
    }

    corpo.innerHTML = filtrados
      .map(
        (p) =>
          '<tr>' +
          '<td>' + window.App.escaparHtml(p.nome) + '</td>' +
          '<td>' + window.App.escaparHtml(p.especialidade || '—') + '</td>' +
          '<td>' + window.App.escaparHtml(p.crm || '—') + '</td>' +
          '<td>' + window.App.escaparHtml(p.telefone || '—') + '</td>' +
          '<td>' + window.App.escaparHtml(p.email) + '</td>' +
          '<td>' + pacientesDoProfissional(p.id) + '</td>' +
          '<td class="grupo-botoes">' +
          '<button type="button" class="botao botao-contorno botao-pequeno" data-editar="' + p.id + '">Editar</button>' +
          '<button type="button" class="botao botao-perigo botao-pequeno" data-excluir="' + p.id + '">Excluir</button>' +
          '</td>' +
          '</tr>'
      )
      .join('');

    corpo.querySelectorAll('[data-editar]').forEach((b) => b.addEventListener('click', () => abrirEdicao(b.dataset.editar)));
    corpo.querySelectorAll('[data-excluir]').forEach((b) => b.addEventListener('click', () => excluir(b.dataset.excluir)));
  }

  function definirCamposDesabilitados(desabilitado) {
    form.querySelectorAll('input, select').forEach((el) => {
      el.disabled = desabilitado;
    });
  }

  function abrirNovo() {
    form.reset();
    document.getElementById('profissional-id').value = '';
    document.getElementById('titulo-modal-profissional').textContent = 'Novo profissional';
    document.getElementById('area-senha-gerada').innerHTML = '';
    definirCamposDesabilitados(false);
    form.querySelector('button[type=submit]').textContent = 'Salvar';
    criacaoConcluidaId = null;
    window.App.abrirModal('modal-profissional');
  }

  function abrirEdicao(id) {
    const p = window.DB.Profissionais.obter(id);
    if (!p) return;
    document.getElementById('titulo-modal-profissional').textContent = 'Editar profissional';
    document.getElementById('profissional-id').value = p.id;
    document.getElementById('profissional-nome').value = p.nome;
    document.getElementById('profissional-especialidade').value = p.especialidade;
    document.getElementById('profissional-crm').value = p.crm || '';
    document.getElementById('profissional-telefone').value = p.telefone || '';
    document.getElementById('profissional-email').value = p.email;
    document.getElementById('area-senha-gerada').innerHTML = '';
    definirCamposDesabilitados(false);
    form.querySelector('button[type=submit]').textContent = 'Salvar';
    criacaoConcluidaId = null;
    window.App.abrirModal('modal-profissional');
  }

  function excluir(id) {
    const p = window.DB.Profissionais.obter(id);
    if (!p) return;
    if (!window.App.confirmarExclusao('Excluir o profissional "' + p.nome + '"? Os pacientes vinculados ficarão sem profissional responsável.')) return;
    window.DB.Profissionais.excluir(id);
    window.App.toast('Profissional excluído.', 'sucesso');
    render();
  }

  document.getElementById('botao-novo-profissional').addEventListener('click', abrirNovo);

  document.getElementById('campo-busca').addEventListener('input', function (e) {
    termoBusca = e.target.value;
    render();
  });

  modal.addEventListener('close', function () {
    form.reset();
    document.getElementById('area-senha-gerada').innerHTML = '';
    definirCamposDesabilitados(false);
    criacaoConcluidaId = null;
  });

  form.addEventListener('submit', async function (evento) {
    evento.preventDefault();

    if (criacaoConcluidaId) {
      window.App.fecharModal('modal-profissional');
      render();
      return;
    }

    const id = document.getElementById('profissional-id').value;
    const nome = document.getElementById('profissional-nome').value.trim();
    const especialidade = document.getElementById('profissional-especialidade').value;
    const crm = document.getElementById('profissional-crm').value.trim();
    const telefone = document.getElementById('profissional-telefone').value.trim();
    const email = document.getElementById('profissional-email').value.trim();

    if (!nome || !email) {
      window.App.toast('Preencha nome e e-mail.', 'erro');
      return;
    }

    if (id) {
      await window.DB.Profissionais.atualizar(id, { nome, especialidade, crm, telefone, email });
      window.App.toast('Profissional atualizado.', 'sucesso');
      window.App.fecharModal('modal-profissional');
      render();
      return;
    }

    const existente = window.DB.Profissionais.obterPorEmail(email);
    if (existente) {
      window.App.toast('Já existe um profissional com este e-mail.', 'erro');
      return;
    }

    const resultado = await window.DB.Profissionais.criar({
      nome,
      especialidade,
      crm,
      telefone,
      email,
      organizationId: sessao.organizationId,
      criadoPor: sessao.userId
    });

    document.getElementById('area-senha-gerada').innerHTML =
      '<div class="senha-gerada-caixa">Profissional cadastrado! Senha de acesso gerada: <strong>' +
      resultado.senhaGerada +
      '</strong><br><span class="texto-fraco">Anote e repasse essa senha ao profissional — ela não será exibida novamente.</span></div>';
    definirCamposDesabilitados(true);
    form.querySelector('button[type=submit]').textContent = 'Concluir';
    criacaoConcluidaId = resultado.profissional.id;
    window.App.toast('Profissional cadastrado.', 'sucesso');
    render();
  });

  render();
})();
