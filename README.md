# SanTTos Agent City v0.7.1 — Equipes de projeto e personagens da cidade

Aplicação **local** em Node.js 20+, interface em português. Casas, cidade isométrica e interiores visitáveis. Código publicado para desenvolvimento colaborativo; não usa artes oficiais de Pokémon.

## Iniciar no Windows

Baixe o ZIP do repositório, extraia em uma pasta NOVA e execute **`INICIAR-SANTTOS-CITY.bat`**. Com Node.js instalado, o navegador abre `http://127.0.0.1:4317`. Feche qualquer servidor de uma versão anterior que ocupe a porta 4317. Pelo terminal: `npm test` e `npm start`. Não é necessário `npm install`.

## Novidades v0.7

- Cada escritório recebe Gerente (agente principal), Código, QA, Tester, UX e Auxiliar (subagentes vinculados ao Gerente). Configure o provedor de cada função em **EQUIPE DO ESCRITÓRIO**. Os perfis persistem; uma IA só executa depois de conexão e aprovação de uma missão. O vínculo de subagente não inicia outras missões automaticamente.
- As salas selecionam funções, sem trocar para Claude por posição do clique. Clique no personagem para ver apenas a sua função.
- O personagem precisa estar perto do prédio para entrar. Clicar longe leva até a entrada; clique novamente quando chegar. Um clique no chão também permite caminhar. WASD interrompe o trajeto.
- Equipes dos projetos ficam no interior dos escritórios, inclusive durante as missões. O jogador tem skin exclusiva, não disponível no cadastro de agentes. Há 15 outras skins selecionáveis, incluindo funcionários e policiais com identidade própria.
- Secretária, Bibliotecária, Pesquisador, Engenheiro, Recepcionista, Delegado e dois Policiais têm ações individuais. Pesquisador e Engenheiro seguem a mesma família visual das funcionárias da cidade.
- Policiais patrulham a cidade entre as inspeções; durante a análise, aparecem na Delegacia. A inspeção automática usa repositórios públicos vinculados, na inicialização, a cada 45 minutos e ao vincular um projeto. Quando uma missão CLI termina com alterações, também inspeciona seu clone temporário, sem executar o código nem copiar possíveis segredos para o relatório. É uma triagem parcial, não uma auditoria completa.
- Grama e piso de pedra têm texturas novas, as ruas têm meios-fios e marcações contínuas e a fonte isométrica fica na praça em frente à Prefeitura.

### Novidades anteriores (v0.6)

- **Universidade ampliada:** edifício 10×8 no mapa, duas salas de aula distintas e um centro de pesquisa/laboratório com bancadas e computadores.
- **Pesquisador:** usa a busca pública do GitHub em seis temas rotativos, arquiva descobertas na coleção **Achados da Universidade**. Busca amostral, não a totalidade do GitHub.
- **Engenheiro:** consulta **README** de até cinco projetos da Biblioteca por execução, indexa trechos na estante e cruza tecnologias/palavras-chave com os projetos que têm GitHub vinculado. As sugestões aparecem na área do gerente do escritório. Análise heurística: a compatibilidade real precisa ser confirmada antes de integrar.
- **Bibliotecária:** personagem com rotina visual de arrumação; Biblioteca guarda coleções, perfis, links e índices de README. As entradas pesquisadas são catalogadas automaticamente.
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

## Revisão visual v0.7.1

Direção de arte inspirada nos sprites de mapa dos RPGs portáteis de 16 bits: personagens compactos com olhos simples, fachadas limpas, telhados com poucas cores, grama sem ruído e uma fonte menor. A cidade continua isométrica e as identidades e funções foram preservadas. Toda a arte é original; não contém personagens, logotipos ou sprites oficiais de Pokémon.
