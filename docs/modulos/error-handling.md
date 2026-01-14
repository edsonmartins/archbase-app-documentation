---
title: archbase-error-handling
sidebar_position: 12
---

# archbase-error-handling

Módulo para **tratamento centralizado de erros** com respostas REST padronizadas.

## Instalação

```xml
<dependency>
    <groupId>br.com.archbase</groupId>
    <artifactId>archbase-error-handling</artifactId>
    <version>${archbase.version}</version>
</dependency>
```

## Configuração

```yaml
archbase:
  error-handling:
    enabled: true
    include-stack-trace: false  # Em produção, use false
    include-message: always
```

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

## Usando as Exceções

### ResourceNotFoundException

```java
@GetMapping("/{id}")
public Produto buscar(@PathVariable UUID id) {
    return produtoRepository.findById(id)
        .orElseThrow(() -> new ResourceNotFoundException("Produto não encontrado", id));
}
```

**Resposta:**
```json
{
  "timestamp": "2023-12-28T10:30:00Z",
  "status": 404,
  "error": "Not Found",
  "message": "Produto não encontrado",
  "path": "/api/produtos/123"
}
```

### ValidationException

```java
public void criar(Cliente cliente) {
    ValidationResult result = cliente.validate();

    if (!result.isValid()) {
        throw new ValidationException("Erro de validação", result.getErrors());
    }

    repository.save(cliente);
}
```

**Resposta:**
```json
{
  "timestamp": "2023-12-28T10:30:00Z",
  "status": 400,
  "error": "Bad Request",
  "message": "Erro de validação",
  "errors": [
    {
      "field": "nome",
      "message": "Nome é obrigatório"
    },
    {
      "field": "email",
      "message": "E-mail inválido"
    }
  ]
}
```

### BusinessRuleException

```java
public void confirmarPedido(UUID pedidoId) {
    Pedido pedido = buscarPedido(pedidoId);

    if (pedido.getItens().isEmpty()) {
        throw new BusinessRuleException(
            "Pedido não pode ser confirmado sem itens",
            "PEDIDO_SEM_ITENS"
        );
    }

    pedido.confirmar();
}
```

**Resposta:**
```json
{
  "timestamp": "2023-12-28T10:30:00Z",
  "status": 422,
  "error": "Unprocessable Entity",
  "message": "Pedido não pode ser confirmado sem itens",
  "code": "PEDIDO_SEM_ITENS"
}
```

## Exceções Customizadas

```java
public class EstoqueInsuficienteException extends BusinessRuleException {

    public EstoqueInsuficienteException(UUID produtoId, int solicitado, int disponivel) {
        super(
            String.format("Produto %s: solicitado=%d, disponível=%d",
                produtoId, solicitado, disponivel),
            "ESTOQUE_INSUFICIENTE"
        );
    }
}
```

## Error Handler Global

```java
@RestControllerAdvice
public class GlobalExceptionHandler {

    @ExceptionHandler(ResourceNotFoundException.class)
    public ResponseEntity<ErrorResponse> handleNotFound(ResourceNotFoundException ex) {
        return ResponseEntity
            .status(HttpStatus.NOT_FOUND)
            .body(new ErrorResponse(
                LocalDateTime.now(),
                HttpStatus.NOT_FOUND.value(),
                "Not Found",
                ex.getMessage()
            ));
    }

    @ExceptionHandler(ValidationException.class)
    public ResponseEntity<ValidationErrorResponse> handleValidation(ValidationException ex) {
        return ResponseEntity
            .status(HttpStatus.BAD_REQUEST)
            .body(new ValidationErrorResponse(
                LocalDateTime.now(),
                HttpStatus.BAD_REQUEST.value(),
                "Bad Request",
                ex.getMessage(),
                ex.getErrors()
            ));
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<ErrorResponse> handleGeneric(Exception ex) {
        return ResponseEntity
            .status(HttpStatus.INTERNAL_SERVER_ERROR)
            .body(new ErrorResponse(
                LocalDateTime.now(),
                HttpStatus.INTERNAL_SERVER_ERROR.value(),
                "Internal Server Error",
                "Ocorreu um erro inesperado"
            ));
    }
}
```

## Resposta de Erro Padrão

```java
public class ErrorResponse {

    private LocalDateTime timestamp;
    private int status;
    private String error;
    private String message;
    private String path;
    private Map<String, Object> details;
}
```

## Propagação de Contexto

Erros incluem informações de contexto quando disponível:

```json
{
  "timestamp": "2023-12-28T10:30:00Z",
  "status": 404,
  "error": "Not Found",
  "message": "Produto não encontrado",
  "path": "/api/produtos/123",
  "correlationId": "abc123-def456"
}
```

## Log de Erros

Erros são automaticamente logados com nível apropriado:

```java
@ExceptionHandler(Exception.class)
public ResponseEntity<ErrorResponse> handle(Exception ex) {
    // Log automático com ERROR
    logger.error("Erro não tratado", ex);

    return ResponseEntity
        .status(HttpStatus.INTERNAL_SERVER_ERROR)
        .body(new ErrorResponse(...));
}
```

## Solução de Problemas

### Mensagens de Erro Expostas

Em produção, oculte stack traces:

```yaml
archbase:
  error-handling:
    include-stack-trace: false  # false em produção
```

### Erros Não Localizados

Para suporte a internacionalização:

```java
@ExceptionHandler(BusinessRuleException.class)
public ResponseEntity<ErrorResponse> handle(BusinessRuleException ex, Locale locale) {
    String message = messageSource.getMessage(
        ex.getCode(),
        ex.getArgs(),
        locale,
        ex.getDefaultMessage()
    );

    return ResponseEntity
        .status(HttpStatus.UNPROCESSABLE_ENTITY)
        .body(new ErrorResponse(...));
}
```

---

## Anotações Customizadas

O Archbase oferece anotações para personalizar respostas de erro:

### @ArchbaseResponseErrorCode

Define um código de erro customizado para exceções:

```java
@ArchbaseResponseErrorCode("PRODUTO_NAO_ENCONTRADO")
public class ProdutoNotFoundException extends ArchbaseRuntimeException {

    public ProdutoNotFoundException(UUID id) {
        super(HttpStatus.NOT_FOUND, "Produto não encontrado: " + id);
    }
}
```

**Resposta:**
```json
{
  "code": "PRODUTO_NAO_ENCONTRADO",
  "message": "Produto não encontrado: 123e4567-e89b-12d3-a456-426614174000",
  "status": 404
}
```

### @ArchbaseResponseErrorProperty

Adiciona propriedades customizadas na resposta de erro:

```java
@ArchbaseResponseErrorCode("ESTOQUE_INSUFICIENTE")
public class EstoqueInsuficienteException extends ArchbaseRuntimeException {

    @ArchbaseResponseErrorProperty
    private UUID produtoId;

    @ArchbaseResponseErrorProperty
    private int quantidadeSolicitada;

    @ArchbaseResponseErrorProperty
    private int quantidadeDisponivel;

    public EstoqueInsuficienteException(UUID produtoId, int solicitada, int disponivel) {
        super(HttpStatus.UNPROCESSABLE_ENTITY, "Estoque insuficiente");
        this.produtoId = produtoId;
        this.quantidadeSolicitada = solicitada;
        this.quantidadeDisponivel = disponivel;
    }
}
```

**Resposta:**
```json
{
  "code": "ESTOQUE_INSUFICIENTE",
  "message": "Estoque insuficiente",
  "produtoId": "123e4567-e89b-12d3-a456-426614174000",
  "quantidadeSolicitada": 100,
  "quantidadeDisponivel": 50,
  "status": 422
}
```

---

## Classes de Resposta

O framework fornece classes padronizadas para respostas de erro:

### ArchbaseApiErrorResponse

Resposta de erro principal:

```java
public class ArchbaseApiErrorResponse {

    private LocalDateTime timestamp;
    private int status;
    private String error;
    private String message;
    private String code;
    private String path;
    private List<ArchbaseApiFieldError> fieldErrors;
    private List<ArchbaseApiGlobalError> globalErrors;
}
```

### ArchbaseApiFieldError

Erro específico de campo:

```java
public class ArchbaseApiFieldError {

    private String field;
    private String message;
    private String code;
    private Object rejectedValue;
}
```

**Exemplo:**
```json
{
  "field": "email",
  "message": "E-mail inválido",
  "code": "EMAIL_INVALIDO",
  "rejectedValue": "invalid-email"
}
```

### ArchbaseApiGlobalError

Erro global (não associado a um campo específico):

```java
public class ArchbaseApiGlobalError {

    private String code;
    private String message;
    private Map<String, Object> details;
}
```

---

## Handlers Específicos

O framework fornece handlers especializados para diferentes tipos de exceção:

### SpringValidationArchbaseApiExceptionHandler

Trata exceções de validação do Spring:

```java
// Trata automaticamente:
// - MethodArgumentNotValidException (@Valid falha)
// - HttpMessageNotReadableException (JSON inválido)
// - MethodArgumentTypeMismatchException (tipo incorreto)
```

**Exemplo de resposta:**
```json
{
  "fieldErrors": [
    {
      "field": "email",
      "message": "must be a well-formed email address"
    },
    {
      "field": "idade",
      "message": "must be greater than or equal to 18"
    }
  ]
}
```

### SpringSecurityArchbaseApiExceptionHandler

Trata exceções do Spring Security:

```java
// Trata automaticamente:
// - AccessDeniedException (sem permissão)
// - BadCredentialsException (credenciais inválidas)
// - AccountExpiredException (conta expirada)
// - LockedException (conta bloqueada)
```

### ObjectOptimisticLockingFailureArchbaseApiExceptionHandler

Trata conflitos de optimistic locking:

```java
// Trata: ObjectOptimisticLockingFailureException
```

**Resposta:**
```json
{
  "code": "OPTIMISTIC_LOCK_ERROR",
  "message": "Este registro foi modificado por outro usuário. Por favor, atualize e tente novamente.",
  "status": 409
}
```

### TypeMismatchArchbaseApiExceptionHandler

Trata erros de tipo de parâmetro:

```java
// Trata: TypeMismatchException
```

**Resposta:**
```json
{
  "code": "TYPE_MISMATCH",
  "message": "Parâmetro 'idade' deve ser do tipo Integer",
  "status": 400
}
```

### SimpleFallbackApiExceptionHandler

Handler fallback para exceções não tratadas:

```java
// Captura qualquer exceção não tratada por outros handlers
// Retorna status 500 com mensagem genérica em produção
```

---

## ArchbaseRuntimeException

Exceção base para exceções customizadas:

```java
public class MinhaExceptionCustomizada extends ArchbaseRuntimeException {

    public MinhaExceptionCustomizada(String message) {
        super(HttpStatus.BAD_REQUEST, message);
    }

    public MinhaExceptionCustomizada(String code, String message) {
        super(code, message);
    }

    public MinhaExceptionCustomizada(String code, String message, Throwable cause) {
        super(code, message, cause);
    }
}
```

**Construtores disponíveis:**

```java
// Apenas mensagem
new ArchbaseRuntimeException("Erro ocorreu");

// Com HTTP status
new ArchbaseRuntimeException(HttpStatus.NOT_FOUND, "Não encontrado");

// Com código customizado
new ArchbaseRuntimeException("CODIGO_ERRO", "Mensagem detalhada");

// Com causa
new ArchbaseRuntimeException("CODIGO_ERRO", "Mensagem", exception);

// Com internacionalização
new ArchbaseRuntimeException("codigo.i18n", messageSource, locale);
```

---

## Próximos Passos

- [Guias: Error Handling](/docs/guias/error-handling) - Padrões avançados
- [Validation](/docs/modulos/validation) - Validação de regras
