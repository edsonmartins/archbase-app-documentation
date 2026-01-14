---
title: archbase-starter
sidebar_position: 1
---

# archbase-starter

O **archbase-starter** é a forma mais completa de usar o Archbase Framework. Ele inclui todos os módulos em uma única dependência, ideal para aplicações corporativas completas.

## O Que Está Incluído

| Módulo | Descrição |
|--------|-----------|
| `archbase-domain-driven-design` | Entidades e Repositórios DDD |
| `archbase-event-driven` | CQRS com Command/Event/Query Bus |
| `archbase-security` | Autenticação JWT e autorização |
| `archbase-multitenancy` | Suporte multi-tenant |
| `archbase-query` | Queries com RSQL |
| `archbase-validation` | Validação fluente |
| `archbase-error-handling` | Tratamento centralizado de erros |

## Instalação

### Maven

```xml
<dependency>
    <groupId>br.com.archbase</groupId>
    <artifactId>archbase-starter</artifactId>
    <version>${archbase.version}</version>
</dependency>
```

### Gradle

```groovy
implementation 'br.com.archbase:archbase-starter:${archbase.version}'
```

## Configuração Automática

O `archbase-starter` configura automaticamente todos os componentes quando adicionado ao projeto. A configuração é baseada em propriedades do `application.yml`:

```yaml
archbase:
  # Multi-tenancy
  multitenancy:
    enabled: true
    scan-packages: com.minhaempresa.minhaapp

  # Segurança
  security:
    enabled: true
    jwt:
      secret: ${JWT_SECRET}
      expiration: 86400000
      refresh-expiration: 604800000

  # RSQL para queries dinâmicas
  rsql:
    enabled: true
    page:
      parameter: page
      size:
        parameter: size
        max: 100
```

## Funcionalidades Habilitadas

### 1. Domínio DDD

```java
@Entity
@DomainEntity
public class MinhaEntidade extends PersistenceEntityBase<MinhaEntidade, UUID> {
    // Sua lógica de domínio aqui
}
```

### 2. Repositórios

```java
@DomainRepository
public interface MinhaEntidadeRepository extends Repository<MinhaEntidade, UUID, Long> {
    // CRUD automático disponível
}
```

### 3. CQRS / Event-Driven

```java
@Component
public class MeuCommandHandler implements CommandHandler<CriarEntityCommand, UUID> {
    @Override
    public UUID handle(CriarEntityCommand command) {
        // Lógica do comando
    }
}
```

### 4. Segurança JWT

```java
@RestController
@RequestMapping("/api")
public class MeuController {

    @GetMapping("/publico")
    @PermitAll
    public String publico() {
        return "Acesso livre";
    }

    @GetMapping("/protegido")
    public String protegido() {
        return "Apenas autenticados";
    }
}
```

### 5. Multi-tenancy

```java
@Entity
@DomainEntity
public class MinhaEntidade extends TenantPersistenceEntityBase<MinhaEntidade, UUID> {
    // Tenant automático via @TenantAware
}
```

### 6. Queries RSQL

```java
@GetMapping
public Page<MinhaEntidade> buscar(
        @RequestParam(required = false) String query,
        Pageable pageable) {

    ArchbaseSpecification<MinhaEntidade> spec =
        ArchbaseRSQLJPASupport.toSpecification(query, MinhaEntidade.class);

    return repository.findAll(spec, pageable);
}
```

## Starters Alternativos

Se você não precisa de todos os recursos, considere usar starters menores:

### archbase-starter-security

Inclui DDD + Segurança, sem multi-tenancy:

```xml
<dependency>
    <groupId>br.com.archbase</groupId>
    <artifactId>archbase-starter-security</artifactId>
</dependency>
```

### archbase-starter-core

Apenas DDD básico, sem segurança nem multi-tenancy:

```xml
<dependency>
    <groupId>br.com.archbase</groupId>
    <artifactId>archbase-starter-core</artifactId>
</dependency>
```

## Exemplo Completo de Configuração

```yaml
# application.yml
spring:
  application:
    name: minha-app
  datasource:
    url: jdbc:postgresql://localhost:5432/meudb
    username: usuario
    password: senha
  jpa:
    hibernate:
      ddl-auto: update
    show-sql: true

server:
  port: 8080

archbase:
  multitenancy:
    enabled: true
    scan-packages: com.minhaempresa

  security:
    enabled: true
    method:
      enabled: true
    jwt:
      secret: ${JWT_SECRET:minha-chave-secreta-de-pelo-menos-32-caracteres}
      expiration: 86400000      # 24 horas
      refresh-expiration: 604800000  # 7 dias

  rsql:
    enabled: true
    case-insensitive: true
```

## Testando a Instalação

```java
@SpringBootTest
class ArchbaseStarterTest {

    @Autowired
    private ApplicationContext context;

    @Test
    void contextLoads() {
        assertNotNull(context);
        assertTrue(context.containsBean("commandBus"));
        assertTrue(context.containsBean("eventBus"));
        assertTrue(context.containsBean("queryBus"));
    }
}
```

## Solução de Problemas

### Beans não criados

Verifique se as propriedades `enabled` estão corretas:

```yaml
archbase:
  multitenancy:
    enabled: true  # Deve estar true para ativar
```

### Erro de autenticação

Certifique-se de configurar o secret do JWT:

```yaml
archbase:
  security:
    jwt:
      secret: deve-ter-no-minimo-32-caracteres
```

## Próximos Passos

- [archbase-security](/docs/modulos/security) - Configuração de segurança detalhada
- [archbase-multitenancy](/docs/modulos/multitenancy) - Configuração multi-tenant
- [Quick Start](/docs/getting-started/quick-start) - Primeiro projeto completo
