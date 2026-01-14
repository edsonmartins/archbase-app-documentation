---
title: Criando Entidades
sidebar_position: 2
---

# Criando Entidades DDD

Entidades representam conceitos do domínio que possuem **identidade** e **ciclo de vida**.

## Entidade Básica

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
    private String cpf;
    private Boolean ativo;

    // Construtor padrão JPA
    protected Cliente() {}

    // Construtor de domínio
    public Cliente(String nome, String email, String cpf) {
        this.nome = nome;
        this.email = email;
        this.cpf = cpf;
        this.ativo = true;
    }

    // Getters e Setters
    public String getNome() {
        return nome;
    }

    public void setNome(String nome) {
        this.nome = nome;
    }

    // Lógica de domínio
    public void ativar() {
        this.ativo = true;
    }

    public void desativar() {
        if (possuiPedidosEmAberto()) {
            throw new IllegalStateException(
                "Cliente não pode ser desativado com pedidos em aberto"
            );
        }
        this.ativo = false;
    }

    public boolean possuiPedidosEmAberto() {
        // Verificar se há pedidos em aberto
        return false;
    }

    @Override
    public ValidationResult validate() {
        return new Cliente.Validator().validate(this);
    }

    // Validador embutido
    static class Validator extends AbstractArchbaseValidator<Cliente> {
        @Override
        public void rules() {
            ruleFor(Cliente::getNome)
                .must(not(stringEmptyOrNull()))
                .withMessage("Nome é obrigatório")
                .withFieldName("nome")
                .critical();

            ruleFor(Cliente::getEmail)
                .must(not(stringEmptyOrNull()))
                .withMessage("E-mail é obrigatório")
                .withFieldName("email")
                .critical();

            ruleFor(Cliente::getCpf)
                .must(not(stringEmptyOrNull()))
                .withMessage("CPF é obrigatório")
                .withFieldName("cpf")
                .critical();

            ruleFor(Cliente::getCpf)
                .must(cpf -> CPF.isValido(cpf))
                .withMessage("CPF inválido")
                .withFieldName("cpf")
                .critical();
        }
    }
}
```

## Aggregate Root

Agregados são entidades que servem como raiz de um cluster de objetos.

```java
package com.exemplo.domain.aggregate;

import br.com.archbase.ddd.domain.entity.AggregateRoot;
import jakarta.persistence.Entity;
import java.time.LocalDateTime;
import java.util.*;

@Entity
@DomainAggregateRoot
public class Pedido extends AggregateRoot<Pedido, UUID> {

    private UUID clienteId;
    private StatusPedido status;
    private Money total;
    private LocalDateTime dataCriacao;
    private final List<ItemPedido> itens;

    protected Pedido() {
        this.itens = new ArrayList<>();
    }

    public Pedido(UUID clienteId) {
        this.id = UUID.randomUUID();
        this.clienteId = clienteId;
        this.status = StatusPedido.CRIADO;
        this.total = Money.ZERO;
        this.dataCriacao = LocalDateTime.now();
        this.itens = new ArrayList<>();
    }

    // Comportamentos de domínio
    public void adicionarItem(Produto produto, int quantidade) {
        validarAdicaoItem(produto, quantidade);

        ItemPedido item = new ItemPedido(produto, quantidade);
        this.itens.add(item);

        recalcularTotal();
    }

    public void removerItem(UUID itemId) {
        if (status != StatusPedido.CRIADO) {
            throw new IllegalStateException(
                "Só é possível remover itens de pedidos criados"
            );
        }

        itens.removeIf(item -> item.getId().equals(itemId));
        recalcularTotal();
    }

    public void confirmar() {
        validarConfirmacao();

        this.status = StatusPedido.CONFIRMADO;

        // Publicar evento de domínio
        registerEvent(new PedidoConfirmadoEvent(
            this.getId(),
            this.clienteId,
            this.total,
            LocalDateTime.now()
        ));
    }

    public void cancelar(String motivo) {
        if (status == StatusPedido.ENTREGUE) {
            throw new IllegalStateException("Pedido entregue não pode ser cancelado");
        }

        this.status = StatusPedido.CANCELADO;

        registerEvent(new PedidoCanceladoEvent(this.getId(), motivo));
    }

    public void iniciarEntrega() {
        if (status != StatusPedido.CONFIRMADO) {
            throw new IllegalStateException("Pedido deve estar confirmado");
        }

        this.status = StatusPedido.EM_ENTREGA;
    }

    public void finalizarEntrega() {
        if (status != StatusPedido.EM_ENTREGA) {
            throw new IllegalStateException("Pedido deve estar em entrega");
        }

        this.status = StatusPedido.ENTREGUE;
    }

    // Validações privadas
    private void validarAdicaoItem(Produto produto, int quantidade) {
        if (produto == null) {
            throw new IllegalArgumentException("Produto é obrigatório");
        }
        if (quantidade <= 0) {
            throw new IllegalArgumentException("Quantidade deve ser maior que zero");
        }
    }

    private void validarConfirmacao() {
        if (itens.isEmpty()) {
            throw new IllegalStateException("Pedido não pode ser confirmado sem itens");
        }
        if (status != StatusPedido.CRIADO) {
            throw new IllegalStateException("Pedido já está confirmado ou cancelado");
        }
    }

    private void recalcularTotal() {
        this.total = itens.stream()
            .map(ItemPedido::getSubtotal)
            .reduce(Money.ZERO, Money::soma);
    }

    // Getters
    public List<ItemPedido> getItens() {
        return Collections.unmodifiableList(itens);
    }

    public StatusPedido getStatus() {
        return status;
    }

    public Money getTotal() {
        return total;
    }

    @Override
    public ValidationResult validate() {
        return new Pedido.Validator().validate(this);
    }

    static class Validator extends AbstractArchbaseValidator<Pedido> {
        @Override
        public void rules() {
            ruleFor(Pedido::getClienteId)
                .must(Objects::nonNull)
                .withMessage("Cliente é obrigatório")
                .withFieldName("clienteId")
                .critical();

            ruleFor(Pedido::getStatus)
                .must(Objects::nonNull)
                .withMessage("Status é obrigatório")
                .withFieldName("status")
                .critical();
        }
    }
}
```

## Enum de Status

```java
public enum StatusPedido {

    CRIADO("Criado"),
    CONFIRMADO("Confirmado"),
    EM_ENTREGA("Em Entrega"),
    ENTREGUE("Entregue"),
    CANCELADO("Cancelado");

    private final String descricao;

    StatusPedido(String descricao) {
        this.descricao = descricao;
    }

    public String getDescricao() {
        return descricao;
    }

    public boolean podeSerConfirmado() {
        return this == CRIADO;
    }

    public boolean podeSerCancelado() {
        return this == CRIADO || this == CONFIRMADO;
    }

    public boolean isFinal() {
        return this == ENTREGUE || this == CANCELADO;
    }
}
```

## Entidade dentro do Agregado

```java
package com.exemplo.domain.entity;

import br.com.archbase.ddd.domain.entity.PersistenceEntityBase;
import jakarta.persistence.Entity;

@Entity
public class ItemPedido extends PersistenceEntityBase<ItemPedido, UUID> {

    private String produtoNome;
    private Money precoUnitario;
    private Integer quantidade;

    protected ItemPedido() {}

    public ItemPedido(Produto produto, Integer quantidade) {
        this.produtoNome = produto.getNome();
        this.precoUnitario = produto.getPreco();
        this.quantidade = quantidade;
    }

    public Money getSubtotal() {
        return precoUnitario.multiplicar(BigDecimal.valueOf(quantidade));
    }

    // Getters...
}
```

## Value Object

```java
package com.exemplo.domain.valueobject;

import br.com.archbase.ddd.domain.valueobject.ValueObject;
import java.math.BigDecimal;
import java.util.Objects;

public class Money implements ValueObject {

    private static final BigDecimal ZERO_VALUE = BigDecimal.ZERO;
    public static final Money ZERO = new Money(ZERO_VALUE);

    private final BigDecimal valor;

    private Money(BigDecimal valor) {
        this.valor = valor.setScale(2, RoundingMode.HALF_UP);
    }

    public static Money of(BigDecimal valor) {
        if (valor == null) {
            throw new IllegalArgumentException("Valor não pode ser nulo");
        }
        if (valor.compareTo(ZERO_VALUE) < 0) {
            throw new IllegalArgumentException("Valor não pode ser negativo");
        }
        return new Money(valor);
    }

    public static Money reais(double valor) {
        return new Money(BigDecimal.valueOf(valor));
    }

    public Money soma(Money other) {
        return new Money(this.valor.add(other.valor));
    }

    public Money subtrai(Money other) {
        return new Money(this.valor.subtract(other.valor));
    }

    public Money multiplicar(BigDecimal fator) {
        return new Money(this.valor.multiply(fator));
    }

    public Money porcentagem(BigDecimal taxa) {
        return new Money(this.valor.multiply(taxa).divide(
            BigDecimal.valueOf(100),
            2,
            RoundingMode.HALF_UP
        ));
    }

    public boolean isZero() {
        return valor.compareTo(ZERO_VALUE) == 0;
    }

    public boolean isPositive() {
        return valor.compareTo(ZERO_VALUE) > 0;
    }

    public boolean isGreaterThan(Money other) {
        return this.valor.compareTo(other.valor) > 0;
    }

    public boolean isLessThan(Money other) {
        return this.valor.compareTo(other.valor) < 0;
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (o == null || getClass() != o.getClass()) return false;
        Money money = (Money) o;
        return Objects.equals(valor, money.valor);
    }

    @Override
    public int hashCode() {
        return Objects.hash(valor);
    }

    @Override
    public String toString() {
        return String.format("R$ %s", valor);
    }

    public BigDecimal getValor() {
        return valor;
    }
}
```

## Boas Práticas

| Prática | Descrição |
|---------|-----------|
| **Imutabilidade de IDs** | IDs nunca mudam após criados |
| **Métodos de domínio** | Lógica dentro da entidade, não fora |
| **Validação embutida** | Use `validate()` em todos os agregados |
| **Eventos** | Publique eventos em mudanças importantes |
| **Invariantes** | Garanta que o estado nunca seja inválido |

## Próximos Passos

- [Agregados](/docs/conceitos/aggregates) - Agrupando entidades
- [Value Objects](/docs/conceitos/value-objects) - Objetos de valor
- [Repositories](/docs/conceitos/repositories) - Persistindo entidades
