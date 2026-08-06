// Checklist SAPPP - Manual do Avaliador AGF (39 itens, extraidos da planilha oficial)
const CHECKLIST_ITEMS = [
  {
    "cat": "ATENDIMENTO AO CLIENTE",
    "num": 1,
    "question": "O atendimento ao cliente é feito conforme previsto?\nAspecto: Prioridade, Produtividade, Receita",
    "peso": 4,
    "forma": "FORMA DE AVALIAÇÃO: Acompanhar a operação e observar se os atendentes cumprem os padrões previstos quanto à recepção e qualidade do atendimento ao cliente, bem como realizam o oferecimento dos produtos/serviços.\nAMOSTRA: observar, no mínimo, 5 atendimentos, não havendo esse quantitativo, observar os atendimentos que acontecerem.\nMARGEM DE TOLERÂNCIA: não há",
    "ref": "MANCAT 19/02",
    "id": 1
  },
  {
    "cat": "ATENDIMENTO AO CLIENTE",
    "num": 2,
    "question": "Durante os atendimento, o atendente informa ao cliente sobre cada produto ou serviço solicitado/adquirido e discrimina somente estes no comprovante? \nAspectos: Prioridade  e informação",
    "peso": 2,
    "forma": "FORMA DE AVALIAÇÃO: Acompanhar o atendimento ao cliente e verificar, no comprovante dos atendimentos, se foi realizada a inclusão de serviço adicional/produto com preço embutido no valor total da aquisição sem o consentimento do consumidor. \nAMOSTRA: observar, no mínimo, 5 atendimentos, não havendo esse quantitativo, observar os atendimentos que acontecerem.\nMARGEM DE TOLERÂNCIA: Não há",
    "ref": "MANCAT 19/02",
    "id": 2
  },
  {
    "cat": "ATENDIMENTO AO CLIENTE",
    "num": 3,
    "question": "O atendimento ao cliente é feito sem interrupções para uso de aparelhos eletrônicos?\nAspectos: segurança e produtividade",
    "peso": 2,
    "forma": "FORMA DE AVALIAÇÃO: observar se os atendimentos são realizados, do início ao fim, sem interrupções. \nAMOSTRA: observar no decorrer da avaliação.\nMARGEM DE TOLERÂNCIA: O NA será aceito em casos de urgência ou emergência.",
    "ref": "MANCAT 19/02",
    "id": 3
  },
  {
    "cat": "ATENDIMENTO AO CLIENTE",
    "num": 4,
    "question": "No no ato da postagem do telegrama, o atendente digita o texto, faz a taxação e transmissão, e na sequência entrega o recibo ao cliente?\nAspecto: informação e produtividade",
    "peso": 2,
    "forma": "FORMA DE AVALIAÇAO: Verificar se no ato da captação o atendente faz a digitação do texto, a taxação e a transmissão do telegrama e na sequência entrega o recibo ao cliente.\nAMOSTRA: no dia da verificação observar, no mínimo, 5 atendimentos, não havendo esse quantitativo, observar os atendimentos que acontecerem. Verificar ainda o resultado da unidade no CTTA, no último mês.\nMARGEM DE TOLERÂNCIA: não há\nO NA será aceito somente se no dia da verificação não houver captação de nenhum telegrama.",
    "ref": "MANCAT 19/02/02",
    "id": 4
  },
  {
    "cat": "ATENDIMENTO AO CLIENTE",
    "num": 5,
    "question": "A documentação relativa ao uso de Caixas Postais está conforme as regras do serviço?\nAspectos: Segurança e Informação",
    "peso": 2,
    "forma": "FORMA DE AVALIAÇÃO: Verificar se na pasta de contrato do cliente os documentos obrigatórios conforme o tipo de serviço:\nAssinatura de Caixa Postal PF: 1-Termo de Assinatura assinada pelo titular(conferir se a assinatura é semelhante ao documento de identificação);2- Documento de identificação oficial com foto(Conferir se os dados são os mesmo no termo de assinatura);Assinatura de Caixa Postal PJ: 1-Termo de Assinatura assinada pelo titular(conferir se a assinatura é semelhante ao documento de identificação);2- Documento de identificação oficial com foto(Conferir se os dados são os mesmo no termo de assinatura);3-Documento constituinte da empresa(verificar se quem assina pela empresa é o titular e somente ele pode assinar pela empresa);Para a renovação verificar se o último termo está inserido e assinado pelo titular.\nAMOSTRA:15 contratos ou verificar todas as caixas quando a unidade tiver menos de 15.\nMARGEM DE TOLERÂNCIA: O NA será aceito quando a agência não tiver caixas postais",
    "ref": "MANCAT 06/19\nMANCAT 09/19/03",
    "id": 5
  },
  {
    "cat": "ATENDIMENTO AO CLIENTE",
    "num": 6,
    "question": "Os atendentes verificam se as postagens de cartas simples ou registradas atendem às condições de aceitação previstas para o serviço?\nAspectos: Informação, Segurança e Prioridade, receita",
    "peso": 5,
    "forma": "FORMA DE AVALIAÇÃO: observar se no ato da postagem de cartas simples ou registradas os atendentes verificam se são cumpridas as condições de aceitação previstas para o serviço.\nAlém das formas tradicionais de comunicação escrita, somente é permitida nesta modalidade a  postagem de cartões de plástico (débito, crédito, seguro, saúde, fidelidade, identificação pessoal e chip de telefonia), sendo vedadas as postagens de CDs, DVDs, Tokens, Pen Drives, cartões de memória e mídia player portátil, tais como MP3 e similares.\nAMOSTRAS: verificar, no mínimo, 5 objetos por guichê, não havendo esse quantitativo, observar os atendimentos que acontecerem.\nMARGEM DE TOLERÂNCIA: Não há",
    "ref": "MANCAT 06/02/03",
    "id": 6
  },
  {
    "cat": "ATENDIMENTO AO CLIENTE",
    "num": 7,
    "question": "Os Avisos de Recebimentos postados foram preenchidos e afixados corretamente no objeto?\nAspectos: Informação e Produtividade",
    "peso": 2,
    "forma": "FORMA DE AVALIAÇÃO: Verificar : a) se todos os campos obrigatórios estão devidamente preenchidos (com todos os dados do remetente e destinatário, incluindo endereço completo); b) se estão bem afixados, sem grampos e sem excesso de cola e fita. c) se o número de registro do objeto é o mesmo do  respectivo AR. \nAMOSTRA: 05 a 10 objetos com AR por guichê, não havendo esse quantitativo, observar os atendimentos que acontecerem.\nMARGEM DE TOLERÂNCIA: não há\nO NA será aceito quando não houver postagem de objetos",
    "ref": "MANCAT 07/12",
    "id": 7
  },
  {
    "cat": "ATENDIMENTO AO CLIENTE",
    "num": 8,
    "question": "O atendente orienta os clientes quanto às proibições e restrições na postagem e sobre a  obrigatoriedade de apresentação de Nota Fiscal ou  Declaração de Conteúdo?\nAspecto: segurança, informação e prioridade",
    "peso": 5,
    "forma": "FORMA DE AVALIAÇÃO: Verificar se o atendente orienta o cliente com relação às proibições e restrições na postagem de objetos,\ninformando sobre a obrigatoriedade da Nota Fiscal ou Declaração e/ou Discriminação de Conteúdo. Verificar por meio de conferência da NF/DC se foi aceita alguma postagem contendo objetos proibido/restrito.\nAMOSTRA: acompanhar, no mínimo, 5 atendimentos e verificar, no mínimo, 5  objetos por guichê,  não havendo esse quantitativo, observar os atendimentos que acontecerem.\nMARGEM DE TOLERÂNCIA: Não há\nO NA será aceito quando não houver postagem na unidade no dia da verificação.",
    "ref": "MANCAT 16/03",
    "id": 8
  },
  {
    "cat": "ATENDIMENTO AO CLIENTE",
    "num": 9,
    "question": "Os atendentes observam se as encomendas estão acondicionadas conforme previsto?\nAspectos: Informação, Segurança e Prioridade.",
    "peso": 5,
    "forma": "FORMA DE AVALIAÇÃO: Acompanhar a operação e verificar se são observadas todas as condições de aceitação dos objetos, referentes ao acondicionamento de cada encomenda. Verificar se são observadas as condições da embalagem em caso de não resistir ao peso, à forma e à\nnatureza do conteúdo ou às condições de transporte; \nAMOSTRA: observar, no mínimo, 5 atendimentos, não havendo esse quantitativo, observar os atendimentos que acontecerem.\nMARGEM DE TOLERÂNCIA: Considerar item NA caso não haja postagem de encomendas no período da verificação.",
    "ref": "MANCAT 16/03",
    "id": 9
  },
  {
    "cat": "ATENDIMENTO AO CLIENTE",
    "num": 10,
    "question": "Os atendentes observam se as postagens via PLP atendem  as regras e condições previstas?\nAspectos: Informação, Segurança e Prioridade",
    "peso": 5,
    "forma": "FORMA DE AVALIAÇÃO: Verificar se o rótulo de endereçamento das postagens PLP está com:\na) impressão de baixa qualidade e as informações estejam ilegíveis;\nb) rasuras ou danos em quaisquer campos que impeçam a compreensão ou leitura ótica;\nc) os códigos de barras cobertos por invólucros plásticos e/ou fitas adesivas, inclusive as transparentes;\nd) colado na dobradura da embalagem e/ou fora da face de maior área da embalagem e não no sentido da maior dimensão;\ne) dimensões menores que 8 x 10 cm;\nAMOSTRA: observar, no mínimo, 5 atendimentos, não havendo esse quantitativo, observar os atendimentos que acontecerem.\nMARGEM DE TOLERÂNCIA: O NA será aceito se não houve postagem desse tipo no dia.",
    "ref": "MANCAT 16/28",
    "id": 10
  },
  {
    "cat": "INTERNO",
    "num": 1,
    "question": "A unidade lança a carga destinada à entrega interna no prazo estabelecido?\nAspecto: informação, segurança e prioridade",
    "peso": 5,
    "forma": "FORMA DE AVALIAÇÃO:  Observar, no dia da verificação, se a unidade lança a carga para entrega interna conforme previsto.\nAMOSTRA: verificar, no mínimo, 10 objetos, não havendo esse quantitativo, observar os atendimentos que acontecerem. Verificar ainda o resultado da unidade no DDIA, no último mês.\nMARGEM DE TOLERÂNCIA: Não há",
    "ref": "MANDIS\nMANCAT 15/01",
    "id": 11
  },
  {
    "cat": "INTERNO",
    "num": 2,
    "question": "A unidade efetua a baixa da entrega interna dentro do prazo?\nAspecto: informação, segurança e prioridade",
    "peso": 5,
    "forma": "FORMA DE AVALIAÇÃO:  Observar, no dia da verificação, se a unidade baixa os objetos  entrega interna conforme previsto e se há objetos com prazo de guarda vencido..\nAMOSTRA: verificar, no mínimo, 10 objetos, não havendo esse quantitativo, observar os atendimentos que acontecerem. Verificar ainda o resultado da unidade no DBEI, no último mês.\nMARGEM DE TOLERÂNCIA: Não há",
    "ref": "MANDIS\nMANCAT 15/01",
    "id": 12
  },
  {
    "cat": "INTERNO",
    "num": 3,
    "question": "Os unitizadores a serem expedidos são devidamente rotulados??\nAspecto: informação e produtividade",
    "peso": 2,
    "forma": "FORMA DE AVALIAÇÃO: Verificar se os unitizadores a serem expedidos contém os rótulos conforme padrão definido.\nAMOSTRA: observar, no mínimo, 5 , não havendo esse quantitativo, observar os que tiverem.\nMARGEM DE TOLERÂNCIA: Não há",
    "ref": "MANENC 02/01/02\nMANENC 06/01/03",
    "id": 13
  },
  {
    "cat": "INTERNO",
    "num": 4,
    "question": "A unidade cumpre o plano de triagem definido pelo Centralizador?\nAspectos: Produtividade e prioridade",
    "peso": 2,
    "forma": "FORMA DE AVALIAÇÃO: Verificar no dia da avaliação se os objetos contidos nos unitizadores (mala, caixeta, CDL etc)  foram triados, conforme as direções do respectivo plano de triagem.\nAMOSTRA: Verificar, no mínimo, 5 unitizadores ou a quantidade total quando esta for menor que 5. Verificar, no mínimo, 10 objetos.\nMARGEM DE TOLERÂNCIA: Não há",
    "ref": "MANCAT 19/04\nMANENC 06/01",
    "id": 14
  },
  {
    "cat": "INTERNO",
    "num": 5,
    "question": "Quando da chegada e saída das linhas a unidade faz as verificações previstas e registra no RDVO?\nAspecto: organização e segurança",
    "peso": 2,
    "forma": "FORMA DE AVALIAÇÃO: No dia da verificação, observar se há conferência dos dados e se são feitos os registros no RDVO: horário de chegada/ saída do veículo, quilometragem, quantidade de carga embarcada/ desembarcada e o número do lacre.\nAMOSTRA: 100% das linhas do dia\nMARGEM DE TOLERÂNCIA: \nO NA será aceito quando, no dia da verificação, não houver chegada e/ou saída da carga ou quando a linha for executada por um CDD",
    "ref": "MANTRA 3/2",
    "id": 15
  },
  {
    "cat": "INTERNO",
    "num": 6,
    "question": "As encomendas são expedidas dentro do prazo previsto?\nAspectos: Prioridade, Informação, Segurança",
    "peso": 5,
    "forma": "FORMA DE AVALIAÇÃO: Verificar se as encomendas SEDEX (10, 12 e convencional) são expedidas até 20 min após o horário de DH da unidade. PAC até às 12 h do D+1.\nAMOSTRA: verificar, no mínimo, 10 objetos, não havendo esse quantitativo, observar os que tiverem. Verificar ainda o resultado da unidade no DECA, no último mês.\nMARGEM DE TOLERÂNCIA: Não há",
    "ref": "MANCAT 19/04",
    "id": 16
  },
  {
    "cat": "INTERNO",
    "num": 7,
    "question": "O carimbo datador é aplicado de forma correta e legível nos objetos?\nAspectos: Segurança e Informação",
    "peso": 2,
    "forma": "FORMA DE AVALIAÇÃO: Verificar se foi aplicado o carimbo datador nos objetos simples e registradas para fins de identificação da unidade e da data de postagem. A aplicação deverá ser feita próxima ao endereço do destinatário e não sobre a etiqueta de código de barras; Não aplicar carimbo datador nos objetos postais que apresentarem chancelas de contratos, exceto nos objetos dos Serviços de Resposta. \nAMOSTRA: verificar, no mínimo, 10 objetos, observar, não havendo esse quantitativo, observar os que tiverem.\nMARGEM DE TOLERÂNCIA: Não há",
    "ref": "MANCAT 19/04\nMANCAT 07/02",
    "id": 17
  },
  {
    "cat": "INTERNO",
    "num": 8,
    "question": "Os objetos destinados a entrega interna são armazenados em local apropriado?\nAspectos: Produtividade e Informação",
    "peso": 2,
    "forma": "FORMA DE AVALIAÇÃO: Verificar se os objetos e correspondências estão armazenados em local restrito ou em armário com chave, caso o local seja compartilhado ou aberto. Não deve haver nenhum objeto armazenado diretamente no chão.\nAMOSTRA:100% dos objetos\nMARGEM DE TOLERÂNCIA: Deverão ser desconsiderados os objetos que chegaram no dia para cadastramento. O NA será aceito para unidades que não realizam entrega interna.",
    "ref": "MANCAT 19/04",
    "id": 18
  },
  {
    "cat": "ORGANIZAÇÃO",
    "num": 1,
    "question": "Os periféricos do guichês de atendimento ao público estão organizados?\nAspecto: organização",
    "peso": 1,
    "forma": "FORMA DE AVALIAÇÃO: Verificar se o guichê de atendimento está organizado com os equipamentos (CPU, monitor, teclado, impressora térmica, balanças, PIN PAD, scanner, CMC7 e outros), de acordo com o disposto no Anexo 4 do normativo.\nAMOSTRA: 100 %\nMARGEM DE TOLERÂNCIA: Não há.",
    "ref": "MANCAT 19/01\nMANCAT 19/01/04",
    "id": 19
  },
  {
    "cat": "ORGANIZAÇÃO",
    "num": 2,
    "question": "O guichê de atendimento dispõe apenas do kit básico  para o trabalho, conforme previsto?\nAspecto: organização",
    "peso": 1,
    "forma": "FORMA DE AVALIAÇÃO: Verificar se no guichê consta apenas um kit básico para atendimento, como por exemplo: malotes para documentos e numerário, grampeador pequeno, régua, extrator de grampos, caneta, carimbo pessoal, tesoura e cola. Não deverão permanecer no guichê  objetos pessoais (carteira, celular, bolsa, óculos de sol, capacetes etc) calendários, calculadoras carimbo datador e outros que não se destinem às operações de atendimento.\nAMOSTRA: 100 %\nMARGEM DE TOLERÂNCIA: poderá ser mantida no guichê uma garrafinha para água (com tampa).",
    "ref": "MANCAT 19/01/02",
    "id": 20
  },
  {
    "cat": "ORGANIZAÇÃO",
    "num": 3,
    "question": "Os guichês com acessibilidade estão identificados, organizados e preparados para atender ao público, conforme padrão?\nAspectos: Organização",
    "peso": 1,
    "forma": "FORMA DE AVALIAÇÃO: Verificar se o guichê de acessibilidade está com a sinalização universal e desobstruído. \nAMOSTRA: 100% \nMARGEM DE TOLERÂNCIA: Não há.",
    "ref": "catalogo de especificações técnicas\nMANENG 07/04",
    "id": 21
  },
  {
    "cat": "ORGANIZAÇÃO",
    "num": 4,
    "question": "As balanças estão posicionadas corretamente?\nAspecto: informação",
    "peso": 1,
    "forma": "FORMA DE AVALIAÇÃO: Verificar se a balança está posicionada de forma que permita a visualização do display pelo atendente e pelo cliente, com o visor zerado antes da pesagem de objetos.\nAMOSTRA: 100%\nMARGEM DE TOLERÂNCIA: Não há",
    "ref": "MANCAT 19/01\nMANCAT 19/01/02",
    "id": 22
  },
  {
    "cat": "ORGANIZAÇÃO",
    "num": 5,
    "question": "O horário de atendimento ao público coincide com o horário de abertura dos caixas de atendimento?  \nAspecto: Produtividade, informação, prioridade",
    "peso": 5,
    "forma": "FORMA DE AVALIAÇÃO: Verificar no painel de atendimento se a unidade possui registro de abertura em atraso.\nAMOSTRA: Último mês\nMARGEM DE TOLERÂNCIA: Não há",
    "ref": "MANCAT 19/01/02",
    "id": 23
  },
  {
    "cat": "ORGANIZAÇÃO",
    "num": 6,
    "question": "As pastas de informações ao público estão atualizadas em meio físico para consulta imediata?\nAspectos: Prioridade e Informação",
    "peso": 4,
    "forma": "FORMA DE AVALIAÇÃO: Verificar se existe pasta física de informações ao cliente com tarifas de serviços e produtos(nacionais e internacionais), tributos e informações complementares de serviços atualizadas. Deverá haver uma pasta na mesa de hall público ou na mesa do gestor disponível ao cliente. Nas unidades que não possuem a mesa do gestor no hall de atendimento a pasta pode ficar no balcão de retaguarda de forma visível\nAMOSTRA: 100%\nMARGEM DE TOLERÂNCIA: não há",
    "ref": "MANCAT 19/01/02",
    "id": 24
  },
  {
    "cat": "ORGANIZAÇÃO",
    "num": 7,
    "question": "A unidade dispõe de um exemplar do Código de Defesa do Consumidor (CDC)?\nAspecto: informação, segurança",
    "peso": 2,
    "forma": "FORMA DE AVALIAÇÃO: Verificar se o CDC está disponível na mesa do gerente, na mesa de escrita pública (no acrílico) ou no móvel de retaguarda. O exemplar deve estar em bom estado de conservação (sem amassados, riscados ou rasgos)\nAMOSTRA: 100%\nMARGEM DE TOLERÂNCIA: Não há",
    "ref": "MANCAT 19/01/02",
    "id": 25
  },
  {
    "cat": "ORGANIZAÇÃO",
    "num": 8,
    "question": "A unidade possui placa institucional de identificação?\nAspectos: Informação",
    "peso": 1,
    "forma": "FORMA DE AVALIAÇÃO: Verificar se a unidade possui placa institucional de comunicação visual externa tipo fachada e/ou tipo bandeira, conforme orientações do Guia de Comunicação Visual Externa de Unidades de Atendimento\nAMOSTRA: 100%\nMARGEM DE TOLERÂNCIA:O item deverá ser considerado NA nas agências localizadas em patrimônio histórico, estabelecimentos, órgão públicos, municípios ou locais que possuam legislação (comprovadamente) que impeçam a instalação da placa padrão",
    "ref": "MANCAT 19/01/03\nMANCOM 01/02",
    "id": 26
  },
  {
    "cat": "ORGANIZAÇÃO",
    "num": 9,
    "question": "A estrutura predial externa e interna da unidade está limpa e em bom estado de conservação?\nAspecto: Segurança, informação",
    "peso": 2,
    "forma": "FORMA DE AVALIAÇÃO: Verificar se a estrutura predial externa e o hall de atendimento da unidade (paredes, portas, janelas, grades, pisos etc.) está limpa e em bom estado de conservação (sem infiltrações, buracos, rachaduras, pichações etc.). Verificar se as paredes estão pintadas na cor palha ou bege claro, de acordo com o padrão. \nAMOSTRA:100%\nMARGEM DE TOLERÂNCIA:\nO NA será aceito para as unidades tombadas pelo patrimônio histórico ou instaladas em órgãos públicos\n(verificar as condições da pintura, conforme orientação) e neste caso, considerar também as unidades com a fachada de tijolinho, cerâmica ou outro material (verificar se não está quebrado, descolado ou faltando peças).",
    "ref": "MANCAT 19/01/03",
    "id": 27
  },
  {
    "cat": "ORGANIZAÇÃO",
    "num": 10,
    "question": "Os jardins/gramados/quintal estão limpos e em bom estado de conservação?\nAspectos: organização e segurança",
    "peso": 2,
    "forma": "FORMA DE AVALIAÇÃO: Verificar as condições de manutenção do jardim/gramado/quintal, que faça parte da propriedade da agência. Verificar se o jardim/quintal/gramado está com a vegetação aparada. Verificar se não há lixo ou entulho espalhado\nAMOSTRA: 100%\nMARGEM DE TOLERÂNCIA: \nO NA será aceito quando a agência não possuir jardim/gramado/quintal",
    "ref": "MANCAT 19/01/03",
    "id": 28
  },
  {
    "cat": "ORGANIZAÇÃO",
    "num": 11,
    "question": "O material de divulgação obrigatória está exposto conforme previsto?\n Aspectos: Prioridade e Informação.",
    "peso": 4,
    "forma": "FORMA DE AVALIAÇÃO: Verificar se todos os cartazes, listados no índice de cartazes na página do SIGA, estão dispostos no PINP/PINT 01 de acordo com padrão definido: cor, formato, atualizados, sem estar rasgados, rasurados, sujos, etc. Devem estar preferencialmente colorido, e em caso de impressão preto e branco, utilizar para todos. Material confeccionado no âmbito da SE ou pela unidade e sem autorização do DERAT será considerada irregularidade.\nAMOSTRA:100%\nMARGEM DE TOLERÂNCIA: Não há",
    "ref": "MANCAT 19/01/03",
    "id": 29
  },
  {
    "cat": "ORGANIZAÇÃO",
    "num": 12,
    "question": "O material de divulgação comercial, institucional e social está exposto conforme previsto?\nAspectos: Informação.",
    "peso": 1,
    "forma": "FORMA DE AVALIAÇÃO: Verificar se todos os materiais exposto estão autorizados (woobler, mobile, cartaz, filipeta, etc), conforme material\nexposto na pasta de cartazes comerciais e estão dispostos de acordo com o local definido. Verificar condições sem estar rasgados, rasurados, sujos, etc. . A existência de avisos ou qualquer outro tipo de informação ou material de campanha institucional, regional ou de terceiros afixado nas paredes, portas, pilastras, janelas, móveis, divisórias, painel canaletado ou em local inadequado no hall de atendimento ou na parte interna ou externa da unidade deverá ser considerada uma não conformidade. Material confeccionado no âmbito da SE ou pela unidade e sem autorização do\nDERAT será considerada irregularidade.\nAMOSTRA:100%\nMARGEM DE TOLERÂNCIA: não há",
    "ref": "MANCAT 19/01/03",
    "id": 30
  },
  {
    "cat": "ORGANIZAÇÃO",
    "num": 13,
    "question": "A demarcação de fila está aplicada conforme padrão? \nAspectos: Informação e Segurança",
    "peso": 2,
    "forma": "FORMA DE AVALIAÇÃO: Verificar se a demarcacão de fila  está em bom estado de conservação (não descolada, interrompida e/ou rasgada), se está na cor padrão (amarela) e se atende ao estabelecido para a demarcação de fila prioritária e para o atendimento geral.\nAMOSTRA: 100%\nMARGEM DE TOLERÂNCIA: \nO NA será aceito para unidade com organizador de fila, desde que contemple a opção para o atendimento prioritário ou nas unidades que o piso tátil não permita a demarcação.",
    "ref": "MANCAT 19/01/03",
    "id": 31
  },
  {
    "cat": "ORGANIZAÇÃO",
    "num": 14,
    "question": "A porta de vidro e/ou paredes envidraçadas estão devidamente sinalizadas?\nAspectos: Segurança",
    "peso": 1,
    "forma": "FORMA DE AVALIAÇÃO: Verificar se a faixa de segurança está aplicada conforme definido no Guia de Comunicação Visual Externa das unidades de Atendimento. Nas unidades que possuem portas de vidro, verificar se a faixa de segurança possui a orientação de comando de abertura da porta (puxe/empurre para pivotante, entrada/saída para tipo de correr e empurre para giratória)\nAMOSTRA: 100%\nMARGEM DE TOLERÂNCIA: não há\nO NA será aceito quando a porta de vidro contiver estrutura metálica ou quando a agência não tiver porta de vidro",
    "ref": "MANCAT 19/01/03",
    "id": 32
  },
  {
    "cat": "ORGANIZAÇÃO",
    "num": 15,
    "question": "As longarinas estão em bom estado de conservação e com os assentos prioritários sinalizados?\nAspectos: Informação",
    "peso": 1,
    "forma": "FORMA DE AVALIAÇÃO: Verificar o estado de conservação das longarinas (se não estão rasgadas, quebradas, manchadas ou soltas).Visando atendimento à legislação vigente, deverão ser identificados os assentos preferenciais por meio de Capa para Identificação do Assento Prioritário(modelo antigo) e cor do assento vermelho para os modelos de polipropileno.\nAMOSTRA:100%\nMARGEM DE TOLERÂNCIA: O NA será admitido em unidades que não possuem espaço no hall para pelo menos 01 longarina ou que tenha uso de fila sem gerenciador",
    "ref": "MANCAT 19/01/03",
    "id": 33
  },
  {
    "cat": "ORGANIZAÇÃO",
    "num": 16,
    "question": "Os móveis e equipamentos da unidade são padronizados e estão em bom estado de conservação?\nAspectos: organização",
    "peso": 1,
    "forma": "FORMA DE AVALIAÇÃO: Verificar se os móveis e equipamentos da área exclusiva para atendimento ao cliente, estão em bom estado de conservação. Verificar se algum móvel ou equipamento está quebrado, rasgado, enferrujado ou precisando de manutenção. Verificar se os móveis estão na cor padrão.(palha/bege).\nAMOSTRA: 100% dos setores\nMARGEM DE TOLERÂNCIA: considerar conforme se houver solicitação de manutenção, comprovada, com até 30 dias",
    "ref": "MANCAT 19/01/03\nCatálogo de Especificações Técnicas",
    "id": 34
  },
  {
    "cat": "ORGANIZAÇÃO",
    "num": 17,
    "question": "As informações sobre o horário de atendimento e o DH da unidade estão visíveis e legíveis aos clientes, e é o mesmo horário limite inserido no SARA?\nAspectos: Informação e organização",
    "peso": 2,
    "forma": "FORMA DE AVALIAÇÃO: Verificar se as informações sobre o horário de atendimento e o DH da unidade estão visíveis e legíveis aos clientes em cartaz, placas ou pórticos. Verificar se o horário limite de postagem no SARA é o mesmo do cartaz de horário de atendimento ao público. Nas unidades com porta de vidro, que não possuem placa ou pórtico, o cartaz de horário de funcionamento deverá estar afixado na porta, internamente, de tal forma que possibilite a visualização externa mesmo que a agência esteja fechada.\nAMOSTRA: 100%\nMARGEM DE TOLERÂNCIA: não há",
    "ref": "MANCAT 19/01/03",
    "id": 35
  },
  {
    "cat": "ORGANIZAÇÃO",
    "num": 18,
    "question": "Os produtos estão expostos  conforme previsto?\nAspectos: Informação, organização e receita",
    "peso": 3,
    "forma": "Verificar se os produtos expostos estão com a etiqueta de preço padrão. A disposição dos produtos no painel canaletado deverá ser feita utilizando-se os tipos de suportes disponíveis na agência (gancho de metal e/ou acrílicos). Não deverá ser afixado produtos direto no painel.\nAMOSTRAS: 100%\nMARGEM DE TOLERÂNCIA: Somente caixas poderão ser expostas sobre o móvel de retaguarda.",
    "ref": "MANCAT 19/03/02\nMANCAT 19/03/03",
    "id": 36
  },
  {
    "cat": "ORGANIZAÇÃO",
    "num": 19,
    "question": "Todas as caixas postais estão devidamente numeradas e identificadas?\nAspectos: Informação",
    "peso": 1,
    "forma": "FORMA DE AVALIAÇÃO: Verificar se as caixas postais estão numeradas sequencialmente devendo, a distribuição dos números, ser feita no sentido de cima para baixo e da esquerda para a direta, considerando a visão dos clientes. Verificar se a identificação da numeração está sendo por meio das placas metálicas.\nAMOSTRA: 100%\nMARGEM DE TOLERÂNCIA:O NA será admitido para unidade\nque não possuir caixa postal.",
    "ref": "MANCAT 19/01/03\nMANCAT 19/01/05\nMANCAT 06/19\nMANCAT 06/19/03",
    "id": 37
  },
  {
    "cat": "ORGANIZAÇÃO",
    "num": 20,
    "question": "Todos os empregados estão devidamente uniformizados?\nAspectos: Informação e  organização",
    "peso": 2,
    "forma": "FORMA DE AVALIAÇÃO: Verificar se todos os empregados que possuem contato com clientes, estão utilizando o uniforme de forma correta, em bom estado de limpeza e conservação.  \nAMOSTRA: 100% dos empregados\nMARGEM DE TOLERÂNCIA: o item deverá ser considerado como conforme quando os empregados estiverem utilizando camisas de campanha (período determinado). Outro agasalho pode ser utilizado seguindo a cor padrão do cardigan.",
    "ref": "MANSUP 06/01\nMANSUP 06/01/08\nMANPES 01/02/36",
    "id": 38
  },
  {
    "cat": "ORGANIZAÇÃO",
    "num": 21,
    "question": "Todos os empregados usam o crachá de identificação?\nAspecto: segurança e informação",
    "peso": 1,
    "forma": "FORMA DE AVALIAÇÃO: verificar se todos os empregados estão usando o crachá de identificação. Verificar se o\ncrachá está na altura do peito, afixado na própria roupa ou por meio de cordão personalizado dos Correios ou sem nenhuma identificação.\nAMOSTRA : 100% dos empregados\nMARGEM DE TOLERÂNCIA: não há",
    "ref": "MANPES 01/02 Anexo 32",
    "id": 39
  }
];

// Produtos de terceiros vendidos pela agência (pontuação por dificuldade de venda)
const PRODUCTS = [
  { id: 'telesena', nome: 'Telesena', pontos: 1 },
  { id: 'jequiti', nome: 'Jequiti', pontos: 3 },
  { id: 'seguro', nome: 'Seguro', pontos: 5 },
  { id: 'plano_odontologico', nome: 'Plano Odontológico', pontos: 5 },
  { id: 'chip_correios_celular', nome: 'Chip Correios Celular', pontos: 5 },
  { id: 'serasa', nome: 'Serasa', pontos: 2 }
];
