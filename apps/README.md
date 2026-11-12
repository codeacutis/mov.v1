# Aplicações

Monorepo do Mov+: duas aplicações independentes no mesmo Git. Cada pasta terá o próprio `package.json` depois do scaffold. **Não misturar** React e NestJS no mesmo app.

| Pasta | Aplicação | Stack |
| --- | --- | --- |
| `api/` | Backend (API REST) | NestJS + TypeScript + Prisma + PostgreSQL |
| `web/` | Frontend | React + TypeScript |

As pastas começam vazias (apenas `.gitkeep`) para o CLI do Nest e do Vite poderem criar o projeto. Apague o `.gitkeep` da pasta imediatamente antes de rodar o gerador.

Regras:

- Regras de negócio, autorização e horários reais ficam em `api/`.
- `web/` consome a API; não duplicar regras críticas na interface.
- Segredos só em `.env` (não versionado). Usar `.env.example` sem valores reais.
- Dados de desenvolvimento e seed são fictícios.
