---
title: archbase-hypersistence
sidebar_position: 19
---

# archbase-hypersistence

Módulo de integração com [Hypersistence Utils](https://github.com/vladmihalcea/hypersistence-utils) que fornece suporte avançado a tipos Hibernate para persistência de dados complexos como JSON, arrays e ranges.

## Visão Geral

O módulo `archbase-hypersistence` adiciona funcionalidades avançadas de persistência ao framework Archbase:

| Funcionalidade | Descrição | Banco de Dados |
|---------------|-----------|----------------|
| **JSON Types** | Colunas JSON/JSONB | PostgreSQL, MySQL, Oracle, H2 |
| **Array Types** | Arrays nativos (text[], int[], uuid[]) | PostgreSQL |
| **Range Types** | Intervalos (daterange, int4range, etc.) | PostgreSQL |
| **Repository Otimizado** | Métodos `persist()`, `merge()`, `update()` | Todos |
| **N+1 Detection** | Detecção de queries N+1 em testes | Todos |
| **TSID Generator** | IDs ordenados por tempo | Todos |

## Instalação

### Usando o Starter (Recomendado)

```xml
<dependency>
    <groupId>br.com.archbase</groupId>
    <artifactId>archbase-starter-hypersistence</artifactId>
    <version>${archbase.version}</version>
</dependency>
```

### Usando apenas o módulo core

```xml
<dependency>
    <groupId>br.com.archbase</groupId>
    <artifactId>archbase-hypersistence</artifactId>
    <version>${archbase.version}</version>
</dependency>
```

## Tipos JSON

O tipo JSON é a funcionalidade mais utilizada do módulo. Permite armazenar estruturas complexas em colunas JSON do banco de dados.

### Map como JSON

```java
import io.hypersistence.utils.hibernate.type.json.JsonType;
import org.hibernate.annotations.Type;

@Entity
public class ProductEntity extends TenantPersistenceEntityBase<ProductEntity, String> {

    private String name;

    @Type(JsonType.class)
    @Column(columnDefinition = "jsonb")
    private Map<String, Object> metadata;
}
```

### Lista como JSON

```java
@Entity
public class ArticleEntity extends PersistenceEntityBase<ArticleEntity, String> {

    private String title;

    @Type(JsonType.class)
    @Column(columnDefinition = "jsonb")
    private List<String> tags;
}
```

### POJO customizado como JSON

```java
// Classe POJO para armazenar como JSON
public class ProductDetails {
    private String manufacturer;
    private String model;
    private Map<String, String> specifications;

    // getters e setters
}

@Entity
public class ProductEntity extends TenantPersistenceEntityBase<ProductEntity, String> {

    @Type(JsonType.class)
    @Column(columnDefinition = "jsonb")
    private ProductDetails details;
}
```

### JsonNode (JSON dinâmico)

```java
import com.fasterxml.jackson.databind.JsonNode;

@Entity
public class ConfigurationEntity extends PersistenceEntityBase<ConfigurationEntity, String> {

    @Type(JsonType.class)
    @Column(columnDefinition = "jsonb")
    private JsonNode configuration;
}
```

## Tipos Array (PostgreSQL)

:::caution Atenção
Tipos Array funcionam **apenas com PostgreSQL**. Para testes com H2, use tipos JSON.
:::

### Array de Strings

```java
import io.hypersistence.utils.hibernate.type.array.StringArrayType;

@Entity
public class EventEntity extends PersistenceEntityBase<EventEntity, String> {

    @Type(StringArrayType.class)
    @Column(columnDefinition = "text[]")
    private String[] participants;
}
```

### Array de Inteiros

```java
import io.hypersistence.utils.hibernate.type.array.IntArrayType;

@Entity
public class ScoreEntity extends PersistenceEntityBase<ScoreEntity, String> {

    @Type(IntArrayType.class)
    @Column(columnDefinition = "int[]")
    private int[] scores;
}
```

### Array de UUIDs

```java
import io.hypersistence.utils.hibernate.type.array.UUIDArrayType;

@Entity
public class RelationEntity extends PersistenceEntityBase<RelationEntity, String> {

    @Type(UUIDArrayType.class)
    @Column(columnDefinition = "uuid[]")
    private UUID[] relatedIds;
}
```

### Lista como Array

```java
import io.hypersistence.utils.hibernate.type.array.ListArrayType;

@Entity
public class CategoryEntity extends PersistenceEntityBase<CategoryEntity, String> {

    @Type(ListArrayType.class)
    @Column(columnDefinition = "text[]")
    private List<String> subcategories;
}
```

## Tipos Range (PostgreSQL)

:::caution Atenção
Tipos Range funcionam **apenas com PostgreSQL**.
:::

### Range de Datas

```java
import io.hypersistence.utils.hibernate.type.range.PostgreSQLRangeType;
import io.hypersistence.utils.hibernate.type.range.Range;

@Entity
public class ReservationEntity extends PersistenceEntityBase<ReservationEntity, String> {

    @Type(PostgreSQLRangeType.class)
    @Column(columnDefinition = "daterange")
    private Range<LocalDate> reservationPeriod;
}

// Uso
Range<LocalDate> period = Range.closed(
    LocalDate.of(2024, 1, 1),
    LocalDate.of(2024, 1, 31)
);
```

### Range de Inteiros

```java
@Entity
public class AgeGroupEntity extends PersistenceEntityBase<AgeGroupEntity, String> {

    @Type(PostgreSQLRangeType.class)
    @Column(columnDefinition = "int4range")
    private Range<Integer> ageRange;
}

// Uso - range semi-aberto [18, 65)
Range<Integer> adults = Range.closedOpen(18, 65);
```

### Range de BigDecimal

```java
@Entity
public class PriceRangeEntity extends PersistenceEntityBase<PriceRangeEntity, String> {

    @Type(PostgreSQLRangeType.class)
    @Column(columnDefinition = "numrange")
    private Range<BigDecimal> priceRange;
}
```

## Repository Otimizado

O módulo fornece métodos de repositório mais eficientes que o `save()` padrão.

### Interface do Repository

```java
public interface ProductRepository
    extends ArchbaseJpaRepository<ProductEntity, String, Long>,
            ArchbaseHypersistenceRepository<ProductEntity, String> {
}
```

### Usando persist() vs save()

```java
@Service
public class ProductService {

    private final ProductRepository repository;

    /**
     * persist() é mais eficiente que save() para entidades NOVAS.
     * Não faz SELECT antes do INSERT.
     */
    public ProductEntity createProduct(ProductEntity product) {
        return repository.persist(product);
    }

    /**
     * Para múltiplas entidades, use persistAll().
     */
    public List<ProductEntity> createProducts(List<ProductEntity> products) {
        return repository.persistAll(products);
    }

    /**
     * update() para entidades existentes.
     */
    public ProductEntity updateProduct(ProductEntity product) {
        return repository.update(product);
    }
}
```

### Comparação de Performance

| Método | Operação | SELECTs | INSERTs/UPDATEs |
|--------|----------|---------|-----------------|
| `save()` (novo) | INSERT | 1 | 1 |
| `persist()` | INSERT | 0 | 1 |
| `save()` (existente) | UPDATE | 1 | 1 |
| `update()` | UPDATE | 0 | 1 |

## Detecção de N+1 Queries

Use `SQLStatementCountAssertions` em testes para detectar problemas de N+1.

### Exemplo de Teste

```java
import br.com.archbase.hypersistence.util.SQLStatementCountAssertions;

@SpringBootTest
class OrderRepositoryTest {

    @Autowired
    private OrderRepository orderRepository;

    @Test
    void shouldNotHaveNPlusOneQueries() {
        // Reset dos contadores
        SQLStatementCountAssertions.reset();

        // Executa operação que pode ter N+1
        List<Order> orders = orderRepository.findAllWithItems();

        // Verifica que apenas 1 SELECT foi executado
        SQLStatementCountAssertions.assertSelectCount(1);
    }

    @Test
    void shouldExecuteExactlyOneInsert() {
        SQLStatementCountAssertions.reset();

        Order order = new Order();
        orderRepository.persist(order);
        orderRepository.flush();

        SQLStatementCountAssertions.assertInsertCount(1);
        SQLStatementCountAssertions.assertNoSelect();
    }
}
```

## TSID Generator

TSID (Time-Sorted Unique Identifier) é uma alternativa ao UUID que é ordenável por tempo.

### Uso

```java
import io.hypersistence.utils.hibernate.id.Tsid;

@Entity
public class OrderEntity {

    @Id
    @Tsid
    private Long id;

    // ou como String
    @Id
    @Tsid
    private String id;
}
```

### Vantagens do TSID sobre UUID

| Característica | TSID | UUID |
|---------------|------|------|
| Tamanho | 8 bytes | 16 bytes |
| String | 13 caracteres | 36 caracteres |
| Ordenável por tempo | Sim | Não |
| Performance em índices | Melhor | Pior |

## Tipos PostgreSQL Específicos

### HStore (Map key-value)

```java
import io.hypersistence.utils.hibernate.type.basic.PostgreSQLHStoreType;

@Entity
public class MetadataEntity extends PersistenceEntityBase<MetadataEntity, String> {

    @Type(PostgreSQLHStoreType.class)
    @Column(columnDefinition = "hstore")
    private Map<String, String> attributes;
}
```

### Inet (Endereços IP)

```java
import io.hypersistence.utils.hibernate.type.basic.PostgreSQLInetType;
import io.hypersistence.utils.hibernate.type.basic.Inet;

@Entity
public class AccessLogEntity extends PersistenceEntityBase<AccessLogEntity, String> {

    @Type(PostgreSQLInetType.class)
    @Column(columnDefinition = "inet")
    private Inet clientIp;
}
```

## Configuração

### application.yml

```yaml
archbase:
  hypersistence:
    enabled: true
    json:
      enabled: true
    postgresql:
      array-types-enabled: true
      range-types-enabled: true
      hstore-enabled: false
      inet-enabled: false
    repository:
      enhanced-methods-enabled: false
```

### Desabilitar o módulo

```yaml
archbase:
  hypersistence:
    enabled: false
```

## Compatibilidade de Banco de Dados

| Funcionalidade | PostgreSQL | MySQL | Oracle | H2 |
|---------------|------------|-------|--------|-----|
| JSON Types | jsonb/json | json | JSON/VARCHAR | json |
| Array Types | Sim | Não | Não | Não |
| Range Types | Sim | Não | Não | Não |
| HStore | Sim | Não | Não | Não |
| Inet | Sim | Não | Não | Não |
| Repository Methods | Sim | Sim | Sim | Sim |
| TSID | Sim | Sim | Sim | Sim |

## Migração de Converters Existentes

O módulo coexiste com os converters existentes do Archbase:

| Converter Archbase | Hypersistence Type | Recomendação |
|-------------------|-------------------|--------------|
| `MonetaryAmountAttributeConverter` | `MonetaryAmountType` | Manter Archbase (1 coluna) |
| `YearMonthConverter` | `YearMonthType` | Manter Archbase |
| N/A | `JsonType` | Usar Hypersistence |
| N/A | `StringArrayType` | Usar Hypersistence |

## Troubleshooting

### Erro: "Could not determine recommended JdbcType for Java type"

**Causa**: Tipo não reconhecido pelo Hibernate.

**Solução**: Verifique se a anotação `@Type` está correta e a dependência está presente.

### Erro: "Array types not supported"

**Causa**: Tentando usar tipos array em banco que não é PostgreSQL.

**Solução**: Use tipos JSON em vez de array para H2/MySQL.

### Erro em testes com H2

**Causa**: H2 não suporta alguns tipos PostgreSQL específicos.

**Solução**:
1. Use tipos JSON (funcionam com H2)
2. Ou use Testcontainers com PostgreSQL para testes de integração

```java
@Testcontainers
class PostgreSQLIntegrationTest {

    @Container
    static PostgreSQLContainer<?> postgres =
        new PostgreSQLContainer<>("postgres:15");

    // seus testes aqui
}
```

## Próximos Passos

- [Guias: Criando Entidades](/docs/guias/creating-entities)
- [Módulos: Domain-Driven-Design](/docs/modulos/domain-driven-design)
- [Módulos: Multitenancy](/docs/modulos/multitenancy)
- [Módulos: Test Utils](/docs/modulos/test-utils)
