---
title: archbase-multitenancy
sidebar_position: 5
---

# archbase-multitenancy

O módulo **archbase-multitenancy** fornece suporte multi-tenant para aplicações Spring Boot, permitindo que múltiplos inquilinos compartilhem a mesma aplicação.

## Instalação

```xml
<dependency>
    <groupId>br.com.archbase</groupId>
    <artifactId>archbase-multitenancy</artifactId>
    <version>${archbase.version}</version>
</dependency>
```

## Configuração

```yaml
archbase:
  multitenancy:
    enabled: true
    scan-packages: com.minhaempresa.minhaapp  # Pacote para escanear entidades
    resolver:
      type: header  # header, query, or subdomain
      header-name: X-Tenant-Id
      query-param-name: tenantId
      subdomain-domain: minhaempresa.com.br
```

## Estratégias de Resolução de Tenant

### 1. Por Header (Recomendado)

```yaml
archbase:
  multitenancy:
    resolver:
      type: header
      header-name: X-Tenant-Id
```

**Uso:**
```bash
curl -H "X-Tenant-Id: tenant-123" http://localhost:8080/api/pedidos
```

### 2. Por Query Parameter

```yaml
archbase:
  multitenancy:
    resolver:
      type: query
      query-param-name: tenantId
```

**Uso:**
```bash
curl http://localhost:8080/api/pedidos?tenantId=tenant-123
```

### 3. Por Subdomínio

```yaml
archbase:
  multitenancy:
    resolver:
      type: subdomain
      subdomain-domain: minhaempresa.com.br
```

**Uso:**
```bash
curl http://tenant-123.minhaempresa.com.br/api/pedidos
```

## Entidades Multi-Tenant

### TenantPersistenceEntityBase

Use a base específica para entidades multi-tenant:

```java
@Entity
@DomainEntity
@Table(name = "clientes")
public class Cliente extends TenantPersistenceEntityBase<Cliente, UUID> {

    private String nome;
    private String email;

    // Tenant ID é adicionado automaticamente
}
```

O framework adiciona automaticamente:
- Coluna `tenant_id` na tabela
- Filtro `WHERE tenant_id = ?` em todas as queries
- Validação de tenant nas operações

### Repositório Tenant-Aware

```java
@DomainRepository
public interface ClienteRepository extends TenantRepository<Cliente, UUID, Long> {
    // Queries automaticamente filtradas por tenant
    // Não é necessário adicionar WHERE tenantId = ?
}
```

## Contexto de Tenant

### Obter Tenant Atual

```java
@Service
public class ClienteService {

    public Cliente criar(ClienteRequest request) {
        // Obter tenant do contexto
        String tenantId = ArchbaseTenantContext.getTenantId();

        Cliente cliente = new Cliente();
        cliente.setNome(request.getNome());
        cliente.setEmail(request.getEmail());

        // Tenant é definido automaticamente antes de salvar
        return clienteRepository.save(cliente);
    }
}
```

### Modificar Contexto de Tenant

```java
@Component
public class TenantMigrationService {

    public void migrarDados(String tenantOrigem, String tenantDestino) {
        ArchbaseTenantContext.setTenantId(tenantOrigem);

        List<Cliente> clientes = clienteRepository.findAll();

        ArchbaseTenantContext.setTenantId(tenantDestino);

        clientes.forEach(clienteRepository::save);
    }
}
```

## Tasks Assíncronas

Para tasks assíncronas, use o decorator para propagar o contexto:

```java
@Configuration
@EnableAsync
public class AsyncConfig {

    @Bean(name = "taskExecutor")
    public Executor taskExecutor() {
        ThreadPoolTaskExecutor executor = new ThreadPoolTaskExecutor();
        executor.setCorePoolSize(5);
        executor.setMaxPoolSize(10);
        executor.setQueueCapacity(100);
        executor.setThreadNamePrefix("async-");
        executor.initialize();
        return executor;
    }

    @Bean
    public AsyncTaskDecorator asyncTenantDecorator() {
        return new TenantAwareAsyncDecorator();
    }
}
```

## Row-Level Security

Para segurança adicional no banco de dados:

```sql
-- PostgreSQL
CREATE POLICY tenant_isolation_policy ON clientes
FOR ALL
USING (tenant_id = current_setting('app.current_tenant')::uuid);
```

## Testes Multi-Tenant

```java
@SpringBootTest
class MultiTenantTest {

    @Autowired
    private ClienteRepository clienteRepository;

    @Test
    void deveIsolarDadosPorTenant() {
        // Tenant 1
        ArchbaseTenantContext.setTenantId("tenant-1");
        clienteRepository.save(new Cliente("João"));

        // Tenant 2
        ArchbaseTenantContext.setTenantId("tenant-2");
        clienteRepository.save(new Cliente("Maria"));

        // Verificar isolamento
        ArchbaseTenantContext.setTenantId("tenant-1");
        List<Cliente> clientesTenant1 = clienteRepository.findAll();
        assertThat(clientesTenant1).hasSize(1);
        assertThat(clientesTenant1.get(0).getNome()).isEqualTo("João");

        ArchbaseTenantContext.setTenantId("tenant-2");
        List<Cliente> clientesTenant2 = clienteRepository.findAll();
        assertThat(clientesTenant2).hasSize(1);
        assertThat(clientesTenant2.get(0).getNome()).isEqualTo("Maria");
    }
}
```

---

## Interceptadores e Headers

### ArchbaseTenantRequestInterceptor

Interceptador Spring MVC que extrai o tenant de cada requisição:

```java
@Component
public class ArchbaseTenantRequestInterceptor implements HandlerInterceptor {

    @Override
    public boolean preHandle(HttpServletRequest request,
                           HttpServletResponse response,
                           Object handler) {

        // Tenta obter do header X-TENANT-ID
        String tenantId = request.getHeader("X-Tenant-Id");

        if (tenantId == null) {
            // Tenta obter do header X-COMPANY-ID
            tenantId = request.getHeader("X-Company-Id");
        }

        if (tenantId != null) {
            ArchbaseTenantContext.setTenantId(tenantId);
        }

        return true;
    }

    @Override
    public void afterCompletion(HttpServletRequest request,
                              HttpServletResponse response,
                              Object handler,
                              Exception ex) {
        // Limpa o contexto após a requisição
        ArchbaseTenantContext.clear();
    }
}
```

### Headers Suportados

| Header | Descrição | Prioridade |
|--------|-----------|------------|
| `X-Tenant-Id` | Identificador do tenant | 1ª |
| `X-Company-Id` | Identificador da empresa (alternativa) | 2ª |

**Exemplo de requisição:**

```http
GET /api/pedidos HTTP/1.1
Host: api.example.com
X-Tenant-Id: tenant-123
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

Ou com company:

```http
GET /api/pedidos HTTP/1.1
Host: api.example.com
X-Company-Id: company-456
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

---

## Propagação de Contexto

### ArchbaseTenantServiceAspect

Aspect AOP para propagação de contexto em chamadas de serviço:

```java
@Aspect
@Component
public class ArchbaseTenantServiceAspect {

    @Around("@annotation(TenantAware)")
    public Object propagateTenantContext(ProceedingJoinPoint joinPoint) throws Throwable {

        String tenantId = ArchbaseTenantContext.getTenantId();

        try {
            // Executa o método com contexto de tenant
            return joinPoint.proceed();
        } finally {
            // Garante que o contexto seja mantido
            if (tenantId != null) {
                ArchbaseTenantContext.setTenantId(tenantId);
            }
        }
    }
}
```

**Uso com anotação customizada:**

```java
@TenantAware
public void processarDados(Dados dados) {
    // O contexto de tenant é automaticamente propagado
}
```

### ArchbaseTenantAwareTaskDecorator

Decorator para propagação de contexto em tarefas assíncronas:

```java
@Configuration
@EnableAsync
public class AsyncConfig {

    @Bean(name = "taskExecutor")
    public Executor taskExecutor() {
        ThreadPoolTaskExecutor executor = new ThreadPoolTaskExecutor();
        executor.setCorePoolSize(5);
        executor.setMaxPoolSize(10);
        executor.setQueueCapacity(100);
        executor.setThreadNamePrefix("async-");
        executor.initialize();

        // Configura decorator para propagar contexto
        executor.setTaskDecorator(new ArchbaseTenantAwareTaskDecorator());

        return executor;
    }
}
```

**Uso em métodos assíncronos:**

```java
@Service
public class PedidoService {

    @Async("taskExecutor")
    public void processarPedidoAsync(UUID pedidoId) {
        // Contexto de tenant é propagado automaticamente
        String tenantId = ArchbaseTenantContext.getTenantId();
        // Processa pedido...
    }
}
```

---

## Integração com Hibernate

### ArchbaseCurrentTenantIdentifierResolverImpl

Resolvedor Hibernate para identificação de tenant:

```java
@Component
public class ArchbaseCurrentTenantIdentifierResolverImpl
        implements CurrentTenantIdentifierResolver<String> {

    @Override
    public String resolveCurrentTenantIdentifier() {
        return ArchbaseTenantContext.getTenantId();
    }

    @Override
    public boolean validateExistingCurrentSessions() {
        return true;
    }
}
```

**Configuração do Hibernate:**

```yaml
spring:
  jpa:
    properties:
      hibernate:
        multiTenancy: SCHEMA  # ou DATABASE
        tenant_identifier_resolver: archbaseCurrentTenantIdentifierResolverImpl
```

---

## Solução de Problemas

### Tenant Não Definido

```java
@ControllerAdvice
public class TenantNotFoundAdvice {

    @ExceptionHandler(TenantNotFoundException.class)
    public ResponseEntity<ErrorResponse> handleTenantNotFound() {
        return ResponseEntity
            .status(HttpStatus.BAD_REQUEST)
            .body(new ErrorResponse("TENANT_NOT_FOUND", "Tenant não informado"));
    }
}
```

### Cross-Tenant Data Leakage

Sempre use `TenantPersistenceEntityBase` e `TenantRepository` para garantir isolamento:

```java
// ✅ CORRETO - Filtragem automática
public class Cliente extends TenantPersistenceEntityBase<Cliente, UUID> { }

// ❏ INCORRETO - Sem isolamento
public class Cliente extends PersistenceEntityBase<Cliente, UUID> { }
```

## Próximos Passos

- [Guias: Multi-tenancy Setup](/docs/guias/multitenancy-setup) - Guia completo
- [archbase-starter](/docs/modulos/starter) - Inclui multi-tenancy
