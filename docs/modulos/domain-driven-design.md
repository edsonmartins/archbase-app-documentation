---
title: archbase-domain-driven-design
sidebar_position: 2
---

# archbase-domain-driven-design

O módulo **archbase-domain-driven-design** fornece as classes base para implementar Domain-Driven Design em Java.

## Instalação

```xml
<dependency>
    <groupId>br.com.archbase</groupId>
    <artifactId>archbase-domain-driven-design</artifactId>
    <version>${archbase.version}</version>
</dependency>
```

## Classes Base

### PersistenceEntityBase

Base para entidades que precisam ser persistidas:

```java
@Entity
@DomainEntity
public class Cliente extends PersistenceEntityBase<Cliente, UUID> {

    private String nome;
    private String email;

    // getters e setters
}
```

**Parâmetros de Tipo:**
- `T` - O tipo da própria entidade (para métodos fluentes)
- `ID` - O tipo do identificador (UUID, Long, String, etc.)

**Métodos Disponíveis:**

| Método | Descrição |
|--------|-----------|
| `getId()` | Retorna o ID da entidade |
| `getVersion()` | Retorna a versão para optimistic locking |
| `getCreatedAt()` | Retorna a data de criação |
| `getUpdatedAt()` | Retorna a data de atualização |
| `validate()` | Valida a entidade (sobrescrever nas subclasses) |
| `equals()` | Baseado no ID |
| `hashCode()` | Baseado no ID |

### AggregateRoot

Base para agregados que publicam eventos de domínio:

```java
@Entity
@DomainEntity
public class Pedido extends AggregateRoot<Pedido, UUID> {

    public void confirmar() {
        // Lógica de negócio
        this.status = StatusPedido.CONFIRMADO;

        // Publicar evento
        registerEvent(new PedidoConfirmadoEvent(this.getId()));
    }
}
```

**Métodos Adicionais:**

| Método | Descrição |
|--------|-----------|
| `registerEvent(Event)` | Registra um evento de domínio |
| `getEvents()` | Retorna todos os eventos registrados |
| `clearEvents()` | Limpa os eventos após publicação |

### Repository

Interface base para repositórios:

```java
@DomainRepository
public interface ClienteRepository extends Repository<Cliente, UUID, Long> {
    // Métodos CRUD automáticos disponíveis
}
```

**Parâmetros de Tipo:**
- `T` - Tipo da entidade
- `ID` - Tipo do identificador
- `N` - Tipo numérico para versão

**Métodos CRUD Básicos:**

```java
T save(T entity);
List<T> saveAll(List<T> entities);
Optional<T> findById(ID id);
List<T> findAll();
Page<T> findAll(Pageable pageable);
void deleteById(ID id);
boolean existsById(ID id);
long count();

// Queries com Specification
List<T> findAll(ArchbaseSpecification<T> specification);
Page<T> findAll(ArchbaseSpecification<T> specification, Pageable pageable);
Optional<T> findOne(ArchbaseSpecification<T> specification);
```

### Métodos Avançados de Repository

O `Repository` oferece métodos adicionais para queries mais flexíveis:

```java
@DomainRepository
public interface ProdutoRepository extends Repository<Produto, UUID, Long> {

    // Busca com especificação - retorna lista
    List<Produto> matching(ArchbaseSpecification<Produto> specification);

    // Conta registros que correspondem à especificação
    long howMany(ArchbaseSpecification<Produto> specification);

    // Verifica se existe algum registro com a especificação
    boolean containsAny(ArchbaseSpecification<Produto> specification);

    // Busca com filtro textual (RSQL) e paginação
    Page<Produto> findAll(String filter, Pageable pageable);
}
```

**Exemplos de Uso:**

```java
@Service
public class ProdutoService {

    private final ProdutoRepository repository;

    // Contar produtos ativos
    public long contarAtivos() {
        return repository.howMany(
            new EqualSpecification<>("ativo", true)
        );
    }

    // Verificar se existe produto em promoção
    public boolean existePromocao() {
        return repository.containsAny(
            new EqualSpecification<>("emPromocao", true)
        );
    }

    // Buscar com filtro textual (RSQL)
    public Page<Produto> buscar(String filtro, Pageable pageable) {
        return repository.findAll(filtro, pageable);
    }

    // Buscar com especificação
    public List<Produto> encontrarEmEstoque() {
        return repository.matching(
            new GreaterThanSpecification<>("estoque", 0)
        );
    }
}
```

---

## Anotações

### Referência Completa de Anotações

| Anotação | Propósito | Pacote |
|----------|-----------|---------|
| `@DomainEntity` | Marca uma classe como entidade de domínio | `br.com.archbase.ddd.domain.annotations` |
| `@DomainRepository` | Marca uma interface como repositório | `br.com.archbase.ddd.domain.annotations` |
| `@DomainAggregateRoot` | Marca um agregado (raiz de agregado) | `br.com.archbase.ddd.domain.annotations` |
| `@DomainValueObject` | Marca um value object | `br.com.archbase.ddd.domain.annotations` |
| `@DomainIdentifier` | Marca um identificador customizado | `br.com.archbase.ddd.domain.annotations` |
| `@DomainService` | Marca um serviço de domínio | `br.com.archbase.ddd.domain.annotations` |
| `@DomainEvent` | Marca um evento de domínio | `br.com.archbase.ddd.domain.annotations` |
| `@DomainCommand` | Marca um comando CQRS | `br.com.archbase.ddd.domain.annotations` |
| `@DomainQuery` | Marca uma query CQRS | `br.com.archbase.ddd.domain.annotations` |
| `@DomainTransient` | Marca campos transientes (não persistidos) | `br.com.archbase.ddd.domain.annotations` |
| `@PersistenceDomainEntity` | Variante para persistência | `br.com.archbase.ddd.persistence.annotations` |
| `@PersistenceDomainValueObject` | Value object para persistência | `br.com.archbase.ddd.persistence.annotations` |
| `@PersistenceField` | Configuração de campo de persistência | `br.com.archbase.ddd.persistence.annotations` |
| `@RequestBodyDTO` | Marca DTOs de request | `br.com.archbase.ddd.dto.annotations` |
| `@ResponseBodyDTO` | Marca DTOs de response | `br.com.archbase.ddd.dto.annotations` |
| `@StorageField` | Para aspectos de armazenamento | `br.com.archbase.ddd.domain.aspect.annotations` |

### @DomainEntity

Marca uma classe como entidade de domínio:

```java
@Entity
@DomainEntity
public class Produto extends PersistenceEntityBase<Produto, UUID> {
    // ...
}
```

### @DomainAggregateRoot

Marca um agregado (raiz de agregado) com eventos:

```java
@Entity
@DomainAggregateRoot
public class Pedido extends AggregateRoot<Pedido, UUID> {
    // Gerencia invariantes dentro do agregado
}
```

### @DomainValueObject

Marca um value object:

```java
@DomainValueObject
public class Email implements ValueObject {
    private final String endereco;

    public Email(String endereco) {
        if (!isValid(email)) {
            throw new IllegalArgumentException("E-mail inválido");
        }
        this.endereco = endereco;
    }

    // equals e hashCode baseados em valores
}
```

### @DomainRepository

Marca uma interface como repositório de domínio:

```java
@DomainRepository
public interface ProdutoRepository extends Repository<Produto, UUID, Long> {
    // ...
}
```

### @HandlerScan

Escanhea pacotes para handlers de CQRS:

```java
@Configuration
@HandlerScan(basePackages = "com.minhaempresa")
public class ApplicationConfig {
}
```

## Validação

### ValidationResult

Resultado da validação de uma entidade:

```java
@Entity
@DomainEntity
public class Cliente extends PersistenceEntityBase<Cliente, UUID> {

    @Override
    public ValidationResult validate() {
        ValidationResult result = new ValidationResult();

        if (nome == null || nome.isBlank()) {
            result.addError("nome", "Nome é obrigatório");
        }

        if (email == null || !email.matches(".+@.+\\..+")) {
            result.addError("email", "E-mail inválido");
        }

        return result;
    }
}
```

### Usando ValidationResult

```java
public class ClienteService {

    public Cliente criar(Cliente cliente) {
        ValidationResult result = cliente.validate();

        if (!result.isValid()) {
            throw new ValidationException(result.getErrors());
        }

        return repository.save(cliente);
    }
}
```

## Specification

Specificações para queries dinâmicas:

```java
public class ClienteSpecification extends ArchbaseSpecification<Cliente> {

    public static ArchbaseSpecification<Cliente> ativos() {
        return new EqualSpecification<>("ativo", true);
    }

    public static ArchbaseSpecification<Cliente> porNome(String nome) {
        return new LikeSpecification<>("nome", "%" + nome + "%");
    }

    public static ArchbaseSpecification<Cliente> porEmail(String email) {
        return new EqualSpecification<>("email", email);
    }
}
```

**Usando Specifications:**

```java
@Service
public class ClienteService {

    public List<Cliente> buscar(String nome, String email) {
        ArchbaseSpecification<Cliente> spec = Specification.where(null);

        if (nome != null) {
            spec = spec.and(ClienteSpecification.porNome(nome));
        }

        if (email != null) {
            spec = spec.and(ClienteSpecification.porEmail(email));
        }

        return repository.findAll(spec);
    }
}
```

### Specifications Avançadas

O framework oferece uma variedade de especificações para queries complexas:

| Specification | Descrição | Exemplo |
|---------------|-----------|---------|
| `EqualSpecification` | Igualdade | `new EqualSpecification<>("ativo", true)` |
| `NotEqualSpecification` | Desigualdade | `new NotEqualSpecification<>("status", "CANCELADO")` |
| `LikeSpecification` | Like (contém) | `new LikeSpecification<>("nome", "%João%")` |
| `NotLikeSpecification` | Not Like | `new NotLikeSpecification<>("nome", "%Test%")` |
| `GreaterThanSpecification` | Maior que | `new GreaterThanSpecification<>("valor", 100)` |
| `GreaterThanOrEqualSpecification` | Maior ou igual | `new GreaterThanOrEqualSpecification<>("valor", 100)` |
| `LessThanSpecification` | Menor que | `new LessThanSpecification<>("valor", 1000)` |
| `LessThanOrEqualSpecification` | Menor ou igual | `new LessThanOrEqualSpecification<>("valor", 1000)` |
| `BetweenSpecification` | Entre dois valores | `new BetweenSpecification<>("preco", 10, 100)` |
| `InSpecification` | Em uma lista | `new InSpecification<>("status", List.of("ATIVO", "PENDENTE"))` |
| `NotInSpecification` | Não está na lista | `new NotInSpecification<>("tipo", List.of("EXCLUIDO"))` |
| `CompareToSpecification` | Comparação genérica | `new CompareToSpecification<>("data", comparator, value)` |
| `AndArchbaseSpecification` | Combina com AND | `spec1.and(spec2)` |
| `OrArchbaseSpecification` | Combina com OR | `spec1.or(spec2)` |
| `NotArchbaseSpecification` | Negação | `ArchbaseSpecification.not(spec)` |
| `ComposableArchbaseSpecification` | Para composição complexa | Especifique composição customizada |

### Exemplos de Specifications Avançadas

```java
public class ProdutoSpecification extends ArchbaseSpecification<Produto> {

    // Preço entre dois valores
    public static ArchbaseSpecification<Produto> precoEntre(BigDecimal min, BigDecimal max) {
        return new BetweenSpecification<>("preco", min, max);
    }

    // Status em uma lista
    public static ArchbaseSpecification<Produto> comStatus(List<String> status) {
        return new InSpecification<>("status", status);
    }

    // Composição com AND
    public static ArchbaseSpecification<Produto> ativosComPrecoMenorQue(BigDecimal valor) {
        return new EqualSpecification<>("ativo", true)
            .and(new LessThanSpecification<>("preco", valor));
    }

    // Composição com OR
    public static ArchbaseSpecification<Produto> estoqueBaixo() {
        return new LessThanSpecification<>("estoque", 10)
            .or(new EqualSpecification<>("semEstoque", true));
    }

    // Composição complexa
    public static ArchbaseSpecification<Produto> promocaoValida() {
        return new EqualSpecification<>("emPromocao", true)
            .and(new BetweenSpecification<>("dataInicio", hoje, dataFim))
            .and(new GreaterThanSpecification<>("estoque", 0));
    }
}
```

## Value Objects

Base para objetos de valor:

```java
public class CPF extends BaseValueObject {

    private final String numero;

    public CPF(String numero) {
        if (!isValid(numero)) {
            throw new IllegalArgumentException("CPF inválido");
        }
        this.numero = numero;
    }

    // equals() e hashCode() baseados nos valores
}
```

---

## Controllers REST Base

O framework fornece controllers REST base para reduzir código repetitivo:

### CommonArchbaseRestController

Controller completo com operações CRUD:

```java
@RestController
@RequestMapping("/api/produtos")
public class ProdutoController extends CommonArchbaseRestController<Produto, UUID> {

    public ProdutoController(ProdutoRepository repository, ProdutoMapper mapper) {
        super(repository, mapper);
    }

    // Métodos herdados automaticamente:
    // GET /api/produtos - listar todos (com paginação)
    // GET /api/produtos/{id} - buscar por ID
    // POST /api/produtos - criar novo
    // PUT /api/produtos/{id} - atualizar
    // DELETE /api/produtos/{id} - deletar
}
```

### CommonArchbaseQueryRestController

Controller apenas para leitura (queries):

```java
@RestController
@RequestMapping("/api/produtos")
public class ProdutoQueryController extends CommonArchbaseQueryRestController<Produto, UUID> {

    // Apenas métodos GET disponíveis
    // GET /api/produtos - listar
    // GET /api/produtos/{id} - buscar por ID
}
```

### CommonArchbaseCommandRestController

Controller apenas para escrita (comandos):

```java
@RestController
@RequestMapping("/api/produtos")
public class ProdutoCommandController extends CommonArchbaseCommandRestController<Produto, UUID> {

    // Apenas métodos de escrita:
    // POST /api/produtos - criar
    // PUT /api/produtos/{id} - atualizar
    // DELETE /api/produtos/{id} - deletar
}
```

### SimpleArchbaseRestController

Versão simplificada sem paginação:

```java
@RestController
@RequestMapping("/api/categorias")
public class CategoriaController extends SimpleArchbaseRestController<Categoria, Long> {

    // Lista retorna List<Categoria> em vez de Page
}
```

---

## Eventos e Handlers

O framework oferece suporte completo a eventos de domínio:

### Publicando Eventos

```java
@Entity
@DomainAggregateRoot
public class Pedido extends AggregateRoot<Pedido, UUID> {

    public void confirmar() {
        this.status = StatusPedido.CONFIRMADO;

        // Registra evento para ser publicado
        registerEvent(new PedidoConfirmadoEvent(
            this.getId(),
            this.getClienteId(),
            this.getValorTotal()
        ));
    }
}
```

### SimpleEventPublisher

Publicador de eventos síncrono:

```java
@Service
public class PedidoService {

    private final SimpleEventPublisher eventPublisher;

    public Pedido confirmarPedido(UUID pedidoId) {
        Pedido pedido = repository.findById(pedidoId).orElseThrow();
        pedido.confirmar();

        Pedido salvo = repository.save(pedido);

        // Publica eventos registrados
        eventPublisher.publishEvents(pedido.getEvents());
        pedido.clearEvents();

        return salvo;
    }
}
```

### AsynchronousEventHandler

Handler para processar eventos de forma assíncrona:

```java
@Component
public class PedidoEventHandler implements AsynchronousEventHandler {

    @EventHandler
    public void on(PedidoConfirmadoEvent event) {
        // Processa de forma assíncrona
        enviarEmailConfirmacao(event.getClienteId());
        atualizarEstoque(event.getItens());
    }

    @EventHandler
    public void on(PedidoCanceladoEvent event) {
        // Processa cancelamento
        liberarEstoque(event.getItens());
    }
}
```

### EventListenerBeanPostProcessor

O framework detecta automaticamente handlers anotados com `@EventHandler`:

```java
@Configuration
@EnableArchbaseEvents
public class EventConfig {
    // Handlers são descobertos automaticamente via @EventHandler
}
```

### Contratos de Serviço

```java
// Serviço de comandos (escrita)
public interface CriarPedidoService extends CommandService<CriarPedidoCommand, UUID> {
    UUID handle(CriarPedidoCommand command);
}

// Serviço de queries (leitura)
public interface BuscarPedidoService extends QueryService<BuscarPedidoQuery, PedidoDTO> {
    PedidoDTO handle(BuscarPedidoQuery query);
}
```

---

## Próximos Passos

- [Conceitos DDD](/docs/category/conceitos-ddd) - Fundamentos do DDD
- [Guias: Criando Entidades](/docs/guias/creating-entities) - Padrões para entidades
- [API: DomainEntityBase](/docs/api/domain-entity-base) - Referência completa
