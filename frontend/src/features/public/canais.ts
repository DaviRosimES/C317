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
      'Reúne capacidade (unidades habitacionais e leitos), período de funcionamento, Cadastur e uso do FNRH Digital para subsidiar decisões do poder público e do setor turístico.',
    continuidade:
      'Depois do cadastro, o Observatório envia mensalmente aos estabelecimentos cadastrados um formulário curto, de cerca de 1 minuto, com os dados de ocupação.',
    href: 'https://forms.gle/82ef7PG85ZCKuqFZ9',
  },
]

export const ORIENTACOES = [
  {
    sigla: 'C',
    cor: 'bg-brand-blue',
    titulo: 'Cadastur',
    resumo: 'Cadastro obrigatório para prestadores de serviços turísticos previstos em lei.',
    detalhe: 'Entenda quem precisa se cadastrar, benefícios e onde realizar o cadastro no portal do Ministério do Turismo.',
    href: 'https://cadastur.turismo.gov.br/',
  },
  {
    sigla: 'F',
    cor: 'bg-brand-purple',
    titulo: 'FNRH Digital',
    resumo: 'Ficha Nacional de Registro de Hóspedes em formato digital.',
    detalhe: 'Orientações de uso e acesso aos canais oficiais. O Observatório não tem integração com sistemas federais.',
    href: 'https://www.gov.br/turismo/pt-br/assuntos/fnrh',
  },
]

/** Link recebido no pacote de dados da G4 sobre o Sistema Regional de Inovação do Sul de Minas. */
export const SRI_LINK = {
  rotulo: 'Notícia da Agência Sebrae sobre o SRI do Sul de Minas',
  href: 'https://mg.agenciasebrae.com.br/inovacao-e-tecnologia/sistema-regional-de-inovacao-sri-do-sul-de-minas-conquista-r-185-milhao-para-impulsionar-startups/',
}
