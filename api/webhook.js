const fetch = require('node-fetch');

export default async function handler(req, res) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { card, action, cardIndex } = req.body;

    // Get webhook URL from environment variable
    const webhookUrl = process.env.DISCORD_WEBHOOK_URL;

    if (!webhookUrl) {
      console.error('DISCORD_WEBHOOK_URL not configured');
      return res.status(500).json({ error: 'Webhook URL not configured' });
    }

    let title, color, description;

    switch (action) {
      case 'create':
        title = 'Novo Card Criado! 📋';
        color = 0x37b7a5; // Verde (accent)
        description = 'Um novo card foi adicionado ao sistema.';
        break;
      case 'update':
        title = 'Card Atualizado! ✏️';
        color = 0xf59e0b; // Amarelo (warning)
        description = `O card ${cardIndex + 1} foi editado.`;
        break;
      case 'delete':
        title = 'Card Excluído! 🗑️';
        color = 0xf9736b; // Vermelho (danger)
        description = `O card ${cardIndex + 1} foi removido do sistema.`;
        break;
      default:
        title = 'Card Modificado! 📝';
        color = 0x37b7a5;
        description = 'Uma ação foi realizada em um card.';
    }

    const message = {
      embeds: [{
        title: title,
        description: description,
        color: color,
        fields: action !== 'delete' ? [
          {
            name: 'Contexto',
            value: card.contexto || 'N/A',
            inline: false
          },
          {
            name: 'Comportamento Atual',
            value: card.comportamentoAtual || 'N/A',
            inline: false
          },
          {
            name: 'Comportamento Esperado',
            value: card.comportamentoEsperado || 'N/A',
            inline: false
          },
          {
            name: 'Regras de Negócio',
            value: card.regrasNegocio || 'N/A',
            inline: false
          },
          {
            name: 'Critérios de Aceite',
            value: card.criteriosAceite.length > 0 ? card.criteriosAceite.map((c, i) => `${i + 1}. ${c}`).join('\n') : 'Nenhum',
            inline: false
          },
          {
            name: 'Observação',
            value: card.observacao || 'Nenhuma',
            inline: false
          }
        ] : [
          {
            name: 'Informações do Card Removido',
            value: 'O card foi permanentemente excluído do sistema.',
            inline: false
          }
        ],
        timestamp: new Date().toISOString(),
        footer: {
          text: `Ação realizada em ${new Date().toLocaleString('pt-BR')}`
        }
      }]
    };

    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(message)
    });

    if (!response.ok) {
      throw new Error(`Discord API error: ${response.status}`);
    }

    res.status(200).json({ success: true });
  } catch (error) {
    console.error('Erro ao enviar para Discord:', error);
    res.status(500).json({ error: 'Failed to send to Discord' });
  }
}