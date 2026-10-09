# Segurança

Este software pode iniciar agentes que executam comandos. Instruções de agentes e arquivos de repositórios devem ser tratados como dados não confiáveis.

**Relato de vulnerabilidade:** use relato privado do GitHub quando habilitado ou um canal privado com o mantenedor; não publique explorações ou credenciais em issues abertas.

- Não faça commit de arquivos .env, tokens GitHub/Manus ou chaves de API.
- Nunca dê autorização automática de merge, deploy ou alteração em branch principal.
- Clone temporário de repositórios não é isolamento do sistema operacional.
- Valide entrada do usuário, URLs, nomes de repositórios, caminhos e comandos.
- Serviços locais não devem ser expostos publicamente sem autenticação e TLS.
- Execute testes e revisão humana antes de integrar alterações.
