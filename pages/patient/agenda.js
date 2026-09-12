/* agenda.js (patient) */
(function () {
  const sessao = window.App.protegerPagina(['paciente']);
  if (!sessao) return;

  if (!sessao.professionalId) {
    document.getElementById('aviso-sem-profissional').hidden = false;
    return;
  }
  document.getElementById('conteudo-agenda-paciente').hidden = false;

  const profissional = window.DB.Profissionais.obter(sessao.professionalId);
  document.getElementById('nome-profissional-vinculado').textContent = profissional ? profissional.nome : '—';

  function render() {
    const disponiveis = window.DB.Agenda.listar({ professionalId: sessao.professionalId, status: 'disponivel' });
    const corpoDisponiveis = document.getElementById('corpo-horarios-disponiveis');
    if (disponiveis.length === 0) {
      corpoDisponiveis.innerHTML = '<tr><td colspan="3" class="tabela-vazia">Nenhum horário disponível no momento.</td></tr>';
    } else {
      corpoDisponiveis.innerHTML = disponiveis
        .map(
          (a) =>
            '<tr><td>' + window.App.formatarData(a.data) + '</td><td>' + a.hora + '</td>' +
            '<td><button type="button" class="botao botao-primario botao-pequeno" data-solicitar="' + a.id + '">Solicitar</button></td></tr>'
        )
        .join('');
      corpoDisponiveis.querySelectorAll('[data-solicitar]').forEach((b) => b.addEventListener('click', () => solicitar(b.dataset.solicitar)));
    }

    const minhas = window.DB.Agenda.listar({ patientId: sessao.userId });
    const corpoMinhas = document.getElementById('corpo-minhas-consultas');
    if (minhas.length === 0) {
      corpoMinhas.innerHTML = '<tr><td colspan="4" class="tabela-vazia">Você ainda não solicitou nenhuma consulta.</td></tr>';
    } else {
      corpoMinhas.innerHTML = minhas
        .map(function (a) {
          const acao =
            a.status === 'solicitada'
              ? '<button type="button" class="botao botao-fantasma botao-pequeno" data-cancelar="' + a.id + '">Cancelar</button>'
              : '';
          return (
            '<tr><td>' + window.App.formatarData(a.data) + '</td><td>' + a.hora + '</td>' +
            '<td>' + window.App.etiquetaStatusAgenda(a.status) + '</td><td>' + acao + '</td></tr>'
          );
        })
        .join('');
      corpoMinhas.querySelectorAll('[data-cancelar]').forEach((b) => b.addEventListener('click', () => cancelar(b.dataset.cancelar)));
    }
  }

  function solicitar(id) {
    window.DB.Agenda.solicitar(id, sessao.userId);
    window.App.toast('Solicitação enviada! Aguarde a confirmação do profissional.', 'sucesso');
    render();
  }

  function cancelar(id) {
    if (!window.App.confirmarAcao('Cancelar esta solicitação de horário?')) return;
    window.DB.Agenda.cancelarSolicitacao(id);
    window.App.toast('Solicitação cancelada.', 'info');
    render();
  }

  render();
})();
