---
title: Implementando CQRS
sidebar_position: 1
---

# Implementando CQRS

CQRS (Command Query Responsibility Segregation) é um padrão que separa operações de escrita (Commands) de operações de leitura (Queries).

## O Padrão CQRS

![Diagrama CQRS](/img/cqrs-pattern.svg)

## Command

Um Command representa uma **intenção** de mudança no sistema.

```java
package com.exemplo.application.command;

import br.com.archbase.cqrs.command.Command;
import java.util.UUID;

public class CriarPedidoCommand extends Command {

    private UUID clienteId;
    private List<ItemPedidoCommand> itens;

    public CriarPedidoCommand(UUID clienteId, List<ItemPedidoCommand> itens) {
        this.clienteId = clienteId;
        this.itens = itens;
    }

    public UUID getClienteId() {
        return clienteId;
    }

    public List<ItemPedidoCommand> getItens() {
        return itens;
    }

    public record ItemPedidoCommand(UUID produtoId, int quantidade) {}
}
```

## Command Handler

O CommandHandler executa o Command e pode retornar um resultado.

```java
package com.exemplo.application.handler;

import br.com.archbase.cqrs.command.CommandHandler;
import br.com.archbase.cqrs.command.CommandBus;
import org.springframework.stereotype.Component;

@Component
public class CriarPedidoHandler implements CommandHandler<CriarPedidoCommand, UUID> {

    private final PedidoRepository pedidoRepository;
    private final ClienteRepository clienteRepository;
    private final EventPublisher eventPublisher;

    @Override
    public UUID handle(CriarPedidoCommand command) {
        // 1. Buscar agregados necessários
        Cliente cliente = clienteRepository.findById(command.getClienteId())
            .orElseThrow(() -> new ClienteNaoEncontradoException(command.getClienteId()));

        // 2. Criar agregado
        Pedido pedido = new Pedido(cliente);

        // 3. Executar lógica de domínio
        for (var item : command.getItens()) {
            pedido.adicionarItem(item.produtoId(), item.quantidade());
        }

        // 4. Validar
        ValidationResult validation = pedido.validate();
        if (!validation.isValid()) {
            throw new ValidationException(validation.getErrors());
        }

        // 5. Persistir
        Pedido salvo = pedidoRepository.save(pedido);

        // 6. Publicar eventos de domínio
        salvo.getEvents().forEach(eventPublisher::publish);
        salvo.clearEvents();

        return salvo.getId();
    }
}
```

## Query

Uma Query representa uma **consulta** ao sistema.

```java
package com.exemplo.application.query;

import br.com.archbase.cqrs.query.Query;
import java.time.LocalDateTime;
import java.util.UUID;

public class ListarPedidosQuery extends Query<List<PedidoDTO>> {

    private UUID clienteId;
    private LocalDateTime dataInicio;
    private LocalDateTime dataFim;
    private StatusPedido status;

    // Builder pattern para queries opcionais
    public static ListarPedidosQuery builder() {
        return new ListarPedidosQuery();
    }

    public ListarPedidosQuery clienteId(UUID clienteId) {
        this.clienteId = clienteId;
        return this;
    }

    public ListarPedidosQuery periodo(LocalDateTime inicio, LocalDateTime fim) {
        this.dataInicio = inicio;
        this.dataFim = fim;
        return this;
    }

    public ListarPedidosQuery status(StatusPedido status) {
        this.status = status;
        return this;
    }

    // Getters...
}
```

## Query Handler

O QueryHandler executa consultas otimizadas para leitura.

```java
@Component
public class ListarPedidosHandler implements QueryHandler<ListarPedidosQuery, List<PedidoDTO>> {

    private final PedidoQueryRepository queryRepository;

    @Override
    public List<PedidoDTO> handle(ListarPedidosQuery query) {
        // Queries podem usar modelos otimizados para leitura
        // (projeções, views materializadas, cache, etc)
        return queryRepository.findPedidos(
            query.getClienteId(),
            query.getDataInicio(),
            query.getDataFim(),
            query.getStatus()
        );
    }
}
```

## Usando o CommandBus

```java
@RestController
@RequestMapping("/api/v1/pedidos")
public class PedidoController {

    private final CommandBus commandBus;
    private final QueryBus queryBus;

    @PostMapping
    public ResponseEntity<PedidoResponse> criar(@RequestBody CriarPedidoRequest request) {
        CriarPedidoCommand command = new CriarPedidoCommand(
            request.getClienteId(),
            request.getItens()
        );

        UUID pedidoId = commandBus.dispatch(command);

        return ResponseEntity
            .status(HttpStatus.CREATED)
            .body(new PedidoResponse(pedidoId));
    }

    @GetMapping
    public ResponseEntity<List<PedidoDTO>> listar(
            @RequestParam(required = false) UUID clienteId,
            @RequestParam(required = false) StatusPedido status) {

        ListarPedidosQuery query = ListarPedidosQuery.builder()
            .clienteId(clienteId)
            .status(status);

        List<PedidoDTO> pedidos = queryBus.dispatch(query);

        return ResponseEntity.ok(pedidos);
    }
}
```

## Eventos de Domínio

Agregados publicam eventos quando algo importante acontece.

```java
public class Pedido extends AggregateRoot<Pedido, UUID> {

    public void confirmar() {
        if (!podeSerConfirmado()) {
            throw new IllegalStateException("Pedido não pode ser confirmado");
        }

        this.status = StatusPedido.CONFIRMADO;

        // Publicar evento
        registerEvent(new PedidoConfirmadoEvent(
            this.getId(),
            this.clienteId,
            this.total,
            LocalDateTime.now()
        ));
    }
}
```

## Event Handler

React to domain events and trigger side effects.

```java
@Component
@HandlerScan(basePackages = "com.exemplo.application.handler")
public class PedidoEventHandler {

    private final EmailService emailService;
    private final EstoqueService estoqueService;

    @EventHandler
    public void on(PedidoConfirmadoEvent event) {
        // Enviar email de confirmação
        emailService.enviarConfirmacao(event.getPedidoId());

        // Baixar estoque
        estoqueService.baixarEstoque(event.getItens());
    }

    @EventHandler
    public void on(PedidoCanceladoEvent event) {
        // Devolver estoque
        estoqueService.devolverEstoque(event.getItens());
    }
}
```

## Configuração

```java
@Configuration
@HandlerScan(basePackages = "com.exemplo.application")
@EnableCQRS
public class CQRSConfig {

    @Bean
    public CommandBus commandBus() {
        return new ArchbaseCommandBus();
    }

    @Bean
    public QueryBus queryBus() {
        return new ArchbaseQueryBus();
    }

    @Bean
    public EventBus eventBus() {
        return new ArchbaseEventBus();
    }
}
```

## Boas Práticas

### Commands

| Regra | Descrição |
|-------|-----------|
| Nome verbal | `CriarPedido`, `AtualizarStatus`, `CancelarPedido` |
| Imutável | Todos os campos são `final` |
| Validação | Validar antes de executar |

### Queries

| Regra | Descrição |
|-------|-----------|
| Nome baseado em retorno | `ListarPedidos`, `BuscarPorId`, `ContarPorStatus` |
| Sem efeitos colaterais | Nunca modificar estado |
| Otimizadas | Usar projeções, DTOs, cache |

### Handlers

| Regra | Descrição |
|-------|-----------|
| Um handler por command/query | Mantenha simples |
| Transações | Use `@Transactional` em command handlers |
| Exceções | Trate exceções de domínio apropriadamente |

## Exemplo Completo

```java
// 1. Command
public record FecharCaixaCommand(
    UUID caixaId,
    UUID operadorId
) extends Command<Void> {}

// 2. Command Handler
@Component
public class FecharCaixaHandler implements CommandHandler<FecharCaixaCommand, Void> {

    @Transactional
    @Override
    public Void handle(FecharCaixaCommand command) {
        Caixa caixa = caixaRepository.findById(command.caixaId())
            .orElseThrow(() -> new CaixaNaoEncontradoException(command.caixaId()));

        caixa.fechar(command.operadorId());

        caixaRepository.save(caixa);

        return null;
    }
}

// 3. Query
public record ConsultarCaixaQuery(
    UUID caixaId
) extends Query<CaixaDTO> {}

// 4. Query Handler
@Component
public class ConsultarCaixaHandler implements QueryHandler<ConsultarCaixaQuery, CaixaDTO> {

    @Override
    public CaixaDTO handle(ConsultarCaixaQuery query) {
        return caixaQueryRepository.findProjectedById(query.caixaId());
    }
}

// 5. Controller
@RestController
@RequestMapping("/api/v1/caixas")
@RequiredArgsConstructor
public class CaixaController {

    private final CommandBus commandBus;
    private final QueryBus queryBus;

    @PostMapping("/{id}/fechar")
    public ResponseEntity<Void> fechar(@PathVariable UUID id, @RequestBody FecharCaixaRequest req) {
        commandBus.dispatch(new FecharCaixaCommand(id, req.operadorId()));
        return ResponseEntity.ok().build();
    }

    @GetMapping("/{id}")
    public ResponseEntity<CaixaDTO> consultar(@PathVariable UUID id) {
        CaixaDTO caixa = queryBus.dispatch(new ConsultarCaixaQuery(id));
        return ResponseEntity.ok(caixa);
    }
}
```

## Próximos Passos

- [Event-Driven](/docs/modulos/event-driven) - Sistema de eventos
- [Validation](/docs/modulos/validation) - Validação de commands
- [Error Handling](/docs/modulos/error-handling) - Tratamento de erros
