// controller/ia-agent.js
// Requer: npm i @google/generative-ai dotenv
const { GoogleGenerativeAI } = require('@google/generative-ai');
require('dotenv').config();

const API_KEY = process.env.API_KEY_GOOGLE;

// -------------------------------
// Helpers: padrão de código de grupo e heurísticas
// -------------------------------
const GROUP_CODE_RE = /^GRP_[A-Z]{2,}_[A-Z0-9]{2,}_(R|M|A)$/;

function guessArea(s = '') {
  s = (s || '').toLowerCase();
  if (/(finance|financeiro|contas|pagar|receber|contábil|concil|fatur)/.test(s)) return 'FIN';
  if (/(ti|tech|tecnologia|infra|zabbix|grafana|o365|entra|azure|ad|ldap|vpn|git|devops)/.test(s)) return 'TI';
  if (/(rh|pessoal|folha)/.test(s)) return 'RH';
  if (/(jur|juríd)/.test(s)) return 'JUR';
  if (/(compras|procure|procurement)/.test(s)) return 'COMP';
  if (/(log|pcp|produção|opera)/.test(s)) return 'PROD';
  if (/(vendas|comercial|crm)/.test(s)) return 'VEND';
  if (/(seguran|security)/.test(s)) return 'SEG';
  return 'GEN';
}
function guessFunc(s = '') {
  s = (s || '').toLowerCase();
  if (/(zabbix)/.test(s)) return 'ZABBIX';
  if (/(grafana)/.test(s)) return 'GRAFANA';
  if (/(o365|office|entra|azure)/.test(s)) return 'O365';
  if (/(devops|deploy|pipeline|ci|cd)/.test(s)) return 'DEVOPS';
  if (/(dba|banco|sql|database|db)/.test(s)) return 'DBA';
  if (/(help|suporte|service desk|n1|n2)/.test(s)) return 'HELPDESK';
  if (/(pagamento|ap|pagar)/.test(s)) return 'PAGT';
  if (/(receb|ar|credito|cobr)/.test(s)) return 'CRED';
  if (/(pcp|planejamento)/.test(s)) return 'PCP';
  if (/(opera(ç|c)ões|ops)/.test(s)) return 'OPS';
  if (/(auditoria|audit)/.test(s)) return 'AUD';
  if (/(gerent|manager|gestor)/.test(s)) return 'GER';
  if (/(supervisor|coord|líder|lead)/.test(s)) return 'SUP';
  if (/(analist|anl)/.test(s)) return 'ANL';
  return 'USER';
}
function guessLevel(s = '') {
  s = (s || '').toLowerCase();
  if (/(admin|global|owner|root|sudo)/.test(s)) return 'A';
  if (/(operator|operators|supervisor|manager|gerent|coord|aprov)/.test(s)) return 'M';
  return 'R';
}

function coercePercent(n, total) {
  const t = Number(total) || 0;
  const x = Number(n) || 0;
  if (t <= 0) return '0%';
  return `${Math.round((x / t) * 100)}%`;
}

// Normaliza/garante estrutura do payload
function normalizePayload(payload) {
  const p = payload || {};
  p.table1 = Array.isArray(p.table1) ? p.table1 : [];
  p.table2 = Array.isArray(p.table2) ? p.table2 : [];
  p.summary = p.summary || {};

  // table1: garantir e normalizar group_code
  p.table1 = p.table1.map((row) => {
    const r = { ...row };
    const hint = [r.group_label, r.role, r.assignment, r.justification].filter(Boolean).join(' ');
    if (!GROUP_CODE_RE.test(r.group_code || '')) {
      r.group_code = `GRP_${guessArea(hint)}_${guessFunc(hint)}_${guessLevel(hint)}`;
    }
    r.samaccountname = r.samaccountname || 'Desconhecido';
    r.role = r.role || 'Desconhecido';
    r.sod_summary = Array.isArray(r.sod_summary) ? r.sod_summary : [];
    r.role_fit = Boolean(r.role_fit);
    r.not_fit_reason = r.not_fit_reason || '';
    r.name = r.name || '';
    r.assignment = r.assignment || '';
    r.group_label = r.group_label || '';
    r.justification = r.justification || '';
    return r;
  });

  // summary: preencher faltantes
  const users_total = p.table1.length;
  const users_role_fit = p.table1.filter((r) => r.role_fit).length;
  const users_with_sod = new Set(
    p.table2.filter(Boolean).map((c) => (c && c.samaccountname) || '')
  ).size;

  p.summary.users_total = Number(p.summary.users_total ?? users_total);
  p.summary.users_role_fit = Number(p.summary.users_role_fit ?? users_role_fit);
  p.summary.users_role_fit_pct =
    p.summary.users_role_fit_pct || coercePercent(p.summary.users_role_fit, p.summary.users_total);
  p.summary.users_with_sod = Number(p.summary.users_with_sod ?? users_with_sod);
  p.summary.users_with_sod_pct =
    p.summary.users_with_sod_pct || coercePercent(p.summary.users_with_sod, p.summary.users_total);
  p.summary.top_groups = Array.isArray(p.summary.top_groups) ? p.summary.top_groups : [];
  p.summary.notes = Array.isArray(p.summary.notes) ? p.summary.notes : [];

  return p;
}

// Tenta parsear JSON mesmo se vier com ```json ou texto extra
function safeParseJson(text) {
  try { return JSON.parse(text); } catch {}
  // remover cercas
  let t = text.replace(/```json/gi, '```').replace(/```/g, '').trim();
  try { return JSON.parse(t); } catch {}
  // recortar do primeiro { até o último }
  const first = t.indexOf('{');
  const last = t.lastIndexOf('}');
  if (first !== -1 && last !== -1 && last > first) {
    t = t.slice(first, last + 1);
    try { return JSON.parse(t); } catch {}
  }
  throw new Error('Resposta da IA não é um JSON válido.');
}

// ---------------------------------
// Instruction para ONLY JSON
// ---------------------------------
const instruction = `
Idioma: PT-BR.

Você receberá um CSV com usuários e seus acessos. Retorne APENAS um JSON válido (UTF-8), sem texto adicional, sem markdown, sem comentários.

Tarefas
1) Sugerir o melhor grupo RBAC para cada usuário.
2) Verificar se os acessos atuais condizem com o cargo.
3) Identificar conflitos de Segregação de Funções (SoD).
4) Nomear grupos no formato OBRIGATÓRIO: GRP_<AREA>_<FUNCAO>_<NIVEL> 
   - <AREA> MAIÚSC.: TI, FIN, RH, MKT, ADM, VEND, LOG, COMP, JUR, CONT, PROD, SEG; se desconhecida, GEN.
   - <FUNCAO> MAIÚSC.: SUP, ANL, DEV, GER, AUD, OPS, DBA, HELPDESK, PAGT, CRED, PCP, ZABBIX, GRAFANA, O365; se desconhecida, USER.
   - <NIVEL>: R (Restrito), M (Médio), A (Administrativo).

Critérios
- Menor privilégio que cubra as tarefas do cargo/área.
- Aderência: false se houver privilégio fora do escopo, admin sem justificativa ou cruzamento crítico (ex.: Produção+Financeiro).
- SoD: use matriz fornecida; se ausente, considere ao menos:
  ["Solicitar/Emitir + Aprovar", "Criar Fornecedor + Aprovar Pagamento", "AP + Conciliação/GL",
   "Vendas (Condições) + Faturamento", "DBA Produção + DevOps/Deploy",
   "Admin Global O365/Entra + Aprovação Financeira", "Operações/Produção + Aprovação de Mudança em Produção",
   "Zabbix Admin + Operação Financeira"].
- Se não houver conflito explícito, gere 2–3 suspeitas “inferidas” (risk = "medium") quando houver sinais.

Esquema de saída (APENAS JSON):
{
  "table1": [
    {
      "name": "string",
      "samaccountname": "string | 'Desconhecido'",
      "role": "string | 'Desconhecido'",
      "assignment": "string",
      "group_code": "GRP_<AREA>_<FUNCAO>_<NIVEL>",
      "group_label": "string",
      "justification": "string",
      "role_fit": true | false,
      "not_fit_reason": "string",
      "sod_summary": ["string", "..."]
    }
  ],
  "table2": [
    {
      "name": "string",
      "samaccountname": "string",
      "sod_rule": { "key": "string", "source": "provided|inferred" },
      "evidence": ["string", "..."],
      "risk": "low|medium|high",
      "recommendation": "string"
    }
  ],
  "summary": {
    "users_total": number,
    "users_role_fit": number,
    "users_role_fit_pct": "string",
    "users_with_sod": number,
    "users_with_sod_pct": "string",
    "top_groups": [ { "group_code": "GRP_TI_HELPDESK_M", "count": number } ],
    "notes": ["string", "..."]
  }
}
`;

// ---------------------------------
// Controller
// ---------------------------------
exports.analyzeCsvWithGemini = async (req, res) => {
  try {
    if (!API_KEY) {
      return res.status(500).json({ error: 'API_KEY_GOOGLE não configurada' });
    }
    const file = req?.file;
    if (!file) {
      return res.status(400).json({ error: 'CSV não enviado. Use multipart/form-data com campo "file".' });
    }

    // CSV e catálogos opcionais (aceitos via multipart fields)
    const csvText = file.buffer.toString('utf8');
    const jobRoleCatalog = (req.body && req.body.jobRoleCatalog) || '';
    const sodMatrix = (req.body && req.body.sodMatrix) || '';
    const rbacCatalog = (req.body && req.body.rbacCatalog) || '';

    const prompt =
      `${instruction}\n\n` +
      `CSV:\n${csvText}\n\n` +
      `CATÁLOGO DE CARGOS (opcional):\n${jobRoleCatalog}\n\n` +
      `MATRIZ SoD (opcional):\n${sodMatrix}\n\n` +
      `CATÁLOGO DE GRUPOS RBAC (opcional):\n${rbacCatalog}`;

    const genAI = new GoogleGenerativeAI(API_KEY);
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

    const result = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.2, topP: 0.9, responseMimeType: 'application/json' },
    });

    // Parse robusto
    const raw = result?.response?.text() || '';
    let payload = safeParseJson(raw);

    // Normalizar/garantir campos
    payload = normalizePayload(payload);

    return res.status(200).json(payload);
  } catch (error) {
    return res.status(500).json({
      error: 'Erro ao analisar CSV com Gemini',
      details: error?.message || String(error),
    });
  }
};
