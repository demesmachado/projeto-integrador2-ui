/* agenda.js (professional) */
(function () {
  const sessao = window.App.protegerPagina(['profissional']);
  if (!sessao) return;

  const modalHorario = document.getElementById('modal-horario');
  const formHorario = document.getElementById('formulario-horario');
  const modalConsulta = document.getElementById('modal-consulta');
  const formConsulta = document.getElementById('formulario-consulta');

  let filtroStatus = '';
  let termoBusca = '';

  function render() {
    let lista = window.DB.Agenda.listar({ professionalId: sessao.userId });
    if (filtroStatus) lista = lista.filter((a) => a.status === filtroStatus);
    if (termoBusca) {
      const alvo = termoBusca.toLowerCase();
      lista = lista.filter((a) => {
        const paciente = a.patientId ? window.DB.Pacientes.obter(a.patientId) : null;
        return paciente && paciente.nome.toLowerCase().includes(alvo);
      });
    }

    const corpo = document.getElementById('corpo-tabela-agenda');
    if (lista.length === 0) {
      corpo.innerHTML = '<tr><td colspan="5" class="tabela-vazia">Nenhum horário encontrado. Clique em "Novo horário" para começar.</td></tr>';
      return;
    }

    corpo.innerHTML = lista
      .map(function (a) {
        const paciente = a.patientId ? window.DB.Pacientes.obter(a.patientId) : null;
        return (
          '<tr>' +
          '<td>' + window.App.formatarData(a.data) + '</td>' +
          '<td>' + a.hora + '</td>' +
          '<td>' + (paciente ? window.App.escaparHtml(paciente.nome) : '<span class="campo-vazio-dado">Disponível</span>') + '</td>' +
          '<td>' + window.App.etiquetaStatusAgenda(a.status) + '</td>' +
          '<td class="grupo-botoes">' + acoesParaLinha(a) + '</td>' +
          '</tr>'
        );
      })
      .join('');

    ligarAcoes();
  }

  function acoesParaLinha(a) {
    if (a.status === 'disponivel') {
      return '<button type="button" class="botao botao-perigo botao-pequeno" data-excluir="' + a.id + '">Excluir</button>';
    }
    if (a.status === 'solicitada') {
      return (
        '<button type="button" class="botao botao-primario botao-pequeno" data-confirmar="' + a.id + '">Confirmar</button>' +
        '<button type="button" class="botao botao-perigo botao-pequeno" data-recusar="' + a.id + '">Recusar</button>'
      );
    }
    if (a.status === 'confirmada') {
      return (
        '<button type="button" class="botao botao-secundario botao-pequeno" data-registrar="' + a.id + '">Registrar consulta</button>' +
        '<button type="button" class="botao botao-fantasma botao-pequeno" data-cancelar="' + a.id + '">Cancelar</button>'
      );
    }
    if (a.status === 'realizada') {
      return '<button type="button" class="botao botao-contorno botao-pequeno" data-ver="' + a.id + '">Ver dados</button>';
    }
    return '<button type="button" class="botao botao-perigo botao-pequeno" data-excluir="' + a.id + '">Excluir</button>';
  }

  function ligarAcoes() {
    document.querySelectorAll('[data-confirmar]').forEach((b) => b.addEventListener('click', () => confirmar(b.dataset.confirmar)));
    document.querySelectorAll('[data-recusar]').forEach((b) => b.addEventListener('click', () => recusar(b.dataset.recusar)));
    document.querySelectorAll('[data-cancelar]').forEach((b) => b.addEventListener('click', () => cancelar(b.dataset.cancelar)));
    document.querySelectorAll('[data-excluir]').forEach((b) => b.addEventListener('click', () => excluir(b.dataset.excluir)));
    document.querySelectorAll('[data-registrar]').forEach((b) => b.addEventListener('click', () => abrirRegistrarConsulta(b.dataset.registrar)));
    document.querySelectorAll('[data-ver]').forEach((b) => b.addEventListener('click', () => abrirVerConsulta(b.dataset.ver)));
  }

  function confirmar(id) {
    window.DB.Agenda.confirmar(id);
    window.App.toast('Consulta confirmada.', 'sucesso');
    render();
  }

  function recusar(id) {
    if (!window.App.confirmarAcao('Recusar a solicitação deste paciente?')) return;
    window.DB.Agenda.recusar(id);
    window.App.toast('Solicitação recusada.', 'info');
    render();
  }

  function cancelar(id) {
    if (!window.App.confirmarAcao('Cancelar esta consulta confirmada?')) return;
    window.DB.Agenda.atualizar(id, { status: 'cancelada' });
    window.App.toast('Consulta cancelada.', 'info');
    render();
  }

  function excluir(id) {
    if (!window.App.confirmarExclusao('Excluir este horário da agenda?')) return;
    window.DB.Agenda.excluir(id);
    window.App.toast('Horário excluído.', 'sucesso');
    render();
  }

  // ---------- novo horário ----------

  document.getElementById('botao-novo-horario').addEventListener('click', function () {
    formHorario.reset();
    document.getElementById('horario-data').valueAsDate = new Date();
    window.App.abrirModal('modal-horario');
  });

  formHorario.addEventListener('submit', function (evento) {
    evento.preventDefault();
    const data = document.getElementById('horario-data').value;
    const hora = document.getElementById('horario-hora').value;
    if (!data || !hora) {
      window.App.toast('Informe data e hora.', 'erro');
      return;
    }
    window.DB.Agenda.criarHorario({ professionalId: sessao.userId, organizationId: sessao.organizationId, data, hora });
    window.App.toast('Horário criado.', 'sucesso');
    window.App.fecharModal('modal-horario');
    render();
  });

  // ---------- registrar consulta ----------

  function atualizarImcCalculado() {
    const peso = document.getElementById('consulta-peso').value;
    const altura = document.getElementById('consulta-altura').value;
    const imc = window.App.calcularImc(peso, altura);
    const campoImc = document.getElementById('consulta-imc');
    if (imc === null) {
      campoImc.value = '';
    } else {
      const classificacao = window.App.classificarImc(imc);
      campoImc.value = imc + ' — ' + classificacao;
    }
  }

  document.getElementById('consulta-peso').addEventListener('input', atualizarImcCalculado);
  document.getElementById('consulta-altura').addEventListener('input', atualizarImcCalculado);

  function abrirRegistrarConsulta(id) {
    const agendamento = window.DB.Agenda.obter(id);
    if (!agendamento) return;
    const paciente = window.DB.Pacientes.obter(agendamento.patientId);
    formConsulta.reset();
    document.getElementById('consulta-agendamento-id').value = id;
    document.getElementById('paciente-nome-consulta').textContent = paciente ? paciente.nome : '';
    document.getElementById('consulta-imc').value = '';
    window.App.abrirModal('modal-consulta');
  }

  formConsulta.addEventListener('submit', async function (evento) {
    evento.preventDefault();
    const id = document.getElementById('consulta-agendamento-id').value;
    const peso = document.getElementById('consulta-peso').value;
    const altura = document.getElementById('consulta-altura').value;
    const imc = window.App.calcularImc(peso, altura);

    const dadosClinicos = {
      peso: peso || null,
      altura: altura || null,
      imc: imc,
      pressaoArterial: document.getElementById('consulta-pressao').value.trim() || null,
      frequenciaCardiaca: document.getElementById('consulta-bpm').value || null,
      glicemia: document.getElementById('consulta-glicemia').value || null,
      habitosSono: document.getElementById('consulta-sono').value || null,
      atividadeFisica: document.getElementById('consulta-atividade').value || null,
      alimentacao: document.getElementById('consulta-alimentacao').value.trim() || null,
      observacoes: document.getElementById('consulta-observacoes').value.trim() || null
    };

    await window.DB.Agenda.registrarConsulta(id, dadosClinicos);
    window.App.toast('Consulta registrada com sucesso.', 'sucesso');
    window.App.fecharModal('modal-consulta');
    render();
  });

  // ---------- ver dados da consulta ----------

  function itemDado(rotulo, valor, etiquetaExtra) {
    if (valor === null || valor === undefined || valor === '') return '';
    return (
      '<div class="item-dado-consulta"><span class="rotulo">' + rotulo + '</span>' +
      '<span class="valor-dado">' + window.App.escaparHtml(valor) + (etiquetaExtra || '') + '</span></div>'
    );
  }

  async function abrirVerConsulta(id) {
    const agendamento = window.DB.Agenda.obter(id);
    if (!agendamento) return;
    const paciente = window.DB.Pacientes.obter(agendamento.patientId);
    const dados = (await window.DB.Agenda.dadosClinicos(agendamento)) || {};

    const bpmClass = dados.frequenciaCardiaca ? window.App.classificarIndicador('bpm', dados.frequenciaCardiaca) : null;
    const glicemiaClass = dados.glicemia ? window.App.classificarIndicador('glicemia', dados.glicemia) : null;

    let html = '<p class="texto-suave">' + window.App.escaparHtml(paciente ? paciente.nome : '') +
      ' — ' + window.App.formatarData(agendamento.data) + ' às ' + agendamento.hora + '</p>';

    html += '<div class="grade-dados-consulta">';
    html += itemDado('Peso', dados.peso ? dados.peso + ' kg' : '');
    html += itemDado('Altura', dados.altura ? dados.altura + ' m' : '');
    html += itemDado('IMC', dados.imc ? dados.imc + ' (' + window.App.classificarImc(dados.imc) + ')' : '');
    html += itemDado('Pressão arterial', dados.pressaoArterial ? dados.pressaoArterial + ' mmHg' : '');
    html += itemDado('Frequência cardíaca', dados.frequenciaCardiaca ? dados.frequenciaCardiaca + ' bpm' + (bpmClass ? ' — ' + bpmClass : '') : '');
    html += itemDado('Glicemia', dados.glicemia ? dados.glicemia + ' mg/dL' + (glicemiaClass ? ' — ' + glicemiaClass : '') : '');
    html += itemDado('Hábitos de sono', dados.habitosSono);
    html += itemDado('Atividade física', dados.atividadeFisica);
    html += '</div>';

    if (dados.alimentacao) html += '<p><strong>Alimentação:</strong> ' + window.App.escaparHtml(dados.alimentacao) + '</p>';
    if (dados.observacoes) html += '<p><strong>Observações:</strong> ' + window.App.escaparHtml(dados.observacoes) + '</p>';

    const algumDado = Object.values(dados).some((v) => v !== null && v !== undefined && v !== '');
    if (!algumDado) html += '<p class="vazio">Nenhum dado clínico foi registrado nesta consulta.</p>';

    document.getElementById('corpo-ver-consulta').innerHTML = html;
    window.App.abrirModal('modal-ver-consulta');
  }

  // ---------- filtros ----------

  document.getElementById('filtro-status').addEventListener('change', function (e) {
    filtroStatus = e.target.value;
    render();
  });
  document.getElementById('campo-busca').addEventListener('input', function (e) {
    termoBusca = e.target.value;
    render();
  });

  render();
})();
