---
title: archbase-architecture-rules
sidebar_position: 18
---

# archbase-architecture-rules

O módulo **archbase-architecture-rules** fornece regras de validação arquitetural baseadas em Taikai/ArchUnit para garantir que projetos sigam os padrões do Archbase Framework.

## Por que usar?

- **Prevenir violações**: Detecta problemas arquiteturais antes do merge
- **Automatizado**: Executa como teste unitário no CI/CD
- **Consistência**: Garante que toda a equipe siga os mesmos padrões
- **Feedback rápido**: Mensagens claras sobre o que está errado

## Instalação

```xml
<dependency>
    <groupId>br.com.archbase</groupId>
    <artifactId>archbase-architecture-rules</artifactId>
    <version>${archbase.version}</version>
    <scope>test</scope>
</dependency>
```

## Uso Básico

### API Fluente

```java
@Test
void shouldFollowArchbasePatterns() {
    ArchbaseArchitectureRules.forNamespace("com.minhaempresa.meuprojeto")
        .withDddRules()         // Entidades, repositórios, camadas
        .withSpringRules()      // Controllers, Services, @Autowired
        .withNamingRules()      // Convenções de nomes
        .withSecurityRules()    // @HasPermission obrigatório
        .withMultitenancyRules() // TenantPersistenceEntityBase
        .check();
}
```

### Profiles Predefinidos

```java
// API REST com multitenancy (mais comum)
ArchbaseRuleProfiles.multitenantRestApi("com.minhaempresa").check();

// API REST sem multitenancy
ArchbaseRuleProfiles.simpleRestApi("com.minhaempresa").check();

// Microservice simples
ArchbaseRuleProfiles.simpleService("com.minhaempresa").check();

// Apenas regras DDD (para bibliotecas)
ArchbaseRuleProfiles.domainOnly("com.minhaempresa").check();

// Todas as regras (modo estrito)
ArchbaseRuleProfiles.strict("com.minhaempresa").check();

// Regras mínimas (projetos em migração)
ArchbaseRuleProfiles.lenient("com.minhaempresa").check();
```

### Estendendo Classe Base

```java
class MeuProjetoArchitectureTest extends ArchbaseArchitectureTest {

    @Override
    protected String getBasePackage() {
        return "com.minhaempresa.meuprojeto";
    }

    @Override
    protected boolean enableSecurityRules() {
        return true; // Valida @HasPermission
    }

    @Override
    protected boolean enableMultitenancyRules() {
        return true; // Valida TenantPersistenceEntityBase
    }

    @Override
    protected void configureCustomRules(ArchbaseArchitectureRules rules) {
        // Regras específicas do projeto
    }
}
```

## Regras Disponíveis

### Regras DDD

| Regra | Descrição |
|-------|-----------|
| Entidades JPA | Devem estender `PersistenceEntityBase` ou `TenantPersistenceEntityBase` |
| Repositórios | Devem implementar `ArchbaseCommonJpaRepository` |
| **Sem métodos customizados** | Repositórios não devem ter `findByX`, `@Query` - usar QueryDSL no adapter |
| Separação de camadas | Domain não depende de Infrastructure |
| Pacotes corretos | Entidades em `domain`, `entity` ou `persistence` |

:::warning Repositórios sem métodos customizados
Esta regra garante que todas as queries sejam feitas via QueryDSL no adapter:

```java
// ❌ VIOLAÇÃO - método customizado no repositório
public interface ProdutoRepository extends ArchbaseCommonJpaRepository<...> {
    Optional<Produto> findBySku(String sku);  // Não permitido!

    @Query("SELECT p FROM Produto p WHERE p.ativo = true")
    List<Produto> findAtivos();  // Não permitido!
}

// ✅ CORRETO - usar QueryDSL no adapter
@Component
public class ProdutoQueryAdapter {
    private final JPAQueryFactory queryFactory;

    public Optional<Produto> findBySku(String sku) {
        QProduto p = QProduto.produto;
        return Optional.ofNullable(
            queryFactory.selectFrom(p)
                .where(p.sku.eq(sku))
                .fetchOne()
        );
    }
}
```
:::

### Regras Spring

| Regra | Descrição |
|-------|-----------|
| Nomenclatura | Controllers terminam com `Controller`, Services com `Service`, etc |
| Sem @Autowired em campos | Usar injeção via construtor |
| Controllers isolados | Não dependem de outros controllers |
| Camadas | Controllers → Services → Repositories (não pular camadas) |

### Regras de Segurança

| Regra | Descrição |
|-------|-----------|
| @HasPermission | Todos os endpoints REST devem ter anotação de segurança |
| Endpoints públicos | Devem ser explicitamente marcados com `@PermitAll` |

:::tip Exemplo de controller seguro
```java
@RestController
@RequestMapping("/api/v1/produtos")
@HasPermission(action = "VIEW", resource = "PRODUTO")
class ProdutoController {

    @PostMapping
    @HasPermission(action = "CREATE", resource = "PRODUTO")
    ResponseEntity<ProdutoDTO> criar(@Valid @RequestBody ProdutoCreateDTO dto) {
        // ...
    }
}
```
:::

### Regras de Nomenclatura

| Regra | Descrição |
|-------|-----------|
| Interfaces | Não devem ter prefixo `I` (use `UserRepository`, não `IUserRepository`) |
| Classes | Não devem ter sufixo `Impl` (use nomes descritivos) |
| DTOs | Devem terminar com `DTO` ou `Dto` |
| Exceções | Devem terminar com `Exception` |
| Constantes | Devem usar `UPPER_SNAKE_CASE` |

### Regras de Multitenancy

| Regra | Descrição |
|-------|-----------|
| Entidades tenant-aware | Devem estender `TenantPersistenceEntityBase` |

## Regras Customizadas

```java
ArchbaseArchitectureRules.forNamespace("com.minhaempresa")
    .withDddRules()
    // Regra customizada
    .addRule(TaikaiRule.of(
        ArchRuleDefinition.classes()
            .that().resideInAPackage("..usecase..")
            .should().haveSimpleNameEndingWith("UseCase")
    ))
    .check();
```

## Integração com CI/CD

Crie um teste que será executado automaticamente no build:

```java title="src/test/java/com/minhaempresa/ArchitectureTest.java"
package com.minhaempresa;

import br.com.archbase.architecture.rules.core.ArchbaseRuleProfiles;
import org.junit.jupiter.api.Test;

class ArchitectureTest {

    @Test
    void shouldFollowArchbasePatterns() {
        ArchbaseRuleProfiles.multitenantRestApi("com.minhaempresa").check();
    }
}
```

Se alguma regra for violada, o teste falha e o build é bloqueado.

## Boas Práticas

| Prática | Descrição |
|---------|-----------|
| Execute no CI | Configure para rodar em todo PR |
| Use `checkAll(true)` | Mostra todos os erros de uma vez |
| Comece com `lenient()` | Para projetos em migração |
| Adicione gradualmente | Habilite regras conforme o projeto amadurece |
| Documente exceções | Se precisar ignorar uma regra, documente o motivo |

## Exemplo Completo

```java title="src/test/java/com/vendax/ArchitectureTest.java"
package com.vendax;

import br.com.archbase.architecture.rules.test.ArchbaseArchitectureTest;
import br.com.archbase.architecture.rules.core.ArchbaseArchitectureRules;
import com.enofex.taikai.TaikaiRule;
import com.tngtech.archunit.lang.syntax.ArchRuleDefinition;

class VendaxArchitectureTest extends ArchbaseArchitectureTest {

    @Override
    protected String getBasePackage() {
        return "com.vendax";
    }

    @Override
    protected boolean enableSecurityRules() {
        return true;
    }

    @Override
    protected boolean enableMultitenancyRules() {
        return true;
    }

    @Override
    protected void configureCustomRules(ArchbaseArchitectureRules rules) {
        // Regra específica: Adapters devem terminar com "Adapter"
        rules.addRule(TaikaiRule.of(
            ArchRuleDefinition.classes()
                .that().resideInAPackage("..adapter..")
                .should().haveSimpleNameEndingWith("Adapter")
        ));
    }
}
```

## Próximos Passos

- [Guias: Testing](/docs/guias/testing) - Estratégias de teste
- [archbase-test-utils](/docs/modulos/test-utils) - Utilitários de teste
- [Taikai Documentation](https://enofex.github.io/taikai/) - Documentação oficial do Taikai
- [ArchUnit User Guide](https://www.archunit.org/userguide/html/000_Index.html) - Guia do ArchUnit
