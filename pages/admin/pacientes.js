/* pacientes.js (admin) */
(function () {
  const sessao = window.App.protegerPagina(['admin']);
  if (!sessao) return;

  const form = document.getElementById('formulario-paciente');
  const modal = document.getElementById('modal-paciente');
  const seletorProfissional = document.getElementById('paciente-profissional');
  let termoBusca = '';
  let criacaoConcluidaId = null;

  function popularProfissionais() {
    const profissionais = window.DB.Profissionais.listar({ organizationId: sessao.organizationId });
    seletorProfissional.innerHTML =
      '<option value="">Sem vínculo definido</option>' +
      profissionais.map((p) => '<option value="' + p.id + '">' + window.App.escaparHtml(p.nome) + '</option>').join('');
  }

  function nomeProfissional(id) {
    if (!id) return '<span class="texto-fraco">Não vinculado</span>';
    const p = window.DB.Profissionais.obter(id);
    return p ? window.App.escaparHtml(p.nome) : '<span class="texto-fraco">Não vinculado</span>';
  }

  async function render() {
    const todos = window.DB.Pacientes.listar({ organizationId: sessao.organizationId });
    const alvo = termoBusca.toLowerCase();
    const filtrados = todos.filter((p) => !alvo || p.nome.toLowerCase().includes(alvo));

    const corpo = document.getElementById('corpo-tabela-pacientes');
    if (filtrados.length === 0) {
      corpo.innerHTML = '<tr><td colspan="5" class="tabela-vazia">Nenhum paciente encontrado.</td></tr>';
      return;
    }

    const linhas = await Promise.all(
      filtrados.map(async function (p) {
        const sensiveis = await window.DB.Pacientes.dadosSensiveis(p);
        const idade = sensiveis ? window.App.calcularIdade(sensiveis.dataNascimento) : null;
        return (
          '<tr>' +
          '<td>' + window.App.escaparHtml(p.nome) + '</td>' +
          '<td>' + window.App.escaparHtml(sensiveis ? sensiveis.sexo : '—') + '</td>' +
          '<td>' + (idade === null ? '—' : idade + ' anos') + '</td>' +
          '<td>' + nomeProfissional(p.professionalId) + '</td>' +
          '<td class="grupo-botoes">' +
          '<button type="button" class="botao botao-contorno botao-pequeno" data-editar="' + p.id + '">Editar</button>' +
          '<button type="button" class="botao botao-perigo botao-pequeno" data-excluir="' + p.id + '">Excluir</button>' +
          '</td>' +
          '</tr>'
        );
      })
    );

    corpo.innerHTML = linhas.join('');
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
    document.getElementById('paciente-id').value = '';
    document.getElementById('titulo-modal-paciente').textContent = 'Novo paciente';
    document.getElementById('area-senha-gerada').innerHTML = '';
    popularProfissionais();
    definirCamposDesabilitados(false);
    form.querySelector('button[type=submit]').textContent = 'Salvar';
    criacaoConcluidaId = null;
    window.App.abrirModal('modal-paciente');
  }

  async function abrirEdicao(id) {
    const p = window.DB.Pacientes.obter(id);
    if (!p) return;
    const sensiveis = (await window.DB.Pacientes.dadosSensiveis(p)) || {};
    document.getElementById('titulo-modal-paciente').textContent = 'Editar paciente';
    document.getElementById('paciente-id').value = p.id;
    document.getElementById('paciente-nome').value = p.nome;
    document.getElementById('paciente-sexo').value = sensiveis.sexo || 'Feminino';
    document.getElementById('paciente-nascimento').value = sensiveis.dataNascimento || '';
    document.getElementById('paciente-email').value = sensiveis.email || '';
    document.getElementById('area-senha-gerada').innerHTML = '';
    popularProfissionais();
    seletorProfissional.value = p.professionalId || '';
    definirCamposDesabilitados(false);
    form.querySelector('button[type=submit]').textContent = 'Salvar';
    criacaoConcluidaId = null;
    window.App.abrirModal('modal-paciente');
  }

  function excluir(id) {
    const p = window.DB.Pacientes.obter(id);
    if (!p) return;
    if (!window.App.confirmarExclusao('Excluir o paciente "' + p.nome + '"? Todo o histórico de consultas e evolução será removido.')) return;
    window.DB.Pacientes.excluir(id);
    window.App.toast('Paciente excluído.', 'sucesso');
    render();
  }

  document.getElementById('botao-novo-paciente').addEventListener('click', abrirNovo);

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
      window.App.fecharModal('modal-paciente');
      render();
      return;
    }

    const id = document.getElementById('paciente-id').value;
    const nome = document.getElementById('paciente-nome').value.trim();
    const sexo = document.getElementById('paciente-sexo').value;
    const dataNascimento = document.getElementById('paciente-nascimento').value;
    const email = document.getElementById('paciente-email').value.trim();
    const professionalId = seletorProfissional.value || null;

    if (!nome || !dataNascimento || !email) {
      window.App.toast('Preencha nome, data de nascimento e e-mail.', 'erro');
      return;
    }

    if (id) {
      await window.DB.Pacientes.atualizar(id, { nome, sexo, dataNascimento, email, professionalId });
      window.App.toast('Paciente atualizado.', 'sucesso');
      window.App.fecharModal('modal-paciente');
      render();
      return;
    }

    const existente = await window.DB.Pacientes.obterPorEmail(email);
    if (existente) {
      window.App.toast('Já existe um paciente com este e-mail.', 'erro');
      return;
    }

    const resultado = await window.DB.Pacientes.criar({
      nome,
      sexo,
      dataNascimento,
      email,
      organizationId: sessao.organizationId,
      professionalId,
      criadoPor: sessao.userId
    });

    document.getElementById('area-senha-gerada').innerHTML =
      '<div class="senha-gerada-caixa">Paciente cadastrado! Senha de acesso gerada: <strong>' +
      resultado.senhaGerada +
      '</strong><br><span class="texto-fraco">Anote e repasse essa senha ao paciente — ela não será exibida novamente.</span></div>';
    definirCamposDesabilitados(true);
    form.querySelector('button[type=submit]').textContent = 'Concluir';
    criacaoConcluidaId = resultado.paciente.id;
    window.App.toast('Paciente cadastrado.', 'sucesso');
    render();
  });

  render();
})();
