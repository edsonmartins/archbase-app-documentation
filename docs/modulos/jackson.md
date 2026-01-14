---
title: archbase-jackson
sidebar_position: 14
---

# archbase-jackson

Módulo Jackson para **serialização otimizada de Value Objects**.

## Instalação

```xml
<dependency>
    <groupId>br.com.archbase</groupId>
    <artifactId>archbase-jackson</artifactId>
    <version>${archbase.version}</version>
</dependency>
```

## Configuração

```yaml
archbase:
  jackson:
    enabled: false  # Desabilitado por padrão
```

## Funcionalidade

Detecta automaticamente Value Objects com um único campo e os serializa como o valor direto:

```java
// Sem módulo: {"cpf": {"numero": "123.456.789-09"}}
// Com módulo:  {"cpf": "123.456.789-09"}
```

## Requisitos

O módulo detecta Value Objects que atendem a um dos critérios:

1. Implementam a interface `ValueObject` do Archbase
2. Possuem anotação `@DomainValueObject`
3. São classes imutáveis (`final`) com um único campo privado final

## Exemplos

### Value Object Simples

```java
@DomainValueObject
public class CPF {

    private final String numero;

    public CPF(String numero) {
        this.numero = Objects.requireNonNull(numero);
    }

    public String getNumero() {
        return numero;
    }
}
```

### Serialização Automática

```java
@Service
public class ClienteService {

    private final ObjectMapper mapper;

    public String toJson(Cliente cliente) {
        // CPF é serializado como String direta
        return mapper.writeValueAsString(cliente);
    }
}
```

### Desserialização

O módulo também suporta desserialização automática:

```java
// JSON: {"cpf": "123.456.789-09"}
// Desserializado para: new CPF("123.456.789-09")
```

Para isso, o Value Object deve ter:
- Um construtor com um parâmetro, OU
- Um método estático `of()` ou `from()`

```java
@DomainValueObject
public class CPF {

    private final String numero;

    public CPF(String numero) {
        this.numero = numero;
    }

    // Método factory (opcional)
    public static CPF of(String numero) {
        return new CPF(numero);
    }
}
```

## Configuração Manual

```java
@Configuration
public class JacksonConfig {

    @Bean
    public ObjectMapper objectMapper() {
        ObjectMapper mapper = new ObjectMapper();
        mapper.registerModule(new ArchbaseJacksonModule());
        return mapper;
    }
}
```

## Integração com archbase-identifier

Os módulos trabalham juntos para serialização otimizada:

```java
@Entity
public class Pedido {

    @ArchbaseIdentifier
    private PedidoId id;

    private CPF cpfCliente;  // Value Object serializado como String
}

// JSON resultante:
// {"id": "123e4567-e89b-12d3-a456-426614174000", "cpfCliente": "123.456.789-09"}
```

## Exemplos de Value Objects

### Email

```java
@DomainValueObject
public class Email {

    private final String endereco;

    public Email(String endereco) {
        if (!endereco.matches(".+@.+\\..+")) {
            throw new IllegalArgumentException("E-mail inválido");
        }
        this.endereco = endereco;
    }

    public static Email of(String endereco) {
        return new Email(endereco);
    }
}
```

### Monetário

```java
@DomainValueObject
public class Dinheiro {

    private final BigDecimal valor;

    public Dinheiro(BigDecimal valor) {
        this.valor = valor != null ? value : BigDecimal.ZERO;
    }

    public static Dinheiro of(BigDecimal valor) {
        return new Dinheiro(valor);
    }
}
```

## Limitações

- Funciona apenas para Value Objects com **um único campo**
- O construtor ou método factory deve aceitar o valor diretamente
- Campos sintéticos do Lombok são ignorados automaticamente

## Solução de Problemas

### Value Object Não É Serializado Como Valor

Verifique se o módulo está habilitado:

```yaml
archbase:
  jackson:
    enabled: true
```

### Erro de Desserialização

Adicione um construtor ou método factory:

```java
@DomainValueObject
public class MeuVO {

    private final String valor;

    // Opção 1: Construtor
    public MeuVO(String valor) {
        this.valor = valor;
    }

    // Opção 2: Método factory
    public static MeuVO of(String valor) {
        return new MeuVO(valor);
    }
}
```

## Próximos Passos

- [archbase-identifier](/docs/modulos/identifier) - Identificadores
- [archbase-value-objects](/docs/modulos/value-objects) - Value Objects comuns
