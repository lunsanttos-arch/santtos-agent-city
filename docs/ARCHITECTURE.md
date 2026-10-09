# Arquitetura planejada

- **Frontend:** engine de cidade isométrica, câmera, editor, interiores e HUD.
- **World State:** entidades de prédios, ruas, projetos, avatares e eventos.
- **Orquestrador:** missões, agendamento, aprovação e auditoria.
- **Conectores IA:** Codex, Claude, Gemini, Ollama e Manus.
- **GitHub:** catálogo de repositórios públicos, vínculo de projetos e PRs mediante aprovação.
- **Segurança:** auditoria, validação de escopo e revisão.

Regra fundamental: o cliente não deve inventar conexão de agente. O adaptador confirma autenticação e atividade no servidor; apenas esses eventos podem criar avatares.

O prefeito representa o orquestrador, a universidade representa aprendizado por documentação/contexto/avaliação, a delegacia representa execução verificável de ferramentas de segurança. Nenhum dos três deve prometer capabilities inexistentes.

Não persistir credenciais no mapa; evitar alterações permanentes fora de workspaces temporários. Separar autorização de missão, execução, publicação de PR e merge.
