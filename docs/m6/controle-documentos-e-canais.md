# Controle de documentos e canais (D5 e D6)

Conferência de 28/10/2026 para [D5 #38](https://github.com/DaviRosimES/C317/issues/38) e [D6 #39](https://github.com/DaviRosimES/C317/issues/39), a partir dos links recebidos no pacote da G4 (`backend/dados/m6/catalogos.json`). Só entram na interface os itens com acesso conferido e metadados necessários. Os demais ficam registrados aqui como exclusão ou pendência, sem bloquear a M6.

Método: requisição HTTP anônima (sem login) a cada link. Os PDFs públicos foram baixados apenas para ler número, data e responsável na capa; não foram copiados para o repositório. Os formulários foram abertos sem envio de respostas.

## Documentos (D5)

| Documento | Conferência | Situação |
| --- | --- | --- |
| Relatório OT nº 001/2024 – Análise, pesquisa e avaliação da Festa de Santa Rita 2024 | PDF público no Google Drive. Capa: “Data da publicação: 08/11/2024”; evento de 18 a 26/05/2024; realização SMCELT/Prefeitura. | Disponível (link externo) |
| Relatório OT nº 004/2025 – Impacto Turístico HackTown 2025 | PDF público no Google Drive. “Data da publicação: 07 de novembro de 2025”; pesquisa em 01 e 02/08/2025; declara caráter técnico. | Disponível (link externo) |
| Peça “Festa de Santa Rita em números” (publicada em 11/06/2025) | O link exige login no Google: acesso negado ao público. | Excluída: acesso não confirmado |
| Quarto documento listado como publicado na planilha | Não identificado: a planilha original fica fora do repositório e o pacote da G4 cita apenas os três acima. | Pendente: conferir na planilha original |
| Relatórios de 2026 em elaboração | Não publicados. | Fora da vitrine |

Decisões:

- Os dois relatórios disponíveis abrem no arquivo publicado pelo Observatório (link recebido), com o destino `drive.google.com` visível. Não há cópia local porque a permissão de redistribuição do PDF não foi confirmada.
- Número e data de publicação vêm da capa de cada PDF. A referência é o ano do evento (anual); nenhum mês foi atribuído.
- Os dois são relatórios técnicos numerados da série “Relatório OT”. A peça excluída seria `peca_divulgacao`.
- Os metadados conferidos estão em `backend/dados/relatorios.json` e são carregados por `python -m scripts.carregar_relatorios --aplicar`. Os boletins do `seed_demo` continuam marcados como fictícios e não fazem parte da carga real.

Para incluir um documento pendente depois que o acesso for liberado: conferir o link sem login, ler número e data no próprio documento (deixar `null` o que não estiver informado), acrescentar a entrada em `relatorios.json` com `acesso_conferido_em` e reexecutar a carga.

## Canais (D6)

| Canal | Link | Conferência | Situação |
| --- | --- | --- | --- |
| Cadastro de meios de hospedagem | `https://forms.gle/82ef7PG85ZCKuqFZ9` | Abre sem login o Google Forms “Observatório do Turismo de Santa Rita do Sapucaí \| Cadastro de meios de hospedagem”. A descrição informa cadastro anual (cerca de 3 minutos) e formulário mensal de ocupação enviado depois aos cadastrados. Nenhuma resposta enviada. | Disponível em `/contribua` |
| Segundo formulário de hospedagem (ocupação mensal) | Não recebido | O link não está no material versionado. O cadastro informa que esse formulário é enviado diretamente aos estabelecimentos cadastrados. | Pendente: citado só como frequência, sem botão |
| Startups e eventos | — | Formulários ainda a criar. | Omitidos |
| Sugestões | — | Sem destino institucional confirmado. | Omitido, sem aviso público |
| Cadastur | `https://cadastur.turismo.gov.br/` | Responde 200 (portal do Ministério do Turismo). | Em `/sobre` |
| FNRH Digital | `https://www.gov.br/turismo/pt-br/assuntos/fnrh` | Redireciona para a página da Ficha Nacional de Registro de Hóspedes no gov.br. | Em `/sobre` |
| SRI do Sul de Minas | Notícia da Agência Sebrae recebida no pacote da G4 | Responde 200. | Em `/sobre` |
| Fontes de dados | `GET /observacoes/catalogos` | Lidas da API, somente as que têm dados publicados. | Em `/sobre` |

A interface explica que o envio é por formulário externo (Google Forms), que a plataforma não recebe as respostas automaticamente nem se integra ao Cadastur ou ao FNRH Digital, e que só resultados agregados são publicados. Também informa que respostas individuais, receitas e informações de hóspedes não são publicadas e que recortes abaixo do mínimo de respondentes exigido pela pesquisa não são divulgados.
