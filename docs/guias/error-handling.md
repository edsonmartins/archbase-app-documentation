---
title: Tratamento de Erros
sidebar_position: 5
---

# Tratamento de Erros

O Archbase fornece um sistema centralizado de tratamento de erros com exceções e respostas padronizadas.

## Exceções do Framework

| Exceção | HTTP Status | Quando Usar |
|----------|-------------|-------------|
| `ResourceNotFoundException` | 404 | Recurso não encontrado |
| `ValidationException` | 400 | Erro de validação |
| `BusinessRuleException` | 422 | Violação de regra de negócio |
| `ConflictException` | 409 | Conflito de dados |
| `UnauthorizedException` | 401 | Não autenticado |
| `ForbiddenException` | 403 | Sem permissão |
| `ArchbaseException` | 500 | Erro genérico |

## Exceções de Domínio

### ResourceNotFoundException

```java
@Service
public class ClienteService {

    private final ClienteRepository repository;

    public Cliente buscarPorId(UUID id) {
        return repository.findById(id)
            .orElseThrow(() -> new ResourceNotFoundException(
                "Cliente não encontrado",
                id
            ));
    }
}
```

**Resposta:**
```json
{
  "timestamp": "2024-12-28T10:30:00Z",
  "status": 404,
  "error": "Not Found",
  "message": "Cliente não encontrado",
  "path": "/api/v1/clientes/123",
  "resourceId": "123"
}
```

### ValidationException

```java
@Service
public class PedidoService {

    public void criar(Pedido pedido) {
        ValidationResult result = pedido.validate();

        if (!result.isValid()) {
            throw new ValidationException(
                "Erro de validação do pedido",
                result.getErrors()
            );
        }

        repository.save(pedido);
    }
}
```

**Resposta:**
```json
{
  "timestamp": "2024-12-28T10:30:00Z",
  "status": 400,
  "error": "Bad Request",
  "message": "Erro de validação do pedido",
  "errors": [
    {
      "field": "clienteId",
      "message": "Cliente é obrigatório"
    },
    {
      "field": "itens",
      "message": "Pedido deve ter ao menos um item"
    }
  ]
}
```

### BusinessRuleException

```java
@Service
public class CaixaService {

    public void fecharCaixa(UUID caixaId, UUID operadorId) {
        Caixa caixa = caixaRepository.findById(caixaId)
            .orElseThrow(() -> new ResourceNotFoundException("Caixa", caixaId));

        if (!caixa.podeSerFechado()) {
            throw new BusinessRuleException(
                "Caixa não pode ser fechado",
                "CAIXA_ABERTO",
                Map.of("status", caixa.getStatus(), "saldo", caixa.getSaldo())
            );
        }

        caixa.fechar(operadorId);
        caixaRepository.save(caixa);
    }
}
```

**Resposta:**
```json
{
  "timestamp": "2024-12-28T10:30:00Z",
  "status": 422,
  "error": "Unprocessable Entity",
  "message": "Caixa não pode ser fechado",
  "code": "CAIXA_ABERTO",
  "details": {
    "status": "ABERTO",
    "saldo": 150.00
  }
}
```

### ConflictException

```java
@Service
public class UsuarioService {

    public Usuario criar(Usuario usuario) {
        if (repository.existsByEmail(usuario.getEmail())) {
            throw new ConflictException(
                "Já existe um usuário com este e-mail",
                "EMAIL_DUPLICADO",
                "email"
            );
        }
        return repository.save(usuario);
    }
}
```

## Exceções Customizadas

```java
package com.exemplo.domain.exception;

public class EstoqueInsuficienteException extends BusinessRuleException {

    public EstoqueInsuficienteException(UUID produtoId, int solicitado, int disponivel) {
        super(
            String.format("Estoque insuficiente para o produto %s: solicitado=%d, disponível=%d",
                produtoId, solicitado, disponivel),
            "ESTOQUE_INSUFICIENTE",
            Map.of(
                "produtoId", produtoId,
                "solicitado", solicitado,
                "disponivel", disponivel
            )
        );
    }
}
```

## Global Exception Handler

```java
@RestControllerAdvice
public class GlobalExceptionHandler {

    private static final Logger logger = LoggerFactory.getLogger(GlobalExceptionHandler.class);

    @ExceptionHandler(ResourceNotFoundException.class)
    public ResponseEntity<ErrorResponse> handleNotFound(
            ResourceNotFoundException ex,
            HttpServletRequest request) {

        ErrorResponse response = ErrorResponse.builder()
            .timestamp(Instant.now())
            .status(HttpStatus.NOT_FOUND.value())
            .error("Not Found")
            .message(ex.getMessage())
            .path(request.getRequestURI())
            .resourceId(ex.getResourceId())
            .build();

        return ResponseEntity.status(HttpStatus.NOT_FOUND).body(response);
    }

    @ExceptionHandler(ValidationException.class)
    public ResponseEntity<ValidationErrorResponse> handleValidation(
            ValidationException ex,
            HttpServletRequest request) {

        ValidationErrorResponse response = ValidationErrorResponse.builder()
            .timestamp(Instant.now())
            .status(HttpStatus.BAD_REQUEST.value())
            .error("Bad Request")
            .message(ex.getMessage())
            .path(request.getRequestURI())
            .errors(ex.getErrors())
            .build();

        return ResponseEntity.badRequest().body(response);
    }

    @ExceptionHandler(BusinessRuleException.class)
    public ResponseEntity<ErrorResponse> handleBusinessRule(
            BusinessRuleException ex,
            HttpServletRequest request) {

        ErrorResponse response = ErrorResponse.builder()
            .timestamp(Instant.now())
            .status(HttpStatus.UNPROCESSABLE_ENTITY.value())
            .error("Unprocessable Entity")
            .message(ex.getMessage())
            .path(request.getRequestURI())
            .code(ex.getCode())
            .details(ex.getDetails())
            .build();

        return ResponseEntity.unprocessableEntity().body(response);
    }

    @ExceptionHandler(ConflictException.class)
    public ResponseEntity<ErrorResponse> handleConflict(
            ConflictException ex,
            HttpServletRequest request) {

        ErrorResponse response = ErrorResponse.builder()
            .timestamp(Instant.now())
            .status(HttpStatus.CONFLICT.value())
            .error("Conflict")
            .message(ex.getMessage())
            .path(request.getRequestURI())
            .code(ex.getCode())
            .field(ex.getField())
            .build();

        return ResponseEntity.status(HttpStatus.CONFLICT).body(response);
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ValidationErrorResponse> handleMethodArgumentNotValid(
            MethodArgumentNotValidException ex,
            HttpServletRequest request) {

        List<ValidationError> errors = ex.getBindingResult()
            .getFieldErrors()
            .stream()
            .map(error -> ValidationError.builder()
                .field(error.getField())
                .message(error.getDefaultMessage())
                .rejectedValue(error.getRejectedValue())
                .build())
            .toList();

        ValidationErrorResponse response = ValidationErrorResponse.builder()
            .timestamp(Instant.now())
            .status(HttpStatus.BAD_REQUEST.value())
            .error("Bad Request")
            .message("Erro de validação")
            .path(request.getRequestURI())
            .errors(errors)
            .build();

        return ResponseEntity.badRequest().body(response);
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<ErrorResponse> handleGeneric(
            Exception ex,
            HttpServletRequest request) {

        logger.error("Erro não tratado", ex);

        ErrorResponse response = ErrorResponse.builder()
            .timestamp(Instant.now())
            .status(HttpStatus.INTERNAL_SERVER_ERROR.value())
            .error("Internal Server Error")
            .message("Ocorreu um erro inesperado")
            .path(request.getRequestURI())
            .build();

        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
    }
}
```

## Error Response DTOs

```java
@Data
@Builder
public class ErrorResponse {
    private Instant timestamp;
    private Integer status;
    private String error;
    private String message;
    private String path;
    private String code;
    private String field;
    private String resourceId;
    private Map<String, Object> details;
}

@Data
@Builder
public class ValidationErrorResponse extends ErrorResponse {
    private List<ValidationError> errors;
}

@Data
@Builder
public class ValidationError {
    private String field;
    private String message;
    private Object rejectedValue;
}
```

## Configuração

```yaml
archbase:
  error-handling:
    enabled: true
    include-stack-trace: false  # false em produção
    include-message: always
    log-errors: true
```

## Testando Exceções

```java
@SpringBootTest
class PedidoServiceTest {

    @Autowired
    private PedidoService pedidoService;

    @Test
    void deveLancarExcecaoQuandoPedidoSemItens() {
        // Arrange
        CriarPedidoCommand command = new CriarPedidoCommand(
            clienteId,
            List.of() // sem itens
        );

        // Act & Assert
        assertThatThrownBy(() -> pedidoService.criar(command))
            .isInstanceOf(BusinessRuleException.class)
            .hasMessageContaining("Pedido deve ter ao menos um item");
    }

    @Test
    void deveLancarExcecaoQuandoClienteNaoEncontrado() {
        assertThatThrownBy(() -> pedidoService.criar(
            new CriarPedidoCommand(UUID.randomUUID(), List.of())
        ))
            .isInstanceOf(ResourceNotFoundException.class)
            .hasMessageContaining("Cliente não encontrado");
    }
}
```

## Boas Práticas

| Prática | Descrição |
|---------|-----------|
| **Exceções específicas** | Use exceções de domínio específicas |
| **Mensagens claras** | Mensagens que ajudam o cliente a entender o erro |
| **Códigos de erro** | Use códigos para tratamento programático |
| **Log de erros** | Sempre logue erros não tratados |
| **Não exponha stack** | Em produção, oculte stack traces |

## Próximos Passos

- [Error Handling Module](/docs/modulos/error-handling) - Documentação completa
- [Validation](/docs/modulos/validation) - Validação de regras
- [Testing](/docs/guias/testing) - Testando exceções
