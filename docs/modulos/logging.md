---
title: archbase-logging
sidebar_position: 9
---

# archbase-logging

Módulo para **logging estruturado** com suporte a correlation ID e MDC (Mapped Diagnostic Context).

## Instalação

```xml
<dependency>
    <groupId>br.com.archbase</groupId>
    <artifactId>archbase-logging</artifactId>
    <version>${archbase.version}</version>
</dependency>
```

## Configuração

```yaml
archbase:
  logging:
    enabled: true
    structured: true
    correlation:
      header-name: X-Correlation-Id
      mdc-key: correlationId
    level:
      default: INFO
      packages:
        com.minhaempresa: DEBUG
        br.com.archbase: INFO
```

## StructuredLogger

Logger estruturado com campos nomeados:

```java
import br.com.archbase.logging.StructuredLogger;
import org.springframework.stereotype.Service;

@Service
public class PedidoService {

    private static final StructuredLogger log = StructuredLogger.getLogger(PedidoService.class);

    public void criarPedido(Pedido pedido) {
        log.info("Criando pedido")
            .field("pedidoId", pedido.getId())
            .field("clienteId", pedido.getClienteId())
            .field("valor", pedido.getTotal())
            .log();

        // ...
    }
}
```

**Saída formatada (JSON):**
```json
{
  "timestamp": "2023-12-28T10:30:00Z",
  "level": "INFO",
  "logger": "com.minhaempresa.PedidoService",
  "message": "Criando pedido",
  "correlationId": "abc123-def456",
  "pedidoId": "123e4567-e89b-12d3-a456-426614174000",
  "clienteId": "456e7890-e89b-12d3-a456-426614174000",
  "valor": 150.00
}
```

## Níveis de Log

```java
// Trace (mais detalhado)
log.trace("Entrando no método").field("param", value).log();

// Debug
log.debug("Processando item").field("itemId", id).log();

// Info
log.info("Pedido criado").field("pedidoId", id).log();

// Warning
log.warn("Estoque baixo")
    .field("produtoId", produtoId)
    .field("estoque", estoque)
    .log();

// Error
log.error("Erro ao processar pagamento")
    .field("pedidoId", pedidoId)
    .exception(e)
    .log();
```

## Correlation ID

### Propagação Automática

O correlation ID é propagado automaticamente através de:

1. **Headers HTTP**: `X-Correlation-Id`
2. **MDC**: `correlationId`
3. **Mensageria**: Headers de mensagens

### Gerar Novo Correlation ID

```java
@RestController
@RequestMapping("/api/pedidos")
public class PedidoController {

    private final StructuredLogger log = StructuredLogger.getLogger(PedidoController.class);

    @PostMapping
    public ResponseEntity<Pedido> criar(@RequestBody CriarPedidoRequest request) {
        // Se não existir correlation ID, gera um novo
        CorrelationIdContext.generateIfAbsent();

        log.info("Recebida requisição de criação de pedido")
            .field("clienteId", request.getClienteId())
            .log();

        Pedido pedido = pedidoService.criar(request);

        return ResponseEntity.ok(pedido);
    }
}
```

### Obter Correlation ID Atual

```java
String correlationId = CorrelationIdContext.getCorrelationId();
```

## Contexto Estruturado

### Adicionar Campos ao Contexto

```java
log.info("Processando pedido")
    .field("pedidoId", pedido.getId())
    .field("clienteId", pedido.getClienteId())
    .field("valorTotal", pedido.getTotal())
    .field("itens", pedido.getItens().size())
    .log();
```

### Objetos Aninhados

```java
log.info("Dados do cliente")
    .field("cliente", Map.of(
        "id", cliente.getId(),
        "nome", cliente.getNome(),
        "email", cliente.getEmail()
    ))
    .log();
```

## Markers

Adicione marcadores para filtros:

```java
import static br.com.archbase.logging.Markers.*;

// Marker de auditoria
log.info(AUDIT, "Usuário logado")
    .field("usuario", username)
    .field("ip", request.getRemoteAddr())
    .log();

// Marker de performance
log.info(PERFORMANCE, "Tempo de execução")
    .field("operacao", "criarPedido")
    .field("tempoMs", System.currentTimeMillis() - inicio)
    .log();

// Marker de segurança
log.warn(SECURITY, "Tentativa de acesso inválida")
    .field("usuario", username)
    .field("recurso", recurso)
    .log();
```

## Configuração Logback

```xml
<configuration>
    <appender name="CONSOLE" class="ch.qos.logback.core.ConsoleAppender">
        <encoder class="net.logstash.logback.encoder.LogstashEncoder">
            <includeMdcKeyName>correlationId</includeMdcKeyName>
            <includeStructuredArguments>true</includeStructuredArguments>
        </encoder>
    </appender>

    <appender name="FILE" class="ch.qos.logback.core.rolling.RollingFileAppender">
        <file>logs/application.log</file>
        <rollingPolicy class="ch.qos.logback.core.rolling.TimeBasedRollingPolicy">
            <fileNamePattern>logs/application-%d{yyyy-MM-dd}.log</fileNamePattern>
        </rollingPolicy>
        <encoder class="net.logstash.logback.encoder.LogstashEncoder">
            <includeMdcKeyName>correlationId</includeMdcKeyName>
        </encoder>
    </appender>

    <root level="INFO">
        <appender-ref ref="CONSOLE" />
        <appender-ref ref="FILE" />
    </root>
</configuration>
```

## Métricas de Logging

Integração com Micrometer:

```yaml
archbase:
  logging:
    metrics:
      enabled: true
```

Métricas disponíveis:
- `logback.events`: Contagem de logs por nível
- `logback.errors`: Contagem de erros de log

## Próximos Passos

- [Observabilidade](/docs/category/observabilidade) - Métricas e tracing
- [archbase-event-driven](/docs/modulos/event-driven) - Métricas de CQRS
