# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Copiar arquivos de configuração
COPY package.json pnpm-lock.yaml ./

# Instalar pnpm — VERSÃO FIXA, a do lockfile (lockfileVersion 9.0). Sem versão, o npm traz a
# mais nova; desde a 10 o pnpm bloqueia scripts de instalação não aprovados, e na 11 o bloqueio é
# erro (ERR_PNPM_IGNORED_BUILDS, core-js): o deploy da documentação falhava desde 11/09/2026.
RUN npm install -g pnpm@9.15.9

# Instalar dependências
RUN pnpm install --frozen-lockfile

# Copiar código fonte
COPY . .

# Build estático do Docusaurus
RUN pnpm build

# Production stage - Nginx
FROM nginx:alpine

# Copiar build do Docusaurus (pasta build/)
COPY --from=builder /app/build /usr/share/nginx/html

# Copiar configuração nginx personalizada
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
