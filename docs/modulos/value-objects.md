---
title: archbase-value-objects
sidebar_position: 10
---

# archbase-value-objects

Módulo com **Value Objects** comuns para uso em aplicações DDD.

## Instalação

```xml
<dependency>
    <groupId>br.com.archbase</groupId>
    <artifactId>archbase-value-objects</artifactId>
    <version>${archbase.version}</version>
</dependency>
```

## Value Objects Disponíveis

### CPF

```java
import br.com.archbase.valueobject.document.CPF;

// Criar
CPF cpf = new CPF("12345678900");

// Validar automaticamente
try {
    CPF cpfInvalido = new CPF("00000000000");
} catch (IllegalArgumentException e) {
    // "CPF inválido"
}

// Obter valor formatado
String formatado = cpf.getNumeroFormatado(); // "123.456.789-00"

// Comparação
CPF cpf1 = new CPF("12345678900");
CPF cpf2 = new CPF("12345678900");
cpf1.equals(cpf2); // true
```

### CNPJ

```java
import br.com.archbase.valueobject.document.CNPJ;

// Criar
CNPJ cnpj = new CNPJ("12345678000190");

// Validar automaticamente
try {
    CNPJ cnpjInvalido = new CNPJ("00000000000000");
} catch (IllegalArgumentException e) {
    // "CNPJ inválido"
}

// Obter valor formatado
String formatado = cnpj.getNumeroFormatado(); // "12.345.678/0001-90"
```

### EmailAddress

```java
import br.com.archbase.valueobject.contact.EmailAddress;

// Criar
EmailAddress email = new EmailAddress("usuario@exemplo.com");

// Valida automática
try {
    EmailAddress invalido = new EmailAddress("nao-email");
} catch (IllegalArgumentException e) {
    // "E-mail inválido"
}

// Obter partes
String endereco = email.getEndereco(); // "usuario@exemplo.com"
String usuario = email.getUsuario(); // "usuario"
String dominio = email.getDominio(); // "exemplo.com"

// Normalização
EmailAddress email2 = new EmailAddress("USUARIO@EXEMPLO.COM");
email2.getEndereco(); // "usuario@exemplo.com" (minúsculas)
```

### Telefone

```java
import br.com.archbase.valueobject.contact.Telefone;

// Criar
Telefone telefone = new Telefone("(11) 99999-9999");

// Formatar
String formatado = telefone.getNumeroFormatado(); // "(11) 99999-9999"

// Obter apenas dígitos
String digitos = telefone.getDigitos(); // "11999999999"

// Tipo
TipoTelefone tipo = telefone.getTipo(); // CELULAR, FIXO, etc.
```

### Endereco

```java
import br.com.archbase.valueobject.address.Endereco;
import br.com.archbase.valueobject.address.Endereco.EnderecoBuilder;

// Usando Builder
Endereco endereco = Endereco.builder()
    .rua("Av. Paulista")
    .numero("1000")
    .complemento("Sala 101")
    .bairro("Bela Vista")
    .cidade("São Paulo")
    .estado("SP")
    .cep("01310-100")
    .build();

// Obter valores
endereco.getRua(); // "Av. Paulista"
endereco.getCep().getNumero(); // "01310100"

// Endereço completo
endereco.getEnderecoCompleto(); // "Av. Paulista, 1000 - Sala 101"
```

## Usando em Entidades

```java
@Entity
@DomainEntity
public class Cliente extends PersistenceEntityBase<Cliente, UUID> {

    private String nome;

    @Embedded
    private CPF cpf;

    @Embedded
    private EmailAddress email;

    @Embedded
    private Telefone telefone;

    @Embedded
    private Endereco endereco;

    public void alterarEmail(EmailAddress novoEmail) {
        this.email = novoEmail;
    }

    public boolean getEmailDominio() {
        return email.getDominio();
    }
}
```

## Criando Value Objects Customizados

Use `BaseValueObject` como base:

```java
import br.com.archbase.shared.ddd.valueobject.BaseValueObject;
import java.util.Objects;

public class Dinheiro extends BaseValueObject {

    private final BigDecimal valor;
    private final String moeda;

    public Dinheiro(BigDecimal valor, String moeda) {
        if (valor.compareTo(BigDecimal.ZERO) < 0) {
            throw new IllegalArgumentException("Valor não pode ser negativo");
        }
        this.valor = valor.setScale(2, RoundingMode.HALF_EVEN);
        this.moeda = moeda;
    }

    public static Dinheiro reais(BigDecimal valor) {
        return new Dinheiro(valor, "BRL");
    }

    public Dinheiro somar(Dinheiro outro) {
        if (!this.moeda.equals(outro.moeda)) {
            throw new IllegalArgumentException("Não pode somar moedas diferentes");
        }
        return new Dinheiro(this.valor.add(outro.valor), this.moeda);
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (o == null || getClass() != o.getClass()) return false;
        Dinheiro dinheiro = (Dinheiro) o;
        return Objects.equals(valor, dinheiro.valor) &&
               Objects.equals(moeda, dinheiro.moeda);
    }

    @Override
    public int hashCode() {
        return Objects.hash(valor, moeda);
    }

    @Override
    public String toString() {
        return String.format("%s %s", moeda, valor);
    }
}
```

## JPA Embeddable

Os VOs são `@Embeddable` por padrão:

```java
@Embeddable
public class CPF extends BaseValueObject {
    // Implementação...
}
```

Isso permite armazená-los diretamente na entidade:

```java
@Entity
public class Cliente {
    @Embedded
    private CPF cpf;  // Colunas: cpf_numero, cpf_digitoVerificador
}
```

## Testando Value Objects

```java
@Test
void deveCriarCPFValido() {
    CPF cpf = new CPF("12345678900");
    assertThat(cpf.getNumero()).isEqualTo("12345678900");
}

@Test
void deveRejeitarCPFInvalido() {
    assertThatThrownBy(() -> new CPF("00000000000"))
        .isInstanceOf(IllegalArgumentException.class)
        .hasMessageContaining("CPF inválido");
}

@Test
void cpfMesmoValorSaoIguais() {
    CPF cpf1 = new CPF("12345678900");
    CPF cpf2 = new CPF("12345678900");
    assertThat(cpf1).isEqualTo(cpf2);
    assertThat(cpf1.hashCode()).isEqualTo(cpf2.hashCode());
}
```

## Próximos Passos

- [Conceitos: Value Objects](/docs/conceitos/value-objects) - Fundamentos
- [BaseValueObject](/docs/modulos/archbase-shared-kernel) - Base para VOs customizados
