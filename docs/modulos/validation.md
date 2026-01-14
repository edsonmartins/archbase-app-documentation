---
title: archbase-validation
sidebar_position: 7
---

# archbase-validation

O módulo **archbase-validation** fornece validação fluente para regras de negócio complexas, além de suporte completo a **Jakarta Bean Validation**.

## Tipos de Validação

O Archbase suporta dois tipos de validação:

| Tipo | Descrição | Quando Usar |
|------|-----------|-------------|
| **Jakarta Bean Validation** | Validação declarativa com anotações | DTOs, entrada de APIs, validações simples |
| **Archbase Fluent Validation** | Validação programática fluente | Entidades de domínio, regras complexas |

## 1. Jakarta Bean Validation

### Anotações Básicas

| Anotação | Descrição | Exemplo |
|----------|-----------|---------|
| `@NotNull` | Valor não pode ser nulo | `@NotNull private Long id;` |
| `@NotBlank` | String não pode ser nula ou vazia | `@NotBlank private String nome;` |
| `@NotEmpty` | Coleção não pode ser vazia | `@NotEmpty private List<Item> itens;` |
| `@Size` | Tamanho mínimo/máximo | `@Size(min=3, max=100)` |
| `@Min` | Valor mínimo numérico | `@Min(0) private Integer idade;` |
| `@Max` | Valor máximo numérico | `@Max(100) private Integer pontos;` |
| `@Positive` | Número positivo | `@Positive private BigDecimal valor;` |
| `@Negative` | Número negativo | `@Negative private BigDecimal desconto;` |
| `@Pattern` | Expressão regular | `@Pattern(regexp="\\d{11}")` |
| `@Email` | E-mail válido | `@Email private String email;` |
| `@Past` | Data no passado | `@Past private LocalDateTime dataNascimento;` |
| `@Future` | Data no futuro | `@Future private LocalDateTime dataExpiracao;` |
| `@AssertTrue` | Deve ser true | `@AssertTrue private boolean ativo;` |
| `@AssertFalse` | Deve ser false | `@AssertFalse private boolean cancelado;` |

### Exemplo em DTO

```java
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TicketDTO {

    @NotNull(message = "Canal de origem é obrigatório")
    private ChannelType origem;

    @NotBlank(message = "Descrição é obrigatória")
    @Size(min = 10, max = 500, message = "Descrição deve ter entre 10 e 500 caracteres")
    private String descricao;

    @NotNull(message = "Número do motorista é obrigatório")
    private Long numeroMotorista;

    @NotBlank(message = "CPF é obrigatório")
    @Pattern(regexp = "\\d{11}", message = "CPF deve conter 11 dígitos")
    private String cpf;

    @Min(value = 0, message = "Pontuação mínima é 0")
    @Max(value = 100, message = "Pontuação máxima é 100")
    private Integer pontuacao;

    @Email(message = "E-mail inválido")
    private String email;

    @NotEmpty(message = "Lista de itens não pode ser vazia")
    private List<ItemDTO> itens;
}
```

### Validação em Controller

```java
@RestController
@RequestMapping("/api/v1/tickets")
public class TicketController {

    @PostMapping
    public ResponseEntity<TicketDTO> criar(
            @Valid @RequestBody TicketDTO dto,
            BindingResult result) {

        if (result.hasErrors()) {
            throw new ValidationException(result);
        }

        TicketDTO salvo = service.criar(dto);
        return ResponseEntity.ok(salvo);
    }
}
```

**Resposta de Validação:**
```json
{
  "timestamp": "2024-12-28T10:30:00Z",
  "status": 400,
  "error": "Bad Request",
  "message": "Erro de validação",
  "errors": [
    {
      "field": "descricao",
      "message": "Descrição é obrigatória"
    },
    {
      "field": "cpf",
      "message": "CPF deve conter 11 dígitos"
    }
  ]
}
```

### Validações Customizadas

```java
@Target({ElementType.FIELD})
@Retention(RetentionPolicy.RUNTIME)
@Constraint(validatedBy = CpfValidator.class)
public @interface ValidCpf {
    String message() default "CPF inválido";
    Class<?>[] groups() default {};
    Class<? extends Payload>[] payload() default {};
}

public class CpfValidator implements ConstraintValidator<ValidCpf, String> {
    @Override
    public boolean isValid(String cpf, ConstraintValidatorContext context) {
        return CpfValidatorUtils.isValido(cpf);
    }
}
```

## 2. Archbase Fluent Validation

### Instalação

```xml
<dependency>
    <groupId>br.com.archbase</groupId>
    <artifactId>archbase-validation</artifactId>
    <version>${archbase.version}</version>
</dependency>
```

## Validator Fluente

### Validação de Domínio (DDD)

Para entidades de domínio, use o padrão de validação interna:

```java
@DomainAggregateRoot
public class Pneu extends DomainAggregatorBase<Pneu> {

    private String codigoFogo;
    private String marca;
    private Integer vidaRestante;

    @Override
    public ValidationResult validate() {
        return new Pneu.Validator().validate(this);
    }

    static class Validator extends AbstractArchbaseValidator<Pneu> {
        @Override
        public void rules() {
            ruleFor(Pneu::getCodigoFogo)
                .must(not(stringEmptyOrNull()))
                .withMessage("Código de fogo é obrigatório")
                .withFieldName("codigoFogo")
                .critical();

            ruleFor(Pneu::getMarca)
                .must(not(stringEmptyOrNull()))
                .withMessage("Marca é obrigatória")
                .withFieldName("marca")
                .critical();

            ruleFor(Pneu::getVidaRestante)
                .must(isGreaterThan(0))
                .withMessage("Vida restante deve ser maior que zero")
                .withFieldName("vidaRestante")
                .critical();
        }
    }
}
```

### Predicados Disponíveis

| Predicado | Descrição |
|-----------|-----------|
| `not(stringEmptyOrNull())` | String não vazia ou nula |
| `not(nullValue())` | Valor não nulo |
| `isGreaterThan(valor)` | Maior que |
| `isGreaterThanOrEqualTo(valor)` | Maior ou igual a |
| `isLessThan(valor)` | Menor que |
| `isBetween(min, max)` | Entre dois valores |

### Criando um Validator

```java
import br.com.archbase.validation.fluent.*;
import static br.com.archbase.validation.fluent.Predicate.*;

public class ClienteValidator extends AbstractArchbaseValidator<Cliente> {

    @Override
    public ValidationResult validate(Cliente cliente) {
        return Validator.of(cliente)
            .require(Cliente::getNome, isNotBlank(), "Nome é obrigatório")
            .require(Cliente::getNome, lengthBetween(3, 100), "Nome deve ter entre 3 e 100 caracteres")
            .require(Cliente::getEmail, isNotBlank(), "E-mail é obrigatório")
            .require(Cliente::getEmail, isValidEmail(), "E-mail inválido")
            .require(Cliente::getIdade, isGreaterThan(17), "Cliente deve ser maior de idade")
            .getValidationResult();
    }
}
```

### Usando o Validator

```java
@Service
public class ClienteService {

    private final ClienteRepository repository;
    private final ClienteValidator validator;

    public Cliente criar(Cliente cliente) {
        ValidationResult result = validator.validate(cliente);

        if (!result.isValid()) {
            throw new ValidationException(result.getErrors());
        }

        return repository.save(cliente);
    }
}
```

## Predicados Disponíveis

### String Predicates

```java
// Não vazio
require(Cliente::getNome, isNotBlank(), "Nome obrigatório")

// Vazio
require(Cliente::getSobrenome, isEmpty(), "Sobrenome não deve ser informado")

// Tamanho
require(Cliente::getNome, minLength(3), "Mínimo 3 caracteres")
require(Cliente::getNome, maxLength(100), "Máximo 100 caracteres")
require(Cliente::getNome, lengthBetween(3, 100), "Entre 3 e 100 caracteres")

// Padrões
require(Cliente::getEmail, matchesRegex(".+@.+\\..+"), "Email inválido")
require(Cliente::getCpf, matchesRegex("\\d{11}"), "CPF deve ter 11 dígitos")

// Contém
require(Cliente::getNome, containsString("João"), "Deve conter João")

// Começa/Termina com
require(Cliente::getNome, startsWith("Admin"), "Deve começar com Admin")
require(Cliente::getEmail, endsWith("@empresa.com.br"), "Deve ser email corporativo")
```

### Comparable Predicates

```java
// Igual a
require(Produto::getPreco, equalTo(100.0), "Preço deve ser 100")

// Maior/Menor
require(Produto::getPreco, isGreaterThan(0), "Preço deve ser positivo")
require(Cliente::getIdade, isGreaterThanOrEqualTo(18), "Maior de idade")
require(Produto::getEstoque, isLessThan(100), "Estoque máximo é 100")

// Entre
require(Cliente::getIdade, isBetween(18, 65), "Idade entre 18 e 65")
```

### Logical Predicates

```java
// E
require(valor, allOf(isNotNull(), isGreaterThan(0)), "Deve ser positivo")

// Ou
require(Cliente::getStatus, anyOf(equalTo("ATIVO"), equalTo("PENDENTE")), "Status inválido")

// Não
require(Cliente::getEmail, not(containsString("@temp.com")), "Email temporário não permitido")
```

### Null Predicates

```java
require(Cliente::getNome, isNotNull(), "Nome não pode ser nulo")
require(Cliente::getSobrenome, isNull(), "Sobrenome deve ser nulo")
require(Cliente::getEmail, isNotNullOrEmpty(), "Email é obrigatório")
```

## Validation Result

```java
ValidationResult result = validator.validate(cliente);

// Verificar se é válido
if (result.isValid()) {
    // Prosseguir
}

// Obter erros
List<ValidationError> errors = result.getErrors();

// Obter erros por campo
List<String> nomeErrors = result.getErrors("nome");

// Combinar resultados
ValidationResult result1 = validator1.validate(cliente);
ValidationResult result2 = validator2.validate(cliente);
ValidationResult combined = result1.combine(result2);
```

## BusinessRuleValidator

Para regras de negócio complexas:

```java
import br.com.archbase.shared.ddd.validation.BusinessRuleValidator;

public class PedidoBusinessRules {

    public static ValidationResult validarCriacao(Pedido pedido) {
        return BusinessRuleValidator.<Pedido>create()
            .addRule("pedido.semItens",
                () -> !pedido.getItens().isEmpty(),
                "Pedido deve ter ao menos um item")
            .addRule("pedido.valorMinimo",
                () -> pedido.getTotal().isGreaterThanOrEqualTo(Money.reais(50)),
                "Valor mínimo do pedido é R$ 50,00")
            .addRule("pedido.clienteAtivo",
                () -> clienteRepository.findById(pedido.getClienteId())
                    .map(Cliente::isAtivo)
                    .orElse(false),
                "Cliente deve estar ativo")
            .validate(pedido);
    }
}
```

## @ValidBusinessRules

Anotação para validação automática:

```java
@Entity
@DomainEntity
public class Pedido extends AggregateRoot<Pedido, UUID> {

    @ValidBusinessRules
    private final List<BusinessRule<Pedido>> rules = List.of(
        new PedidoSemItensRule(),
        new ValorMinimoRule(),
        new ClienteAtivoRule()
    );
}
```

## Testes de Validação

```java
@Test
void deveValidarCliente() {
    Cliente cliente = new Cliente();
    cliente.setEmail("email-invalido");

    ValidationResult result = validator.validate(cliente);

    assertThat(result.isValid()).isFalse();
    assertThat(result.getErrors("email"))
        .containsExactly("E-mail inválido");
}
```

## Próximos Passos

- [Validation Module Docs](https://github.com/archbase-framework/archbase-validation) - Documentação completa
- [BusinessRuleValidator](/docs/modulos/archbase-shared-kernel) - Validator no shared-kernel
