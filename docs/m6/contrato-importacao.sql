-- PROPOSTA de contrato de persistência para a implementação V5 (#31).
-- Este arquivo não é uma migração e não é executado pelo carregador PostgreSQL.
-- Vitor deve incorporar/adaptar o contrato em nova revisão Alembic antes da carga real.
-- A consulta pública e a administração continuam dependendo de V6/J5/D4.

CREATE TABLE catalogos_m6 (
    tipo TEXT NOT NULL,
    codigo TEXT NOT NULL,
    conteudo JSONB NOT NULL,
    PRIMARY KEY (tipo, codigo)
);

CREATE TABLE observacoes_m6 (
    id VARCHAR(64) PRIMARY KEY,
    valor NUMERIC NOT NULL CHECK (valor >= 0),
    conteudo JSONB NOT NULL,
    status TEXT NOT NULL DEFAULT 'rascunho' CHECK (status IN ('rascunho', 'publicado')),
    demonstracao BOOLEAN NOT NULL DEFAULT FALSE,
    CHECK (conteudo->>'id' = id),
    CHECK ((conteudo->>'valor')::NUMERIC = valor)
);

CREATE TABLE cargas_m6 (
    hash_pacote VARCHAR(64) PRIMARY KEY,
    sha256_origem VARCHAR(64) NOT NULL,
    quantidade INTEGER NOT NULL CHECK (quantidade >= 0),
    aplicado_em TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
