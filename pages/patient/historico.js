/* historico.js (patient) */
(function () {
  const sessao = window.App.protegerPagina(['paciente']);
  if (!sessao) return;

  function itemDado(rotulo, valor) {
    if (valor === null || valor === undefined || valor === '') return '';
    return '<div class="item-dado-consulta"><span class="rotulo">' + rotulo + '</span><span class="valor-dado">' + window.App.escaparHtml(valor) + '</span></div>';
  }

  async function render() {
    const consultas = window.DB.Agenda.listar({ patientId: sessao.userId }).filter((a) => a.status === 'realizada').reverse();
    const container = document.getElementById('lista-historico-paciente');

    if (consultas.length === 0) {
      container.innerHTML = '<div class="cartao vazio"><span class="icone-vazio">📖</span>Você ainda não tem consultas registradas.</div>';
      return;
    }

    const itens = await Promise.all(
      consultas.map(async function (a) {
        const dados = (await window.DB.Agenda.dadosClinicos(a)) || {};
        const profissional = window.DB.Profissionais.obter(a.professionalId);
        const bpmClass = dados.frequenciaCardiaca ? window.App.classificarIndicador('bpm', dados.frequenciaCardiaca) : null;
        const glicemiaClass = dados.glicemia ? window.App.classificarIndicador('glicemia', dados.glicemia) : null;

        let grade = '<div class="grade-dados-consulta">';
        grade += itemDado('Peso', dados.peso ? dados.peso + ' kg' : '');
        grade += itemDado('Altura', dados.altura ? dados.altura + ' m' : '');
        grade += itemDado('IMC', dados.imc ? dados.imc + ' (' + window.App.classificarImc(dados.imc) + ')' : '');
        grade += itemDado('Pressão arterial', dados.pressaoArterial ? dados.pressaoArterial + ' mmHg' : '');
        grade += itemDado('Frequência cardíaca', dados.frequenciaCardiaca ? dados.frequenciaCardiaca + ' bpm' + (bpmClass ? ' — ' + bpmClass : '') : '');
        grade += itemDado('Glicemia', dados.glicemia ? dados.glicemia + ' mg/dL' + (glicemiaClass ? ' — ' + glicemiaClass : '') : '');
        grade += itemDado('Hábitos de sono', dados.habitosSono);
        grade += itemDado('Atividade física', dados.atividadeFisica);
        grade += '</div>';

        const algumDado = Object.keys(dados).some((k) => dados[k]);

        return (
          '<div class="item-historico-paciente">' +
          '<div class="cabecalho-item"><strong>' + window.App.formatarData(a.data) + ' às ' + a.hora + '</strong>' +
          '<span class="texto-fraco">' + (profissional ? window.App.escaparHtml(profissional.nome) : '') + '</span></div>' +
          (algumDado ? grade : '<p class="texto-fraco">Nenhum dado clínico foi registrado nesta consulta.</p>') +
          (dados.alimentacao ? '<p class="texto-pequeno" style="margin-top:8px"><strong>Alimentação:</strong> ' + window.App.escaparHtml(dados.alimentacao) + '</p>' : '') +
          (dados.observacoes ? '<p class="texto-pequeno"><strong>Observações:</strong> ' + window.App.escaparHtml(dados.observacoes) + '</p>' : '') +
          '</div>'
        );
      })
    );

    container.innerHTML = itens.join('');
  }

  render();
})();
