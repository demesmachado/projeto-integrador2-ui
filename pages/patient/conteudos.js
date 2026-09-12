/* conteudos.js (patient) */
(function () {
  const sessao = window.App.protegerPagina(['paciente']);
  if (!sessao) return;

  function render() {
    const recomendacoes = window.DB.Recomendacoes.listar({ patientId: sessao.userId });
    const grade = document.getElementById('grade-conteudos');

    if (recomendacoes.length === 0) {
      grade.innerHTML = '<div class="vazio"><span class="icone-vazio">🎬</span>Nenhum conteúdo foi recomendado para você ainda.</div>';
      return;
    }

    grade.innerHTML = recomendacoes
      .map(function (r) {
        const conteudo = window.DB.Conteudos.obter(r.contentId);
        if (!conteudo) return '';
        const info = window.App.infoTipoConteudo(conteudo.tipo);
        return (
          '<div class="cartao-conteudo">' +
          '<span class="icone-conteudo">' + info.icone + '</span>' +
          '<h3>' + window.App.escaparHtml(conteudo.titulo) + '</h3>' +
          '<span class="etiqueta etiqueta-verde">' + info.rotulo + '</span>' +
          '<p>' + window.App.escaparHtml(conteudo.descricao) + '</p>' +
          (conteudo.url ? '<a href="' + window.App.escaparHtml(conteudo.url) + '" target="_blank" rel="noopener" class="texto-pequeno">Acessar conteúdo ↗</a>' : '') +
          '</div>'
        );
      })
      .join('');
  }

  render();
})();
