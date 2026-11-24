# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Copiar arquivos de configuração
COPY package.json pnpm-lock.yaml ./

# Instalar pnpm
# Mesma versão do lockfile (lockfileVersion 9.0) e do workflow. Sem versão, o npm traz o
# pnpm 11, que falha em ERR_PNPM_IGNORED_BUILDS por causa do postinstall do core-js.
RUN npm install -g pnpm@9

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
