# REQ.

> Da conversa ao requisito, com clareza e rastreabilidade.

O **REQ.** é um workspace para times de produto transformarem descoberta em execução. A plataforma reúne captura de contexto, consolidação de entendimento, geração de requisitos, criação de cards e gestão de responsáveis em um único fluxo.

## O produto

- **Elicitação** — conduza sessões, registre o contexto e identifique lacunas antes que elas virem retrabalho.
- **Requisitos** — gere rascunhos estruturados, refine critérios de aceite e exporte em Markdown ou JSON.
- **Cards** — organize impacto, comportamento, regras, evidências e ownership em uma demanda pronta para execução.
- **Usuários** — gerencie administradores e editores em uma base centralizada.
- **Integrações** — sincronize cards com Discord e armazene evidências temporárias no Vercel Blob.

## Experiência

A interface foi desenhada como um produto SaaS responsivo e acessível:

- navegação lateral no desktop e menu compacto no mobile;
- hierarquia visual orientada pelas etapas do trabalho;
- estados de foco, feedback e autosave visíveis;
- formulários com leitura confortável e alvos de toque adequados;
- identidade visual própria em verde floresta e lima;
- layout testado em desktop e em viewport mobile de 390 px.

## Stack

- Frontend estático em HTML, CSS e JavaScript
- Funções serverless na Vercel
- Vercel KV / Upstash Redis para autenticação e usuários
- Vercel Blob para evidências temporárias
- Webhook do Discord para distribuição dos cards

## Executar o projeto

Instale as dependências e gere o frontend publicado:

```bash
npm install
npm run build
```

O build é multiplataforma e copia `app/` para `public/` usando Node.js.

## Estrutura

```text
app/
├── assets/
│   ├── css/        # design system e estilos das telas
│   ├── js/         # autenticação e módulos do produto
│   └── favicon.svg # identidade do produto
├── cards/          # criação e sincronização de cards
├── elicitation/    # descoberta e requisitos
├── users/          # administração de usuários
└── index.html      # acesso ao workspace

api/
├── auth/           # sessão, login, logout e bootstrap
├── blob/           # upload e limpeza de evidências
├── users/          # CRUD de usuários
└── webhook.js      # integração com Discord
```

## Variáveis de ambiente

Configure no ambiente da Vercel:

```env
DISCORD_WEBHOOK_URL=

# Redis TCP, ou as variáveis REST do Vercel KV / Upstash
REDIS_URL=
KV_REST_API_URL=
KV_REST_API_TOKEN=
```

Use `.env.example` como referência e nunca versione credenciais reais.

## Deploy

O projeto é Vercel-first. O `vercel.json` publica o diretório `public/` e mantém as funções serverless em `api/`.

```bash
npm run build
vercel --prod
```

---

Criado por [codexmark](https://github.com/codexmark) · GPL-3.0
