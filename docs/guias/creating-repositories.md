---
title: Criando Repositories
sidebar_position: 3
---

# Criando Repositories

Repositories são responsáveis por **persistir e recuperar** agregados do domínio.

## Interface de Repository

```java
package com.exemplo.domain.repository;

import br.com.archbase.ddd.data.repository.Repository;
import com.exemplo.domain.aggregate.Pedido;
import java.util.Optional;
import java.util.UUID;

@DomainRepository
public interface PedidoRepository extends Repository<Pedido, UUID, Long> {

    // Métodos básicos já incluídos:
    // - save(Pedido entity)
    // - deleteById(UUID id)
    // - findById(UUID id)
    // - findAll()
    // - existsById(UUID id)

    // Queries customizadas
    Optional<Pedido> findByNumero(String numero);

    List<Pedido> findByClienteId(UUID clienteId);

    List<Pedido> findByStatus(StatusPedido status);

    @Query("SELECT e FROM Pedido e WHERE e.clienteId = :clienteId AND e.status = :status")
    List<Pedido> findByClienteAndStatus(
        @Param("clienteId") UUID clienteId,
        @Param("status") StatusPedido status
    );
}
```

## Specification Pattern

Use specifications para queries complexas:

```java
package com.exemplo.domain.specification;

import br.com.archbase.ddd.data.specification.*;
import com.exemplo.domain.aggregate.Pedido;
import java.time.LocalDateTime;
import java.util.UUID;

public class PedidoSpecifications {

    public static Specification<Pedido> porCliente(UUID clienteId) {
        return (root, query, cb) ->
            cb.equal(root.get("clienteId"), clienteId);
    }

    public static Specification<Pedido> porStatus(StatusPedido status) {
        return (root, query, cb) ->
            cb.equal(root.get("status"), status);
    }

    public static Specification<Pedido> criadosEntre(LocalDateTime inicio, LocalDateTime fim) {
        return (root, query, cb) ->
            cb.between(root.get("dataCriacao"), inicio, fim);
    }

    public static Specification<Pedido> comValorMinimo(Money valor) {
        return (root, query, cb) ->
            cb.greaterThanOrEqualTo(root.get("total"), valor);
    }

    // Combinando specifications
    public static Specification<Pedido> pedidosConfirmadosDoCliente(UUID clienteId) {
        return porCliente(clienteId).and(porStatus(StatusPedido.CONFIRMADO));
    }

    public static Specification<Pedido> pedidosRecentesDoCliente(
            UUID clienteId,
            LocalDateTime desde) {
        return porCliente(clienteId)
            .and(criadosEntre(desde, LocalDateTime.now()));
    }
}
```

### Usando Specifications

```java
@Service
public class PedidoQueryService {

    private final PedidoRepository repository;

    public List<Pedido> buscarPedidosDoCliente(UUID clienteId) {
        Specification<Pedido> spec = PedidoSpecifications
            .porCliente(clienteId);

        return repository.findAll(spec);
    }

    public List<Pedido> buscarPedidosConfirmadosUltimosDias(UUID clienteId, int dias) {
        LocalDateTime desde = LocalDateTime.now().minusDays(dias);

        Specification<Pedido> spec = PedidoSpecifications
            .pedidosRecentesDoCliente(clienteId, desde);

        return repository.findAll(spec);
    }
}
```

## Repository com RSQL

```java
package com.exemplo.domain.repository;

import br.com.archbase.query.rsql.ArchbaseRSQLRepository;
import com.exemplo.domain.aggregate.Pedido;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import java.util.UUID;

@DomainRepository
public interface PedidoRepository extends ArchbaseRSQLRepository<Pedido, UUID> {

    // Com suporte a RSQL automático
    Page<Pedido> search(String filter, Pageable pageable);
}
```

### Controller com RSQL

```java
@RestController
@RequestMapping("/api/v1/pedidos")
public class PedidoController {

    private final PedidoRepository repository;

    @GetMapping("/search")
    public Page<PedidoDTO> search(
            @RequestParam(required = false) String filter,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {

        Pageable pageable = PageRequest.of(page, size, Sort.by("dataCriacao").descending());

        return repository.search(filter, pageable)
            .map(PedidoMapper::toDTO);
    }
}
```

## Query Methods

Spring Data JPA suporta criação automática de queries pelo nome do método:

| Prefixo | Exemplo | Resultado |
|---------|---------|-----------|
| `findBy` | `findByStatus(Status s)` | WHERE status = ? |
| `readBy` | `readByClienteId(UUID id)` | SELECT ... WHERE cliente_id = ? |
| `queryBy` | `queryByEmail(String email)` | WHERE email = ? |
| `countBy` | `countByStatus(Status s)` | COUNT WHERE status = ? |
| `existsBy` | `existsByEmail(String e)` | EXISTS WHERE email = ? |
| `deleteBy` | `deleteByStatus(Status s)` | DELETE WHERE status = ? |

### Keywords

| Keyword | Cláusula SQL |
|---------|--------------|
| `And` | AND |
| `Or` | OR |
| `Between` | BETWEEN |
| `LessThan` | \< |
| `GreaterThan` | \> |
| `After` / `Before` | \> / \< (para datas) |
| `Like` | LIKE |
| `IgnoreCase` | Ignora case |
| `OrderBy` | ORDER BY |
| `Not` | NOT |
| `In` | IN |

```java
@DomainRepository
public interface ClienteRepository extends Repository<Cliente, UUID, Long> {

    // Simples
    Cliente findByEmail(String email);

    // Com múltiplas condições
    Cliente findByCpfAndAtivo(String cpf, boolean ativo);

    // Com ordenação
    List<Cliente> findByNomeContainingIgnoreCaseOrderByNomeAsc(String nome);

    // Com between
    List<Pedido> findByDataCriacaoBetween(LocalDateTime inicio, LocalDateTime fim);

    // Com IN
    List<Cliente> findByStatusIn(List<StatusCliente> statuses);

    // Contagem
    long countByAtivoTrue();

    // Existência
    boolean existsByEmail(String email);
}
```

## Query Annotation

Para queries mais complexas:

```java
@DomainRepository
public interface PedidoRepository extends Repository<Pedido, UUID, Long> {

    @Query("""
        SELECT p FROM Pedido p
        LEFT JOIN FETCH p.itens
        WHERE p.clienteId = :clienteId
        AND p.status = :status
        ORDER BY p.dataCriacao DESC
    """)
    List<Pedido> findCompletosPorClienteEStatus(
        @Param("clienteId") UUID clienteId,
        @Param("status") StatusPedido status
    );

    @Query(nativeQuery = true, value = """
        SELECT * FROM pedido p
        WHERE p.total > :valorMinimo
        AND DATE(p.data_criacao) = CURRENT_DATE
        LIMIT :limite
    """)
    List<Pedido> findPedidosHojeAcimaDe(
        @Param("valorMinimo") BigDecimal valorMinimo,
        @Param("limite") int limite
    );

    @Query("SELECT COUNT(p) FROM Pedido p WHERE p.status = :status")
    long contarPorStatus(@Param("status") StatusPedido status);
}
```

## Repository Implementation

Quando precisa de lógica mais complexa:

```java
package com.exemplo.infrastructure.persistence.repository;

@Repository
public class PedidoRepositoryImpl implements PedidoRepositoryCustom {

    @PersistenceContext
    private EntityManager em;

    @Override
    public List<PedidoRelatorioDTO> gerarRelatorioVendas(
            LocalDateTime inicio,
            LocalDateTime fim) {

        String jpql = """
            SELECT new com.exemplo.dto.PedidoRelatorioDTO(
                p.id,
                c.nome,
                p.total,
                p.status,
                p.dataCriacao
            )
            FROM Pedido p
            JOIN Cliente c ON p.clienteId = c.id
            WHERE p.dataCriacao BETWEEN :inicio AND :fim
            ORDER BY p.dataCriacao DESC
            """;

        TypedQuery<PedidoRelatorioDTO> query = em.createQuery(jpql, PedidoRelatorioDTO.class);
        query.setParameter("inicio", inicio);
        query.setParameter("fim", fim);

        return query.getResultList();
    }

    @Override
    @Transactional
    public void atualizarStatusEmLote(
            List<UUID> pedidoIds,
            StatusPedido novoStatus) {

        String jpql = """
            UPDATE Pedido p
            SET p.status = :novoStatus
            WHERE p.id IN :ids
            """;

        em.createQuery(jpql)
            .setParameter("novoStatus", novoStatus)
            .setParameter("ids", pedidoIds)
            .executeUpdate();
    }
}
```

## Multi-Tenancy

Para repositórios multi-tenant:

```java
@DomainRepository
public interface ProdutoRepository extends TenantRepository<Produto, UUID, Long> {

    // Filtra automaticamente por tenant atual
    List<Produto> findByAtivoTrue();

    @Query("SELECT p FROM Produto p WHERE p.tenantId = :tenantId AND p.ativo = true")
    List<Produto> buscarAtivosPorTenant(@Param("tenantId") String tenantId);
}
```

## Paginação

```java
@Service
public class PedidoQueryService {

    private final PedidoRepository repository;

    public Page<PedidoDTO> listar(int pagina, int tamanho) {
        Pageable pageable = PageRequest.of(
            pagina,
            tamanho,
            Sort.by("dataCriacao").descending()
        );

        Page<Pedido> pedidos = repository.findAll(pageable);

        return pedidos.map(PedidoMapper::toDTO);
    }

    public Page<PedidoDTO> buscarComFiltro(
            String filtro,
            int pagina,
            int tamanho) {

        ArchbaseSpecification<Pedido> spec =
            ArchbaseRSQLJPASupport.toSpecification(filtro, Pedido.class);

        Pageable pageable = PageRequest.of(
            pagina,
            tamanho,
            Sort.by("dataCriacao").descending()
        );

        return repository.findAll(spec, pageable)
            .map(PedidoMapper::toDTO);
    }
}
```

## Boas Práticas

| Prática | Descrição |
|---------|-----------|
| **Interfaces no domínio** | Coloque interfaces no pacote `domain/repository` |
| **Implementações na infra** | Coloque implementações em `infrastructure/persistence` |
| **Retorne agregados** | Repositórios retornam agregados completos |
| **Use specifications** | Para queries dinâmicas e compostas |
| **Evite DTOs** | Repositórios do domínio não retornam DTOs |

## Próximos Passos

- [Specifications](/docs/conceitos/repositories) - Padrão Specification
- [RSQL](/docs/guias/using-rsql) - Queries dinâmicas
- [Multi-Tenancy](/docs/guias/multitenancy-setup) - Repositórios multi-tenant
