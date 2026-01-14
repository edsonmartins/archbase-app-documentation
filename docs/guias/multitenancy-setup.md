---
title: Configuração Multi-Tenancy
sidebar_position: 6
---

# Configuração Multi-Tenancy

Multi-tenancy permite que múltiplos inquilinos (tenantes) compartilhem a mesma aplicação com dados isolados.

## Tipos de Multi-Tenancy

| Estratégia | Descrição | Vantagens |
|------------|-----------|-----------|
| **Schema por Tenant** | Schema separado por tenant | Isolamento bom, migration facilitada |
| **Coluna Tenant** | Coluna em cada tabela | Simples, migrations compartilhadas |
| **Database por Tenant** | Banco separado por tenant | Máximo isolamento |

## Configuração Básica

```yaml
archbase:
  multitenancy:
    enabled: true
    strategy: COLUMN  # COLUMN, SCHEMA, DATABASE
    tenant-resolver: header  # header, subdomain, query
    tenant-header: X-Tenant-ID
```

## Entidade Multi-Tenant

```java
package com.exemplo.domain.entity;

import br.com.archbase.multitenancy.domain.entity.TenantPersistenceEntityBase;
import jakarta.persistence.Entity;
import java.util.UUID;

@Entity
@DomainEntity
public class Produto extends TenantPersistenceEntityBase<Produto, UUID> {

    private String nome;
    private String descricao;
    private BigDecimal preco;
    private Boolean ativo;

    // O campo tenantId é herdado automaticamente
    // e é preenchido pelo contexto do tenant atual
}
```

## Repository Multi-Tenant

```java
package com.exemplo.domain.repository;

import br.com.archbase.multitenancy.data.repository.TenantRepository;
import com.exemplo.domain.entity.Produto;
import java.util.UUID;

@DomainRepository
public interface ProdutoRepository extends TenantRepository<Produto, UUID> {

    // Queries filtram automaticamente por tenant
    List<Produto> findByAtivoTrue();

    List<Produto> findByCategoria(String categoria);
}
```

## Tenant Resolver

### Header Tenant Resolver

```java
@Component
@Order(1)
public class HeaderTenantResolver implements TenantResolver {

    @Override
    public String resolve(HttpServletRequest request) {
        String tenantId = request.getHeader("X-Tenant-ID");
        return tenantId;
    }

    @Override
    public boolean supports(HttpServletRequest request) {
        return request.getHeader("X-Tenant-ID") != null;
    }
}
```

### Subdomain Tenant Resolver

```java
@Component
@Order(2)
public class SubdomainTenantResolver implements TenantResolver {

    private static final List<String> RESERVED_SUBDOMAINS = List.of(
        "www", "api", "admin", "app"
    );

    @Override
    public String resolve(HttpServletRequest request) {
        String host = request.getServerName();
        String subdomain = extractSubdomain(host);

        if (RESERVED_SUBDOMAINS.contains(subdomain)) {
            return null;
        }

        return subdomain;
    }

    @Override
    public boolean supports(HttpServletRequest request) {
        String host = request.getServerName();
        return extractSubdomain(host) != null;
    }

    private String extractSubdomain(String host) {
        String[] parts = host.split("\\.");
        return parts.length > 2 ? parts[0] : null;
    }
}
```

### Query Parameter Tenant Resolver

```java
@Component
@Order(3)
public class QueryParamTenantResolver implements TenantResolver {

    @Override
    public String resolve(HttpServletRequest request) {
        return request.getParameter("tenantId");
    }

    @Override
    public boolean supports(HttpServletRequest request) {
        return request.getParameter("tenantId") != null;
    }
}
```

## Tenant Context

O contexto do tenant é armazenado em ThreadLocal:

```java
@Service
public class ProdutoService {

    public Produto criar(ProdutoDTO dto) {
        // Contexto está disponível automaticamente
        String tenantId = ArchbaseTenantContext.getTenantId();

        log.info("Criando produto para tenant: {}", tenantId);

        Produto produto = new Produto();
        produto.setNome(dto.getNome());
        produto.setPreco(dto.getPreco());

        // tenantId é preenchido automaticamente no save
        return produtoRepository.save(produto);
    }
}
```

## Configuração Avançada

```java
@Configuration
@EnableMultiTenancy
public class MultiTenancyConfig {

    @Bean
    public TenantResolverChain tenantResolverChain(
            List<TenantResolver> resolvers) {
        return new TenantResolverChain(resolvers);
    }

    @Bean
    public TenantFilter tenantFilter(TenantResolverChain resolverChain) {
        return new TenantFilter(resolverChain);
    }

    @Bean
    public TenantInterceptor tenantInterceptor() {
        return new TenantInterceptor();
    }

    // Para tarefas assíncronas
    @Bean
    public TaskDecorator tenantTaskDecorator() {
        return new TenantAwareTaskDecorator();
    }
}
```

## Tarefas Assíncronas

Para propagar o contexto do tenant em tarefas assíncronas:

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
        executor.setTaskDecorator(new TenantAwareTaskDecorator());
        executor.initialize();
        return executor;
    }
}
```

```java
@Service
public class EmailService {

    @Async("taskExecutor")
    public void enviarEmailConfirmacao(Pedido pedido) {
        // Tenant context é propagado automaticamente
        String tenantId = ArchbaseTenantContext.getTenantId();
        // Enviar email...
    }
}
```

## Migration Flyway

### Schema por Tenant

```java
@Bean
public FlywayMigrationStrategy flywayMigrationStrategy() {
    return Flyway::migrate;
}

@Component
public class TenantMigrationService {

    public void criarSchemaParaTenant(String tenantId) {
        Flyway flyway = Flyway.configure()
            .dataSource(dataSource)
            .schemas(tenantId)
            .locations("classpath:db/migration/{tenant}")
            .load();

        flyway.migrate();
    }
}
```

### Coluna Tenant

```sql
-- V1__criar_tabela_produto.sql
CREATE TABLE produto (
    id          UUID PRIMARY KEY,
    tenant_id   VARCHAR(100) NOT NULL,
    nome        VARCHAR(200) NOT NULL,
    preco       DECIMAL(10,2) NOT NULL,
    ativo       BOOLEAN DEFAULT TRUE,
    created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_produto_tenant ON produto(tenant_id);
```

## Testando Multi-Tenancy

```java
@SpringBootTest
@AutoConfigureMockMvc
class ProdutoControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Test
    @WithMockTenant(tenantId = "tenant-1")
    void deveCriarProdutoParaTenant1() throws Exception {
        String produtoJson = """
            {
                "nome": "Produto Teste",
                "preco": 99.90
            }
            """;

        mockMvc.perform(post("/api/v1/produtos")
                .header("X-Tenant-ID", "tenant-1")
                .contentType(MediaType.APPLICATION_JSON)
                .content(produtoJson))
            .andExpect(status().isCreated());

        // Verificar que o produto foi criado para tenant-1
    }

    @Test
    void deveNegarAcessoSemTenant() throws Exception {
        mockMvc.perform(get("/api/v1/produtos"))
            .andExpect(status().isBadRequest());
    }
}
```

## Anotação @WithMockTenant

```java
@Target({ElementType.METHOD, ElementType.TYPE})
@Retention(RetentionPolicy.RUNTIME)
public @interface WithMockTenant {
    String tenantId() default "test-tenant";
}
```

## Boas Práticas

| Prática | Descrição |
|---------|-----------|
| **Sempre valide tenant** | Nunca confie apenas no contexto |
| **Índices por tenant** | Crie índices na coluna tenant_id |
| **Log com tenant** | Inclua tenantId em todos os logs |
| **Testes com tenant** | Use @WithMockTenant nos testes |
| **Cache por tenant** | Inclua tenant nas chaves de cache |

## Próximos Passos

- [Multi-Tenancy Module](/docs/modulos/multitenancy) - Documentação completa
- [Security](/docs/guias/security-setup) - Segurança com multi-tenancy
- [Testing](/docs/guias/testing) - Testando com múltiplos tenants
