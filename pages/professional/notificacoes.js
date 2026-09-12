/* notificacoes.js (professional) */
(function () {
  const sessao = window.App.protegerPagina(['profissional']);
  if (!sessao) return;

  const params = new URLSearchParams(window.location.search);
  const pacienteParaPreencher = params.get('patientId');

  let filtroPaciente = '';
  let filtroTipo = '';

  function meusPacientes() {
    return window.DB.Pacientes.listar({ professionalId: sessao.userId });
  }

  function popularSeletoresPaciente() {
    const pacientes = meusPacientes();
    const opcoes = pacientes.map((p) => '<option value="' + p.id + '">' + window.App.escaparHtml(p.nome) + '</option>').join('');
    document.getElementById('filtro-paciente').innerHTML = '<option value="">Todos os pacientes</option>' + opcoes;
    document.getElementById('notificacao-paciente').innerHTML = opcoes;
  }

  function render() {
    let notifs = window.DB.Notificacoes.listar({ professionalId: sessao.userId });
    if (filtroPaciente) notifs = notifs.filter((n) => n.patientId === filtroPaciente);
    if (filtroTipo) notifs = notifs.filter((n) => n.tipo === filtroTipo);

    const corpo = document.getElementById('corpo-tabela-notificacoes');
    if (notifs.length === 0) {
      corpo.innerHTML = '<tr><td colspan="5" class="tabela-vazia">Nenhuma notificação enviada ainda.</td></tr>';
      return;
    }

    corpo.innerHTML = notifs
      .map(function (n) {
        const paciente = window.DB.Pacientes.obter(n.patientId);
        const info = window.App.infoTipoNotificacao(n.tipo);
        return (
          '<tr>' +
          '<td>' + (paciente ? window.App.escaparHtml(paciente.nome) : '—') + '</td>' +
          '<td><span class="etiqueta ' + info.classe + '">' + info.icone + ' ' + info.rotulo + '</span></td>' +
          '<td>' + window.App.escaparHtml(n.titulo) + '</td>' +
          '<td>' + window.App.formatarDataHora(n.criadoEm) + '</td>' +
          '<td><button type="button" class="botao botao-perigo botao-pequeno" data-excluir="' + n.id + '">Excluir</button></td>' +
          '</tr>'
        );
      })
      .join('');

    corpo.querySelectorAll('[data-excluir]').forEach((b) => b.addEventListener('click', () => excluir(b.dataset.excluir)));
  }

  function excluir(id) {
    if (!window.App.confirmarExclusao('Excluir esta notificação?')) return;
    window.DB.Notificacoes.excluir(id);
    window.App.toast('Notificação excluída.', 'sucesso');
    render();
  }

  function abrirNova(patientIdPreSelecionado) {
    const form = document.getElementById('formulario-notificacao');
    form.reset();
    if (patientIdPreSelecionado) document.getElementById('notificacao-paciente').value = patientIdPreSelecionado;
    window.App.abrirModal('modal-notificacao');
  }

  document.getElementById('botao-nova-notificacao').addEventListener('click', () => abrirNova(null));

  document.getElementById('filtro-paciente').addEventListener('change', function (e) {
    filtroPaciente = e.target.value;
    render();
  });
  document.getElementById('filtro-tipo').addEventListener('change', function (e) {
    filtroTipo = e.target.value;
    render();
  });

  document.getElementById('formulario-notificacao').addEventListener('submit', function (evento) {
    evento.preventDefault();
    const patientId = document.getElementById('notificacao-paciente').value;
    const tipo = document.getElementById('notificacao-tipo').value;
    const titulo = document.getElementById('notificacao-titulo').value.trim();
    const mensagem = document.getElementById('notificacao-mensagem').value.trim();

    if (!patientId) {
      window.App.toast('Selecione um paciente.', 'erro');
      return;
    }
    if (!titulo || !mensagem) {
      window.App.toast('Preencha título e mensagem.', 'erro');
      return;
    }

    window.DB.Notificacoes.criar({ patientId, professionalId: sessao.userId, tipo, titulo, mensagem });
    window.App.toast('Notificação enviada.', 'sucesso');
    window.App.fecharModal('modal-notificacao');
    render();
  });

  popularSeletoresPaciente();
  render();

  if (pacienteParaPreencher) abrirNova(pacienteParaPreencher);
})();
