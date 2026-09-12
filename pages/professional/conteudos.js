/* conteudos.js (professional) */
(function () {
  const sessao = window.App.protegerPagina(['profissional']);
  if (!sessao) return;

  const form = document.getElementById('formulario-conteudo');
  const modal = document.getElementById('modal-conteudo');

  function render() {
    const conteudos = window.DB.Conteudos.listar();
    const grade = document.getElementById('grade-conteudos');
    if (conteudos.length === 0) {
      grade.innerHTML = '<div class="vazio"><span class="icone-vazio">🎬</span>Nenhum conteúdo cadastrado ainda.</div>';
      return;
    }

    grade.innerHTML = conteudos
      .map(function (c) {
        const info = window.App.infoTipoConteudo(c.tipo);
        return (
          '<div class="cartao-conteudo">' +
          '<span class="icone-conteudo">' + info.icone + '</span>' +
          '<h3>' + window.App.escaparHtml(c.titulo) + '</h3>' +
          '<span class="etiqueta etiqueta-verde">' + info.rotulo + '</span>' +
          '<p>' + window.App.escaparHtml(c.descricao) + '</p>' +
          (c.url ? '<a href="' + window.App.escaparHtml(c.url) + '" target="_blank" rel="noopener" class="texto-pequeno">Acessar conteúdo ↗</a>' : '') +
          '<div class="rodape-conteudo">' +
          '<button type="button" class="botao botao-contorno botao-pequeno" data-editar="' + c.id + '">Editar</button>' +
          '<button type="button" class="botao botao-perigo botao-pequeno" data-excluir="' + c.id + '">Excluir</button>' +
          '</div></div>'
        );
      })
      .join('');

    grade.querySelectorAll('[data-editar]').forEach((b) => b.addEventListener('click', () => abrirEdicao(b.dataset.editar)));
    grade.querySelectorAll('[data-excluir]').forEach((b) => b.addEventListener('click', () => excluir(b.dataset.excluir)));
  }

  function abrirNovo() {
    form.reset();
    document.getElementById('conteudo-id').value = '';
    document.getElementById('titulo-modal-conteudo').textContent = 'Novo conteúdo';
    window.App.abrirModal('modal-conteudo');
  }

  function abrirEdicao(id) {
    const c = window.DB.Conteudos.obter(id);
    if (!c) return;
    document.getElementById('titulo-modal-conteudo').textContent = 'Editar conteúdo';
    document.getElementById('conteudo-id').value = c.id;
    document.getElementById('conteudo-titulo').value = c.titulo;
    document.getElementById('conteudo-tipo').value = c.tipo;
    document.getElementById('conteudo-descricao').value = c.descricao;
    document.getElementById('conteudo-url').value = c.url || '';
    window.App.abrirModal('modal-conteudo');
  }

  function excluir(id) {
    if (!window.App.confirmarExclusao('Excluir este conteúdo? Recomendações já feitas para pacientes também serão removidas.')) return;
    window.DB.Conteudos.excluir(id);
    window.App.toast('Conteúdo excluído.', 'sucesso');
    render();
  }

  document.getElementById('botao-novo-conteudo').addEventListener('click', abrirNovo);

  modal.addEventListener('close', function () {
    form.reset();
  });

  form.addEventListener('submit', function (evento) {
    evento.preventDefault();
    const id = document.getElementById('conteudo-id').value;
    const titulo = document.getElementById('conteudo-titulo').value.trim();
    const tipo = document.getElementById('conteudo-tipo').value;
    const descricao = document.getElementById('conteudo-descricao').value.trim();
    const url = document.getElementById('conteudo-url').value.trim();

    if (!titulo || !descricao) {
      window.App.toast('Preencha título e descrição.', 'erro');
      return;
    }

    if (id) {
      window.DB.Conteudos.atualizar(id, { titulo, tipo, descricao, url });
      window.App.toast('Conteúdo atualizado.', 'sucesso');
    } else {
      window.DB.Conteudos.criar({ titulo, tipo, descricao, url, criadoPor: sessao.userId });
      window.App.toast('Conteúdo cadastrado.', 'sucesso');
    }
    window.App.fecharModal('modal-conteudo');
    render();
  });

  render();
})();
