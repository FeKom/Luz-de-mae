-- Luz de Mãe — schema SQLite
-- Parte A: dimensões geográficas
-- Parte B: dados públicos DATASUS (SINASC = nascidos vivos, SIM = óbitos fetais) importados de data/raw/*.csv
-- Parte C: tabelas do aplicativo (gestante, UBS, consultas, sintomas, alertas, orientações)
PRAGMA foreign_keys = ON;

---------------------------------------------------------------- A. DIMENSÕES
CREATE TABLE IF NOT EXISTS regiao (
  codigo INTEGER PRIMARY KEY,            -- 1 Norte ... 5 Centro-Oeste
  nome   TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS uf (
  codigo        INTEGER PRIMARY KEY,     -- código IBGE (11 = Rondônia ...)
  sigla         TEXT NOT NULL UNIQUE,
  nome          TEXT NOT NULL,
  regiao_codigo INTEGER NOT NULL REFERENCES regiao(codigo)
);

---------------------------------------------------------------- B. DATASUS
-- Convenção: linhas/colunas "Total" dos CSVs NÃO são gravadas (evita dupla contagem);
-- elas são usadas só para conferir a integridade na importação (ver importacao_log).

CREATE TABLE IF NOT EXISTS sinasc_nascidos_uf_ano (
  uf_codigo INTEGER NOT NULL REFERENCES uf(codigo),
  ano       INTEGER NOT NULL,
  qtd       INTEGER NOT NULL,
  PRIMARY KEY (uf_codigo, ano)
);

CREATE TABLE IF NOT EXISTS sinasc_consultas_uf (
  uf_codigo INTEGER NOT NULL REFERENCES uf(codigo),
  faixa     TEXT    NOT NULL,            -- Nenhuma | De 1 a 3 | De 4 a 6 | 7 ou mais | Ignorado
  ordem     INTEGER NOT NULL,
  qtd       INTEGER NOT NULL,
  PRIMARY KEY (uf_codigo, faixa)
);

CREATE TABLE IF NOT EXISTS sinasc_consultas_ano (
  ano   INTEGER NOT NULL,
  faixa TEXT    NOT NULL,
  ordem INTEGER NOT NULL,
  qtd   INTEGER NOT NULL,
  PRIMARY KEY (ano, faixa)
);

CREATE TABLE IF NOT EXISTS sinasc_adequacao_uf (
  uf_codigo INTEGER NOT NULL REFERENCES uf(codigo),
  adequacao TEXT    NOT NULL,            -- Não fez pré-natal | Inadequado | Intermediário | Adequado | ...
  ordem     INTEGER NOT NULL,
  qtd       INTEGER NOT NULL,
  PRIMARY KEY (uf_codigo, adequacao)
);

-- Cruzamento nº de consultas de pré-natal x desfecho do bebê (peso, duração da gestação, Apgar 5º min)
CREATE TABLE IF NOT EXISTS sinasc_cruzamento (
  dimensao        TEXT    NOT NULL CHECK (dimensao IN ('peso','duracao_gestacao','apgar5')),
  faixa_consultas TEXT    NOT NULL,
  faixa_ordem     INTEGER NOT NULL,
  categoria       TEXT    NOT NULL,
  cat_ordem       INTEGER NOT NULL,
  qtd             INTEGER NOT NULL,
  PRIMARY KEY (dimensao, faixa_consultas, categoria)
);

CREATE TABLE IF NOT EXISTS sim_obitos_uf_ano (
  uf_codigo INTEGER NOT NULL REFERENCES uf(codigo),
  ano       INTEGER NOT NULL,
  qtd       INTEGER NOT NULL,
  PRIMARY KEY (uf_codigo, ano)
);

-- nivel: 'capitulo' (grande grupo CID-10) ou 'grupo' (subitem, prefixado com ". " no CSV).
-- Somar apenas UM nível por vez; capítulos somam o total geral.
CREATE TABLE IF NOT EXISTS sim_causa_ano (
  causa TEXT NOT NULL,
  nivel TEXT NOT NULL CHECK (nivel IN ('capitulo','grupo')),
  ano   INTEGER NOT NULL,
  qtd   INTEGER NOT NULL,
  PRIMARY KEY (causa, nivel, ano)
);

CREATE TABLE IF NOT EXISTS sim_causa_regiao (
  causa         TEXT    NOT NULL,
  nivel         TEXT    NOT NULL CHECK (nivel IN ('capitulo','grupo')),
  regiao_codigo INTEGER NOT NULL REFERENCES regiao(codigo),
  qtd           INTEGER NOT NULL,
  PRIMARY KEY (causa, nivel, regiao_codigo)
);

CREATE TABLE IF NOT EXISTS sim_cid_ano (
  cid       TEXT    NOT NULL,            -- ex.: P95, Q90, A50
  descricao TEXT    NOT NULL,
  ano       INTEGER NOT NULL,
  qtd       INTEGER NOT NULL,
  PRIMARY KEY (cid, ano)
);

-- Perfil dos óbitos fetais por ano (cor/raça, idade da mãe, escolaridade, peso, duração da gestação)
CREATE TABLE IF NOT EXISTS sim_perfil_ano (
  dimensao  TEXT    NOT NULL CHECK (dimensao IN ('cor_raca','idade_mae','escolaridade_mae','peso','duracao_gestacao')),
  categoria TEXT    NOT NULL,
  ordem     INTEGER NOT NULL,
  ano       INTEGER NOT NULL,
  qtd       INTEGER NOT NULL,
  PRIMARY KEY (dimensao, categoria, ano)
);

CREATE TABLE IF NOT EXISTS sim_investigacao_uf (
  uf_codigo INTEGER NOT NULL REFERENCES uf(codigo),
  situacao  TEXT    NOT NULL,
  ordem     INTEGER NOT NULL,
  qtd       INTEGER NOT NULL,
  PRIMARY KEY (uf_codigo, situacao)
);

CREATE TABLE IF NOT EXISTS sim_relacao_parto_uf (
  uf_codigo INTEGER NOT NULL REFERENCES uf(codigo),
  momento   TEXT    NOT NULL,            -- Antes do parto | Durante o parto | Ignorado
  ordem     INTEGER NOT NULL,
  qtd       INTEGER NOT NULL,
  PRIMARY KEY (uf_codigo, momento)
);

CREATE TABLE IF NOT EXISTS importacao_log (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  arquivo        TEXT NOT NULL,
  tabela         TEXT NOT NULL,
  linhas         INTEGER NOT NULL,
  soma_dados     INTEGER NOT NULL,       -- soma dos valores gravados
  soma_total_csv INTEGER,                -- soma dos valores "Total" do CSV (quando existe)
  confere        INTEGER NOT NULL,       -- 1 = soma_dados == soma_total_csv (ou sem total p/ comparar)
  importado_em   TEXT NOT NULL DEFAULT (datetime('now'))
);

---------------------------------------------------------------- C. APLICATIVO
CREATE TABLE IF NOT EXISTS ubs (
  id        INTEGER PRIMARY KEY AUTOINCREMENT,
  nome      TEXT NOT NULL,
  municipio TEXT NOT NULL,
  uf_codigo INTEGER NOT NULL REFERENCES uf(codigo),
  telefone  TEXT
);

CREATE TABLE IF NOT EXISTS gestante (
  id                INTEGER PRIMARY KEY AUTOINCREMENT,
  nome              TEXT NOT NULL,
  data_nascimento   TEXT NOT NULL,       -- ISO yyyy-mm-dd
  telefone          TEXT,
  uf_codigo         INTEGER NOT NULL REFERENCES uf(codigo),
  ubs_id            INTEGER NOT NULL REFERENCES ubs(id),
  dum               TEXT NOT NULL,       -- data da última menstruação (base p/ idade gestacional)
  primeira_gestacao INTEGER NOT NULL DEFAULT 0 CHECK (primeira_gestacao IN (0,1)),
  gestacao_risco    INTEGER NOT NULL DEFAULT 0 CHECK (gestacao_risco IN (0,1)),
  fcm_token         TEXT,                -- token do Firebase Cloud Messaging
  criado_em         TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_gestante_ubs ON gestante(ubs_id);

CREATE TABLE IF NOT EXISTS consulta_prenatal (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  gestante_id   INTEGER NOT NULL REFERENCES gestante(id) ON DELETE CASCADE,
  data_agendada TEXT NOT NULL,           -- ISO yyyy-mm-dd
  tipo          TEXT NOT NULL DEFAULT 'consulta' CHECK (tipo IN ('consulta','exame','vacina')),
  descricao     TEXT,
  status        TEXT NOT NULL DEFAULT 'agendada' CHECK (status IN ('agendada','realizada','faltou','cancelada')),
  atualizado_em TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_consulta_gestante ON consulta_prenatal(gestante_id, data_agendada);

CREATE TABLE IF NOT EXISTS registro_sintoma (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  gestante_id   INTEGER NOT NULL REFERENCES gestante(id) ON DELETE CASCADE,
  registrado_em TEXT NOT NULL DEFAULT (datetime('now')),
  pa_sistolica  INTEGER,
  pa_diastolica INTEGER,
  sintomas      TEXT NOT NULL DEFAULT '[]',   -- JSON: ["sangramento","visao_turva",...]
  observacao    TEXT,
  nivel_risco   TEXT NOT NULL DEFAULT 'baixo' CHECK (nivel_risco IN ('baixo','medio','alto'))
);
CREATE INDEX IF NOT EXISTS idx_sintoma_gestante ON registro_sintoma(gestante_id, registrado_em);

-- Alerta enviado à UBS para "busca ativa"
CREATE TABLE IF NOT EXISTS alerta_ubs (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  gestante_id   INTEGER NOT NULL REFERENCES gestante(id) ON DELETE CASCADE,
  ubs_id        INTEGER NOT NULL REFERENCES ubs(id),
  origem        TEXT NOT NULL CHECK (origem IN ('consulta_faltada','sintoma_risco')),
  referencia_id INTEGER NOT NULL,        -- id da consulta_prenatal ou do registro_sintoma
  nivel         TEXT NOT NULL CHECK (nivel IN ('medio','alto')),
  mensagem      TEXT NOT NULL,
  status        TEXT NOT NULL DEFAULT 'aberto' CHECK (status IN ('aberto','em_atendimento','resolvido')),
  criado_em     TEXT NOT NULL DEFAULT (datetime('now')),
  resolvido_em  TEXT,
  UNIQUE (origem, referencia_id)         -- idempotência: 1 alerta por evento
);
CREATE INDEX IF NOT EXISTS idx_alerta_ubs ON alerta_ubs(ubs_id, status);

-- "Tradutor": termos médicos em linguagem acolhedora + calendário por trimestre
CREATE TABLE IF NOT EXISTS orientacao (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  trimestre    INTEGER NOT NULL CHECK (trimestre IN (1,2,3)),
  categoria    TEXT NOT NULL CHECK (categoria IN ('exame','vacina','sinal_alerta','cuidado')),
  titulo       TEXT NOT NULL,
  termo_medico TEXT,
  explicacao   TEXT NOT NULL
);

-- Histórico de notificações push (FCM) geradas pelo sistema
CREATE TABLE IF NOT EXISTS notificacao (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  gestante_id INTEGER REFERENCES gestante(id) ON DELETE CASCADE,
  ubs_id      INTEGER REFERENCES ubs(id),
  titulo      TEXT NOT NULL,
  corpo       TEXT NOT NULL,
  canal       TEXT NOT NULL DEFAULT 'fcm',
  entregue    INTEGER NOT NULL DEFAULT 0,
  criado_em   TEXT NOT NULL DEFAULT (datetime('now'))
);
