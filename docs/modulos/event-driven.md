---
title: archbase-event-driven
sidebar_position: 3
---

# archbase-event-driven

O módulo **archbase-event-driven** implementa o padrão **CQRS (Command Query Responsibility Segregation)** com buses para Commands, Events e Queries.

## Instalação

```xml
<dependency>
    <groupId>br.com.archbase</groupId>
    <artifactId>archbase-event-driven</artifactId>
    <version>${archbase.version}</version>
</dependency>
```

## Configuração

```yaml
archbase:
  event-driven:
    enabled: true
    handler-scan: com.minhaempresa  # Pacote para escanear handlers
    metrics:
      enabled: true  # Métricas com Micrometer
```

## CQRS com Command Bus

O **Command Bus** despacha comandos para seus handlers correspondentes.

### Criar um Command

```java
package com.minhaempresa.application.command;

import br.com.archbase.event.driven.bus.command.Command;

public class CriarPedidoCommand extends Command<UUID> {

    private final UUID clienteId;
    private final List<ItemPedidoDto> itens;

    public CriarPedidoCommand(UUID clienteId, List<ItemPedidoDto> itens) {
        this.clienteId = clienteId;
        this.itens = itens;
    }

    public UUID getClienteId() {
        return clienteId;
    }

    public List<ItemPedidoDto> getItens() {
        return itens;
    }
}
```

### Criar um Command Handler

```java
package com.minhaempresa.application.handler;

import br.com.archbase.event.driven.bus.command.CommandHandler;
import br.com.archbase.event.driven.bus.command.CommandBus;
import com.minhaempresa.application.command.CriarPedidoCommand;
import com.minhaempresa.domain.Pedido;
import com.minhaempresa.domain.repository.PedidoRepository;
import org.springframework.stereotype.Component;

@Component
public class CriarPedidoHandler implements CommandHandler<CriarPedidoCommand, UUID> {

    private final PedidoRepository repository;

    public CriarPedidoHandler(PedidoRepository repository) {
        this.repository = repository;
    }

    @Override
    public UUID handle(CriarPedidoCommand command) {
        Pedido pedido = new Pedido(command.getClienteId());

        command.getItens().forEach(item ->
            pedido.adicionarItem(item.getProdutoId(), item.getQuantidade())
        );

        pedido.validar();

        Pedido salvo = repository.save(pedido);
        return salvo.getId();
    }
}
```

### Usar o Command Bus

```java
@RestController
@RequestMapping("/api/pedidos")
public class PedidoController {

    private final CommandBus commandBus;

    @PostMapping
    public ResponseEntity<PedidoResponse> criar(@RequestBody CriarPedidoRequest request) {
        CriarPedidoCommand command = new CriarPedidoCommand(
            request.getClienteId(),
            request.getItens()
        );

        UUID pedidoId = commandBus.dispatch(command);

        return ResponseEntity.ok(new PedidoResponse(pedidoId));
    }
}
```

## Event Bus

O **Event Bus** publica eventos que podem ser consumidos por múltiplos handlers.

### Criar um Event

```java
package com.minhaempresa.domain.event;

import br.com.archbase.event.driven.bus.event.Event;
import java.time.LocalDateTime;
import java.util.UUID;

public class PedidoCriadoEvent extends Event {

    private final UUID pedidoId;
    private final UUID clienteId;
    private final BigDecimal total;

    public PedidoCriadoEvent(UUID pedidoId, UUID clienteId, BigDecimal total) {
        super(LocalDateTime.now());
        this.pedidoId = pedidoId;
        this.clienteId = clientIdId;
        this.total = total;
    }

    // Getters...
}
```

### Publicar um Event

```java
public class Pedido extends AggregateRoot<Pedido, UUID> {

    public void confirmar() {
        // Mudança de estado
        this.status = StatusPedido.CONFIRMADO;

        // Publicar evento
        registerEvent(new PedidoConfirmadoEvent(
            this.getId(),
            this.getClienteId(),
            this.getTotal()
        ));
    }
}
```

### Criar um Event Handler

```java
package com.minhaempresa.application.handler;

import br.com.archbase.event.driven.bus.event.EventHandler;
import br.com.archbase.event.driven.bus.event.Event;
import com.minhaempresa.domain.event.PedidoConfirmadoEvent;
import org.springframework.stereotype.Component;

@Component
public class PedidoEventHandler {

    @EventHandler
    public void on(PedidoConfirmadoEvent event) {
        // Enviar email de confirmação
        emailService.enviarConfirmacao(event.getClienteId(), event.getPedidoId());

        // Atualizar estoque
        estoqueService.baixarItens(event.getPedidoId());
    }

    @EventHandler
    public void on(PedidoCanceladoEvent event) {
        // Liberar estoque
        estoqueService.liberarItens(event.getPedidoId());
    }
}
```

## Query Bus

O **Query Bus** executa consultas separadas da escrita.

### Criar uma Query

```java
package com.minhaempresa.application.query;

import br.com.archbase.event.driven.bus.query.Query;
import java.time.LocalDateTime;

public class ListarPedidosQuery extends Query<Page<PedidoDto>> {

    private final UUID clienteId;
    private final LocalDateTime dataInicio;
    private final LocalDateTime dataFim;
    private final Pageable pageable;

    // Constructor e getters...
}
```

### Criar um Query Handler

```java
package com.minhaempresa.application.handler;

import br.com.archbase.event.driven.bus.query.QueryHandler;
import com.minhaempresa.application.query.ListarPedidosQuery;
import com.minhaempresa.infrastructure.persistence.ProdutoRepositoryImpl;
import org.springframework.stereotype.Component;

@Component
public class ListarPedidosHandler implements QueryHandler<ListarPedidosQuery, Page<PedidoDto>> {

    private final PedidoRepositoryImpl repository;

    @Override
    public Page<PedidoDto> handle(ListarPedidosQuery query) {
        return repository.findByClienteAndPeriodo(
            query.getClienteId(),
            query.getDataInicio(),
            query.getDataFim(),
            query.getPageable()
        ).map(this::toDto);
    }
}
```

### Usar o Query Bus

```java
@RestController
@RequestMapping("/api/pedidos")
public class PedidoController {

    private final QueryBus queryBus;

    @GetMapping
    public ResponseEntity<Page<PedidoDto>> listar(
            @RequestParam UUID clienteId,
            @RequestParam(required = false) LocalDateTime dataInicio,
            @RequestParam(required = false) LocalDateTime dataFim,
            Pageable pageable) {

        ListarPedidosQuery query = new ListarPedidosQuery(
            clienteId, dataInicio, dataFim, pageable
        );

        Page<PedidoDto> pedidos = queryBus.dispatch(query);

        return ResponseEntity.ok(pedidos);
    }
}
```

## Escaneamento de Handlers

Adicione `@HandlerScan` na sua configuração:

```java
@Configuration
@HandlerScan(basePackages = "com.minhaempresa")
public class ApplicationConfig {
}
```

## Middleware

O framework suporta middleware para cross-cutting concerns:

```java
@Component
@Order(1)
public class LoggingMiddleware implements CommandMiddleware {

    @Override
    public <C, R> R handle(CommandBus<C, R> bus, C command) {
        log.info("Executando comando: {}", command.getClass().getSimpleName());
        try {
            R result = bus.dispatch(command);
            log.info("Comando executado com sucesso");
            return result;
        } catch (Exception e) {
            log.error("Erro ao executar comando", e);
            throw e;
        }
    }
}
```

## Métricas

O módulo coleta métricas automaticamente quando Micrometer está disponível:

```yaml
archbase:
  event-driven:
    metrics:
      enabled: true
```

Métricas disponíveis:
- `archbase.command.execution.time` - Tempo de execução de comandos
- `archbase.command.execution.count` - Contagem de comandos executados
- `archbase.query.execution.time` - Tempo de execução de queries
- `archbase.event.published.count` - Contagem de eventos publicados

## Próximos Passos

- [Guias: Implementando CQRS](/docs/guias/implementing-cqrs) - Guia completo
- [API: Command Bus](/docs/api/command-bus) - Referência da API
- [API: Event Bus](/docs/api/event-bus) - Referência da API
