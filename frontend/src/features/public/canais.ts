/**
 * Canais externos com link recebido do Observatório e acesso conferido (sem envio de respostas
 * de teste). Formulários ainda a criar não entram aqui, nem como "em preparação": a conferência
 * e as pendências estão em docs/m6/controle-documentos-e-canais.md.
 */
export const FORMULARIOS_HOSPEDAGEM = [
  {
    titulo: 'Cadastro de meios de hospedagem',
    publico: 'Hotéis, pousadas e demais meios de hospedagem de Santa Rita do Sapucaí.',
    frequencia: 'Uma vez por ano · cerca de 3 minutos',
    finalidade:
      'Reúne a capacidade do estabelecimento (unidades habitacionais e leitos), o período de funcionamento, o Cadastur e o uso do FNRH Digital. Essas respostas não aparecem na plataforma diretamente: só resultados conferidos e publicados pela equipe entram na consulta, sempre com fonte e referência.',
    continuidade:
      'Depois do cadastro, o próprio formulário informa que um questionário mensal de ocupação, de cerca de 1 minuto, é enviado diretamente aos estabelecimentos cadastrados. Esse questionário não tem link público nesta página.',
    href: 'https://forms.gle/82ef7PG85ZCKuqFZ9',
  },
]

/** Orientações oficiais externas para meios de hospedagem (seção secundária de Sobre). */
export const ORIENTACOES = [
  {
    titulo: 'Cadastur',
    resumo: 'Cadastro obrigatório para prestadores de serviços turísticos previstos em lei.',
    detalhe: 'Veja quem precisa se cadastrar e onde fazer o cadastro, no portal do Ministério do Turismo.',
    href: 'https://cadastur.turismo.gov.br/',
  },
  {
    titulo: 'FNRH Digital',
    resumo: 'Ficha Nacional de Registro de Hóspedes em formato digital.',
    detalhe: 'Orientações de uso e acesso aos canais oficiais do governo federal.',
    href: 'https://www.gov.br/turismo/pt-br/assuntos/fnrh',
  },
]
