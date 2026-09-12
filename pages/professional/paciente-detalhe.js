/* paciente-detalhe.js (professional) */
(function () {
  const sessao = window.App.protegerPagina(['profissional']);
  if (!sessao) return;

  const params = new URLSearchParams(window.location.search);
  const patientId = params.get('id');
  const paciente = patientId ? window.DB.Pacientes.obter(patientId) : null;

  if (!paciente || paciente.professionalId !== sessao.userId) {
    window.location.href = 'pacientes.html';
    return;
  }

  async function renderPerfil() {
    const sensiveis = (await window.DB.Pacientes.dadosSensiveis(paciente)) || {};
    const idade = window.App.calcularIdade(sensiveis.dataNascimento);
    const organizacao = paciente.organizationId ? window.DB.Organizacoes.obter(paciente.organizationId) : null;
    document.title = 'Saúde Digital — ' + paciente.nome;
    document.getElementById('cartao-perfil').innerHTML =
      '<span class="avatar-inicial">' + window.App.escaparHtml(paciente.nome.slice(0, 1).toUpperCase()) + '</span>' +
      '<div><h1>' + window.App.escaparHtml(paciente.nome) + '</h1>' +
      '<div class="meta-paciente">' +
      '<span>' + window.App.escaparHtml(sensiveis.sexo || '—') + '</span>' +
      '<span>' + (idade === null ? '—' : idade + ' anos') + '</span>' +
      '<span>' + window.App.escaparHtml(sensiveis.email || '—') + '</span>' +
      (organizacao ? '<span>' + window.App.escaparHtml(organizacao.nome) + '</span>' : '') +
      '</div></div>';
  }

  async function renderHistorico() {
    const consultas = window.DB.Agenda.listar({ patientId: paciente.id }).filter((a) => a.status === 'realizada');
    const container = document.getElementById('lista-historico');
    if (consultas.length === 0) {
      container.innerHTML = '<p class="vazio">Nenhuma consulta realizada ainda.</p>';
      return;
    }

    const itens = await Promise.all(
      consultas
        .slice()
        .reverse()
        .map(async function (a) {
          const dados = (await window.DB.Agenda.dadosClinicos(a)) || {};
          const chips = [];
          if (dados.peso) chips.push('Peso: ' + dados.peso + ' kg');
          if (dados.altura) chips.push('Altura: ' + dados.altura + ' m');
          if (dados.imc) chips.push('IMC: ' + dados.imc);
          if (dados.pressaoArterial) chips.push('PA: ' + dados.pressaoArterial + ' mmHg');
          if (dados.frequenciaCardiaca) chips.push('FC: ' + dados.frequenciaCardiaca + ' bpm');
          if (dados.glicemia) chips.push('Glicemia: ' + dados.glicemia + ' mg/dL');
          if (dados.habitosSono) chips.push('Sono: ' + dados.habitosSono);
          if (dados.atividadeFisica) chips.push('Atividade: ' + dados.atividadeFisica);

          return (
            '<div class="item-historico">' +
            '<div class="cabecalho-item"><strong>' + window.App.formatarData(a.data) + ' às ' + a.hora + '</strong></div>' +
            (chips.length
              ? '<div class="chips-dados">' + chips.map((c) => '<span class="chip-dado">' + window.App.escaparHtml(c) + '</span>').join('') + '</div>'
              : '<p class="texto-fraco">Nenhum dado clínico registrado nesta consulta.</p>') +
            (dados.alimentacao ? '<p class="texto-pequeno"><strong>Alimentação:</strong> ' + window.App.escaparHtml(dados.alimentacao) + '</p>' : '') +
            (dados.observacoes ? '<p class="texto-pequeno"><strong>Observações:</strong> ' + window.App.escaparHtml(dados.observacoes) + '</p>' : '') +
            '</div>'
          );
        })
    );

    container.innerHTML = itens.join('');
  }

  async function renderEvolucao() {
    const evolucoes = window.DB.Evolucoes.listar({ patientId: paciente.id });
    const container = document.getElementById('lista-evolucao');
    if (evolucoes.length === 0) {
      container.innerHTML = '<p class="vazio">Nenhuma evolução registrada ainda.</p>';
      return;
    }
    const itens = await Promise.all(
      evolucoes.map(async function (ev) {
        const dados = await window.DB.Evolucoes.dados(ev);
        if (!dados) return '';
        return (
          '<div class="item-evolucao">' +
          '<div class="cabecalho-item"><span class="etiqueta ' + window.App.classePorIndicador(dados.indicadorBemEstar) + '">' +
          dados.indicadorBemEstar + '</span><span class="texto-fraco">' + window.App.formatarDataHora(ev.criadoEm) + '</span></div>' +
          '<p>' + window.App.escaparHtml(dados.texto) + '</p></div>'
        );
      })
    );
    container.innerHTML = itens.join('');
  }

  document.getElementById('formulario-evolucao').addEventListener('submit', async function (evento) {
    evento.preventDefault();
    const indicador = document.getElementById('evolucao-indicador').value;
    const texto = document.getElementById('evolucao-texto').value.trim();
    if (!texto) {
      window.App.toast('Escreva uma nota de evolução.', 'erro');
      return;
    }
    await window.DB.Evolucoes.criar({ patientId: paciente.id, professionalId: sessao.userId, texto, indicadorBemEstar: indicador });
    document.getElementById('evolucao-texto').value = '';
    window.App.toast('Evolução registrada.', 'sucesso');
    renderEvolucao();
  });

  function renderNotificacoes() {
    const notifs = window.DB.Notificacoes.listar({ patientId: paciente.id }).slice(0, 5);
    const container = document.getElementById('lista-notificacoes-paciente');
    if (notifs.length === 0) {
      container.innerHTML = '<p class="texto-fraco">Nenhuma notificação enviada a este paciente.</p>';
      return;
    }
    container.innerHTML = notifs
      .map(
        (n) =>
          '<div class="notificacao-mini"><strong>' + window.App.escaparHtml(n.titulo) + '</strong><br>' +
          '<span class="texto-fraco">' + window.App.formatarDataHora(n.criadoEm) + '</span></div>'
      )
      .join('');
  }

  document.getElementById('link-nova-notificacao').addEventListener('click', function (evento) {
    evento.preventDefault();
    window.location.href = 'notificacoes.html?patientId=' + paciente.id;
  });

  // ---------- conteúdos recomendados ----------

  function popularSeletorConteudo() {
    const todos = window.DB.Conteudos.listar();
    const jaRecomendados = window.DB.Recomendacoes.listar({ patientId: paciente.id }).map((r) => r.contentId);
    const disponiveis = todos.filter((c) => jaRecomendados.indexOf(c.id) === -1);
    const seletor = document.getElementById('seletor-conteudo');
    const botao = document.getElementById('botao-recomendar');
    if (disponiveis.length === 0) {
      seletor.innerHTML = '<option value="">Todos os conteúdos já foram recomendados</option>';
      botao.disabled = true;
    } else {
      seletor.innerHTML = disponiveis.map((c) => '<option value="' + c.id + '">' + window.App.escaparHtml(c.titulo) + '</option>').join('');
      botao.disabled = false;
    }
  }

  function renderRecomendacoes() {
    const recs = window.DB.Recomendacoes.listar({ patientId: paciente.id });
    const container = document.getElementById('lista-recomendacoes');
    if (recs.length === 0) {
      container.innerHTML = '<p class="texto-fraco">Nenhum conteúdo recomendado ainda.</p>';
      return;
    }
    container.innerHTML = recs
      .map(function (r) {
        const conteudo = window.DB.Conteudos.obter(r.contentId);
        if (!conteudo) return '';
        return (
          '<div class="item-recomendacao"><span>' + window.App.escaparHtml(conteudo.titulo) + '</span>' +
          '<button type="button" class="botao botao-perigo botao-pequeno" data-remover-rec="' + r.id + '">Remover</button></div>'
        );
      })
      .join('');

    container.querySelectorAll('[data-remover-rec]').forEach((b) =>
      b.addEventListener('click', function () {
        window.DB.Recomendacoes.excluir(b.dataset.removerRec);
        window.App.toast('Recomendação removida.', 'info');
        renderRecomendacoes();
        popularSeletorConteudo();
      })
    );
  }

  document.getElementById('botao-recomendar').addEventListener('click', function () {
    const contentId = document.getElementById('seletor-conteudo').value;
    if (!contentId) return;
    window.DB.Recomendacoes.criar({ contentId, patientId: paciente.id, professionalId: sessao.userId });
    window.App.toast('Conteúdo recomendado ao paciente.', 'sucesso');
    renderRecomendacoes();
    popularSeletorConteudo();
  });

  renderPerfil();
  renderHistorico();
  renderEvolucao();
  renderNotificacoes();
  popularSeletorConteudo();
  renderRecomendacoes();
})();
