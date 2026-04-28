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
