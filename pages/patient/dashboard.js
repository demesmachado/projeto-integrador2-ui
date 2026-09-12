/* dashboard.js (patient) */
(function () {
  const sessao = window.App.protegerPagina(['paciente']);
  if (!sessao) return;

  function hojeISO() {
    const hoje = new Date();
    return hoje.getFullYear() + '-' + String(hoje.getMonth() + 1).padStart(2, '0') + '-' + String(hoje.getDate()).padStart(2, '0');
  }

  function media(numeros) {
    if (numeros.length === 0) return null;
    const soma = numeros.reduce((a, b) => a + b, 0);
    return Math.round((soma / numeros.length) * 10) / 10;
  }

  async function renderIndicadores() {
    const consultas = window.DB.Agenda.listar({ patientId: sessao.userId }).filter((a) => a.status === 'realizada');
    const todosDados = await Promise.all(consultas.map((a) => window.DB.Agenda.dadosClinicos(a)));

    const bpms = todosDados.filter((d) => d && d.frequenciaCardiaca).map((d) => parseFloat(d.frequenciaCardiaca));
    const glicemias = todosDados.filter((d) => d && d.glicemia).map((d) => parseFloat(d.glicemia));

    const mediaBpm = media(bpms);
    const mediaGlicemia = media(glicemias);

    const cartoes = [];
    cartoes.push(cartaoIndicador('Frequência cardíaca média', mediaBpm, 'bpm', 'bpm'));
    cartoes.push(cartaoIndicador('Glicemia média', mediaGlicemia, 'glicemia', 'mg/dL'));
    document.getElementById('grade-indicadores').innerHTML = cartoes.join('');
  }

  function cartaoIndicador(titulo, valor, tipo, unidade) {
    if (valor === null) {
      return (
        '<div class="cartao-indicador">' +
        '<span class="rotulo-indicador">' + titulo + '</span>' +
        '<div class="valor-indicador">—</div>' +
        '<span class="etiqueta etiqueta-cinza">Sem dados registrados ainda</span></div>'
      );
    }
    const classificacao = window.App.classificarIndicador(tipo, valor);
    return (
      '<div class="cartao-indicador">' +
      '<span class="rotulo-indicador">' + titulo + '</span>' +
      '<div class="valor-indicador">' + valor + ' <span class="texto-fraco" style="font-size:14px">' + unidade + '</span></div>' +
      '<span class="etiqueta ' + window.App.classePorIndicador(classificacao) + '">' + classificacao + '</span></div>'
    );
  }

  function renderProximasConsultas() {
    const hoje = hojeISO();
    const agenda = window.DB.Agenda.listar({ patientId: sessao.userId }).filter(
      (a) => a.data >= hoje && (a.status === 'confirmada' || a.status === 'solicitada')
    );
    const container = document.getElementById('lista-proximas-consultas');
    if (agenda.length === 0) {
      container.innerHTML = '<p class="vazio">Nenhuma consulta agendada. <a href="agenda.html">Solicitar horário</a>.</p>';
      return;
    }
    container.innerHTML = agenda
      .slice(0, 5)
      .map(
        (a) =>
          '<div class="item-consulta-mini"><span>' + window.App.formatarData(a.data) + ' às ' + a.hora + '</span>' +
          window.App.etiquetaStatusAgenda(a.status) + '</div>'
      )
      .join('');
  }

  function renderNotificacoes() {
    const notifs = window.DB.Notificacoes.listar({ patientId: sessao.userId }).slice(0, 4);
    const container = document.getElementById('lista-notificacoes-recentes');
    if (notifs.length === 0) {
      container.innerHTML = '<p class="vazio">Nenhuma notificação recebida ainda.</p>';
      return;
    }
    container.innerHTML = notifs
      .map(function (n) {
        const info = window.App.infoTipoNotificacao(n.tipo);
        return (
          '<div class="item-notificacao-mini"><strong>' + info.icone + ' ' + window.App.escaparHtml(n.titulo) + '</strong><br>' +
          '<span class="texto-fraco">' + window.App.formatarDataHora(n.criadoEm) + '</span></div>'
        );
      })
      .join('');
  }

  document.getElementById('nome-paciente').textContent = sessao.nome;
  renderIndicadores();
  renderProximasConsultas();
  renderNotificacoes();
})();
