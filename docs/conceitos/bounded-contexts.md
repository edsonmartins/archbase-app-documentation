---
title: Bounded Contexts (Contextos Limitados)
sidebar_position: 2
---

# Bounded Contexts (Contextos Limitados)

Um **Contexto Limitado** é um limite explícito dentro do qual existe um modelo de domínio. O modelo de domínio expressa uma linguagem ubíqua como um modelo de software.

## O Que é um Bounded Context?

> "Um Contexto é o cenário em que uma palavra ou afirmação aparece e isso determina o seu significado."

Na modelagem de software, os contextos limitados representam limites lógicos, definidos por contratos dentro de artefatos de software onde o modelo é implementado.

## Exemplo Prático

Imagine uma empresa de e-commerce. O termo "Produto" tem significados diferentes em contextos diferentes:

![Bounded Contexts](/img/bounded-contexts.svg)

## Por Que Separar Contextos?

### Evitar Ambiguidade

O mesmo termo pode ter significados completamente diferentes, levando a confusões.

```java
// Contexto: Vendas
public class Produto {
    private String nome;
    private Money preco;
    private int estoque;
}

// Contexto: Suporte
public class Produto {
    private String nome;
    private String versao;
    private List<Bug> bugsConhecidos;
    private Date dataLancamento;
}
```

### Foco no Negócio

Cada contexto foca em um aspecto específico do domínio, sem se preocupar com outros.

## Lei de Conway

> "Qualquer organização que projeta um sistema produzirá um projeto cuja estrutura é uma cópia da estrutura de comunicação da organização."

A **inversão da Lei de Conway** permite que a estrutura organizacional se alinhe com os contextos limitados.

### Regras de Organização

1. **Defina limites explicitamente** em termos de organização da equipe
2. **Mantenha o modelo estritamente consistente** dentro desses limites
3. **Um modelo de subdomínio por contexto limitado**
4. **Uma única equipe** designada para trabalhar em um contexto limitado

## Mapeamento de Contexto

Um contexto limitado nunca vive inteiramente por conta própria. Informações de diferentes contextos serão eventualmente sincronizadas.

### Relações Entre Contextos

| Relação | Descrição |
|---------|-----------|
| **Parceria** | Dois contextos/equipes combinam esforços para construir interação |
| **Cliente-Fornecedor** | Upstream pode ter sucesso independentemente dos contextos downstream |
| **Conformista** | Upstream não se esforça para fornecer ao downstream |
| **Kernel Compartilhado** | Explicitamente, compartilhando uma parte do modelo |
| **Caminhos Separados** | Contextos são separados intencionalmente |
| **Camada Anticorrupção** | Downstream constrói uma camada para evitar que o design upstream "vaze" |

## Implementando no Archbase

### Separação por Módulos

```java
// Módulo: Vendas
package com.empresa.vendas.domain;

@Entity
@DomainEntity
public class ProdutoVendas extends PersistenceEntityBase<ProdutoVendas, UUID> {
    private String nome;
    private Money preco;
    private Integer estoque;
}

// Módulo: Suporte
package com.empresa.suporte.domain;

@Entity
@DomainEntity
public class ProdutoSuporte extends PersistenceEntityBase<ProdutoSuporte, UUID> {
    private String nome;
    private String versao;
    private List<String> bugsConhecidos;
}
```

### Comunicação Entre Contextos

```java
// Event-driven para comunicação assíncrona
@Component
public class ProdutoCriadoEventHandler {

    @EventHandler
    public void handle(ProdutoCriadoEvent event) {
        // Sincroniza com contexto de Suporte
        ProdutoSuporte produtoSuporte = new ProdutoSuporte(
            event.getNome(),
            "1.0.0",
            new ArrayList<>()
        );
        suporteRepository.save(produtoSuporte);
    }
}
```

## Benefícios dos Contextos Limitados

### 1. Manutenibilidade

Cada contexto pode evoluir independentemente.

### 2. Escalabilidade

Equipes diferentes podem trabalhar em contextos diferentes.

### 3. Clareza

Semântica clara dentro de cada contexto.

### 4. Testabilidade

Contextos isolados são mais fáceis de testar.

## Identificando Contextos Limitados

### Perguntas Chave

1. Quais termos têm significados diferentes?
2. Quais partes do sistema mudam em ritmos diferentes?
3. Quais times trabalham em quais funcionalidades?
4. Onde seria natural fazer uma "fronteira"?

### Exemplo de Identificação

```
Sistema de E-commerce:
├── Catálogo (Produtos, Categorias)
├── Vendas (Pedidos, Carrinho)
├── Pagamentos (Transações, Faturas)
├── Entregas (Envios, Rastreamento)
└── Suporte (Tickets, Chamados)
```

## Anti-padrões a Evitar

:::danger Não faça
- Misturar conceitos de diferentes contextos na mesma classe
- Criar dependências diretas entre contextos diferentes
- Usar o mesmo modelo para tudo
:::

:::tip Faça
- Mantenha contextos separados em módulos/pacotes distintos
- Use eventos para comunicação entre contextos
- Respeite os limites de cada contexto
:::

## Próximos Passos

- [Value Objects](/docs/conceitos/value-objects) - Objetos de valor
- [Agregados](/docs/conceitos/aggregates) - Consistência dentro de contextos
- [CQRS](/docs/guias/implementing-cqrs) - Comunicação entre contextos
