---
title: EventBus
sidebar_position: 3
---

# EventBus

Componente central para publicação e consumo de eventos de domínio.

## Visão Geral

```
Aggregate Root
    ↓ (registerEvent)
EventBus.publish(event)
    ↓
EventHandler.handle(event)
    ↓
Side Effects (email, integrações, etc.)
```

## Tipos de Eventos

| Tipo | Descrição |
|------|-----------|
| **DomainEvent** | Eventos de domínio |
| **IntegrationEvent** | Eventos de integração externa |
| **SystemEvent** | Eventos do sistema |

## Publicando Eventos

### No Aggregate Root

```java
@Entity
@DomainAggregateRoot
public class Pedido extends AggregateRoot<Pedido, UUID> {

    public void confirmar() {
        validarConfirmacao();

        this.status = StatusPedido.CONFIRMADO;

        // Publicar evento de domínio
        registerEvent(new PedidoConfirmadoEvent(
            this.getId(),
            this.clienteId,
            this.total,
            LocalDateTime.now()
        ));
    }
}
```

### Publicação Manual

```java
@Service
public class PedidoService {

    private final EventBus eventBus;

    public void confirmarPedido(UUID pedidoId) {
        Pedido pedido = repository.findById(pedidoId)
            .orElseThrow();

        pedido.confirmar();

        repository.save(pedido);

        // Publicar eventos acumulados
        pedido.getEvents().forEach(eventBus::publish);
        pedido.clearEvents();
    }

    // Ou publicar diretamente
    public void notificarCliente(Pedido pedido) {
        eventBus.publish(new PedidoConfirmadoEvent(
            pedido.getId(),
            pedido.getClienteId(),
            pedido.getTotal(),
            LocalDateTime.now()
        ));
    }
}
```

## Criando Event Handler

```java
package com.exemplo.application.handler;

import br.com.archbase.event.EventHandler;
import org.springframework.stereotype.Component;

@Component
public class PedidoEventHandler {

    private final EmailService emailService;
    private final EstoqueService estoqueService;

    @EventHandler
    public void on(PedidoConfirmadoEvent event) {
        log.info("Pedido confirmado: {}", event.getPedidoId());

        // Enviar email de confirmação
        emailService.enviarConfirmacao(event.getPedidoId());

        // Baixar estoque
        estoqueService.baixarEstoque(event.getItens());
    }

    @EventHandler
    public void on(PedidoCanceladoEvent event) {
        log.info("Pedido cancelado: {}", event.getPedidoId());

        // Devolver estoque
        estoqueService.devolverEstoque(event.getItens());

        // Notificar cliente
        emailService.enviarNotificacaoCancelamento(event.getPedidoId());
    }

    @EventHandler
    public void on(PedidoEntregueEvent event) {
        log.info("Pedido entregue: {}", event.getPedidoId());

        // Calcular métricas
        metricsService.registrarEntrega(event.getPedidoId());

        // Notificar sistemas externos
        integracaoService.notificarEntrega(event);
    }
}
```

## Event Handler com Filtro

```java
@Component
public class RelatorioEventHandler {

    @EventHandler(condition = "#event.valorTotal > 1000")
    public void onPedidoAltoValor(PedidoConfirmadoEvent event) {
        relatorioService.registrarVendaAlta(event);
    }

    @EventHandler
    @Scheduled(fixedDelay = 60000) // Processa em lote a cada minuto
    public void processarEventosPendentes() {
        // Processar eventos não enviados
    }
}
```

## Handler Scan

```java
@Configuration
@HandlerScan(basePackages = {
    "com.exemplo.application.handler",
    "com.exemplo.infrastructure.handler"
})
public class EventConfig {
    // Handlers são descobertos automaticamente
}
```

## Eventos de Integração

```java
public record PedidoCriadoIntegrationEvent(
    UUID pedidoId,
    UUID clienteId,
    Money total,
    LocalDateTime criadoEm
) implements IntegrationEvent {

    @Override
    public String getAggregateType() {
        return "Pedido";
    }

    @Override
    public String getEventType() {
        return "PedidoCriado";
    }
}
```

### Publicando em Message Broker

```java
@Component
public class EventPublisherMQTT {

    private final MqttClient mqttClient;

    @EventListener
    public void handleIntegrationEvent(IntegrationEvent event) {
        String topic = "events/" + event.getAggregateType() + "/" + event.getEventType();

        try {
            String payload = objectMapper.writeValueAsString(event);
            MqttMessage message = new MqttMessage(payload.getBytes());
            message.setQos(1);
            mqttClient.publish(topic, message);
        } catch (Exception e) {
            log.error("Erro ao publicar evento", e);
        }
    }
}
```

## Event Sourcing

```java
@Service
public class EventSourcingService {

    private final EventStore eventStore;

    public void save(AggregateRoot aggregate) {
        List<DomainEvent> events = aggregate.getUncommittedEvents();

        // Salvar eventos no event store
        eventStore.save(aggregate.getId(), events);

        // Publicar eventos
        events.forEach(eventBus::publish);

        // Marcar eventos como commitados
        aggregate.markEventsAsCommitted();
    }

    public <T extends AggregateRoot> T load(UUID id, Class<T> type) {
        List<DomainEvent> events = eventStore.getEvents(id);

        T aggregate = instantiate(type);
        events.forEach(aggregate::applyEvent);

        return aggregate;
    }
}
```

## Retry em Event Handlers

```java
@Component
public class ResilientEventHandler {

    private final ExternalService externalService;

    @EventHandler
    @RetryableTopic(attempts = "3", backoff = @Backoff(delay = 1000))
    public void on(PedidoConfirmadoEvent event) {
        externalService.notificar(event);
    }

    @Recover
    public void recover(PedidoConfirmadoEvent event, Throwable ex) {
        log.error("Falha ao processar evento após tentativas", ex);

        // Salvar em DLQ (Dead Letter Queue)
        deadLetterQueue.save(event, ex);
    }
}
```

## Saga Orchestration

```java
@Component
public class PedidoSaga {

    @EventHandler
    public void on(PedidoConfirmadoEvent event) {
        // Iniciar saga
        SagaManager saga = new SagaManager(event.getPedidoId());

        // Passo 1: Reservar estoque
        saga.execute("reservar-estoque", () ->
            estoqueService.reservar(event.getItens())
        );

        // Passo 2: Processar pagamento
        saga.execute("processar-pagamento", () ->
            pagamentoService.processar(event.getPedidoId(), event.getTotal())
        );

        // Passo 3: Notificar transportadora
        saga.execute("notificar-transportadora", () ->
            transportadoraService.agendarColeta(event.getPedidoId())
        );
    }

    @EventHandler
    public void on(PagamentoFalhouEvent event) {
        // Compensação
        sagaManager.compensate(event.getPedidoId());
        estoqueService.liberar(event.getPedidoId());
    }
}
```

## Testando Event Handlers

```java
@SpringBootTest
class PedidoEventHandlerTest {

    @Autowired
    private EventBus eventBus;

    @MockBean
    private EmailService emailService;

    @Test
    void deveEnviarEmailQuandoPedidoConfirmado() {
        // Given
        PedidoConfirmadoEvent event = new PedidoConfirmadoEvent(
            pedidoId, clienteId, Money.reais(100), LocalDateTime.now()
        );

        // When
        eventBus.publish(event);

        // Then
        await().atMost(Duration.ofSeconds(1))
            .untilAsserted(() ->
                verify(emailService).enviarConfirmacao(pedidoId)
            );
    }
}
```

## Boas Práticas

| Prática | Descrição |
|---------|-----------|
| **Eventos imutáveis** | Use `record` para eventos |
| **Eventos assíncronos** | Handlers não devem bloquear |
| **Idempotência** | Handlers devem ser idempotentes |
| **Versioning** | Versione eventos para evolução |
| **DLQ** | Use Dead Letter Queue para falhas |

## Próximos Passos

- [Event-Driven Module](/docs/modulos/event-driven) - Documentação completa
- [CommandBus](/docs/api/command-bus) - Bus de Commands
- [Implementando CQRS](/docs/guias/implementing-cqrs) - Guia completo
