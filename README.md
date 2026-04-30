# Pane & Salute — Agendador de Posts

Ferramenta interna para agendamento de posts no Instagram e Facebook via Buffer, com geração de copy por IA (Claude).

## Estrutura

```
index.html   → interface principal
style.css    → estilos da marca
app.js       → lógica do app
logo.png     → logo da Pane & Salute (adicionar manualmente)
```

## Configuração (primeira vez)

### 1. Buffer
1. Crie conta em [buffer.com](https://buffer.com)
2. Conecte Instagram Business e Facebook Page
3. Vá em **Settings → API → Generate API Key**
4. Cole a chave no painel de Configurações do app

### 2. Cloudinary (imagens)
1. Crie conta gratuita em [cloudinary.com](https://cloudinary.com)
2. No dashboard, copie o **Cloud Name**
3. Vá em **Settings → Upload → Add upload preset**
   - Signing Mode: **Unsigned**
   - Dê um nome (ex: `pane_unsigned`)
4. Cole Cloud Name e Preset no painel de Configurações

### 3. IDs das contas Buffer
No app, vá em **Configurações → Buscar IDs do Buffer**
Copie os IDs e cole nos campos correspondentes.

## Deploy no Vercel

1. Fork ou push neste repositório
2. Acesse [vercel.com](https://vercel.com) → Import Project
3. Selecione o repositório → Deploy
4. Pronto — sem variáveis de ambiente necessárias (chaves ficam no localStorage)

## Fluxo de uso

1. **Suba a imagem** do produto
2. **Escolha o texto**: escreva o seu ou peça ao Claude gerar
3. Se pediu ao Claude: **revise e aprove** a copy
4. **Defina data e horário**
5. Clique em **Agendar no Buffer**

## Segurança

As chaves de API ficam armazenadas no `localStorage` do navegador.
Não compartilhe o link do app publicamente se não quiser que outros tenham acesso.
