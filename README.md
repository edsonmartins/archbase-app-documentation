# Archbase Framework Documentation

Documentação oficial do **Archbase Framework** - um framework Java para facilitar o desenvolvimento de aplicações corporativas com Domain-Driven Design (DDD).

## O que é Archbase?

Archbase é um framework Java que permite desenvolver tanto aplicações simples com modelos anêmicos e CRUDs, quanto aplicações complexas usando os conceitos de **DDD (Domain Driven Design)** de forma ágil e bem estruturada.

### Características Principais

- **DDD First** - Construído com padrões Domain-Driven Design desde o início
- **Multi-tenancy** - Suporte nativo para aplicações multi-tenant
- **Segurança** - Autenticação JWT com autorização baseada em permissões
- **Event-Driven** - Arquitetura orientada a eventos com CQRS
- **Queries Dinâmicas** - Suporte a RSQL para queries flexíveis
- **Auto-configuração** - Integração transparente com Spring Boot

## Documentação

A documentação completa está disponível em [**java.archbase.dev**](https://java.archbase.dev)

### Guias Rápidos

| Guia | Descrição |
|------|-----------|
| [Instalação](docs/getting-started/installation) | Como adicionar o Archbase ao seu projeto |
| [Quick Start](docs/getting-started/quick-start) | Seu primeiro projeto em minutos |
| [Estrutura do Projeto](docs/getting-started/project-structure) | Organização de pastas e camadas |

### Conceitos

| Tópico | Descrição |
|--------|-----------|
| [DDD](docs/conceitos/ddd) | Fundamentos de Domain-Driven Design |
| [Bounded Contexts](docs/conceitos/bounded-contexts) | Contextos delimitados |
| [Aggregates](docs/conceitos/aggregates) | Agregados e entidades |
| [Value Objects](docs/conceitos/value-objects) | Objetos de valor |
| [Repositories](docs/conceitos/repositories) | Padrão Repository |

### Módulos

| Módulo | Descrição |
|--------|-----------|
| [Starter](docs/modulos/starter) | Starter completo com todos os módulos |
| [Architecture](docs/modulos/archbase-architecture) | Arquitetura hexagonal |
| [Domain-Driven Design](docs/modulos/domain-driven-design) | Base para entidades DDD |
| [Event-Driven](docs/modulos/event-driven) | CQRS com Command/Event/Query Bus |
| [Security](docs/modulos/security) | Autenticação JWT e autorização |
| [Multitenancy](docs/modulos/multitenancy) | Suporte multi-tenant |
| [Query RSQL](docs/modulos/query-rsql) | Queries com RSQL |
| [Validation](docs/modulos/validation) | Validação fluente de regras |

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

## Boilerplate

Para facilitar ainda mais o início de um projeto com Archbase, utilize o projeto **archbase-java-boilerplate**:

```bash
git clone https://github.com/archbase-framework/archbase-java-boilerplate.git meu-projeto
cd meu-projeto
mvn spring-boot:run
```

## Desenvolvimento da Documentação

Este repositório contém a documentação construída com [Docusaurus](https://docusaurus.io/).

### Pré-requisitos

- Node.js >= 18.0
- pnpm

### Instalação

```bash
pnpm install
```

### Executar localmente

```bash
pnpm start
```

Acesse [http://localhost:3000](http://localhost:3000)

### Build para produção

```bash
pnpm build
```

## Links Úteis

- [Framework Archbase](https://github.com/archbase-framework/archbase-app-framework)
- [Archbase Java Boilerplate](https://github.com/archbase-framework/archbase-java-boilerplate)
- [Documentação Online](https://java.archbase.dev)

## Licença

[MIT License](LICENSE)
