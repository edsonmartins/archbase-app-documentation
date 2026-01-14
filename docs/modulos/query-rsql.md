---
title: archbase-query (RSQL)
sidebar_position: 6
---

# archbase-query

O módulo **archbase-query** fornece suporte a **RSQL** para criar queries dinâmicas e flexíveis via REST API.

:::info Biblioteca Base
Este módulo é baseado no projeto [rsql-jpa-specification](https://github.com/perplexhub/rsql-jpa-specification) do PerplexHub.
:::

## Instalação

```xml
<dependency>
    <groupId>br.com.archbase</groupId>
    <artifactId>archbase-query</artifactId>
    <version>${archbase.version}</version>
</dependency>
```

## Configuração

```yaml
archbase:
  rsql:
    enabled: true
    case-insensitive: true
    page:
      parameter: page
      size:
        parameter: size
        max: 100
        default: 20
```

## O Que é RSQL?

RSQL (RESTful Service Query Language) é uma linguagem de query para parâmetros de URLs, baseada em **FIQL** (Feed Item Query Language).

## Operadores Suportados

### Operadores de Comparação

| Operador | Descrição | Exemplo |
|----------|-----------|---------|
| `==` | Igual a | `status==NOVO` |
| `!=` | Diferente de | `status!=CANCELADO` |
| `>=` | Maior ou igual a | `dataCriacao>=2024-01-01` |
| `<=` | Menor ou igual a | `prioridade<=3` |
| `>` | Maior que | `pontuacao>50` |
| `<` | Menor que | `idade<18` |

### Operadores de Lista

| Operador | Descrição | Exemplo |
|----------|-----------|---------|
| `=in=` | Está na lista | `status=in=(NOVO,EM_ATENDIMENTO)` |
| `=out=` | Não está na lista | `departamento=out=(DEPTO1)` |

### Operadores Lógicos

| Operador | Descrição | Exemplo |
|----------|-----------|---------|
| `;` | E (AND) | `status==NOVO;prioridade==ALTA` |
| `,` | OU (OR) | `status==NOVO,status==EM_ANALISE` |

### Operadores com Wildcards

| Operador | Descrição | Exemplo |
|----------|-----------|---------|
| `*valor*` | Contém | `descricao==*problema*` |
| `valor*` | Começa com | `nome==Jo*` |
| `*valor` | Termina com | `email==*@gmail.com` |

## Implementação

### Controller com RSQL

```java
@RestController
@RequestMapping("/api/produtos")
public class ProdutoController {

    private final ProdutoRepository repository;

    @GetMapping
    public Page<Produto> buscar(
            @RequestParam(required = false) String query,
            Pageable pageable) {

        ArchbaseSpecification<Produto> spec = Specification.where(null);

        if (query != null) {
            spec = ArchbaseRSQLJPASupport.toSpecification(
                query, Produto.class
            );
        }

        return repository.findAll(spec, pageable);
    }
}
```

## Exemplos de Requisições HTTP

### Filtro Simples

```bash
# Status igual a NOVO
GET /api/v1/tickets?filter=status==NOVO&page=0&size=20

# Data maior ou igual a
GET /api/v1/tickets?filter=dataAbertura>=2024-01-01&page=0&size=20
```

### Múltiplos Filtros (AND)

```bash
# Status NOVO E prioridade ALTA
GET /api/v1/tickets?filter=status==NOVO;prioridade==ALTA&page=0&size=20
```

### Múltiplos Filtros (OR)

```bash
# Status NOVO OU EM_ANALISE
GET /api/v1/tickets?filter=status==NOVO,status==EM_ANALISE&page=0&size=20
```

### Lista de Valores (IN)

```bash
# Status na lista
GET /api/v1/tickets?filter=status=in=(NOVO,EM_ATENDIMENTO,RESOLVIDO)&page=0&size=20

# Departamentos na lista
GET /api/v1/tickets?filter=departamento=in=(DEPTO1,DEPTO2,DEPTO3)&page=0&size=20
```

### Busca de Texto (Wildcard)

```bash
# Descrição contém "problema"
GET /api/v1/tickets?filter=descricao==*problema*&page=0&size=20

# E-mail termina com @gmail.com
GET /api/v1/tickets?filter=emailCliente==*@gmail.com&page=0&size=20

# Nome começa com "João"
GET /api/v1/clientes?filter=nome==João*&page=0&size=20
```

### Com Ordenação

```bash
# Ordenar por data descendente
GET /api/v1/tickets?filter=status==NOVO&page=0&size=20&sort=dataAbertura,desc

# Ordenação múltipla
GET /api/v1/tickets?page=0&size=20&sort=prioridade,desc&sort=dataAbertura,asc
```

### Datas e Períodos

```bash
# Criado após uma data
GET /api/v1/pedidos?filter=dataCriacao>=2024-01-01&page=0&size=20

# Criado em um período (AND)
GET /api/v1/pedidos?filter=dataCriacao>=2024-01-01;dataCriacao<=2024-12-31&page=0&size=20
```

## Row-Level Security

O módulo suporta filtros automáticos por tenant:

```java
@GetMapping
public Page<Produto> buscar(
        @RequestParam(required = false) String query,
        Pageable pageable) {

    ArchbaseSpecification<Produto> spec =
        ArchbaseRSQLJPASupport.toSpecification(query, Produto.class);

    // Filtro de tenant aplicado automaticamente
    return repository.findAll(spec, pageable);
}
```

## Paginação

```bash
# Primeira página
GET /api/produtos?page=0&size=20

# Segunda página
GET /api/produtos?page=1&size=20

# Ordenação
GET /api/produtos?sort=nome,asc&sort=preco,desc
```

## Validação de RSQL

### Limitar Campos Permitidos

```java
@Component
public class RSQLValidator {

    private static final Set<String> CAMPOS_PERMITIDOS = Set.of(
        "nome", "preco", "categoria", "estoque"
    );

    public void validate(String query) {
        // Extrair campos da query
        // Validar se estão em CAMPOS_PERMITIDOS
        // Lançar exceção se inválido
    }
}
```

### Proteção contra Injeção

O framework sanitiza automaticamente queries RSQL para prevenir injeção de SQL.

## Solução de Problemas

### Parse Error

```
Erro: Could not parse query
```

**Solução:** Verifique a sintaxe RSQL
```
❌ nome=Notebook (deve ser == para string exata)
✅ nome=='Notebook'
```

### Campo Não Encontrado

```
Erro: No property 'nomme' found for type 'Produto'
```

**Solução:** Verifique o nome do campo
```
❌ nomme=='Notebook'
✅ nome=='Notebook'
```

## Próximos Passos

- [Guias: Usando RSQL](/docs/guias/using-rsql) - Exemplos práticos
- [Specifications](/docs/conceitos/repositories) - Specifications em Java
