/* dashboard.js (superadmin) */
(function () {
  const sessao = window.App.protegerPagina(['superadmin']);
  if (!sessao) return;

  function render() {
    const orgs = window.DB.Organizacoes.listar();
    const admins = window.DB.Admins.listar();
    const profissionais = window.DB.Profissionais.listar();
    const pacientes = window.DB.Pacientes.listar();

    document.getElementById('m-orgs').textContent = orgs.length;
    document.getElementById('m-admins').textContent = admins.length;
    document.getElementById('m-prof').textContent = profissionais.length;
    document.getElementById('m-pac').textContent = pacientes.length;

    const corpo = document.getElementById('corpo-tabela-orgs');
    if (orgs.length === 0) {
      corpo.innerHTML = '<tr><td colspan="5" class="tabela-vazia">Nenhuma organização cadastrada ainda. <a href="organizacoes.html">Cadastrar a primeira</a>.</td></tr>';
      return;
    }

    corpo.innerHTML = orgs
      .map(function (org) {
        const qtdAdmins = admins.filter((a) => a.organizationId === org.id).length;
        const qtdProf = profissionais.filter((p) => p.organizationId === org.id).length;
        const qtdPac = pacientes.filter((p) => p.organizationId === org.id).length;
        return (
          '<tr>' +
          '<td>' + window.App.escaparHtml(org.nome) + '</td>' +
          '<td><span class="etiqueta etiqueta-azul">' + window.App.escaparHtml(org.tipo) + '</span></td>' +
          '<td>' + qtdAdmins + '</td>' +
          '<td>' + qtdProf + '</td>' +
          '<td>' + qtdPac + '</td>' +
          '</tr>'
        );
      })
      .join('');
  }

  render();
})();
