export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { card, action, cardIndex } = req.body;
    const webhookUrl = process.env.DISCORD_WEBHOOK_URL;

    if (!webhookUrl) {
      console.error('DISCORD_WEBHOOK_URL not configured');
      return res.status(500).json({ error: 'Webhook URL not configured' });
    }

    const titles = {
      create: 'Novo Card Criado! 📋',
      update: 'Card Atualizado! ✏️',
      delete: 'Card Excluído! 🗑️'
    };
    const colors = { create: 0x37b7a5, update: 0xf59e0b, delete: 0xf9736b };

    const message = {
      embeds: [{
        title: titles[action] || 'Card Modificado',
        color: colors[action] || 0x37b7a5,
        fields: action !== 'delete' ? [
          { name: 'Contexto', value: card?.contexto || 'N/A', inline: false },
          { name: 'Comportamento Atual', value: card?.comportamentoAtual || 'N/A', inline: false },
          { name: 'Comportamento Esperado', value: card?.comportamentoEsperado || 'N/A', inline: false },
          { name: 'Regras de Negócio', value: card?.regrasNegocio || 'N/A', inline: false },
          { name: 'Responsável Técnico', value: card?.responsavelTecnico || 'N/A', inline: false },
          { name: 'Critérios de Aceite', value: card?.criteriosAceite?.length ? card.criteriosAceite.join('\n') : 'Nenhum', inline: false },
          { name: 'Observação', value: card?.observacao || 'N/A', inline: false }
        ] : [{ name: 'Card Removido', value: `Card ${cardIndex + 1} foi removido`, inline: false }],
        timestamp: new Date().toISOString()
      }]
    };

    const https = require('https');
    const { URL } = require('url');
    const parsedUrl = new URL(webhookUrl);
    
    const options = {
      hostname: parsedUrl.hostname,
      path: parsedUrl.pathname,
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    };

    const reqDiscord = https.request(options, (resDiscord) => {
      if (resDiscord.statusCode >= 200 && resDiscord.statusCode < 300) {
        res.status(200).json({ success: true });
      } else {
        res.status(500).json({ error: 'Webhook failed' });
      }
    });

    reqDiscord.on('error', (e) => {
      res.status(500).json({ error: e.message });
    });

    reqDiscord.write(JSON.stringify(message));
    reqDiscord.end();

  } catch (error) {
    res.status(500).json({ error: 'Internal error' });
  }
}
