# SanTTos Agent City — v0.5 🏙️

Uma **cidade isométrica em pixel art original**, com interiores exploráveis, repositórios GitHub e personagens de agentes de IA conectados a tarefas reais.

> Projeto comunitário em construção. Inspirado no clima dos RPGs retrô de Game Boy Advance. **Não utiliza sprites, mapas, trilhas ou marcas oficiais de Pokémon.**

## Como abrir no Windows

1. Instale Node.js 20+ e Git.
2. Baixe o ZIP do GitHub e extraia numa pasta nova.
3. Execute `INICIAR-SANTTOS-CITY.bat`.
4. Abra **http://127.0.0.1:4317**.

Ou rode `npm start` na pasta do projeto. Para testar: `npm test`.

Para conectar repositórios GitHub da sua conta, instale GitHub CLI e rode `gh auth login`. CLI Codex/Claude/Gemini precisa estar instalada e autenticada para missões. Ollama requer serviço local. Manus requer `MANUS_API_KEY` num `.env` local (não commitar credenciais).

## Novidades que de fato entraram na v0.5

- **Casas detalhadas**: dormers, chaminé, telhados com sombras, jardins, fachada e varanda; piso de rua e vegetação retrabalhados.
- **Sprites de IA autorais**: cabelo, roupa, tom de pele, bonés e animação curta de caminhada; skins e nomes aleatórios ficam salvos no perfil.
- **Interior em todos os prédios importantes**: os cinco serviços têm interiores distintos; além dos escritórios e casas que já eram visitáveis. No mapa, clique no prédio; dentro de instituições, use **GERENCIAR ESTE PRÉDIO**.
- **Prefeitura**: registro de lembretes; balões junto à secretária **somente se ela estiver numa missão realmente conectada**.
- **Biblioteca**: coleções com lista de repos, perfis GitHub, busca de repositórios públicos, vínculos com projetos e corredores de prateleiras. Bibliotecária em missão ativa se movimenta entre estantes.
- **Universidade**: salas de aula e laboratório, busca pública de soluções e lições de contexto por especialidade (não é fine-tuning).
- **Delegacia**: bancada de investigação, vagas de delegado + 2 policiais e análise experimental de até 18 arquivos-fonte pequenos de um projeto **público** vinculado, além da triagem de logs. Relatórios são heurísticos, não um selo de segurança.
- **Agência de Talentos**: define provedor, função e setor; gera automaticamente nome e skin. Vincule o agente a uma missão no escritório.
- **Nenhum avatar institucional fantasma**: o perfil pode existir sem conexão, mas sua representação no interior só aparece quando houver missão com `connected=true`.

## Limites conhecidos

- Não há gestão autônoma hierárquica entre delegado/subagentes, pesquisador/subagentes ou secretária. A v0.5 entrega o vínculo de papéis e seus interiores, **não** vários agentes trabalhando sem uma conexão real.
- A triagem de repositório da Delegacia é manual, parcial e restrita a repositórios públicos; nunca substitui auditorias profissionais.
- Manus, Ollama e CLIs externas ainda exigem validação no computador e com credenciais do usuário.
- Não houve validação gráfica automatizada nesta sessão porque o navegador do ambiente bloqueou até URLs locais. Faça a conferência visual no Windows.

## Contribuir

Confira `ROADMAP.md`, `CONTRIBUTING.md`, `SECURITY.md` e `LICENSE` (MIT). Assets gráficos devem ser originais ou licenciados para uso e redistribuição.
