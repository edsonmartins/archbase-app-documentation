---
title: Introdução
sidebar_position: 1
---

# Bem-vindo ao Archbase Framework

Archbase é um framework Java para facilitar o desenvolvimento de aplicações corporativas. Os módulos desenvolvidos permitem tanto o uso para aplicações simples com modelos anêmicos e CRUDs, como aplicações mais complexas usando os conceitos de **DDD (Domain Driven Design)** de forma ágil e bem estruturada.

## Características Principais

:::info Destaques
- **DDD First**: Construído com padrões Domain-Driven Design desde o início
- **Multi-tenancy**: Suporte nativo para aplicações multi-tenant
- **Segurança**: Autenticação JWT com autorização baseada em permissões
- **Event-Driven**: Arquitetura orientada a eventos com CQRS
- **Queries Dinâmicas**: Suporte a RSQL para queries flexíveis
- **Auto-configuração**: Integração transparente com Spring Boot
:::

## Arquitetura

O framework segue a **Arquitetura Hexagonal** (Ports &amp; Adapters), também conhecida como Arquitetura Onion:

![Arquitetura Hexagonal](/img/hexagonal-architecture.svg)

### Camadas da Arquitetura

| Camada | Descrição |
|--------|-----------|
| **Domínio (Core)** | Entidades, Aggregates, Value Objects e regras de negócio |
| **Aplicação (Ports)** | Use Cases, Commands, Queries e interfaces de ports |
| **Adapters** | REST Controllers, Repositories JPA, MQTT/JMS, External APIs |

A arquitetura hexagonal permite que o domínio permaneça isolado de detalhes técnicos, facilitando testes e manutenção.

## Módulos do Framework

| Módulo | Descrição |
|--------|-----------|
| `archbase-starter` | Starter completo com todos os módulos |
| `archbase-domain-driven-design` | Base para entidades DDD |
| `archbase-event-driven` | CQRS com Command/Event/Query Bus |
| `archbase-security` | Autenticação JWT e autorização |
| `archbase-multitenancy` | Suporte multi-tenant |
| `archbase-query` | Queries com RSQL e filtros dinâmicos |
| `archbase-validation` | Validação fluente de regras |
| `archbase-test-utils` | Utilitários para testes |

## Começando Rápido

### 1. Adicione a dependência

**Maven:**
```xml
<dependency>
    <groupId>br.com.archbase</groupId>
    <artifactId>archbase-starter</artifactId>
    <version>${archbase.version}</version>
</dependency>
```

**Gradle:**
```groovy
implementation 'br.com.archbase:archbase-starter:${archbase.version}'
```

### 2. Crie uma Entidade

```java
@Entity
@DomainEntity
public class Cliente extends PersistenceEntityBase<Cliente, UUID> {

    private String nome;
    private String email;

    // getters e setters
}
```

### 3. Crie um Repository

```java
@DomainRepository
public interface ClienteRepository extends Repository<Cliente, UUID, Long> {
    // Queries automáticas disponíveis
}
```

### 4. Configure a aplicação

```yaml
archbase:
  multitenancy:
    enabled: true
  security:
    jwt:
      secret: sua-chave-secreta
      expiration: 86400000
```

## Começando com Boilerplate

Para facilitar ainda mais o início de um projeto com Archbase, utilize o projeto **archbase-java-boilerplate**:

```bash
# Clone o boilerplate
git clone https://github.com/archbase-framework/archbase-java-boilerplate.git meu-projeto

# Entre na pasta
cd meu-projeto

# Configure suas propriedades
# Editar application.yml com suas configurações

# Execute!
mvn spring-boot:run
```

O boilerplate já vem com:
- ✅ Estrutura de pastas organizada para DDD
- ✅ Exemplos de Entidades, Repositories e Services
- ✅ Configurações de segurança e multi-tenancy
- ✅ Testes de exemplo
- ✅ Docker Compose para banco de dados

## Próximos Passos

- [Instalação](/docs/category/começando) - Guia completo de instalação
- [Quick Start](/docs/getting-started/quick-start) - Seu primeiro projeto
- [Conceitos DDD](/docs/category/conceitos-ddd) - Fundamentos do framework
- [Módulos](/docs/category/módulos) - Documentação detalhada por módulo

## Quando usar Archbase?

:::tip Use Archbase para
- Aplicações corporativas com regras de negócio complexas
- Sistemas que requerem multi-tenancy
- Projetos que precisam de auditoria e segurança avançada
- Equipes que praticam DDD
:::

:::caution Considere alternativas para
- APIs CRUD simples sem regras de negócio
- Protótipos rápidos ou MVPs
- Microserviços simples
:::
