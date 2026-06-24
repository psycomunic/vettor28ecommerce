# VETTOR 28 — Página de captação

Página de captação de clientes (one-page) da agência VETTOR 28.
Desenvolvimento e performance para e-commerce.

## Estrutura

```
vettor28/
├── index.html        → a página inteira (HTML + CSS + JS num arquivo só)
├── assets/
│   └── daniel.png    → foto do hero (recorte sem fundo)
└── README.md         → este arquivo
```

Abra a pasta no Antigravity e edite o `index.html`. Pra visualizar,
é só abrir o `index.html` no navegador (duplo clique) ou usar um
servidor local (ex.: extensão Live Server).

## O que ainda precisa ser trocado

1. **WhatsApp** — procure por `5500000000000` no `index.html` e troque
   pelo seu número com DDI 55 (ex.: 5547999999999). Aparece no botão
   flutuante, no formulário e no rodapé.

2. **E-mail** — procure por `contato@vettor28.com.br` e ajuste.

3. **Vídeos dos depoimentos** — no final do `index.html`, no `<script>`,
   há dois objetos: `YT` e `MP4`. Cole o ID do vídeo do YouTube
   (ex.: `rafael:"dQw4w9WgXcQ"`) ou um link `.mp4`. Enquanto vazio,
   o card mostra a foto com "Vídeo em breve".

4. **Fotos dos depoimentos** — hoje são imagens de banco
   (`images.unsplash.com`). Troque pelos retratos reais dos clientes.

5. **Logos dos clientes** — na seção de marcas (faixa abaixo do hero),
   os nomes estão em texto. Substitua pelos logos reais em PNG com
   fundo transparente.

6. **Números e cases** — `+212%`, `+R$ 40M`, `ROAS 4,2x`, `+120`, etc.
   e os 3 cards de cases são exemplos. Coloque seus dados reais.

7. **Formulário** — hoje só mostra a mensagem de sucesso. No `<script>`
   há um comentário `TODO` onde você conecta o envio ao seu CRM,
   e-mail ou API do WhatsApp.

8. **Redes sociais** — links de Instagram e LinkedIn no rodapé estão
   como `#`. Aponte para os perfis reais.

## Paleta

- Roxo escuro (fundo): `#0A0413`
- Violeta: `#7C3AED` / `#9D5CFF`
- Âmbar/dourado: `#F5A623` / `#FFC15E`
- Off-white (texto): `#F3EEF8`

## Fontes (Google Fonts)

- Anton (títulos)
- Space Grotesk (números, rótulos)
- Sora (texto)
