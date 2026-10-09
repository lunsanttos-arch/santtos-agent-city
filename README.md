# SanTTos Agent City 🏙️

**Uma cidade isométrica em pixel art onde agentes de inteligência artificial são personagens que trabalham em projetos reais.**

> Projeto comunitário em desenvolvimento. Inspirado na sensação de exploração de RPGs retrô de GBA e na ideia de visualização de agentes do ClaudeVille. Arte própria; sem afiliação com Pokémon, Nintendo ou com os criadores do ClaudeVille.

## Visão

Uma cidade jogável: ruas, casas, prédios, prefeitura, biblioteca, universidade, delegacia de segurança e agência de talentos. Agentes conectados a Codex, Claude, Gemini, Ollama ou Manus se movimentam conforme o estado real das tarefas. **Não existem trabalhadores fictícios para simular conexões.**

Os projetos são associados a **repositórios GitHub**, não a pastas permanentes do computador.

## Estado atual

- ✅ Repositório público da comunidade.
- ✅ Código-fonte da **v0.3** publicado neste repositório. Inclui cidade isométrica, editor, interiores, servidor e testes.
- 🚧 **v0.4 em desenvolvimento**: melhorias de arte, mapa maior e arquitetura dos prédios públicos.
- ⚠️ Integrações externas ainda precisam de testes ponta a ponta com contas e CLIs reais.
- ⚠️ O jogo não deve executar merge, deploy ou publicar alterações sem aprovação explícita.

Veja [ROADMAP.md](ROADMAP.md) e [CONTRIBUTING.md](CONTRIBUTING.md).

## Experiência planejada

| Lugar | Responsabilidade |
| --- | --- |
| 🏛️ Prefeitura | Prefeito / orquestração e priorização de tarefas |
| 📚 Biblioteca | Busca e contexto de repositórios públicos do GitHub |
| 🎓 Universidade | Documentação, instruções, competências e avaliação dos agentes |
| 🚓 Delegacia | Segurança: auditoria de mudanças, testes e alertas |
| 🧑‍💼 Agência de talentos | Criar e configurar agentes com conexões reais |
| 🏠 Casas | Descanso dos agentes conectados que estão ociosos |
| 🏢 Escritórios | Missões vinculadas a repositórios GitHub |

### Princípios

1. Cidade 2:1 **isométrica**, com pixel art original influenciada por RPGs clássicos.
2. Grande área de jogo, câmera ajustável, interface discreta e sem barras laterais permanentes.
3. Agente visual somente após confirmação de uma conexão válida.
4. GitHub é a fonte da verdade para projetos; código em workspace temporário para tarefas.
5. Toda mudança em software deve ser revisável; PR em rascunho antes de integrar.
6. Prefeito, universidade e polícia **não possuem habilidades mágicas**: são fluxos e ferramentas reais auditáveis.
7. Tokens e segredos nunca devem ir para repositórios, logs públicos ou para o navegador.

## Desenvolvimento

**A versão v0.3 está disponível para execução local**. Requer [Node.js 20+](https://nodejs.org/).

No Windows, abra o PowerShell:

```powershell
git clone https://github.com/lunsanttos-arch/santtos-agent-city.git
cd santtos-agent-city
node --test
npm start
```

Ou, após baixar e extrair o código pelo botão **Code → Download ZIP**, execute `INICIAR-SANTTOS-CITY.bat`. Acesse `http://127.0.0.1:4317`.

Para integrar seus repositórios, instale o [GitHub CLI](https://cli.github.com/), faça login com `gh auth login` e configure os vínculos dentro da aplicação. Provedores de IA como Codex, Claude, Gemini, Ollama e Manus dependem de instalações ou credenciais próprias. **Não informe credenciais dentro de issues ou commits.**

**Limitações:** este é um protótipo visual e técnico, não a versão v0.4 planejada. O visual e os serviços de Prefeitura, Biblioteca, Universidade, Polícia, Agência de Talentos e Casas ainda estão no roadmap. A integração ponta a ponta das CLIs e API Manus requer validação no computador do usuário.

Para ajudar no projeto, leia [CONTRIBUTING.md](CONTRIBUTING.md). Questões de segurança devem seguir [SECURITY.md](SECURITY.md).

## Licença

A licença de reutilização ainda será escolhida pelo mantenedor. **Repositório público não equivale automaticamente a uma licença open source.** Antes de reutilizar ou redistribuir código, aguarde a adição de um arquivo LICENSE.
