# Deploy de demonstração (Render + Supabase)

> Apenas para demonstração acadêmica (D-019). **Use somente dados fictícios.** Planos gratuitos não oferecem garantia de disponibilidade nem backup.

Arquitetura: `Front (Render Static)` → `API NestJS (Render Web Service)` → `PostgreSQL (Supabase)`. O navegador nunca fala com o banco.

## 1. Supabase (banco)
1. Crie um projeto e guarde a senha do banco.
2. Clique em **Connect** e copie a string **Session pooler** (porta **5432**). Use-a para migrations *e* para a API: o modo *transaction* (6543) não serve para migrations nem para o advisory lock do bootstrap.
3. A string tem o formato `postgresql://postgres.<ref>:<SENHA>@<host>.pooler.supabase.com:5432/postgres`. Se a senha tiver caracteres especiais, aplique URL-encode.

## 2. Render (Blueprint)
1. **New → Blueprint**, conecte o repositório e escolha a branch com `render.yaml`.
2. Preencha as variáveis marcadas como `sync: false`:
   - `mov-api`: `DATABASE_URL` (passo 1) e `WEB_ORIGIN` (URL do front, sem barra final).
   - `mov-web`: `VITE_API_URL` (URL da API, sem barra final).
3. As URLs só são conhecidas após criar os serviços. Fluxo prático: crie, anote as URLs `*.onrender.com`, preencha `WEB_ORIGIN` e `VITE_API_URL` e faça **Manual Deploy** nos dois (o front grava `VITE_API_URL` no build).
4. O `JWT_SECRET` é gerado pelo Render.

## 3. Primeiro acesso
O banco nasce vazio. Crie o primeiro ADMIN (só funciona uma vez):

```bash
curl -X POST https://<sua-api>.onrender.com/auth/bootstrap \
  -H 'content-type: application/json' \
  -d '{"name":"Admin Demo","email":"admin@exemplo.local","password":"<senha-com-10+-caracteres>"}'
```

Depois entre pelo front.

## 4. Limitações do plano gratuito
- A API "dorme" sem tráfego; a primeira requisição pode levar cerca de 1 minuto.
- O projeto Supabase pausa após inatividade prolongada (cerca de 1 semana); reative-o no painel antes de apresentar.
- A API aceita uma única origem em `WEB_ORIGIN` (previews de outros domínios serão bloqueados pelo CORS).

## 5. Problemas comuns
| Sintoma | Causa provável |
|---|---|
| Build da API falha em `prisma migrate deploy` | `DATABASE_URL` ausente/errada, senha sem URL-encode ou projeto Supabase pausado |
| Erro de certificado/SSL ao conectar | Tente acrescentar `?sslmode=require` à URL; se persistir, abra uma pendência (a API ainda não tem opção de SSL customizado) |
| Front carrega mas login falha com erro de rede/CORS | `WEB_ORIGIN` diferente da URL real do front (https, sem barra final) |
| Front chama `localhost:3000` | `VITE_API_URL` não estava definida no build; defina e refaça o deploy |
