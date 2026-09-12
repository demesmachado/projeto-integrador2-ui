/* dashboard.js (professional) */
(function () {
  const sessao = window.App.protegerPagina(['profissional']);
  if (!sessao) return;

  function hojeISO() {
    const hoje = new Date();
    return hoje.getFullYear() + '-' + String(hoje.getMonth() + 1).padStart(2, '0') + '-' + String(hoje.getDate()).padStart(2, '0');
  }

  function render() {
    document.getElementById('nome-profissional').textContent = sessao.nome;

    const pacientes = window.DB.Pacientes.listar({ professionalId: sessao.userId });
    const agenda = window.DB.Agenda.listar({ professionalId: sessao.userId });
    const hoje = hojeISO();

    const hojeConfirmadas = agenda.filter((a) => a.data === hoje && a.status === 'confirmada');
    const pendentes = agenda.filter((a) => a.status === 'solicitada');

    document.getElementById('m-pacientes').textContent = pacientes.length;
    document.getElementById('m-hoje').textContent = hojeConfirmadas.length;
    document.getElementById('m-pendentes').textContent = pendentes.length;

    const proximas = agenda
      .filter((a) => a.data >= hoje && (a.status === 'confirmada' || a.status === 'solicitada'))
      .slice(0, 6);

    const corpo = document.getElementById('corpo-proximas');
    if (proximas.length === 0) {
      corpo.innerHTML = '<tr><td colspan="4" class="tabela-vazia">Nenhuma consulta agendada. <a href="agenda.html">Criar horário</a>.</td></tr>';
      return;
    }

    corpo.innerHTML = proximas
      .map(function (a) {
        const paciente = a.patientId ? window.DB.Pacientes.obter(a.patientId) : null;
        return (
          '<tr>' +
          '<td>' + window.App.formatarData(a.data) + '</td>' +
          '<td>' + a.hora + '</td>' +
          '<td>' + (paciente ? window.App.escaparHtml(paciente.nome) : '<span class="texto-fraco">—</span>') + '</td>' +
          '<td>' + window.App.etiquetaStatusAgenda(a.status) + '</td>' +
          '</tr>'
        );
      })
      .join('');
  }

  render();
})();
