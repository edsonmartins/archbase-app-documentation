---
title: Agregados
sidebar_position: 4
---

# Agregados (Aggregates)

Um **Agregado** é um conjunto de objetos (entidades e value objects) que são tratados como uma **unidade consistente** para fins de mudança de dados.

## O Que é um Agregado?

O padrão Aggregate ajuda a manter a **consistência** dentro do domínio, agrupando objetos relacionados sob uma **raiz** (Aggregate Root).

![Estrutura do Agregado](/img/aggregate-structure.svg)

## Aggregate Root

O **Aggregate Root** é a única "porta de entrada" do agregado. Todo acesso aos objetos internos deve passar pela raiz.

### Regras do Aggregate Root

1. **Acesso externo** só através da raiz
2. **Consistência** garantida dentro do agregado
3. **Transações** limitadas a um único agregado

## Exemplo Prático

### Pedido como Aggregate Root

```java
package com.exemplo.domain.aggregate;

import br.com.archbase.ddd.domain.entity.AggregateRoot;
import br.com.archbase.ddd.domain.entity.DomainEntityBase;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.UUID;

@Entity
@DomainEntity
public class Pedido extends AggregateRoot<Pedido, UUID> {

    private UUID clienteId;
    private StatusPedido status;
    private Money total;
    private final List<ItemPedido> itens;

    // Construtor
    public Pedido(UUID clienteId) {
        this.clienteId = clienteId;
        this.status = StatusPedido.CRIADO;
        this.itens = new ArrayList<>();
        this.total = Money.ZERO;
    }

    // Acesso aos itens só através do Aggregate Root
    public void adicionarItem(Produto produto, int quantidade) {
        validarAdicaoItem(produto, quantidade);

        ItemPedido item = new ItemPedido(produto, quantidade);
        this.itens.add(item);

        recalcularTotal();
    }

    public void removerItem(UUID itemId) {
        if (this.status != StatusPedido.CRIADO) {
            throw new IllegalStateException("Só é possível remover itens de pedidos criados");
        }

        this.itens.removeIf(item -> item.getId().equals(itemId));
        recalcularTotal();
    }

    public void confirmar() {
        if (this.itens.isEmpty()) {
            throw new IllegalStateException("Pedido não pode ser confirmado sem itens");
        }

        this.status = StatusPedido.CONFIRMADO;

        // Publicar evento de domínio
        registerEvent(new PedidoConfirmadoEvent(this.getId(), this.clienteId));
    }

    public void cancelar(String motivo) {
        if (this.status == StatusPedido.ENTREGUE) {
            throw new IllegalStateException("Pedido entregue não pode ser cancelado");
        }

        this.status = StatusPedido.CANCELADO;
        registerEvent(new PedidoCanceladoEvent(this.getId(), motivo));
    }

    private void validarAdicaoItem(Produto produto, int quantidade) {
        if (produto == null) {
            throw new IllegalArgumentException("Produto é obrigatório");
        }
        if (quantidade <= 0) {
            throw new IllegalArgumentException("Quantidade deve ser maior que zero");
        }
    }

    private void recalcularTotal() {
        this.total = this.itens.stream()
            .map(ItemPedido::getSubtotal)
            .reduce(Money.ZERO, Money::somar);
    }

    // Getters - Itens são retornados como imutável
    public List<ItemPedido> getItens() {
        return Collections.unmodifiableList(itens);
    }
}
```

### Entidade dentro do Agregado

```java
@Entity
public class ItemPedido extends PersistenceEntityBase<ItemPedido, UUID> {

    private String produtoNome;
    private Money precoUnitario;
    private Integer quantidade;

    // Só pode ser criado através do Pedido
    ItemPedido(Produto produto, Integer quantidade) {
        this.produtoNome = produto.getNome();
        this.precoUnitario = produto.getPreco();
        this.quantidade = quantidade;
    }

    public Money getSubtotal() {
        return precoUnitario.multiplicar(BigDecimal.valueOf(quantidade));
    }
}
```

## Repositórios de Agregados

```java
@DomainRepository
public interface PedidoRepository extends Repository<Pedido, UUID, Long> {
    // Repositório trabalha apenas com o Aggregate Root
    // Itens não são acessados diretamente
}
```

## Invariantes de Negócio

Invariantes são regras que **nunca** podem ser violadas dentro do agregado:

```java
public class Pedido extends AggregateRoot<Pedido, UUID> {

    public void confirmar() {
        // Invariante: Não pode confirmar pedido sem itens
        if (this.itens.isEmpty()) {
            throw new IllegalStateException("Pedido não pode ser confirmado sem itens");
        }

        // Invariante: Não pode confirmar pedido já confirmado
        if (this.status == StatusPedido.CONFIRMADO) {
            throw new IllegalStateException("Pedido já foi confirmado");
        }

        // Invariante: Cliente deve existir
        if (this.clienteId == null) {
            throw new IllegalStateException("Pedido deve ter um cliente");
        }

        this.status = StatusPedido.CONFIRMADO;
    }
}
```

## Tamanho do Agregado

:::danger Evite agregados grandes
Agregados muito grandes causam problemas de performance e de concorrência.

**Regra geral**: Mantenha agregados pequenos, focados em um conceito.
:::

### Identificando limites do agregado

Perguntas a se fazer:

1. **O que precisa ser consistente junto?**
2. **O que pode ser modificado independentemente?**
3. **Qual é a raiz natural?**

## Agregados no Archbase

### Criando um Aggregate Root

```java
import br.com.archbase.ddd.domain.entity.AggregateRoot;

@Entity
@DomainEntity
public class MeuAgregado extends AggregateRoot<MeuAgregado, UUID> {

    // Implemente seus invariantes
    // Use registerEvent() para publicar eventos
}
```

### Events do Agregado

```java
public class Pedido extends AggregateRoot<Pedido, UUID> {

    public void confirmar() {
        this.status = StatusPedido.CONFIRMADO;

        // Evento será publicado automaticamente
        registerEvent(new PedidoConfirmadoEvent(
            this.getId(),
            this.clienteId,
            this.total
        ));
    }
}
```

## Anti-padrões

:::danger Não faça
- Acessar entidades internas diretamente sem passar pela raiz
- Criar agregados muito grandes
- Permitir que o agregado fique em estado inválido
- Ignorar eventos de domínio
:::

:::tip Faça
- Manter agregados pequenos
- Garantir invariantes no construtor e métodos
- Publicar eventos para mudanças importantes
- Validar tudo antes de persistir
:::

## Próximos Passos

- [Repositories](/docs/conceitos/repositories) - Persistindo agregados
- [CQRS](/docs/guias/implementing-cqrs) - Commands e Queries
- [Event-Driven](/docs/modulos/event-driven) - Events e Handlers
