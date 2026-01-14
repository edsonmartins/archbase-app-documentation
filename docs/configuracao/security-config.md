---
title: Configuração de Segurança
sidebar_position: 1
---

# Configuração de Segurança

Configurações de YAML, ambiente e deployment para o módulo de segurança.

## Estrutura de Configuração

```yaml
archbase:
  security:
    # Habilita/desabilita o módulo de segurança
    enabled: true

    # Configurações JWT
    jwt:
      secret: ${JWT_SECRET:minha-chave-secreta-de-pelo-menos-256-bits}
      expiration: 900000        # 15 minutos (access token)
      refresh-expiration: 604800000  # 7 dias (refresh token)
      issuer: archbase-app

    # Segurança em nível de método
    method:
      enabled: true              # Habilita @HasPermission
      pre-post-enabled: true     # Habilita @Pre/@Post authorize

    # Cache de permissões
    permission:
      cache:
        enabled: true
        ttl: 300                 # 5 minutos
        max-size: 1000

    # Configurações de logout
    logout:
      revoke-refresh-token: true # Revoga refresh token no logout

    # API Tokens para integrações
    api-token:
      enabled: true
      header-prefix: X-API-Token

    # Intervalos de acesso
    access-schedule:
      enabled: false
      timezone: America/Sao_Paulo

    # Limpeza de tokens
    token-cleanup:
      enabled: true
      cron: "0 0 2 * * ?"

  # Multi-tenancy (se aplicável)
  multitenancy:
    enabled: true
    strategy: COLUMN
    tenant-resolver: header
    tenant-header: X-Tenant-ID
```

## Configurações por Ambiente

### Desenvolvimento

```yaml
# application-dev.yml
archbase:
  security:
    jwt:
      secret: dev-secret-key-for-testing-only-do-not-use-in-production
      expiration: 3600000        # 1 hora para facilitar dev
    method:
      enabled: true
    permission:
      cache:
        enabled: false           # Desabilita cache em dev
```

### Produção

```yaml
# application-prod.yml
archbase:
  security:
    jwt:
      # SEMPRE usar variável de ambiente
      secret: ${JWT_SECRET}
      expiration: 900000         # 15 minutos
      refresh-expiration: 604800000  # 7 dias
    method:
      enabled: true
    permission:
      cache:
        enabled: true
        ttl: 300
```

## Variáveis de Ambiente

### .env (Desenvolvimento)

```bash
# JWT Secrets
JWT_SECRET=dev-secret-key-change-in-production
JWT_EXPIRATION=900000
JWT_REFRESH_EXPIRATION=604800000

# Security
ARCHBASE_SECURITY_ENABLED=true
ARCHBASE_SECURITY_METHOD_ENABLED=true
ARCHBASE_SECURITY_PERMISSION_CACHE_ENABLED=true

# Multi-tenancy
ARCHBASE_MULTITENANCY_ENABLED=true
ARCHBASE_MULTITENANCY_TENANT_HEADER=X-Tenant-ID
```

### Docker Compose

```yaml
version: '3.8'

services:
  app:
    image: archbase-app:latest
    environment:
      - JWT_SECRET=${JWT_SECRET}
      - JWT_EXPIRATION=900000
      - JWT_REFRESH_EXPIRATION=604800000
      - ARCHBASE_SECURITY_ENABLED=true
      - SPRING_DATASOURCE_URL=jdbc:postgresql://postgres:5432/archbase
    ports:
      - "8080:8080"
    depends_on:
      - postgres

  postgres:
    image: postgres:16
    environment:
      - POSTGRES_DB=archbase
      - POSTGRES_USER=archbase
      - POSTGRES_PASSWORD=${DB_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data

volumes:
  postgres_data:
```

### Kubernetes Secrets

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: archbase-secrets
type: Opaque
stringData:
  jwt-secret: "your-jwt-secret-here"
  db-password: "your-db-password-here"
---
apiVersion: v1
kind: ConfigMap
metadata:
  name: archbase-config
data:
  jwt-expiration: "900000"
  jwt-refresh-expiration: "604800000"
  security-enabled: "true"
```

### Deployment Kubernetes

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: archbase-app
spec:
  template:
    spec:
      containers:
      - name: app
        image: archbase-app:latest
        env:
        - name: JWT_SECRET
          valueFrom:
            secretKeyRef:
              name: archbase-secrets
              key: jwt-secret
        - name: JWT_EXPIRATION
          valueFrom:
            configMapKeyRef:
              name: archbase-config
              key: jwt-expiration
        - name: ARCHBASE_SECURITY_ENABLED
          value: "true"
```

## Configuração Java (CORS)

```java
@Configuration
public class SecurityConfiguration extends ArchbaseSecurityConfig {

    @Bean
    public CustomSecurityConfiguration customSecurityConfiguration() {
        return CustomSecurityConfiguration.builder()
            .publicEndpoints(
                "/api/v1/auth/**",
                "/api/v1/public/**",
                "/actuator/health",
                "/swagger-ui/**",
                "/v3/api-docs/**"
            )
            .corsAllowedOrigins(
                "https://app.seudominio.com",
                "https://admin.seudominio.com"
            )
            .corsAllowedMethods(
                "GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"
            )
            .corsAllowedHeaders(
                "Authorization",
                "Content-Type",
                "X-Tenant-ID",
                "X-Company-ID"
            )
            .corsAllowCredentials(true)
            .build();
    }
}
```

## Configuração Avançada

### Multiple Contexts

```yaml
archbase:
  security:
    authentication:
      # Contextos disponíveis
      contexts:
        - STORE_APP
        - CUSTOMER_APP
        - DRIVER_APP
        - WEB_ADMIN
      default-context: WEB_ADMIN
```

### Password Requirements

```yaml
archbase:
  security:
    password:
      min-length: 8
      require-uppercase: true
      require-lowercase: true
      require-digit: true
      require-special-char: false
```

### Token Cleanup

```yaml
archbase:
  security:
    token-cleanup:
      enabled: true
      cron: "0 0 2 * * ?"  # 2h da manhã todos os dias
```

---

## Whitelist de Endpoints

Endpoints públicos que não exigem autenticação podem ser configurados via YAML:

```yaml
archbase:
  security:
    whitelist: /api/v1/public/**,/actuator/health,/swagger-ui/**,/v3/api-docs/**
```

### Exemplos de Whitelist

```yaml
# Webhooks e endpoints públicos
archbase:
  security:
    whitelist: >
      /api/v1/webhook/**,
      /api/v1/public/**,
      /actuator/health,
      /actuator/info,
      /swagger-ui/**,
      /v3/api-docs/**,
      /api/v1/auth/**

# Apenas health check e auth em produção
archbase:
  security:
    whitelist: /actuator/health,/api/v1/auth/**
```

---

## Scan de Pacotes

Configure os pacotes onde o Archbase deve escanear controllers e componentes:

```yaml
archbase:
  security:
    scan-packages: br.com.exemplo.rest.infrastructure.input.rest
```

### Múltiplos Pacotes

```yaml
archbase:
  security:
    scan-packages: >
      br.com.exemplo.rest.infrastructure.input.rest,
      br.com.exemplo.api.controllers,
      br.com.exemplo.modules.adapters.in
```

---

## CORS via YAML

CORS também pode ser configurado diretamente no YAML:

```yaml
archbase:
  security:
    cors:
      allowed-origins: http://localhost:3000,https://app.example.com
      allowed-methods: GET,POST,PUT,DELETE,PATCH,OPTIONS
      allowed-headers: Authorization,Content-Type,X-Tenant-ID,X-Company-ID
      allow-credentials: true
```

### CORS por Ambiente

```yaml
# Desenvolvimento
archbase:
  security:
    cors:
      allowed-origins: http://localhost:3000,http://localhost:4200
      allowed-methods: GET,POST,PUT,DELETE,PATCH,OPTIONS
      allowed-headers: Authorization,Content-Type,Accept,X-Requested-With
      allow-credentials: true

# Produção
archbase:
  security:
    cors:
      allowed-origins: https://app.example.com,https://admin.example.com
      allowed-methods: GET,POST,PUT,DELETE,PATCH,OPTIONS
      allowed-headers: Authorization,Content-Type,X-Tenant-ID
      allow-credentials: true
```

## Referência de Propriedades

| Propriedade | Tipo | Default | Descrição |
|-------------|------|---------|-----------|
| `archbase.security.enabled` | boolean | false | Habilita módulo de segurança |
| `archbase.security.jwt.secret` | String | - | Chave secreta JWT (obrigatório) |
| `archbase.security.jwt.expiration` | long | 900000 | Expiração access token (ms) |
| `archbase.security.jwt.refresh-expiration` | long | 604800000 | Expiração refresh token (ms) |
| `archbase.security.jwt.issuer` | String | archbase-app | Emissor dos tokens |
| `archbase.security.method.enabled` | boolean | true | Habilita segurança em métodos |
| `archbase.security.permission.cache.enabled` | boolean | true | Habilita cache de permissões |
| `archbase.security.permission.cache.ttl` | int | 300 | TTL do cache (segundos) |
| `archbase.security.permission.cache.max-size` | int | 1000 | Tamanho máximo do cache |
| `archbase.security.logout.revoke-refresh-token` | boolean | true | Revoga token no logout |
| `archbase.security.api-token.enabled` | boolean | true | Habilita API tokens |
| `archbase.security.api-token.header-prefix` | String | X-API-Token | Prefixo do header API token |
| `archbase.security.whitelist` | String | - | Endpoints públicos (separados por vírgula) |
| `archbase.security.scan-packages` | String | - | Pacotes para escanear controllers |
| `archbase.security.cors.allowed-origins` | String | - | Origens CORS permitidas |
| `archbase.security.cors.allowed-methods` | String | GET,POST,... | Métodos HTTP permitidos |
| `archbase.security.cors.allowed-headers` | String | - | Headers permitidos |
| `archbase.security.cors.allow-credentials` | boolean | true | Permitir credenciais CORS |
| `archbase.security.token-cleanup.enabled` | boolean | true | Habilita limpeza de tokens |
| `archbase.security.token-cleanup.cron` | String | - | Cron para limpeza |
| `archbase.security.access-schedule.enabled` | boolean | false | Habilita intervalos de acesso |
| `archbase.security.access-schedule.timezone` | String | America/Sao_Paulo | Timezone para intervalos |

## Checklist de Segurança

:::danger Antes de ir para produção

- [ ] JWT_SECRET com 256+ bits gerado aleatoriamente
- [ ] HTTPS habilitado em todos os ambientes
- [ ] CORS configurado apenas para origens confiáveis
- [ ] Access tokens com expiração curta (15-30 min)
- [ ] Refresh tokens com expiração maior (7-30 dias)
- [ ] Rate limiting configurado
- [ ] Auditoria de logs ativa
- [ ] Tokens nunca commitados no repositório
- [ ] Variáveis de ambiente para secrets
- [ ] Revogação de tokens implementada

:::

## Próximos Passos

- [Guia de Segurança](/docs/guias/security-setup) - Implementação completa
- [Módulo Security](/docs/modulos/security) - Anotações e recursos avançados
