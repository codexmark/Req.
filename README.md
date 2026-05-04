# Req. Codex

Requirements Studio para condução e consolidação de sessões de elicitação.

Aplicação web estática para conduzir sessões de elicitação de requisitos com:

- blocos guiados de entrevista
- perguntas adaptativas
- progressão por bloco com foco em perguntas ainda não respondidas
- captura de respostas
- derivação de requisitos atômicos
- validação de qualidade
- backlog inicial automático
- matriz de rastreabilidade
- ata formal da sessão
- exportação em Markdown e JSON
- modo reunião para uso contínuo em entrevistas

## Como usar

### Desenvolvimento Local

1. Clone o repositório
2. Execute `npm install` (para dependências do backend)
3. Execute `python3 -m http.server 8000` ou `npm run dev`
4. Abra http://localhost:8000

### Deploy na Vercel

1. **Conecte seu repositório GitHub à Vercel**
   - Acesse [vercel.com](https://vercel.com)
   - Importe seu repositório GitHub

2. **Configure as variáveis de ambiente:**
   - No dashboard da Vercel, vá para Settings > Environment Variables
   - Adicione: `DISCORD_WEBHOOK_URL` com sua URL do webhook do Discord

3. **Deploy automático:**
   - Todo push na branch main fará deploy automático
   - A API estará disponível em `https://seu-projeto.vercel.app/api/webhook`

### Como obter o Discord Webhook URL

1. No Discord, vá para Server Settings > Integrations > Webhooks
2. Clique em "New Webhook" ou edite um existente
3. Copie a URL do webhook
4. Cole como valor da variável `DISCORD_WEBHOOK_URL`

## Funcionalidades

- Criador de cards com campos específicos
- Integração com Discord via webhook
- CRUD completo com notificações
- Interface responsiva

Abra [index.html](./index.html) no navegador.

Se preferir rodar com servidor local:

```bash
python3 -m http.server 4173
```

Depois acesse `http://localhost:4173/meu_projeto/`.

## Estrutura

- `index.html`: layout e componentes
- `styles.css`: identidade visual, layout e responsividade
- `app.js`: estado, fluxo da entrevista, validações, progressão e exportação

## Observações

- O estado da sessão fica salvo em `localStorage`
- O app nasce com um requisito inicial semeado a partir do chat de referência
- Os artefatos são gerados em tempo real a partir da sessão e dos requisitos cadastrados
- O foco desta versão é uso pessoal e produtividade imediata, sem backend
