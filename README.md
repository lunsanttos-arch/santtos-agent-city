# SanTTos Agent City — RPG Isométrico v0.4

Versão comunitária v0.4. Área de jogo 68×52 com câmera e zoom, interface sem painéis laterais permanentes e edifícios institucionais clicáveis. **Cidade isométrica 2:1 em pixel art original**, com editor de ruas, caminhos, água, casas, prédios, árvores, luminárias, praça; personagem do operador; interiores de escritórios preservados; agentes representados **somente quando uma execução com provedor real confirmou atividade**. Nenhum agente simulado aparece na cidade nem no escritório. Não usamos sprites ou mapas de Pokémon/Nintendo.

## Instalação Windows

1. Instale Node.js 20+ (https://nodejs.org), Git (https://git-scm.com/downloads/win) e **GitHub CLI** (https://cli.github.com/).
2. Abra o PowerShell e execute `gh auth login` para autenticar a conta GitHub que tem acesso aos projetos. Para confirmar: `gh auth status`. Não é necessário cadastrar pasta Windows em nenhum prédio.
3. Se quiser executar Codex/Claude/Gemini, instale as respectivas CLIs e entre nas suas contas em cada uma. Para Ollama, instale o servidor e baixe um modelo (`ollama pull qwen3:8b`). Para Manus, crie `.env` a partir de `.env.example` e preencha `MANUS_API_KEY` **apenas no seu PC**.
4. Feche as versões anteriores se elas estiverem abertas na porta 4317. Extraia o ZIP e execute `INICIAR-SANTTOS-CITY.bat`.
5. Acesse `http://127.0.0.1:4317` (somente no próprio computador).
6. Clique em um prédio no mapa ou na barra lateral. Na sessão **GITHUB • PROJETO**, clique **ATUALIZAR REPOS**, escolha o repositório e clique **VINCULAR**.
7. Crie uma missão com agente real, revise e aprove. **O avatar só aparecerá quando a execução real confirmar atividade**. Para Codex/Claude/Gemini, a missão usa uma clonagem Git temporária e não precisa do caminho local do projeto.
8. Se o Git pedir credenciais durante a publicação, no PowerShell execute `gh auth setup-git`. Quando uma missão de programação terminar com alterações, abra **LOGS** e use **PUBLICAR PR**. Isso publica uma *branch* e abre um **Pull Request em rascunho** no GitHub, que deve ser revisado antes do merge.

## O que mudou

- **Isométrico de verdade:** o mundo utiliza projeção 2:1, terrenos em losangos, prédios volumétricos com telhados e fachadas, árvores, água e ruas em perspectiva. Cliques no prédio consideram fachadas e telhados; a posição do editor usa projeção inversa. `public/isometric.js` contém as funções de renderização, conversão e seleção.
- **Agentes reais:** não aparecem personagens de `Codex`, `Claude`, `Gemini`, `Ollama` ou `Manus` quando não há missão autenticada em execução. O avatar roxo é o **operador humano**, não um agente. A relação dos provedores na esquerda mostra condições locais; “CLI instalado” NÃO comprova autenticação. A presença de `MANUS_API_KEY` indica configurado, não necessariamente validado até uma tarefa real.
- **GitHub:** todo prédio-projeto guarda somente um identificador `owner/repo`, URL e branch. A autenticação usa GitHub CLI, sem salvar tokens no JSON da cidade. As CLIs recebem uma cópia temporária obtida do GitHub, não o projeto que existe no PC. A execução não faz commit nem push por conta do aplicativo; publicar PR requer confirmação separada.
- **Interiores:** salas de Código, Reunião, Pesquisa, QA, Lab Local e Lounge continuam em 2D, como o usuário preferiu. Só agentes com missão conectada aparecem trabalhando.
- **Manus:** recebe o link GitHub da missão. Repositórios privados só são acessíveis pelo Manus se a conta Manus tiver autorização própria para eles. O aplicativo não envia token GitHub para o Manus.
- **Ollama:** recebe nome e branch do repositório no prompt, mas **não lê nem modifica código ainda** (futuro adapter com ferramentas e revisão); o que ele produz é análise textual, não uma alteração de código.

## Segurança

- Servidor restrito a `127.0.0.1`; não exponha o serviço na internet sem autenticação forte adicional. Tokens do GitHub são gerenciados pelo `gh`, e a chave Manus pelo `.env` local.
- A execução de CLI pode rodar ferramentas de código; **não oferece uma sandbox de segurança do sistema operacional**. O remoto de push é desativado na cópia de trabalho como medida de defesa, mas não substitui isolamento de processo. Revise comandos e diffs antes de confiar no sistema.
- A missão é executada apenas após aprovação manual; a publicação de PR requer outra confirmação. PR criado como rascunho, sem merge automático.
- O clone temporário existe no diretório temporário do sistema para permitir à CLI acessar o código, mas **não exige que o usuário mantenha pastas locais de projetos**. O clone é removido ao criar PR; clones de missões não publicadas devem ser removidos manualmente do TEMP em versões futuras.
- Mapa persistente em `data/world.json`, histórico de missões só na memória. Mapas da v0.2 são migrados retirando referências a pastas locais (`dir`).

## Testes e limitações

Execute `TESTAR-SANTTOS-CITY.bat` ou `npm test`. Os 13 testes cobrem criação de mapa, edição, segurança das rotas, ausência de agentes simulados, validação de IDs GitHub, projeção inversa e seleção de telhado.

**Ainda não foi validado end-to-end** com GitHub autenticado e as CLIs reais no Windows, nem a navegação direta por localhost neste ambiente (o acesso gráfico a URLs locais foi bloqueado). A interface foi renderizada em Chromium com respostas de API simuladas: 5 projetos, 10 ferramentas e abertura do interior de Playout sem erros JS. É uma versão incremental técnica, não um jogo isométrico completo ou uma reprodução idêntica do vídeo. Também não publica automaticamente correções em produção.

Projeto independente da SanTTos, com gráficos originais; inspirado em RPGs retrô e no conceito de visualização de agentes do ClaudeVille. Não afiliado à Nintendo ou honorstudio.


## Novidades na v0.4

- **Mapa expandido para 68×52 tiles**: ruas, quadras, bairros e prédios em pixel art isométrica original, com novos modelos de casas e edifícios.
- **HUD limpo**: o mapa ocupa a tela; clicar em Projetos/Missões/Construir abre janelas temporárias. Zoom pela rodinha do mouse; WASD movimenta o jogador.
- **Prefeitura**: consulta de status de missões reais, problemas e projetos ativos.
- **Biblioteca**: consulta ao catálogo público da API de busca do GitHub, vínculo ao prédio de um projeto. Respeita limites públicos da API; precisa de acesso de escrita apenas para publicar PR no repositório.
- **Universidade**: lições/instruções salvas e usadas como contexto em missões CLI de programação. Não realiza treinamento de pesos ou fine-tuning de modelos.
- **Delegacia**: triagem de padrões suspeitos nos logs. Não é auditoria de segurança completa; revisão humana permanece essencial.
- **Agência de Talentos**: cadastro de perfis com papel e provedor de IA. Cadastrar perfil **não** significa conexão autenticada e **não** gera um personagem no mundo; apenas tarefas com evidência de execução real ganham avatar.
- **Casas**: personagens que concluíram tarefas conectadas vão para uma casa, por até cinco minutos, antes de sair da cidade.
- **Migração**: caso exista um mundo salvo pela v0.3, a v0.4 cria a nova cidade, copia os vínculos GitHub de projetos conhecidos e salva o anterior em `data/world.json.v03-backup`.

### Limitações

- Não há garantia de equivalência visual a Pokémon FireRed; sprites e edifícios são desenhos originais.
- Codex, Claude, Gemini, Ollama e Manus exigem configuração individual no Windows; as integrações não foram validadas ponta a ponta neste ambiente.
- GitHub Actions/deploys não são realizados automaticamente; solicitação de PR exige confirmação do usuário.
- Algumas funcionalidades institucionais são iniciais e serão expandidas.
