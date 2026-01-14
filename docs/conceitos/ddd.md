---
title: Domain-Driven Design
sidebar_position: 1
---

# Domain-Driven Design (DDD)

**Domain-Driven Design (DDD)** ou desenvolvimento dirigido ao domínio é um conjunto de padrões e princípios usados para ajudar no desenvolvimento de aplicações que vão influenciar na melhor compreensão e uso do projeto.

## O Que é DDD?

DDD é uma metodologia que visa garantir que as aplicações serão construídas para atender as **necessidades do domínio**. A ideia básica está centrada no conhecimento do problema para o qual o software foi proposto.

:::info Fundação de DDD
A fundação de DDD está no conceito de **linguagem onipresente** (_ubiquitous language_).

Não está em determinar o que é uma entidade, objeto de valor, agregado, serviço ou repositório.
:::

## Linguagem Onipresente

A linguagem onipresente é uma linguagem comum entre o **Cliente** e o **Desenvolvedor**. Seu código deve expressar as terminologias do cliente, para que desenvolvedores e cliente falem a mesma língua.

```java
// ✅ CORRETO - Linguagem do domínio
public class Cliente {
    public void realizarPedido(Pedido pedido) { }
    public void cancelarPedido(String pedidoId) { }
}

// ❌ INCORRETO - Linguagem técnica
public class Cliente {
    public void insertRecord(Pedido record) { }
    public void deleteById(String id) { }
}
```

## Principais Conceitos

### Ubiquitous Language

É uma linguagem que deve ser comum entre o "Cliente" e o "Desenvolvedor". Seu código deve expressar as terminologias do cliente.

### Bounded Context (Contexto Limitado)

Criar delimitações específicas entre cada parte do sistema. Uma classe `Produto` não tem o mesmo sentido num contexto de "Suporte" do que num contexto de "Venda".

**Exemplo:**

![Bounded Contexts](/img/bounded-contexts.svg)

### Core Domain

Foca no principal problema a ser resolvido. Detalhes menores podem ser delegados ou integrados com soluções de terceiros.

**O importante é FOCAR SEMPRE NO NEGÓCIO.**

## DDD Não É Só Código

Os desenvolvedores devem estar em constante contato com o negócio e evoluírem constantemente no entendimento sobre o domínio.

## Arquitetura Hexagonal

A arquitetura DDD pode ser visualizada como uma **Arquitetura Hexagonal** (Ports &amp; Adapters), também conhecida como Onion Architecture:

![Arquitetura Hexagonal](/img/hexagonal-architecture.svg)

### Regra das Camadas

Cada "Bloco" pode ter conhecimento dos blocos da **mesma camada** e das camadas **inferiores**. Mas **nunca** das SUPERIORES.

:::warning Importante
O banco de dados estará sempre na camada **Repository**, se você vai utilizar uma ORM ou efetuar as queries diretamente, não importa! As interações com o banco ocorrem por lá.
:::

## Por Que Essa Separação é Importante?

Por causa da **separação de preocupações**:

- As regras de negócios estarão (se não toda, a maioria esmagadora) nos objetos centrais, em especial as **Entity** e **Value Object**
- Esses objetos não devem ter **CONHECIMENTO NENHUM** de como vão ser persistidos, construídos ou mapeados no banco de dados
- Tudo que eles devem saber é o **Domínio** que representam

:::tip Lembre-se
Quanto mais limpo e claro você manter seu modelo, mais fácil será entendê-lo mais tarde.

A falta de separação de responsabilidades é a principal razão que bases de códigos se tornam gigantes e confusas.
:::

## Boas Práticas de Modelagem

### Comece Pelo Core Domain

Tente sempre começar o código pelo **Core Domain** e **testes unitários**. Deixe a camada de apresentação e de banco de dados por último.

:::tip
**DDD == Foco no domínio**
:::

### Seja Pragmático com Testes

Ter um código com 100% Coverage em testes é algo lindo, mas custoso e muitas vezes não necessário.

Na prática:
- **Camada de negócios**: 100% Code Coverage (ideal)
- **Camadas superiores**: Testes de Integração para garantir que as peças estão se "encaixando"

## Quando Usar DDD?

:::tip Use DDD para
- Aplicações com regras de negócio complexas
- Domínios ricos com muitos conceitos e relações
- Equipes que precisam de comunicação constante com especialistas do domínio
- Sistemas de longo prazo com evolução contínua
:::

:::cação Considere alternativas para
- Aplicativos CRUD simples
- Protótipos ou MVPs rápidos
- Sistemas com pouca lógica de negócio
:::

## Benefícios do DDD

### Melhor Expressão da Lógica de Negócios

Objetos de domínio com métodos significativos que expressam o comportamento real do negócio.

### Estrutura de Pacotes Simples

A organização reflete o domínio, não padrões técnicos.

### Melhor Separação Entre Domínio e Persistência

O modelo de domínio fica independente de detalhes de infraestrutura.

## Como Implementar DDD

### 1. Vincular o Modelo com a Implementação

A implementação deve ser reflexo do modelo. Comece com essa conexão desde o início.

### 2. Cultivar a Linguagem Baseada no Modelo

Desenvolvedores e especialistas em domínio devem entender os termos uns dos outros. Organize a comunicação de forma estruturada e consistente.

### 3. Desenvolver um Modelo Rico em Conhecimento

O modelo não pode ser apenas uma estrutura de dados. Ele deve capturar o conhecimento do domínio para resolver os problemas.

### 4. Destilar o Modelo

Conceitos importantes devem ser adicionados ao modelo. Conceitos não relevantes devem ser removidos.

## Próximos Passos

- [Bounded Contexts](/docs/conceitos/bounded-contexts) - Delimitação de contextos
- [Value Objects](/docs/conceitos/value-objects) - Objetos de valor
- [Agregados](/docs/conceitos/aggregates) - Agregados e consistência
- [Repositories](/docs/conceitos/repositories) - Repositórios em DDD
