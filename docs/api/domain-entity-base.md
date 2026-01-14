---
title: DomainEntityBase
sidebar_position: 1
---

# DomainEntityBase

Classe base para entidades de domínio do Archbase.

## Hierarquia

```
DomainEntityBase<T, ID>
    ├── PersistenceEntityBase<T, ID>  # Entidades persistíveis
    └── DomainAggregatorBase<T>       # Aggregates
```

## Métodos Principais

| Método | Descrição |
|--------|-----------|
| `getID()` | Retorna o ID da entidade |
| `setID(ID id)` | Define o ID da entidade |
| `getVersion()` | Retorna a versão para optimistic locking |
| `getCreatedAt()` | Retorna a data de criação |
| `getUpdatedAt()` | Retorna a data de atualização |
| `validate()` | Valida a entidade (sobrescrever nas subclasses) |

## Criando uma Entidade

```java
package com.exemplo.domain.entity;

import br.com.archbase.ddd.domain.entity.PersistenceEntityBase;
import br.com.archbase.ddd.domain.entity.DomainEntity;
import jakarta.persistence.Entity;
import java.util.UUID;

@Entity
@DomainEntity
public class Cliente extends PersistenceEntityBase<Cliente, UUID> {

    private String nome;
    private String email;

    // Construtor padrão JPA
    protected Cliente() {}

    // Construtor de domínio
    public Cliente(String nome, String email) {
        this.nome = nome;
        this.email = email;
    }

    @Override
    public ValidationResult validate() {
        return new Cliente.Validator().validate(this);
    }

    static class Validator extends AbstractArchbaseValidator<Cliente> {
        @Override
        public void rules() {
            ruleFor(Cliente::getNome)
                .must(not(stringEmptyOrNull()))
                .withMessage("Nome é obrigatório")
                .withFieldName("nome")
                .critical();
        }
    }
}
```

## Lifecycle Callbacks

```java
@Entity
public class Pedido extends PersistenceEntityBase<Pedido, UUID> {

    @PrePersist
    protected void onCreate() {
        this.dataCriacao = LocalDateTime.now();
        this.status = StatusPedido.CRIADO;
    }

    @PreUpdate
    protected void onUpdate() {
        this.dataAtualizacao = LocalDateTime.now();
    }

    @PostLoad
    protected void onLoad() {
        // Executado após carregar do banco
    }

    @PreRemove
    protected void onRemove() {
        // Executado antes de deletar
    }
}
```

## Equals e HashCode

```java
@Entity
public class Cliente extends PersistenceEntityBase<Cliente, UUID> {

    // Equals e hashCode são baseados no ID automaticamente
    // Para entidades transientes, use um identificador de negócio

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (!(o instanceof Cliente)) return false;
        Cliente other = (Cliente) o;
        // Comparação por ID quando persistido
        if (getId() != null && other.getId() != null) {
            return getId().equals(other.getId());
        }
        // Comparação por atributo de negócio quando transiente
        return Objects.equals(email, other.email);
    }
}
```

## Próximos Passos

- [Aggregates](/docs/conceitos/aggregates) - AggregateRoot
- [Repositories](/docs/conceitos/repositories) - Persistência
