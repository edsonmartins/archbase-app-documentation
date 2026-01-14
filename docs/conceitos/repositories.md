---
title: Repositories
sidebar_position: 5
---

# Repositories (Repositórios)

Em DDD, um **Repository** é uma coleção-like que representa o acesso aos objetos de um determinado tipo, agindo como um **ponto de acesso centralizado** ao domínio.

## O Que é um Repository?

> "Um Repository representa todos os objetos de um certo tipo como um conjunto conceitual (como uma coleção), permitindo acessá-los de forma mais simples do que consultas diretas ao banco."

### Repositório vs DAO

| Aspecto | DAO | Repository |
|---------|-----|------------|
| Foco | Acesso a dados | Coleção de objetos de domínio |
| Operações | CRUD genérico | Operações significativas do domínio |
| Retorno | Entidades de persistência | Agregados e Entidades de domínio |
| Localização | Camada de infraestrutura | Interface no domínio, impl na infra |

## Repositório no Archbase

### Criando um Repository

```java
package com.exemplo.domain.repository;

import br.com.archbase.ddd.domain.aggregate.Repository;
import br.com.archbase.ddd.domain.annotation.DomainRepository;
import com.exemplo.domain.entity.Produto;
import java.util.UUID;

@DomainRepository
public interface ProdutoRepository extends Repository<Produto, UUID, Long> {

    // Métodos básicos já estão disponíveis:
    // - save(Produto entity)
    // - findById(UUID id)
    // - findAll()
    // - deleteById(UUID id)
    // - existsById(UUID id)

    // Adicione métodos específicos do domínio
    List<Produto> findByNomeContaining(String nome);
    List<Produto> findByCategoria(Categoria categoria);
}
```

### Métodos Disponíveis

```java
public interface Repository<T, ID, N> {

    // CRUD básico
    T save(T entity);
    List<T> saveAll(List<T> entities);

    Optional<T> findById(ID id);
    List<T> findAll();
    Page<T> findAll(Pageable pageable);

    void deleteById(ID id);
    void delete(T entity);

    boolean existsById(ID id);
    long count();
}
```

## Queries com Specifications

O Archbase oferece **Specifications** para criar queries dinâmicas:

```java
@Service
public class ProdutoService {

    public Page<Produto> buscar(String nome, Categoria categoria, Pageable pageable) {
        ArchbaseSpecification<Produto> spec = Specification.where(null);

        if (nome != null) {
            spec = spec.and(new LikeSpecification<>("nome", "%" + nome + "%"));
        }

        if (categoria != null) {
            spec = spec.and(new EqualSpecification<>("categoria", categoria));
        }

        return repository.findAll(spec, pageable);
    }
}
```

### Specifications Comuns

```java
// Igual a
new EqualSpecification<>("status", Status.ATIVO)

// Maior que
new GreaterThanSpecification<>("preco", 100.0)

// Menor que
new LessThanSpecification<>("estoque", 10)

// Like (contém)
new LikeSpecification<>("nome", "%notebook%")

// In (lista)
new InSpecification<>("categoria", Arrays.asList(CAT1, CAT2))

// Between
new BetweenSpecification<>("dataCriacao", dataInicio, dataFim)
```

## Queries com RSQL

RSQL permite queries dinâmicas via API:

```java
@RestController
@RequestMapping("/api/produtos")
public class ProdutoController {

    @GetMapping
    public Page<Produto> buscar(
            @RequestParam(required = false) String query,
            Pageable pageable) {

        ArchbaseSpecification<Produto> spec =
            ArchbaseRSQLJPASupport.toSpecification(query, Produto.class);

        return repository.findAll(spec, pageable);
    }
}
```

**Exemplos de query RSQL:**

```bash
# Nome contém "notebook"
GET /api/produtos?query=nome=='*notebook*'

# Preço maior que 1000 e estoque menor que 10
GET /api/produtos?query=preço>1000;estoque<10

# Categoria é "eletronicos" ou "informatica"
GET /api/produtos?query=categoria=in=('eletronicos','informatica')

# Data de criação entre duas datas
GET /api/produtos?query=dataCriacao>=2023-01-01,dataCriacao<=2023-12-31
```

## Repositório Multi-tenant

Para aplicações multi-tenant, use o `TenantRepository`:

```java
@DomainRepository
public interface ClienteRepository extends TenantRepository<Cliente, UUID, Long> {
    // Queries automaticamente filtradas por tenant
    // Não é necessário adicionar where tenantId = ?
}
```

## Implementação Customizada

Para queries complexas, você pode criar uma implementação customizada:

```java
// Interface
public interface ProdutoRepository extends Repository<Produto, UUID, Long> {

    @Query("SELECT p FROM Produto p WHERE p.preco > :precoMinimo")
    List<Produto> buscarPorPrecoMaiorQue(@Param("precoMinimo") Double precoMinimo);

    @Query(value = "SELECT * FROM produtos WHERE preco > :precoMinimo", nativeQuery = true)
    List<Produto> buscarPorPrecoMaiorQueNative(@Param("precoMinimo") Double precoMinimo);
}
```

## Padrões de Repositório

### Repositório por Agregado

```java
// ✅ CORRETO - Um repositório por agregado
public interface PedidoRepository extends Repository<Pedido, UUID, Long> { }
public interface ClienteRepository extends Repository<Cliente, UUID, Long> { }

// ❏ INCORRETO - Repositório para entidades internas
public interface ItemPedidoRepository extends Repository<ItemPedido, UUID, Long> { }
```

### Retornar Aggregate Root

O repositório deve sempre retornar o agregado completo, não partes dele:

```java
// ✅ CORRETO - Retorna o agregado completo
Pedido pedido = pedidoRepository.findById(id).orElseThrow();

// ❏ INCORRETO - Retorna parte do agregado
ItemPedido item = itemRepository.findById(id).orElseThrow();
```

## Repositório e Testes

```java
@DataJpaTest
class ProdutoRepositoryTest {

    @Autowired
    private ProdutoRepository repository;

    @Test
    void deveSalvarProduto() {
        Produto produto = new Produto("Notebook", 3500.00);

        Produto salvo = repository.save(produto);

        assertThat(salvo.getId()).isNotNull();
        assertThat(salvo.getNome()).isEqualTo("Notebook");
    }

    @Test
    void deveBuscarPorNome() {
        Produto produto = new Produto("Mouse", 50.00);
        repository.save(produto);

        List<Produto> encontrados = repository.findByNomeContaining("Mouse");

        assertThat(encontrados).hasSize(1);
    }
}
```

## Próximos Passos

- [Módulo archbase-query](/docs/modulos/query-rsql) - Queries com RSQL
- [Guias: Criando Repositories](/docs/guias/creating-repositories) - Padrões avançados
- [CQRS](/docs/guias/implementing-cqrs) - Separando leitura de escrita
