---
title: Estrutura do Projeto
sidebar_position: 3
---

# Estrutura do Projeto

Uma estrutura bem organizada é essencial para aplicações DDD. O Archbase recomenda a **Arquitetura Hexagonal** (Ports &amp; Adapters), que isola o domínio de detalhes técnicos.

## Estrutura Hexagonal

![Estrutura de Projeto Hexagonal](/img/hexagonal-project-structure.svg)

## Organização de Pacotes

### domain/ - Core do Negócio

Contém entidades, value objects, agregados e interfaces de repositórios. **Nunca depende de outras camadas.**

```
domain/
├── entity/                    # Entidades do domínio
│   ├── Cliente.java
│   ├── Produto.java
│   └── Pedido.java
├── valueobject/               # Value Objects
│   ├── CPF.java
│   ├── Email.java
│   └── Dinheiro.java
├── aggregate/                 # Aggregates (Aggregate Roots)
│   └── PedidoAggregate.java
├── repository/                # Interfaces de Repository (Ports)
│   ├── ClienteRepository.java
│   └── PedidoRepository.java
├── service/                   # Domain Services
│   └── CalculadoraFreteService.java
└── specification/             # Specifications
    └── ClienteAtivoSpecification.java
```

### application/ - Use Cases e Ports

Contém casos de uso, commands, queries e interfaces de ports (input/output).

```
application/
├── port/                      # Ports (Interfaces)
│   ├── input/                 # Input Ports (Use Cases)
│   │   ├── PedidoUseCase.java
│   │   └── ClienteUseCase.java
│   └── output/                # Output Ports
│       ├── PedidoPort.java
│       └── NotificacaoPort.java
├── service/                   # Implementações de Use Cases
│   └── PedidoService.java
├── command/                   # Commands (CQRS)
│   ├── CriarPedidoCommand.java
│   └── AtualizarStatusCommand.java
├── query/                     # Queries (CQRS)
│   └── ListarPedidosQuery.java
├── handler/                   # Command/Query Handlers
│   └── CriarPedidoHandler.java
└── dto/                       # Data Transfer Objects
    ├── PedidoDTO.java
    └── ClienteDTO.java
```

### infrastructure/ - Adapters

Implementa detalhes técnicos: REST, JPA, MQTT/JMS, APIs externas.

```
infrastructure/
├── input/                     # Input Adapters (Driving)
│   ├── rest/                  # REST Controllers
│   │   ├── PedidoController.java
│   │   └── ClienteController.java
│   ├── graphql/               # GraphQL Resolvers
│   └── websocket/             # WebSocket Handlers
└── output/                    # Output Adapters (Driven)
    ├── persistence/           # JPA/Hibernate
    │   ├── entity/
    │   │   └── PedidoEntity.java
    │   └── repository/
    │       └── PedidoRepositoryAdapter.java
    ├── messaging/             # MQTT/JMS (Artemis)
    │   ├── publisher/
    │   │   └── PedidoMQTTPublisher.java
    │   └── listener/
    │       └── PedidoEventListener.java
    └── external/              # APIs externas
        └── HttpClientPagamento.java
```

### config/ - Configurações

Arquivos de configuração do Spring Boot.

```
config/
├── SecurityConfig.java
├── DatabaseConfig.java
└── MqttConfig.java            # Configuração Artemis/MQTT
```

## Responsabilidades de Cada Camada

### Domain (Domínio)

É o **coração** da aplicação. Contém a lógica de negócio e **nunca** depende de outras camadas.

```java
// ✅ CORRETO - Entidade com lógica de domínio
@Entity
@DomainEntity
public class Pedido extends PersistenceEntityBase<Pedido, UUID> {

    public void adicionarItem(Item item) {
        // Lógica de negócio aqui
        validarQuantidade(item);
        calcularTotal();
    }

    public void confirmar() {
        if (!podeSerConfirmado()) {
            throw new IllegalStateException("Pedido não pode ser confirmado");
        }
        this.status = StatusPedido.CONFIRMADO;
    }
}
```

```java
// ❏ EVITAR - Lógica fora da entidade
@Service
public class PedidoService {
    public void confirmarPedido(Pedido pedido) {
        pedido.setStatus(StatusPedido.CONFIRMADO); // Lógica deveria estar na entidade
    }
}
```

### Application (Aplicação)

Orquestra casos de uso, coordenando objetos do domínio. Usa Commands e Queries (CQRS).

```java
@Component
public class CriarPedidoHandler implements CommandHandler<CriarPedidoCommand, UUID> {

    private final PedidoRepository pedidoRepository;
    private final ClienteRepository clienteRepository;

    @Override
    public UUID handle(CriarPedidoCommand command) {
        Cliente cliente = clienteRepository.findById(command.getClienteId())
                .orElseThrow(() -> new ClienteNaoEncontradoException());

        Pedido pedido = new Pedido(cliente, command.getItens());
        pedido.validar();

        return pedidoRepository.save(pedido).getId();
    }
}
```

### Infrastructure (Infraestrutura)

Implementa detalhes técnicos: JPA, APIs externas, mensageria.

```java
@Repository
public class PedidoRepositoryImpl implements PedidoRepository {

    @PersistenceContext
    private EntityManager entityManager;

    // Implementações técnicas de persistência
}
```

### Interfaces (Interface)

Controllers REST, GraphQL, ou qualquer outra forma de comunicação externa.

```java
@RestController
@RequestMapping("/api/pedidos")
public class PedidoController {

    private final CommandBus commandBus;
    private final QueryBus queryBus;

    @PostMapping
    public ResponseEntity<PedidoResponse> criar(@RequestBody CriarPedidoRequest request) {
        CriarPedidoCommand command = request.toCommand();
        UUID id = commandBus.dispatch(command);
        return ResponseEntity.ok(new PedidoResponse(id));
    }
}
```

## Regras de Dependência

Na Arquitetura Hexagonal, as dependências sempre apontam **para o domínio**:

| Camada | Pode Depender De |
|--------|-----------------|
| **Domain** | Ninguém (independente) |
| **Application (Ports)** | Domain apenas |
| **Infrastructure (Adapters)** | Domain e Application |

**Regra de Ouro**: O Domain **nunca** deve depender de outras camadas.

### Fluxo de Requisição

```
REST Controller (Input Adapter)
    ↓
Use Case Interface (Input Port)
    ↓
Service (Application)
    ↓
Domain Entity (Core)
    ↓
Repository Adapter (Output Adapter)
    ↓
Database
```

## Convenções de Nomenclatura

| Tipo | Sufixo/Prefixo | Exemplo |
|------|----------------|---------|
| Entidade | Nomes concretos do negócio | `Cliente`, `Pedido` |
| Value Object | Conceitos do domínio | `CPF`, `Email`, `Dinheiro` |
| Repository | `Repository` | `ClienteRepository` |
| Command | `Command` ou nome verbal | `CriarPedidoCommand` |
| Query | `Query` ou nome verbal | `ListarPedidosQuery` |
| Handler | `Handler` | `CriarPedidoHandler` |
| Controller | `Controller` | `PedidoController` |
| DTO | `DTO`, `Request`, `Response` | `PedidoDTO`, `CriarPedidoRequest` |

## Multi-tenancy

Para projetos multi-tenant, use a base de entidades com tenant:

```java
@Entity
@DomainEntity
public class Produto extends TenantPersistenceEntityBase<Produto, UUID> {
    // Campos do domínio + tenant automático
}
```

## Próximos Passos

- [Criando Entidades](/docs/conceitos/ddd) - Padrões para entidades DDD
- [Criando Repositories](/docs/conceitos/repositories) - Queries e Specifications
- [Implementando CQRS](/docs/modulos/event-driven) - Commands e Queries
