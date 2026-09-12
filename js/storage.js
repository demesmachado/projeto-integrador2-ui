/**
 * storage.js — camada de dados da aplicação Saúde Digital.
 * Toda a "base de dados" vive no LocalStorage do navegador.
 * Campos sensíveis (dados de pacientes, consultas e evolução) são
 * criptografados com AES-GCM usando uma chave derivada via SHA-256
 * (Web Crypto API). Senhas de acesso são armazenadas apenas como hash SHA-256.
 */
(function (window) {
  'use strict';

  const PREFIXO = 'sd_';
  // Em uma aplicação real esse segredo viveria no backend. Como este é um
  // protótipo 100% frontend (sem servidor), ele fica aqui apenas para
  // demonstrar o fluxo de derivação de chave via SHA-256 + AES-GCM.
  const APP_SECRET = 'saude-digital-local-v1';

  const CHAVES = {
    organizacoes: PREFIXO + 'organizacoes',
    superadmins: PREFIXO + 'superadmins',
    admins: PREFIXO + 'admins',
    profissionais: PREFIXO + 'profissionais',
    pacientes: PREFIXO + 'pacientes',
    agenda: PREFIXO + 'agenda',
    evolucoes: PREFIXO + 'evolucoes',
    notificacoes: PREFIXO + 'notificacoes',
    conteudos: PREFIXO + 'conteudos',
    recomendacoes: PREFIXO + 'recomendacoes',
    sessao: PREFIXO + 'sessao',
    termosVistos: PREFIXO + 'termos_vistos',
    versao: PREFIXO + 'versao_dados'
  };

  // ---------- utilitários de baixo nível ----------

  function ler(chave, padrao) {
    try {
      const bruto = window.localStorage.getItem(chave);
      if (bruto === null) return padrao;
      return JSON.parse(bruto);
    } catch (e) {
      console.error('Falha ao ler ' + chave, e);
      return padrao;
    }
  }

  function gravar(chave, valor) {
    window.localStorage.setItem(chave, JSON.stringify(valor));
  }

  function gerarId() {
    if (window.crypto && typeof window.crypto.randomUUID === 'function') {
      return window.crypto.randomUUID();
    }
    return 'id-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 10);
  }

  function gerarSenhaCurta() {
    return String(Math.floor(100000 + Math.random() * 900000));
  }

  function bufParaBase64(buf) {
    const bytes = new Uint8Array(buf);
    let binario = '';
    for (let i = 0; i < bytes.byteLength; i++) binario += String.fromCharCode(bytes[i]);
    return window.btoa(binario);
  }

  function base64ParaBuf(b64) {
    const binario = window.atob(b64);
    const bytes = new Uint8Array(binario.length);
    for (let i = 0; i < binario.length; i++) bytes[i] = binario.charCodeAt(i);
    return bytes.buffer;
  }

  function bufParaHex(buf) {
    return Array.from(new Uint8Array(buf))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
  }

  async function sha256Hex(texto) {
    const dados = new TextEncoder().encode(texto);
    const hash = await window.crypto.subtle.digest('SHA-256', dados);
    return bufParaHex(hash);
  }

  async function derivarChaveAes(escopo) {
    const material = new TextEncoder().encode(APP_SECRET + ':' + escopo);
    const hash = await window.crypto.subtle.digest('SHA-256', material);
    return window.crypto.subtle.importKey('raw', hash, { name: 'AES-GCM' }, false, ['encrypt', 'decrypt']);
  }

  async function criptografar(objeto, escopo) {
    const chave = await derivarChaveAes(escopo);
    const iv = window.crypto.getRandomValues(new Uint8Array(12));
    const dados = new TextEncoder().encode(JSON.stringify(objeto));
    const cifrado = await window.crypto.subtle.encrypt({ name: 'AES-GCM', iv }, chave, dados);
    return bufParaBase64(iv) + '.' + bufParaBase64(cifrado);
  }

  async function descriptografar(textoCifrado, escopo) {
    if (!textoCifrado) return null;
    const partes = textoCifrado.split('.');
    if (partes.length !== 2) return null;
    try {
      const chave = await derivarChaveAes(escopo);
      const iv = base64ParaBuf(partes[0]);
      const cifrado = base64ParaBuf(partes[1]);
      const plano = await window.crypto.subtle.decrypt({ name: 'AES-GCM', iv }, chave, cifrado);
      return JSON.parse(new TextDecoder().decode(plano));
    } catch (e) {
      console.error('Falha ao descriptografar registro', e);
      return null;
    }
  }

  async function hashSenha(senha, salt) {
    return sha256Hex(senha + ':' + salt);
  }

  // ---------- seed inicial ----------

  async function inicializar() {
    if (ler(CHAVES.versao, null)) return;

    gravar(CHAVES.organizacoes, []);
    gravar(CHAVES.admins, []);
    gravar(CHAVES.profissionais, []);
    gravar(CHAVES.pacientes, []);
    gravar(CHAVES.agenda, []);
    gravar(CHAVES.evolucoes, []);
    gravar(CHAVES.notificacoes, []);
    gravar(CHAVES.recomendacoes, []);

    const superAdminId = gerarId();
    const senhaHash = await hashSenha('superadm@senha', superAdminId);
    gravar(CHAVES.superadmins, [
      {
        id: superAdminId,
        nome: 'Super Administrador',
        email: 'superadm@email.com',
        senhaHash,
        criadoEm: new Date().toISOString()
      }
    ]);

    gravar(CHAVES.conteudos, [
      {
        id: gerarId(),
        titulo: 'Evite o estresse!',
        tipo: 'documentario',
        descricao:
          'Documentário sobre técnicas de controle do estresse no dia a dia e seus impactos na saúde física e mental.',
        url: '',
        criadoPor: 'sistema',
        criadoEm: new Date().toISOString()
      },
      {
        id: gerarId(),
        titulo: 'Pare de fumar: Malefícios do tabaco!',
        tipo: 'documentario',
        descricao:
          'Conteúdo educativo sobre os riscos do tabagismo para a saúde e orientações para quem deseja parar de fumar.',
        url: '',
        criadoPor: 'sistema',
        criadoEm: new Date().toISOString()
      }
    ]);

    gravar(CHAVES.versao, '1.0.0');
  }

  // ---------- sessão ----------

  const Sessao = {
    obter() {
      return ler(CHAVES.sessao, null);
    },
    definir(sessao) {
      gravar(CHAVES.sessao, sessao);
    },
    encerrar() {
      window.localStorage.removeItem(CHAVES.sessao);
    }
  };

  // ---------- organizações ----------

  const Organizacoes = {
    listar() {
      return ler(CHAVES.organizacoes, []);
    },
    obter(id) {
      return this.listar().find((o) => o.id === id) || null;
    },
    criar({ nome, tipo }) {
      const lista = this.listar();
      const registro = { id: gerarId(), nome, tipo, criadoEm: new Date().toISOString() };
      lista.push(registro);
      gravar(CHAVES.organizacoes, lista);
      return registro;
    },
    atualizar(id, dados) {
      const lista = this.listar();
      const idx = lista.findIndex((o) => o.id === id);
      if (idx === -1) return null;
      lista[idx] = Object.assign({}, lista[idx], dados);
      gravar(CHAVES.organizacoes, lista);
      return lista[idx];
    },
    excluir(id) {
      gravar(CHAVES.organizacoes, this.listar().filter((o) => o.id !== id));
      Admins.listar({ organizationId: id }).forEach((a) => Admins.excluir(a.id));
      Profissionais.listar({ organizationId: id }).forEach((p) => Profissionais.excluir(p.id));
      Pacientes.listar({ organizationId: id }).forEach((p) => Pacientes.excluir(p.id));
    }
  };

  // ---------- admins ----------

  const Admins = {
    listar(filtro) {
      let lista = ler(CHAVES.admins, []);
      if (filtro && filtro.organizationId) {
        lista = lista.filter((a) => a.organizationId === filtro.organizationId);
      }
      return lista;
    },
    obter(id) {
      return this.listar().find((a) => a.id === id) || null;
    },
    obterPorEmail(email) {
      const alvo = (email || '').trim().toLowerCase();
      return this.listar().find((a) => a.email.trim().toLowerCase() === alvo) || null;
    },
    async criar({ nome, email, senha, organizationId }) {
      const lista = ler(CHAVES.admins, []);
      const id = gerarId();
      const senhaHash = await hashSenha(senha, id);
      const registro = {
        id,
        nome,
        email,
        senhaHash,
        organizationId,
        criadoEm: new Date().toISOString()
      };
      lista.push(registro);
      gravar(CHAVES.admins, lista);
      return registro;
    },
    async atualizar(id, dados) {
      const lista = ler(CHAVES.admins, []);
      const idx = lista.findIndex((a) => a.id === id);
      if (idx === -1) return null;
      const atualizado = Object.assign({}, lista[idx], dados);
      if (dados.novaSenha) {
        atualizado.senhaHash = await hashSenha(dados.novaSenha, id);
      }
      delete atualizado.novaSenha;
      lista[idx] = atualizado;
      gravar(CHAVES.admins, lista);
      return lista[idx];
    },
    excluir(id) {
      gravar(CHAVES.admins, ler(CHAVES.admins, []).filter((a) => a.id !== id));
    }
  };

  // ---------- profissionais ----------

  const Profissionais = {
    listar(filtro) {
      let lista = ler(CHAVES.profissionais, []);
      if (filtro && filtro.organizationId) {
        lista = lista.filter((p) => p.organizationId === filtro.organizationId);
      }
      return lista;
    },
    obter(id) {
      return this.listar().find((p) => p.id === id) || null;
    },
    obterPorEmail(email) {
      const alvo = (email || '').trim().toLowerCase();
      return this.listar().find((p) => p.email.trim().toLowerCase() === alvo) || null;
    },
    async criar({ nome, especialidade, crm, telefone, email, organizationId, criadoPor }) {
      const lista = ler(CHAVES.profissionais, []);
      const id = gerarId();
      const senhaGerada = gerarSenhaCurta();
      const senhaHash = await hashSenha(senhaGerada, id);
      const registro = {
        id,
        nome,
        especialidade,
        crm,
        telefone,
        email,
        senhaHash,
        organizationId,
        criadoPor: criadoPor || null,
        criadoEm: new Date().toISOString()
      };
      lista.push(registro);
      gravar(CHAVES.profissionais, lista);
      return { profissional: registro, senhaGerada };
    },
    async atualizar(id, dados) {
      const lista = ler(CHAVES.profissionais, []);
      const idx = lista.findIndex((p) => p.id === id);
      if (idx === -1) return null;
      const atualizado = Object.assign({}, lista[idx], dados);
      if (dados.novaSenha) {
        atualizado.senhaHash = await hashSenha(dados.novaSenha, id);
      }
      delete atualizado.novaSenha;
      lista[idx] = atualizado;
      gravar(CHAVES.profissionais, lista);
      return lista[idx];
    },
    excluir(id) {
      gravar(CHAVES.profissionais, ler(CHAVES.profissionais, []).filter((p) => p.id !== id));
      const pacientes = Pacientes.listar({ professionalId: id });
      pacientes.forEach((pac) => Pacientes.atualizar(pac.id, { professionalId: null }));
    }
  };

  // ---------- pacientes ----------
  // Dados sensíveis (e-mail, data de nascimento, sexo) ficam criptografados
  // em `dadosEnc`. Guardamos também `emailHash` (SHA-256 sem reversão) só
  // para permitir localizar o paciente no login sem expor o e-mail em claro.

  const Pacientes = {
    listar(filtro) {
      let lista = ler(CHAVES.pacientes, []);
      if (filtro) {
        if (filtro.organizationId) lista = lista.filter((p) => p.organizationId === filtro.organizationId);
        if (filtro.professionalId) lista = lista.filter((p) => p.professionalId === filtro.professionalId);
      }
      return lista;
    },
    obter(id) {
      return this.listar().find((p) => p.id === id) || null;
    },
    async obterPorEmail(email) {
      const alvoHash = await sha256Hex((email || '').trim().toLowerCase());
      return this.listar().find((p) => p.emailHash === alvoHash) || null;
    },
    async criar({ nome, sexo, dataNascimento, email, organizationId, professionalId, criadoPor }) {
      const lista = ler(CHAVES.pacientes, []);
      const id = gerarId();
      const senhaGerada = gerarSenhaCurta();
      const senhaHash = await hashSenha(senhaGerada, id);
      const emailHash = await sha256Hex((email || '').trim().toLowerCase());
      const dadosEnc = await criptografar({ sexo, dataNascimento, email }, id);
      const registro = {
        id,
        nome,
        emailHash,
        dadosEnc,
        senhaHash,
        organizationId: organizationId || null,
        professionalId: professionalId || null,
        criadoPor: criadoPor || null,
        criadoEm: new Date().toISOString()
      };
      lista.push(registro);
      gravar(CHAVES.pacientes, lista);
      return { paciente: registro, senhaGerada };
    },
    async dadosSensiveis(paciente) {
      if (!paciente) return null;
      return descriptografar(paciente.dadosEnc, paciente.id);
    },
    async atualizar(id, dados) {
      const lista = ler(CHAVES.pacientes, []);
      const idx = lista.findIndex((p) => p.id === id);
      if (idx === -1) return null;
      const atual = lista[idx];
      const atualizado = Object.assign({}, atual);

      if ('nome' in dados) atualizado.nome = dados.nome;
      if ('organizationId' in dados) atualizado.organizationId = dados.organizationId;
      if ('professionalId' in dados) atualizado.professionalId = dados.professionalId;

      const precisaReencriptar = 'sexo' in dados || 'dataNascimento' in dados || 'email' in dados;
      if (precisaReencriptar) {
        const atuais = (await descriptografar(atual.dadosEnc, atual.id)) || {};
        const novosSensiveis = {
          sexo: 'sexo' in dados ? dados.sexo : atuais.sexo,
          dataNascimento: 'dataNascimento' in dados ? dados.dataNascimento : atuais.dataNascimento,
          email: 'email' in dados ? dados.email : atuais.email
        };
        atualizado.dadosEnc = await criptografar(novosSensiveis, id);
        if ('email' in dados) {
          atualizado.emailHash = await sha256Hex((dados.email || '').trim().toLowerCase());
        }
      }

      if (dados.novaSenha) {
        atualizado.senhaHash = await hashSenha(dados.novaSenha, id);
      }

      lista[idx] = atualizado;
      gravar(CHAVES.pacientes, lista);
      return lista[idx];
    },
    excluir(id) {
      gravar(CHAVES.pacientes, ler(CHAVES.pacientes, []).filter((p) => p.id !== id));
      gravar(CHAVES.agenda, ler(CHAVES.agenda, []).filter((a) => a.patientId !== id));
      gravar(CHAVES.evolucoes, ler(CHAVES.evolucoes, []).filter((e) => e.patientId !== id));
      gravar(CHAVES.notificacoes, ler(CHAVES.notificacoes, []).filter((n) => n.patientId !== id));
      gravar(CHAVES.recomendacoes, ler(CHAVES.recomendacoes, []).filter((r) => r.patientId !== id));
    }
  };

  // ---------- agenda / consultas ----------
  // Dados clínicos (peso, altura, IMC, pressão, glicemia, hábitos...) ficam
  // em `dadosClinicosEnc`, preenchido quando a consulta é registrada.

  const Agenda = {
    listar(filtro) {
      let lista = ler(CHAVES.agenda, []);
      if (filtro) {
        if (filtro.professionalId) lista = lista.filter((a) => a.professionalId === filtro.professionalId);
        if (filtro.patientId) lista = lista.filter((a) => a.patientId === filtro.patientId);
        if (filtro.status) lista = lista.filter((a) => a.status === filtro.status);
      }
      return lista.sort((a, b) => (a.data + a.hora).localeCompare(b.data + b.hora));
    },
    obter(id) {
      return this.listar().find((a) => a.id === id) || null;
    },
    criarHorario({ professionalId, organizationId, data, hora }) {
      const lista = ler(CHAVES.agenda, []);
      const registro = {
        id: gerarId(),
        professionalId,
        organizationId: organizationId || null,
        patientId: null,
        data,
        hora,
        status: 'disponivel',
        dadosClinicosEnc: null,
        criadoEm: new Date().toISOString()
      };
      lista.push(registro);
      gravar(CHAVES.agenda, lista);
      return registro;
    },
    atualizar(id, dados) {
      const lista = ler(CHAVES.agenda, []);
      const idx = lista.findIndex((a) => a.id === id);
      if (idx === -1) return null;
      lista[idx] = Object.assign({}, lista[idx], dados);
      gravar(CHAVES.agenda, lista);
      return lista[idx];
    },
    solicitar(id, patientId) {
      return this.atualizar(id, { patientId, status: 'solicitada' });
    },
    cancelarSolicitacao(id) {
      return this.atualizar(id, { patientId: null, status: 'disponivel' });
    },
    confirmar(id) {
      return this.atualizar(id, { status: 'confirmada' });
    },
    recusar(id) {
      return this.atualizar(id, { status: 'recusada' });
    },
    async registrarConsulta(id, dadosClinicos) {
      const registro = this.obter(id);
      if (!registro) return null;
      const dadosClinicosEnc = await criptografar(dadosClinicos, id);
      return this.atualizar(id, { status: 'realizada', dadosClinicosEnc });
    },
    async dadosClinicos(agendamento) {
      if (!agendamento) return null;
      return descriptografar(agendamento.dadosClinicosEnc, agendamento.id);
    },
    excluir(id) {
      gravar(CHAVES.agenda, ler(CHAVES.agenda, []).filter((a) => a.id !== id));
    }
  };

  // ---------- evolução ----------

  const Evolucoes = {
    listar(filtro) {
      let lista = ler(CHAVES.evolucoes, []);
      if (filtro) {
        if (filtro.patientId) lista = lista.filter((e) => e.patientId === filtro.patientId);
        if (filtro.professionalId) lista = lista.filter((e) => e.professionalId === filtro.professionalId);
      }
      return lista.sort((a, b) => b.criadoEm.localeCompare(a.criadoEm));
    },
    async criar({ patientId, professionalId, texto, indicadorBemEstar }) {
      const lista = ler(CHAVES.evolucoes, []);
      const id = gerarId();
      const dadosEnc = await criptografar({ texto, indicadorBemEstar }, id);
      const registro = { id, patientId, professionalId, dadosEnc, criadoEm: new Date().toISOString() };
      lista.push(registro);
      gravar(CHAVES.evolucoes, lista);
      return registro;
    },
    async dados(evolucao) {
      if (!evolucao) return null;
      return descriptografar(evolucao.dadosEnc, evolucao.id);
    },
    excluir(id) {
      gravar(CHAVES.evolucoes, ler(CHAVES.evolucoes, []).filter((e) => e.id !== id));
    }
  };

  // ---------- notificações ----------

  const Notificacoes = {
    listar(filtro) {
      let lista = ler(CHAVES.notificacoes, []);
      if (filtro) {
        if (filtro.patientId) lista = lista.filter((n) => n.patientId === filtro.patientId);
        if (filtro.professionalId) lista = lista.filter((n) => n.professionalId === filtro.professionalId);
      }
      return lista.sort((a, b) => b.criadoEm.localeCompare(a.criadoEm));
    },
    obter(id) {
      return this.listar().find((n) => n.id === id) || null;
    },
    criar({ patientId, professionalId, tipo, titulo, mensagem }) {
      const lista = ler(CHAVES.notificacoes, []);
      const registro = {
        id: gerarId(),
        patientId,
        professionalId,
        tipo,
        titulo,
        mensagem,
        lida: false,
        criadoEm: new Date().toISOString()
      };
      lista.push(registro);
      gravar(CHAVES.notificacoes, lista);
      return registro;
    },
    marcarLida(id) {
      const lista = ler(CHAVES.notificacoes, []);
      const idx = lista.findIndex((n) => n.id === id);
      if (idx === -1) return null;
      lista[idx].lida = true;
      gravar(CHAVES.notificacoes, lista);
      return lista[idx];
    },
    atualizar(id, dados) {
      const lista = ler(CHAVES.notificacoes, []);
      const idx = lista.findIndex((n) => n.id === id);
      if (idx === -1) return null;
      lista[idx] = Object.assign({}, lista[idx], dados);
      gravar(CHAVES.notificacoes, lista);
      return lista[idx];
    },
    excluir(id) {
      gravar(CHAVES.notificacoes, ler(CHAVES.notificacoes, []).filter((n) => n.id !== id));
    }
  };

  // ---------- conteúdos e recomendações ----------

  const Conteudos = {
    listar() {
      return ler(CHAVES.conteudos, []);
    },
    obter(id) {
      return this.listar().find((c) => c.id === id) || null;
    },
    criar({ titulo, tipo, descricao, url, criadoPor }) {
      const lista = this.listar();
      const registro = {
        id: gerarId(),
        titulo,
        tipo,
        descricao,
        url: url || '',
        criadoPor: criadoPor || null,
        criadoEm: new Date().toISOString()
      };
      lista.push(registro);
      gravar(CHAVES.conteudos, lista);
      return registro;
    },
    atualizar(id, dados) {
      const lista = this.listar();
      const idx = lista.findIndex((c) => c.id === id);
      if (idx === -1) return null;
      lista[idx] = Object.assign({}, lista[idx], dados);
      gravar(CHAVES.conteudos, lista);
      return lista[idx];
    },
    excluir(id) {
      gravar(CHAVES.conteudos, this.listar().filter((c) => c.id !== id));
      gravar(CHAVES.recomendacoes, ler(CHAVES.recomendacoes, []).filter((r) => r.contentId !== id));
    }
  };

  const Recomendacoes = {
    listar(filtro) {
      let lista = ler(CHAVES.recomendacoes, []);
      if (filtro) {
        if (filtro.patientId) lista = lista.filter((r) => r.patientId === filtro.patientId);
        if (filtro.professionalId) lista = lista.filter((r) => r.professionalId === filtro.professionalId);
      }
      return lista.sort((a, b) => b.criadoEm.localeCompare(a.criadoEm));
    },
    criar({ contentId, patientId, professionalId }) {
      const lista = ler(CHAVES.recomendacoes, []);
      const jaExiste = lista.some((r) => r.contentId === contentId && r.patientId === patientId);
      if (jaExiste) return null;
      const registro = { id: gerarId(), contentId, patientId, professionalId, criadoEm: new Date().toISOString() };
      lista.push(registro);
      gravar(CHAVES.recomendacoes, lista);
      return registro;
    },
    excluir(id) {
      gravar(CHAVES.recomendacoes, ler(CHAVES.recomendacoes, []).filter((r) => r.id !== id));
    }
  };

  // ---------- autenticação ----------

  const Auth = {
    async login(papel, email, senha) {
      const alvo = (email || '').trim().toLowerCase();
      if (papel === 'superadmin') {
        const conta = ler(CHAVES.superadmins, []).find((s) => s.email.trim().toLowerCase() === alvo);
        if (!conta) return { ok: false, erro: 'E-mail não encontrado.' };
        const hash = await hashSenha(senha, conta.id);
        if (hash !== conta.senhaHash) return { ok: false, erro: 'Senha incorreta.' };
        return { ok: true, sessao: { papel: 'superadmin', userId: conta.id, nome: conta.nome, email: conta.email } };
      }
      if (papel === 'admin') {
        const conta = Admins.obterPorEmail(alvo);
        if (!conta) return { ok: false, erro: 'E-mail não encontrado.' };
        const hash = await hashSenha(senha, conta.id);
        if (hash !== conta.senhaHash) return { ok: false, erro: 'Senha incorreta.' };
        return {
          ok: true,
          sessao: {
            papel: 'admin',
            userId: conta.id,
            nome: conta.nome,
            email: conta.email,
            organizationId: conta.organizationId
          }
        };
      }
      if (papel === 'profissional') {
        const conta = Profissionais.obterPorEmail(alvo);
        if (!conta) return { ok: false, erro: 'E-mail não encontrado.' };
        const hash = await hashSenha(senha, conta.id);
        if (hash !== conta.senhaHash) return { ok: false, erro: 'Senha incorreta.' };
        return {
          ok: true,
          sessao: {
            papel: 'profissional',
            userId: conta.id,
            nome: conta.nome,
            email: conta.email,
            organizationId: conta.organizationId
          }
        };
      }
      if (papel === 'paciente') {
        const conta = await Pacientes.obterPorEmail(alvo);
        if (!conta) return { ok: false, erro: 'E-mail não encontrado.' };
        const hash = await hashSenha(senha, conta.id);
        if (hash !== conta.senhaHash) return { ok: false, erro: 'Senha incorreta.' };
        return {
          ok: true,
          sessao: {
            papel: 'paciente',
            userId: conta.id,
            nome: conta.nome,
            email: conta.email,
            organizationId: conta.organizationId,
            professionalId: conta.professionalId
          }
        };
      }
      return { ok: false, erro: 'Perfil inválido.' };
    }
  };

  window.DB = {
    inicializar,
    gerarId,
    sha256Hex,
    Sessao,
    Organizacoes,
    Admins,
    Profissionais,
    Pacientes,
    Agenda,
    Evolucoes,
    Notificacoes,
    Conteudos,
    Recomendacoes,
    Auth,
    CHAVES
  };
})(window);
