/* pacientes.js (professional) */
(function () {
  const sessao = window.App.protegerPagina(['profissional']);
  if (!sessao) return;

  let termoBusca = '';

  async function render() {
    const todos = window.DB.Pacientes.listar({ professionalId: sessao.userId });
    const alvo = termoBusca.toLowerCase();
    const filtrados = todos.filter((p) => !alvo || p.nome.toLowerCase().includes(alvo));

    const corpo = document.getElementById('corpo-tabela-pacientes');
    if (filtrados.length === 0) {
      corpo.innerHTML = '<tr><td colspan="4" class="tabela-vazia">Nenhum paciente vinculado a você ainda.</td></tr>';
      return;
    }

    const linhas = await Promise.all(
      filtrados.map(async function (p) {
        const sensiveis = await window.DB.Pacientes.dadosSensiveis(p);
        const idade = sensiveis ? window.App.calcularIdade(sensiveis.dataNascimento) : null;
        const iniciais = p.nome.trim().slice(0, 1).toUpperCase();
        return (
          '<tr>' +
          '<td><div class="linha-com-avatar"><span class="avatar-inicial">' + iniciais + '</span>' + window.App.escaparHtml(p.nome) + '</div></td>' +
          '<td>' + window.App.escaparHtml(sensiveis ? sensiveis.sexo : '—') + '</td>' +
          '<td>' + (idade === null ? '—' : idade + ' anos') + '</td>' +
          '<td><a class="botao botao-contorno botao-pequeno" href="paciente-detalhe.html?id=' + p.id + '">Ver ficha</a></td>' +
          '</tr>'
        );
      })
    );

    corpo.innerHTML = linhas.join('');
  }

  document.getElementById('campo-busca').addEventListener('input', function (e) {
    termoBusca = e.target.value;
    render();
  });

  render();
})();
