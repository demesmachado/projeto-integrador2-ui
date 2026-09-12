/* organizacoes.js (superadmin) */
(function () {
  const sessao = window.App.protegerPagina(['superadmin']);
  if (!sessao) return;

  let orgSelecionadaId = null;

  function renderOrganizacoes() {
    const orgs = window.DB.Organizacoes.listar();
    const admins = window.DB.Admins.listar();
    const corpo = document.getElementById('corpo-tabela-organizacoes');

    if (orgs.length === 0) {
      corpo.innerHTML = '<tr><td colspan="4" class="tabela-vazia">Nenhuma organização cadastrada. Clique em "Nova organização" para começar.</td></tr>';
      return;
    }

    corpo.innerHTML = orgs
      .map(function (org) {
        const qtdAdmins = admins.filter((a) => a.organizationId === org.id).length;
        return (
          '<tr>' +
          '<td>' + window.App.escaparHtml(org.nome) + '</td>' +
          '<td><span class="etiqueta etiqueta-azul">' + window.App.escaparHtml(org.tipo) + '</span></td>' +
          '<td>' + qtdAdmins + '</td>' +
          '<td class="grupo-botoes">' +
          '<button type="button" class="botao botao-secundario botao-pequeno" data-admins="' + org.id + '">Admins</button>' +
          '<button type="button" class="botao botao-contorno botao-pequeno" data-editar="' + org.id + '">Editar</button>' +
          '<button type="button" class="botao botao-perigo botao-pequeno" data-excluir="' + org.id + '">Excluir</button>' +
          '</td>' +
          '</tr>'
        );
      })
      .join('');

    corpo.querySelectorAll('[data-admins]').forEach((b) => b.addEventListener('click', () => abrirAdmins(b.dataset.admins)));
    corpo.querySelectorAll('[data-editar]').forEach((b) => b.addEventListener('click', () => abrirEdicaoOrganizacao(b.dataset.editar)));
    corpo.querySelectorAll('[data-excluir]').forEach((b) => b.addEventListener('click', () => excluirOrganizacao(b.dataset.excluir)));
  }

  function abrirNovaOrganizacao() {
    document.getElementById('titulo-modal-organizacao').textContent = 'Nova organização';
    document.getElementById('organizacao-id').value = '';
    document.getElementById('organizacao-nome').value = '';
    document.getElementById('organizacao-tipo').value = 'Hospital';
    window.App.abrirModal('modal-organizacao');
  }

  function abrirEdicaoOrganizacao(id) {
    const org = window.DB.Organizacoes.obter(id);
    if (!org) return;
    document.getElementById('titulo-modal-organizacao').textContent = 'Editar organização';
    document.getElementById('organizacao-id').value = org.id;
    document.getElementById('organizacao-nome').value = org.nome;
    document.getElementById('organizacao-tipo').value = org.tipo;
    window.App.abrirModal('modal-organizacao');
  }

  function excluirOrganizacao(id) {
    const org = window.DB.Organizacoes.obter(id);
    if (!org) return;
    const confirmado = window.App.confirmarExclusao(
      'Excluir "' + org.nome + '"? Todos os administradores, profissionais e pacientes vinculados também serão removidos.'
    );
    if (!confirmado) return;
    window.DB.Organizacoes.excluir(id);
    window.App.toast('Organização excluída.', 'sucesso');
    renderOrganizacoes();
  }

  document.getElementById('botao-nova-organizacao').addEventListener('click', abrirNovaOrganizacao);

  document.getElementById('formulario-organizacao').addEventListener('submit', function (evento) {
    evento.preventDefault();
    const id = document.getElementById('organizacao-id').value;
    const nome = document.getElementById('organizacao-nome').value.trim();
    const tipo = document.getElementById('organizacao-tipo').value;
    if (!nome) {
      window.App.toast('Informe o nome da organização.', 'erro');
      return;
    }
    if (id) {
      window.DB.Organizacoes.atualizar(id, { nome, tipo });
      window.App.toast('Organização atualizada.', 'sucesso');
    } else {
      window.DB.Organizacoes.criar({ nome, tipo });
      window.App.toast('Organização cadastrada.', 'sucesso');
    }
    window.App.fecharModal('modal-organizacao');
    renderOrganizacoes();
  });

  // ---------- administradores ----------

  function abrirAdmins(orgId) {
    const org = window.DB.Organizacoes.obter(orgId);
    if (!org) return;
    orgSelecionadaId = orgId;
    document.getElementById('nome-organizacao-admins').textContent = org.nome;
    renderAdmins();
    window.App.abrirModal('modal-admins');
  }

  function renderAdmins() {
    const admins = window.DB.Admins.listar({ organizationId: orgSelecionadaId });
    const corpo = document.getElementById('corpo-tabela-admins');
    if (admins.length === 0) {
      corpo.innerHTML = '<tr><td colspan="3" class="tabela-vazia">Nenhum administrador cadastrado para esta organização.</td></tr>';
      return;
    }
    corpo.innerHTML = admins
      .map(
        (a) =>
          '<tr>' +
          '<td>' + window.App.escaparHtml(a.nome) + '</td>' +
          '<td>' + window.App.escaparHtml(a.email) + '</td>' +
          '<td class="grupo-botoes">' +
          '<button type="button" class="botao botao-contorno botao-pequeno" data-editar-admin="' + a.id + '">Editar</button>' +
          '<button type="button" class="botao botao-perigo botao-pequeno" data-excluir-admin="' + a.id + '">Excluir</button>' +
          '</td>' +
          '</tr>'
      )
      .join('');

    corpo.querySelectorAll('[data-editar-admin]').forEach((b) => b.addEventListener('click', () => abrirEdicaoAdmin(b.dataset.editarAdmin)));
    corpo.querySelectorAll('[data-excluir-admin]').forEach((b) => b.addEventListener('click', () => excluirAdmin(b.dataset.excluirAdmin)));
  }

  function abrirNovoAdmin() {
    document.getElementById('titulo-modal-admin').textContent = 'Novo administrador';
    document.getElementById('admin-id').value = '';
    document.getElementById('admin-nome').value = '';
    document.getElementById('admin-email').value = '';
    document.getElementById('admin-senha').value = '';
    document.getElementById('rotulo-senha-opcional').hidden = true;
    window.App.abrirModal('modal-admin-form');
  }

  function abrirEdicaoAdmin(id) {
    const admin = window.DB.Admins.obter(id);
    if (!admin) return;
    document.getElementById('titulo-modal-admin').textContent = 'Editar administrador';
    document.getElementById('admin-id').value = admin.id;
    document.getElementById('admin-nome').value = admin.nome;
    document.getElementById('admin-email').value = admin.email;
    document.getElementById('admin-senha').value = '';
    document.getElementById('rotulo-senha-opcional').hidden = false;
    window.App.abrirModal('modal-admin-form');
  }

  function excluirAdmin(id) {
    const admin = window.DB.Admins.obter(id);
    if (!admin) return;
    if (!window.App.confirmarExclusao('Excluir o administrador "' + admin.nome + '"?')) return;
    window.DB.Admins.excluir(id);
    window.App.toast('Administrador excluído.', 'sucesso');
    renderAdmins();
    renderOrganizacoes();
  }

  document.getElementById('botao-novo-admin').addEventListener('click', abrirNovoAdmin);

  document.getElementById('botao-gerar-senha').addEventListener('click', function () {
    document.getElementById('admin-senha').value = window.DB.gerarId().replace(/-/g, '').slice(0, 8);
  });

  document.getElementById('formulario-admin').addEventListener('submit', async function (evento) {
    evento.preventDefault();
    const id = document.getElementById('admin-id').value;
    const nome = document.getElementById('admin-nome').value.trim();
    const email = document.getElementById('admin-email').value.trim();
    const senha = document.getElementById('admin-senha').value.trim();

    if (!nome || !email) {
      window.App.toast('Preencha nome e e-mail.', 'erro');
      return;
    }
    if (!id && !senha) {
      window.App.toast('Defina uma senha para o novo administrador.', 'erro');
      return;
    }

    if (id) {
      await window.DB.Admins.atualizar(id, { nome, email, novaSenha: senha || undefined });
      window.App.toast('Administrador atualizado.', 'sucesso');
    } else {
      const existente = window.DB.Admins.obterPorEmail(email);
      if (existente) {
        window.App.toast('Já existe um administrador com este e-mail.', 'erro');
        return;
      }
      await window.DB.Admins.criar({ nome, email, senha, organizationId: orgSelecionadaId });
      window.App.toast('Administrador cadastrado.', 'sucesso');
    }
    window.App.fecharModal('modal-admin-form');
    renderAdmins();
    renderOrganizacoes();
  });

  renderOrganizacoes();
})();
