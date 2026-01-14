---
title: archbase-architecture
sidebar_position: 15
---

# archbase-architecture

Módulo com **anotações de arquitetura** e regras ArchUnit para validação.

## Instalação

```xml
<dependency>
    <groupId>br.com.archbase</groupId>
    <artifactId>archbase-architecture</artifactId>
    <version>${archbase.version}</version>
</dependency>
```

## Anotações Hexagonais

### @Application

Marca o pacote ou classe como aplicação principal:

```java
@Application
package com.minhaempresa.aplicacao;
```

### @Port

Marca interfaces que definem contratos (ports):

```java
@Port
public interface PedidoRepository {
    Pedido save(Pedido pedido);
}
```

### @Adapter

Marca classes que implementam adaptação:

```java
@PrimaryAdapter
@RestController
public class PedidoController {
    // Adapter primário (REST)
}

@SecondaryAdapter
@Repository
public class PedidoRepositoryImpl {
    // Adapter secundário (Database)
}
```

## Anotações Layered

### Camadas

```java
@InterfaceLayer
public class RestController { }

@ApplicationLayer
public class ApplicationService { }

@DomainLayer
public class DomainEntity { }

@InfrastructureLayer
public class PersistenceRepository { }
```

## Anotações Onion

### Cebolas Clássicas

```java
@InfrastructureRing
public class InfrastructureConfig { }

@ApplicationServiceRing
public class ApplicationService { }

@DomainServiceRing
public class DomainService { }

@DomainModelRing
public class Entity { }
```

### Cebolas Simplificadas

```java
@InfrastructureRing
public class JpaConfig { }

@ApplicationRing
public class Service { }

@DomainRing
public class Entity { }
```

## ArchUnit Rules

### Validação de Arquitetura

```java
import static br.com.archbase.architecture.ArchbaseHexagonalRules;
import com.tngtech.archunit.junit.ArchTest;

@ArchTest
static final ArchRule rule = ArchbaseHexagonalRules
    .domainShouldNotDependOnInfrastructure(
        "com.minhaempresa.domain",
        "com.minhaempresa.infrastructure"
    );
```

### Regras Disponíveis

| Regra | Descrição |
|-------|-----------|
| `hexagonalRules()` | Valida estrutura hexagonal |
| `domainShouldNotDependOnInfrastructure()` | Domínio isento de infraestrutura |
| `adaptersShouldFollowPortRules()` | Adapters respeitam ports |
| `valueObjectsShouldBeImmutable()` | Value Objects são imutáveis |
| `entitiesShouldRespectNaming()` | Entidades têm nomenclatura correta |

## Teste Completo

```java
import com.tngtech.archunit.core.domain.JavaClasses;
import com.tngtech.archunit.junit.ArchTest;
import com.tngtech.archunit.lang.ArchRule;
import org.junit.jupiter.api.Test;

import static com.tngtech.archunit.lang.syntax.ArchRuleDefinition.classes;
import static com.tngtech.archunit.library.Architectures.layeredArchitecture;

class MinhaArquiteturaTest {

    @Test
    void deveRespeitarArquiteturaEmCamadas() {
        var rule = layeredArchitecture()
                .layer("Interface").definedBy("..interface..")
                .layer("Application").definedBy("..application..")
                .layer("Domain").definedBy("..domain..")
                .layer("Infrastructure").definedBy("..infrastructure..")

                .whereLayer("Interface").mayNotBeAccessedByAnyLayer()
                .whereLayer("Application").mayOnlyBeAccessedByLayers("Interface")
                .whereLayer("Domain").mayOnlyBeAccessedByLayers("Application", "Infrastructure")
                .whereLayer("Infrastructure").mayOnlyBeAccessedByLayers("Application");

        rule.check(JavaClasses.inPackage("com.minhaempresa"));
    }

    @Test
    void controllersDevemDependerApenasDeServices() {
        var rule = classes()
                .that().resideInAPackage("..interface..")
                .and().haveSimpleNameContaining("Controller")
                .should().notDependOnClassesThat()
                .haveSimpleNameContaining("Repository")
                .because("Controllers devem depender apenas de services");

        rule.check(JavaClasses.inPackage("com.minhaempresa"));
    }
}
```

## Configuração ArchUnit

```xml
<dependency>
    <groupId>com.tngtech.archunit</groupId>
    <artifactId>archunit-junit5</artifactId>
    <version>1.0.1</version>
    <scope>test</scope>
</dependency>
```

## Exemplo de Estrutura

```
com.minhaempresa
├── interface          (Controllers, REST endpoints)
├── application        (Services, Use Cases)
├── domain            (Entities, Value Objects, Repository interfaces)
└── infrastructure    (JPA, External APIs)
```

## Validação Contínua

Configure no CI/CD:

```yaml
# .github/workflows/architecture.yml
name: Architecture Check

on: [push, pull_request]

jobs:
  archunit:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Set up JDK 17
        uses: actions/setup-java@v3
        with:
          java-version: '17'
      - name: Run ArchUnit
        run: mvn test -Dtest=MinhaArquiteturaTest
```

## Próximos Passos

- [Domain-Driven Design](/docs/modulos/domain-driven-design) - DDD no Archbase
- [ArchUnit Docs](https://www.archunit.org/) - Documentação oficial
