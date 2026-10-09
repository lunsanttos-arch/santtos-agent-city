# SanTTos Agent City v0.6 — Universidade, Biblioteca, Delegacia e Escritórios

Aplicação **local** em Node.js 20+, interface em português. Casas, cidade isométrica e interiores visitáveis. Código publicado para desenvolvimento colaborativo; não usa artes oficiais de Pokémon.

## Iniciar no Windows

Baixe o ZIP do repositório, extraia em uma pasta NOVA e execute **`INICIAR-SANTTOS-CITY.bat`**. Com Node.js instalado, o navegador abre `http://127.0.0.1:4317`. Feche qualquer servidor de uma versão anterior que ocupe a porta 4317. Pelo terminal: `npm test` e `npm start`. Não é necessário `npm install`.

## Novidades v0.6

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
