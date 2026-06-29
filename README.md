# VETTOR 28 — Sistema de Gestão

Sistema interno da agência VETTOR 28 para gestão de clientes, entregáveis, resultados e relatórios.

## Stack

- **Frontend:** Next.js 15 (App Router) + TypeScript + Tailwind CSS
- **Backend / Banco / Auth:** Supabase (Postgres + Auth + RLS + Storage)
- **Deploy:** Vercel

## Configuração Local

### 1. Instalar dependências
```bash
cd sistema
npm install
```

### 2. Variáveis de ambiente
```bash
cp .env.example .env.local
```

Preencha `.env.local` com as credenciais do seu projeto Supabase:
- `NEXT_PUBLIC_SUPABASE_URL` — URL do projeto (ex: `https://abc123.supabase.co`)
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` — chave anon pública
- `SUPABASE_SERVICE_ROLE_KEY` — chave service role (secreta, nunca expor ao cliente)
- `NEXT_PUBLIC_APP_URL` — URL local (ex: `http://localhost:3000`)

### 3. Configurar Supabase

1. Crie um projeto em [supabase.com](https://supabase.com)
2. Vá em **SQL Editor** e execute as migrations em ordem:
   - `supabase/migrations/001_init_schema.sql`
   - `supabase/migrations/002_rls_policies.sql`
   - `supabase/migrations/003_seed.sql`
3. Em **Authentication > Email Templates**, configure o template de convite.
4. Em **Authentication > URL Configuration**, adicione `http://localhost:3000/**` aos Redirect URLs.

### 4. Criar o usuário admin

Após rodar as migrations, crie seu usuário em **Supabase Auth Dashboard → Users → Create user** com o email `psycomunic@gmail.com`, depois execute:

```sql
UPDATE profiles SET role = 'admin', nome = 'Admin VETTOR 28' WHERE email = 'psycomunic@gmail.com';
```

### 5. Rodar localmente

```bash
npm run dev
```

Acesse: http://localhost:3000

---

## Estrutura do Projeto

```
src/
├── app/
│   ├── (dashboard)/         ← Rotas protegidas (autenticado)
│   │   ├── page.tsx         ← Dashboard principal
│   │   ├── clientes/        ← CRM de clientes
│   │   ├── tarefas/         ← Kanban (Fase 2)
│   │   ├── onboarding/      ← Mapa de entregas (Fase 2)
│   │   ├── resultados/      ← KPIs (Fase 4)
│   │   ├── relatorios/      ← Relatórios (Fase 5)
│   │   ├── integracoes/     ← Conectores (Fase 3)
│   │   ├── usuarios/        ← Gestão de usuários (admin)
│   │   ├── configuracoes/   ← Configurações (Fase 2)
│   │   └── portal/          ← Portal do cliente (Fase 5)
│   ├── login/               ← Tela de login
│   ├── auth/callback/       ← Callback OAuth/magic link
│   └── api/invite/          ← API de convite de usuários
├── components/
│   ├── layout/              ← Sidebar, Header
│   ├── clientes/            ← ClienteCard, ClienteForm, ClienteFicha
│   └── usuarios/            ← UsuariosClient
├── hooks/                   ← useUser, useClientes
├── lib/supabase/            ← Clients browser e server
├── types/                   ← Tipos TypeScript do banco
└── middleware.ts            ← Proteção de rotas
```

## Banco de Dados

### Tabelas principais
| Tabela | Descrição |
|--------|-----------|
| `profiles` | Usuários com papel (admin/gestor/colaborador/cliente) |
| `clients` | Empresas clientes |
| `client_assignments` | Colaborador ↔ Cliente |
| `member_services` | Colaborador ↔ Pilar permitido |
| `pillars` | 4 pilares: Tecnologia, Marketing, Gestão, Atendimento |
| `deliverables` | Entregáveis por pilar (configurável) |
| `plans` | Planos contratáveis (Saturno, Falcon, Apollo) |
| `contracts` | Contratos por cliente |
| `tasks` | Kanban de tarefas |
| `onboarding_steps` | Etapas do onboarding |
| `client_onboarding` | Status de onboarding por cliente |
| `integrations` | Conexões externas (Meta, Google, GA4, Magazord) |
| `metrics_daily` | KPIs normalizados por dia |
| `reports` | Relatórios mensais |
| `notifications` | Notificações in-app |
| `audit_log` | Log de auditoria |

### Papéis (RBAC)
| Papel | Acesso |
|-------|--------|
| `admin` | Tudo |
| `gestor` | Clientes atribuídos + tudo dentro deles |
| `colaborador` | Clientes atribuídos + pilares liberados |
| `cliente` | Somente portal próprio (leitura) |

## Roadmap

| Fase | Status | Conteúdo |
|------|--------|----------|
| Fase 1 | ✅ **Concluída** | Setup, auth, RBAC, CRM, usuários |
| Fase 2 | 🔜 | Pilares, entregáveis, Kanban, onboarding, contratos |
| Fase 3 | 🔜 | Integrações Meta, Google Ads, GA4, Magazord |
| Fase 4 | 🔜 | Dashboards de KPIs com Recharts |
| Fase 5 | 🔜 | Relatórios PDF, portal do cliente |
| Fase 6 | 🔜 | Notificações, auditoria, polish final |

## Segurança

- ✅ RLS em todas as tabelas — acesso controlado no banco
- ✅ Service role key nunca exposta ao browser
- ✅ Tokens de integração criptografados (Fases 3+)
- ✅ Audit log para ações sensíveis
- ✅ LGPD: minimização de dados, exportação e exclusão sob demanda (Fase 6)
