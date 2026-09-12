/* notificacoes.js (patient) */
(function () {
  const sessao = window.App.protegerPagina(['paciente']);
  if (!sessao) return;

  function render() {
    const notifs = window.DB.Notificacoes.listar({ patientId: sessao.userId });
    const container = document.getElementById('lista-notificacoes');

    if (notifs.length === 0) {
      container.innerHTML = '<div class="cartao vazio"><span class="icone-vazio">🔔</span>Você ainda não recebeu nenhuma notificação.</div>';
      return;
    }

    container.innerHTML = notifs
      .map(function (n) {
        const info = window.App.infoTipoNotificacao(n.tipo);
        return (
          '<div class="item-notificacao' + (n.lida ? '' : ' nao-lida') + '" data-id="' + n.id + '">' +
          '<div class="cabecalho-item"><strong>' + info.icone + ' ' + window.App.escaparHtml(n.titulo) + '</strong>' +
          '<span class="etiqueta ' + info.classe + '">' + info.rotulo + '</span></div>' +
          '<p>' + window.App.escaparHtml(n.mensagem) + '</p>' +
          '<span class="texto-fraco">' + window.App.formatarDataHora(n.criadoEm) + (n.lida ? '' : ' • não lida') + '</span>' +
          '</div>'
        );
      })
      .join('');

    notifs.filter((n) => !n.lida).forEach((n) => window.DB.Notificacoes.marcarLida(n.id));
  }

  render();
})();
