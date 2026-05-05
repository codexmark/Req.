# Req. Codex

Req. Codex e uma aplicacao Vercel-first com autenticacao propria, CRUD basico de usuarios e dois modulos estaticos protegidos:

- `Login`: autentica sessao e faz bootstrap do primeiro admin
- `Elicitacao`: captura entendimentos, organiza contexto e gera requisitos
- `Cards`: cria cards estruturados e envia atualizacoes para um webhook do Discord

## Deploy

O projeto foi organizado para funcionar a partir de duas raizes:

- `app/`: frontend estatico publicado em `public/`
- `api/`: funcoes serverless da Vercel

O `vercel.json` aponta para `public` como diretório final de saida.

## Estrutura

- `app/index.html`: tela de login
- `app/elicitation/index.html`: entrada do modulo de elicitacao
- `app/cards/index.html`: entrada do modulo de cards
- `app/users/index.html`: CRUD basico de usuarios (admin)
- `app/assets/css/auth.css`: UI da autenticacao
- `app/assets/css/elicitation.css`: UI do modulo de elicitacao
- `app/assets/css/cards.css`: UI do modulo de cards
- `app/assets/js/auth.js`: guardas de sessao e logout
- `app/assets/js/login.js`: login e bootstrap do admin inicial
- `app/assets/js/users.js`: CRUD de usuarios
- `app/assets/js/elicitation.js`: logica do modulo de elicitacao
- `app/assets/js/cards.js`: logica do modulo de cards
- `api/auth/*`: login, logout, sessao e bootstrap
- `api/users/*`: CRUD de usuarios
- `api/webhook.js`: integracao serverless com Discord

## Build

Build estatico para Vercel:

```bash
npm run build
```

Isso copia `app/` integralmente para `public/`.

## Variaveis de ambiente

Defina no painel da Vercel:

- `DISCORD_WEBHOOK_URL`

Para autenticacao e usuarios, instale e configure uma integracao Vercel KV/Redis no projeto. As variaveis dessa integracao sao injetadas automaticamente pela Vercel para o pacote `@vercel/kv`.

Mantenha no repositório apenas o arquivo de exemplo:

- `.env.example`
