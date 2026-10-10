# SanTTos Agent City v0.9.1 — Equipes de projeto e personagens da cidade

Aplicação **local** em Node.js 20+, interface em português. Casas, cidade isométrica e interiores visitáveis. Código publicado para desenvolvimento colaborativo; não usa artes oficiais de Pokémon.

## Iniciar no Windows

Baixe o ZIP do repositório, extraia em uma pasta NOVA e execute **`INICIAR-SANTTOS-CITY.bat`**. Com Node.js instalado, o navegador abre `http://127.0.0.1:4317`. Feche qualquer servidor de uma versão anterior que ocupe a porta 4317. Pelo terminal: `npm test` e `npm start`. Não é necessário `npm install`.

Os testes opcionais de interface são `node scripts/browser-smoke.cjs`, `node scripts/city-behavior-smoke.cjs`, `node scripts/city-controls-smoke.cjs` e `node scripts/city-visual-smoke.cjs`, com Playwright e Chromium disponíveis. Os dois últimos aceitam `SANTTOS_TEST_URL` para apontar para outra porta local e usam fixtures sem executar missões ou autorizar contas reais.

## Correção v0.9.1

Restaura a arte dos prédios da versão 0.8, preservando os PNGs originais. A renderização ajusta separadamente a projeção das duas fachadas para acompanhar os eixos 2:1 das ruas. Texturas do chão, personagens e correções de colisão e sobreposição são mantidas.

## Novidades v0.9

- Cada projeto tem exatamente **Coder e Tester**, dois agentes independentes com skins diferentes. Cada um aceita sua própria missão no mesmo repositório. Os quatro papéis antigos são arquivados no `data/civic.json`; Coder/Tester conservam IDs, nomes e provedores. A migração roda ao iniciar e não apaga os perfis antigos.
- Na **Prefeitura**, clique no **Secretário de Obras**. Configure o provedor, escreva o pedido e clique **CRIAR MISSÃO DE MELHORIA**. Ele trabalha no repositório da própria SanTTos City. Abra **MISSÕES** para aprovar a execução; ao terminar uma missão CLI com alterações, revise e publique o PR. Provedor local instalado/autenticado e acesso ao GitHub continuam necessários para executar código. Ollama serve para planejamento.
- Clique em qualquer personagem para **SALVAR NOME**. Na equipe do escritório também pode editar os nomes. Para renomear um prédio/casa, use **CONSTRUIR → Selecionar** e o campo **NOME DO EDIFÍCIO**.
- Os prédios agora são desenhados pela mesma projeção 2:1 das ruas, incluindo fachadas, janelas e portas. As posições existentes e o ajuste fino são preservados.
- A ordem de desenho usa a posição relativa às fachadas; quem anda na frente/lateral deixa de desaparecer por baixo do prédio. A colisão usa coordenadas contínuas com margem para os pés, inclusive em prédios movidos em ¼ de tile.

## Novidades v0.8

- No projeto, clique **CONECTAR GITHUB** e autorize o código em **Autorizar no GitHub**. A lista é atualizada ao concluir e inclui todas as páginas de repositórios da conta (inclusive privados autorizados). Se faltar GitHub CLI no Windows, instale no PowerShell com `winget install --id GitHub.cli --exact`, feche o servidor e reabra o `.bat`. A autorização fica no GitHub CLI; nenhuma senha ou token deve ser colado na cidade.
- Em **CONSTRUIR → Mover**, selecione o prédio e clique no destino. Os botões **X − / X + / Y − / Y +** ajustam ¼ de tile e salvam cada passo, respeitando colisões e limites. Clique **CONCLUIR AJUSTE** para escolher outro prédio.
- Use **− / +**, a roda do mouse ou **VER CIDADE** para afastar até 25%. **SEGUIR** volta a acompanhar o jogador.
- Casas têm quarto, cozinha, sala, janelas, tapete e móveis em pixel art original. A fonte tem jatos, gotas e ondas animados.
- Agentes ociosos alternam descanso e circulação no escritório, passeios na cidade e visitas às casas. Durante missões, permanecem no escritório. Acima do nome aparecem **ZZZ**, uma nota de passeio ou um mini computador; o texto DISPONÍVEL foi removido.

## Novidades v0.7

- Na versão 0.7, cada escritório recebia seis funções; a versão 0.9 reduz a equipe a Coder e Tester. Configure o provedor de cada função em **EQUIPE DO ESCRITÓRIO**. Os perfis persistem; uma IA só executa depois de conexão e aprovação de uma missão. O vínculo de subagente não inicia outras missões automaticamente.
- As salas selecionam funções, sem trocar para Claude por posição do clique. Clique no personagem para ver apenas a sua função.
- O personagem precisa estar perto do prédio para entrar. Clicar longe leva até a entrada; clique novamente quando chegar. Um clique no chão também permite caminhar. WASD interrompe o trajeto.
- Equipes dos projetos trabalham no interior dos escritórios e passeiam durante a ociosidade. O jogador tem skin exclusiva, não disponível no cadastro de agentes. Há 15 outras skins selecionáveis, incluindo funcionários e policiais com identidade própria.
- Secretária, Bibliotecária, Pesquisador, Engenheiro, Recepcionista, Delegado e dois Policiais têm ações individuais. Pesquisador e Engenheiro seguem a mesma família visual das funcionárias da cidade.
- Policiais patrulham a cidade entre as inspeções; durante a análise, aparecem na Delegacia. A inspeção automática usa repositórios públicos vinculados, na inicialização, a cada 45 minutos e ao vincular um projeto. Quando uma missão CLI termina com alterações, também inspeciona seu clone temporário, sem executar o código nem copiar possíveis segredos para o relatório. É uma triagem parcial, não uma auditoria completa.
- Grama e piso de pedra têm texturas novas, as ruas têm meios-fios e marcações contínuas e a fonte isométrica fica na praça em frente à Prefeitura.

### Novidades anteriores (v0.6)

- **Universidade ampliada:** edifício 10×8 no mapa, duas salas de aula distintas e um centro de pesquisa/laboratório com bancadas e computadores.
- **Pesquisador:** usa a busca pública do GitHub em seis temas rotativos, arquiva descobertas na coleção **Achados da Universidade**. Busca amostral, não a totalidade do GitHub.
- **Engenheiro:** consulta **README** de até cinco projetos da Biblioteca por execução, indexa trechos na estante e cruza tecnologias/palavras-chave com os projetos que têm GitHub vinculado. As sugestões aparecem na área do gerente do escritório. Análise heurística: a compatibilidade real precisa ser confirmada antes de integrar.
- **Bibliotecária:** personagem com rotina visual de arrumação; Biblioteca guarda coleções, perfis, links e índices de README. As entradas pesquisadas são catalogadas automaticamente.
- **Segurança na entrada da Biblioteca:** repositórios guardados manualmente ou descobertos pelo Pesquisador recebem uma inspeção estática de até 18 arquivos públicos pequenos, priorizando autenticação, senhas, configurações e operações destrutivas. A Biblioteca e a Delegacia mostram parecer, arquivo/linha, cobertura e botão **REINSPECIONAR**. Possíveis riscos altos ficam fora das sugestões do Engenheiro; inspeções indisponíveis, incompletas ou com mais de 24 horas também não geram novas sugestões. A ronda periódica revisa até três entradas pendentes ou antigas por execução. Código não é executado, pacotes não são instalados e valores de credenciais não são guardados no relatório. A análise não verifica todas as dependências/CVEs, permissões em produção ou recuperação real de backups.
- **Delegacia:** Delegado coordena relatórios para gerentes; Policial 01 examina padrões de risco em até 18 arquivos de código por repositório público; Policial 02 revisa credenciais, dependências e alguns workflows GitHub Actions. Os resultados incluem arquivo/linha, mas nunca executam os projetos analisados. Uma varredura parcial não garante ausência de vulnerabilidades.
- **Central de Talentos e escritórios:** ao criar um agente, ele recebe nome/skin e aparece na cidade **mesmo que a IA não esteja conectada**. Entre no escritório e clique **EQUIPE DO ESCRITÓRIO** para atribuir a função; isso não executa missões automaticamente. Para executar IA, selecione um provedor disponível, vincule o projeto ao GitHub e aprove a missão.
- **Caixa do gerente:** sugestões de pesquisa e ocorrências policiais acessíveis no gerenciamento da equipe do escritório.

## Automação

As rondas do Pesquisador (aproximadamente **a cada 30 minutos**) e da Polícia (aproximadamente **a cada 45 minutos**) ficam ativadas por padrão em instalações novas. Na tela de cada prédio é possível desativá-las. **Elas operam somente enquanto o servidor local estiver aberto.** O Engenheiro executa quando acionado; após a pesquisa programada, também faz uma rodada de sugestões. Chamadas ao GitHub podem falhar por rede, limite de uso da API ou permissões. Análises disponíveis são **automações locais com heurísticas**, não agentes autônomos de IA já autenticados. Integrações de Codex, Claude, Gemini, Ollama e Manus permanecem dependentes das configurações e das conexões reais.

## Segurança e dados

- Todas as consultas acadêmicas e policiais descritas usam **repositórios públicos**, mesmo que a tua conta possua projetos privados. Sem envio automático de PR, merge ou deploy.
- Os dados locais ficam em `data/` (não envie arquivos dessa pasta para o GitHub). Guarde cópia antes de substituir a instalação.
- É possível consultar código do Pesquisador, Engenheiro e Polícia em `academy.js` e `security.js`; configurações, agentes e relatórios em `civic.js`.
- Não cole senhas, chaves ou tokens nos cadastros.

## Testes

`npm test` executa testes de API, mapa, criação e lotação de agentes, catalogação, análise heurística e delegacia. A aparência em navegador ainda exige avaliação manual no computador do usuário.

## Atualização visual e diagnóstico

Personagens usam seis skins animadas em pixel art; casas, escritórios e instituições usam um atlas original isométrico em `public/assets/building-atlas.png`. A arte gerada foi inspirada nas referências fornecidas, sem reutilizar os arquivos de referência. O desenho procedural permanece como alternativa durante o carregamento do atlas.

Falhas no carregamento dos módulos e no desenho agora aparecem na tela com indicação para consultar F12. Uma falha de desenho não encerra permanentemente a animação. Isso ajuda a diagnosticar a tela verde; a causa específica no computador do usuário ainda precisa ser confirmada.

No Windows, extraia a atualização numa pasta nova, feche o servidor antigo e execute `INICIAR-SANTTOS-CITY.bat`. Preserve uma cópia de `data/` e `.env` antes de migrar dados. Não abra `public/index.html` diretamente. Se a tela continuar verde, envie a primeira mensagem vermelha da aba Console em F12.

Os testes executam sequencialmente porque compartilham `data/civic.json`. Para a regressão visual opcional, com Playwright e Chromium disponíveis e o servidor iniciado, execute `node scripts/browser-smoke.cjs` (defina `CHROMIUM_PATH` se necessário). Essas ferramentas não são necessárias para executar a aplicação.

Com Playwright e Chromium disponíveis, `node scripts/city-behavior-smoke.cjs` verifica entrada por proximidade, agentes em missão no interior, salas por função e interações individuais dos funcionários. Usa respostas simuladas de API e não executa missões de IA.

## Revisão visual v0.9.0

Direção de arte inspirada nos sprites de mapa dos RPGs portáteis de 16 bits: personagens compactos com olhos simples, fachadas limpas, telhados com poucas cores, grama sem ruído e uma fonte menor. A cidade continua isométrica e as identidades e funções foram preservadas. Toda a arte é original; não contém personagens, logotipos ou sprites oficiais de Pokémon.
