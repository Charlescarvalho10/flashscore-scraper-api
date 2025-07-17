# Imagem base do Node.js com Playwright
FROM mcr.microsoft.com/playwright:v1.42.1-jammy

# Criar diretório da aplicação
WORKDIR /app

# Copiar arquivos
COPY package*.json ./
RUN npm install

COPY . .

# Expor porta e rodar app
EXPOSE 3000
CMD ["npm", "start"]