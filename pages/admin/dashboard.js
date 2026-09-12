/* dashboard.js (admin) */
(function () {
  const sessao = window.App.protegerPagina(['admin']);
  if (!sessao) return;

  function render() {
    const organizacao = window.DB.Organizacoes.obter(sessao.organizationId);
    document.getElementById('nome-organizacao').textContent = organizacao ? organizacao.nome : 'Organização';

    const profissionais = window.DB.Profissionais.listar({ organizationId: sessao.organizationId });
    const pacientes = window.DB.Pacientes.listar({ organizationId: sessao.organizationId });
    const idsProfissionais = profissionais.map((p) => p.id);
    const consultasRealizadas = window.DB.Agenda.listar().filter(
      (a) => idsProfissionais.indexOf(a.professionalId) !== -1 && a.status === 'realizada'
    );

    document.getElementById('m-prof').textContent = profissionais.length;
    document.getElementById('m-pac').textContent = pacientes.length;
    document.getElementById('m-consultas').textContent = consultasRealizadas.length;

    const corpo = document.getElementById('corpo-tabela-profissionais');
    if (profissionais.length === 0) {
      corpo.innerHTML = '<tr><td colspan="3" class="tabela-vazia">Nenhum profissional cadastrado. <a href="profissionais.html">Cadastrar o primeiro</a>.</td></tr>';
      return;
    }

    const recentes = profissionais.slice().sort((a, b) => b.criadoEm.localeCompare(a.criadoEm)).slice(0, 5);
    corpo.innerHTML = recentes
      .map(function (prof) {
        const qtdPac = pacientes.filter((p) => p.professionalId === prof.id).length;
        return (
          '<tr>' +
          '<td>' + window.App.escaparHtml(prof.nome) + '</td>' +
          '<td>' + window.App.escaparHtml(prof.especialidade || '—') + '</td>' +
          '<td>' + qtdPac + '</td>' +
          '</tr>'
        );
      })
      .join('');
  }

  render();
})();
