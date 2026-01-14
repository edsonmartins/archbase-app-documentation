---
title: CommandBus
sidebar_position: 2
---

# CommandBus

Componente central para dispatch de Commands na arquitetura CQRS.

## Visão Geral

```
Controller
    ↓
CommandBus.dispatch(command)
    ↓
CommandHandler.handle(command)
    ↓
Domain / Repository
```

## Métodos

| Método | Descrição |
|--------|-----------|
| `dispatch(Command)` | Executa um comando síncrono |
| `dispatchAsync(Command)` | Executa um comando assincronamente |
| `register(Class, Handler)` | Registra um handler manualmente |

## Usando o CommandBus

### Injeção

```java
@Service
public class PedidoService {

    private final CommandBus commandBus;

    public PedidoService(CommandBus commandBus) {
        this.commandBus = commandBus;
    }

    public UUID criarPedido(CriarPedidoRequest request) {
        CriarPedidoCommand command = new CriarPedidoCommand(
            request.getClienteId(),
            request.getItens()
        );

        return commandBus.dispatch(command);
    }
}
```

### Controller com CommandBus

```java
@RestController
@RequestMapping("/api/v1/pedidos")
public class PedidoController {

    private final CommandBus commandBus;

    @PostMapping
    public ResponseEntity<PedidoResponse> criar(
            @RequestBody CriarPedidoRequest request) {

        CriarPedidoCommand command = request.toCommand();

        UUID pedidoId = commandBus.dispatch(command);

        return ResponseEntity
            .status(HttpStatus.CREATED)
            .body(new PedidoResponse(pedidoId));
    }

    @PostMapping("/{id}/confirmar")
    public ResponseEntity<Void> confirmar(@PathVariable UUID id) {
        ConfirmarPedidoCommand command = new ConfirmarPedidoCommand(id);

        commandBus.dispatch(command);

        return ResponseEntity.ok().build();
    }
}
```

## Criando um CommandHandler

```java
package com.exemplo.application.handler;

import br.com.archbase.cqrs.command.CommandHandler;
import br.com.archbase.cqrs.command.Command;
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
            .orElseThrow(() -> new ClienteNaoEncontradoException());

        // 2. Criar agregado
        Pedido pedido = new Pedido(cliente);

        // 3. Executar lógica de domínio
        for (var item : command.getItens()) {
            pedido.adicionarItem(item.getProdutoId(), item.getQuantidade());
        }

        // 4. Validar
        ValidationResult validation = pedido.validate();
        if (!validation.isValid()) {
            throw new ValidationException(validation.getErrors());
        }

        // 5. Persistir
        Pedido salvo = pedidoRepository.save(pedido);

        // 6. Publicar eventos
        salvo.getEvents().forEach(eventPublisher::publish);
        salvo.clearEvents();

        return salvo.getId();
    }
}
```

## Auto-Discovery de Handlers

```java
@Configuration
@HandlerScan(basePackages = "com.exemplo.application.handler")
public class CQRSConfig {
    // Handlers são descobertos automaticamente
}
```

## Command com Resultado

```java
// Command que retorna resultado
public record CalcularTotalCommand(
    UUID pedidoId
) extends Command<Money> {}

@Component
public class CalcularTotalHandler
        implements CommandHandler<CalcularTotalCommand, Money> {

    @Override
    public Money handle(CalccularTotalCommand command) {
        Pedido pedido = repository.findById(command.pedidoId())
            .orElseThrow();

        return pedido.getTotal();
    }
}
```

## Command Sem Resultado

```java
// Command que não retorna resultado
public record FecharCaixaCommand(
    UUID caixaId
) extends Command<Void> {}

@Component
public class FecharCaixaHandler
        implements CommandHandler<FecharCaixaCommand, Void> {

    @Override
    public Void handle(FecharCaixaCommand command) {
        Caixa caixa = repository.findById(command.caixaId())
            .orElseThrow();
        caixa.fechar();
        repository.save(caixa);
        return null;
    }
}
```

## Validação de Command

```java
@Component
public class CriarPedidoHandler
        implements CommandHandler<CriarPedidoCommand, UUID> {

    @Override
    public UUID handle(CriarPedidoCommand command) {
        // Validar command
        ValidationResult validation = command.validate();
        if (!validation.isValid()) {
            throw new ValidationException(validation.getErrors());
        }

        // Lógica de negócio...
    }
}
```

```java
public record CriarPedidoCommand(
    UUID clienteId,
    List<ItemCommand> itens
) extends Command<UUID> {

    @Override
    public ValidationResult validate() {
        return new CriarPedidoCommand.Validator().validate(this);
    }

    static class Validator extends AbstractArchbaseValidator<CriarPedidoCommand> {
        @Override
        public void rules() {
            ruleFor(CriarPedidoCommand::getClienteId)
                .must(Objects::nonNull)
                .withMessage("Cliente é obrigatório")
                .withFieldName("clienteId")
                .critical();

            ruleFor(CriarPedidoCommand::getItens)
                .must(list -> !list.isEmpty())
                .withMessage("Pedido deve ter ao menos um item")
                .withFieldName("itens")
                .critical();
        }
    }
}
```

## Middleware de Command

```java
@Component
@Order(1)
public class ValidationCommandMiddleware implements CommandMiddleware {

    @Override
    public <C extends Command<R>, R> R handle(C command, CommandMiddlewareChain<C, R> chain) {
        // Validar command antes de executar
        if (command instanceof Validatable) {
            ValidationResult result = ((Validatable) command).validate();
            if (!result.isValid()) {
                throw new ValidationException(result.getErrors());
            }
        }

        return chain.proceed(command);
    }
}

@Component
@Order(2)
public class TransactionCommandMiddleware implements CommandMiddleware {

    @Override
    @Transactional
    public <C extends Command<R>, R> R handle(C command, CommandMiddlewareChain<C, R> chain) {
        return chain.proceed(command);
    }
}

@Component
@Order(3)
public class LoggingCommandMiddleware implements CommandMiddleware {

    @Override
    public <C extends Command<R>, R> R handle(C command, CommandMiddlewareChain<C, R> chain) {
        log.info("Executando command: {}", command.getClass().getSimpleName());
        long start = System.currentTimeMillis();

        try {
            R result = chain.proceed(command);
            log.info("Command executado em {}ms", System.currentTimeMillis() - start);
            return result;
        } catch (Exception e) {
            log.error("Command falhou", e);
            throw e;
        }
    }
}
```

## Próximos Passos

- [Implementando CQRS](/docs/guias/implementing-cqrs) - Guia completo
- [QueryBus](/docs/api/query-bus) - Bus de Queries
- [EventBus](/docs/api/event-bus) - Bus de Eventos
