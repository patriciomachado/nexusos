# Servidor de WhatsApp (QR Code)

Mantém o WhatsApp de cada loja conectado 24 horas, como o WhatsApp Web, para a Alice
responder os clientes. Usa o [Baileys](https://github.com/WhiskeySockets/Baileys).

Ele fica **fora da Vercel**, porque a Vercel desliga o app entre um acesso e outro e o
WhatsApp precisa de uma conexão sempre aberta. Um único servidor atende todas as lojas.

## Colocar no ar (Railway, ~US$ 5/mês)

1. Em [railway.app](https://railway.app), crie um projeto: **New Project → Deploy from GitHub
   repo** e escolha o repositório do Nexus OS.
2. No serviço criado, abra **Settings** e defina:
   - **Root Directory:** `whatsapp-server`. O Railway usa o `Dockerfile` desta pasta.
   - **Networking → Generate Domain**, para ter um endereço como `https://nexus-whatsapp.up.railway.app`.
3. Em **Variables**, adicione:
   - `API_KEY`: uma senha longa que você inventar, por exemplo 40 letras e números.
4. Em **Volumes**, crie um volume montado em `/data`. É onde ficam as sessões do
   WhatsApp: sem ele, cada atualização do servidor desconecta as lojas.
5. Na **Vercel** (projeto do app), em Settings → Environment Variables, adicione:
   - `WHATSAPP_QR_SERVER_URL`: o domínio do passo 2 (`https://….up.railway.app`).
   - `WHATSAPP_QR_SERVER_KEY`: a mesma `API_KEY` do passo 3.

   Depois, faça um novo deploy.
6. No app, abra **Alice → Configurações → Atendimento no WhatsApp**, escolha
   **QR Code (WhatsApp Web)**, toque em **Conectar** e leia o código com o celular da loja
   (WhatsApp → Dispositivos conectados → Conectar dispositivo).

Para conferir se está no ar, abra o domínio no navegador. Deve aparecer `{"status":"ok"}`.

## Outros serviços

Em vez deste servidor, a loja pode usar uma **Evolution API** própria ou a **Z-API**. Isso
fica em Alice → Configurações → "Outro serviço (avançado)".

## Cuidados

- A conexão por QR Code não é oficial. Use o número da loja, não mande mensagens em massa e
  deixe o celular com internet de vez em quando. O WhatsApp pode desconectar ou bloquear
  números usados para spam.
- Se o celular desconectar o aparelho em "Dispositivos conectados", leia o QR Code de novo
  no app.
