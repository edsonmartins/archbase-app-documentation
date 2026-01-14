---
title: Value Objects
sidebar_position: 3
---

# Value Objects (Objetos de Valor)

**Value Objects** são objetos que representam conceitos do domínio e são definidos **apenas pelos seus valores**, não por uma identidade única.

## Características de um Value Object

Um Value Object deve:

1. **Não ter identidade própria** - São iguais se todos os seus atributos forem iguais
2. **Ser imutável** - Uma vez criado, não pode ser modificado
3. **Validar-se** - Contém sua própria lógica de validação
4. **Ser substituível** - Pode ser substituído por outro VO com os mesmos valores

## Entidade vs Value Object

| Característica | Entidade | Value Object |
|----------------|----------|--------------|
| Identidade | Tem ID único | Não tem identidade |
| Igualdade | Mesmo ID = mesma entidade | Mesmos valores = mesmo VO |
| Mutabilidade | Pode mudar estado | Imutável |
| Exemplos | Cliente, Pedido | CPF, Email, Dinheiro |

## Exemplos Práticos

### CPF como Value Object

```java
package com.exemplo.domain.valueobject;

import br.com.archbase.shared.ddd.valueobject.BaseValueObject;

public class CPF extends BaseValueObject {

    private final String numero;
    private final String digitoVerificador;

    public CPF(String cpfCompleto) {
        if (!isValid(cpfCompleto)) {
            throw new IllegalArgumentException("CPF inválido");
        }
        this.numero = cpfCompleto.substring(0, 9);
        this.digitoVerificador = cpfCompleto.substring(9, 11);
    }

    public String getNumeroFormatado() {
        return String.format("%s.%s.%s-%s",
            numero.substring(0, 3),
            numero.substring(3, 6),
            numero.substring(6, 9),
            digitoVerificador
        );
    }

    private boolean isValid(String cpf) {
        // Lógica de validação de CPF
        return cpf != null && cpf.matches("\\d{11}");
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (o == null || getClass() != o.getClass()) return false;
        CPF cpf = (CPF) o;
        return numero.equals(cpf.numero) &&
               digitoVerificador.equals(cpf.digitoVerificador);
    }

    @Override
    public int hashCode() {
        return Objects.hash(numero, digitoVerificador);
    }
}
```

### Email como Value Object

```java
package com.exemplo.domain.valueobject;

import br.com.archbase.shared.ddd.valueobject.BaseValueObject;
import java.util.regex.Pattern;

public class EmailAddress extends BaseValueObject {

    private static final Pattern EMAIL_PATTERN =
        Pattern.compile("^[A-Za-z0-9+_.-]+@(.+)$");

    private final String endereco;

    public EmailAddress(String endereco) {
        if (!isValid(endereco)) {
            throw new IllegalArgumentException("E-mail inválido");
        }
        this.endereco = endereco.toLowerCase().trim();
    }

    private boolean isValid(String email) {
        return email != null && EMAIL_PATTERN.matcher(email).matches();
    }

    public String getEndereco() {
        return endereco;
    }

    public String getUsuario() {
        return endereco.split("@")[0];
    }

    public String getDominio() {
        return endereco.split("@")[1];
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (o == null || getClass() != o.getClass()) return false;
        EmailAddress that = (EmailAddress) o;
        return endereco.equals(that.endereco);
    }

    @Override
    public int hashCode() {
        return endereco.hashCode();
    }

    @Override
    public String toString() {
        return endereco;
    }
}
```

### Dinheiro (Money) como Value Object

```java
package com.exemplo.domain.valueobject;

import br.com.archbase.shared.ddd.valueobject.BaseValueObject;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.Currency;

public class Dinheiro extends BaseValueObject {

    private final BigDecimal amount;
    private final Currency currency;

    public Dinheiro(BigDecimal amount, Currency currency) {
        this.amount = amount.setScale(2, RoundingMode.HALF_EVEN);
        this.currency = currency;
    }

    public static Dinheiro reais(BigDecimal amount) {
        return new Dinheiro(amount, Currency.getInstance("BRL"));
    }

    public static Dinheiro reais(double amount) {
        return reais(BigDecimal.valueOf(amount));
    }

    public Dinheiro somar(Dinheiro other) {
        if (!this.currency.equals(other.currency)) {
            throw new IllegalArgumentException("Não é possível somar moedas diferentes");
        }
        return new Dinheiro(this.amount.add(other.amount), this.currency);
    }

    public Dinheiro subtrair(Dinheiro other) {
        if (!this.currency.equals(other.currency)) {
            throw new IllegalArgumentException("Não é possível subtrair moedas diferentes");
        }
        return new Dinheiro(this.amount.subtract(other.amount), this.currency);
    }

    public Dinheiro multiplicar(BigDecimal multiplicador) {
        return new Dinheiro(this.amount.multiply(multiplicador), this.currency);
    }

    public boolean isGreaterThan(Dinheiro other) {
        return this.amount.compareTo(other.amount) > 0;
    }

    public boolean isLessThan(Dinheiro other) {
        return this.amount.compareTo(other.amount) < 0;
    }

    public boolean isZero() {
        return this.amount.compareTo(BigDecimal.ZERO) == 0;
    }

    public boolean isNegative() {
        return this.amount.compareTo(BigDecimal.ZERO) < 0;
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (o == null || getClass() != o.getClass()) return false;
        Dinheiro dinheiro = (Dinheiro) o;
        return amount.equals(dinheiro.amount) && currency.equals(dinheiro.currency);
    }

    @Override
    public int hashCode() {
        return Objects.hash(amount, currency);
    }
}
```

## Usando Value Objects

### Compor Entidades com VOs

```java
@Entity
@DomainEntity
public class Cliente extends PersistenceEntityBase<Cliente, UUID> {

    private String nome;

    // Value Objects
    @Embedded
    private CPF cpf;

    @Embedded
    private EmailAddress email;

    public void alterarEmail(EmailAddress novoEmail) {
        // VO é imutável - criamos um novo
        this.email = novoEmail;
    }
}
```

### Value Objects no Archbase

O framework oferece o módulo `archbase-value-objects` com VOs comuns:

```xml
<dependency>
    <groupId>br.com.archbase</groupId>
    <artifactId>archbase-value-objects</artifactId>
</dependency>
```

**Value Objects disponíveis:**

- `CPF` - Cadastro de Pessoas Físicas
- `CNPJ` - Cadastro Nacional da Pessoa Jurídica
- `EmailAddress` - Endereço de e-mail
- `Telefone` - Número de telefone
- `Endereco` - Endereço completo

## Quando Criar um Value Object?

:::tip Use Value Object para
- Conceitos que não precisam de identidade própria
- Valores que podem ser compartilhados entre entidades
- Tipos primitivos que precisam de validação
- Quantidades, medidas, valores monetários
:::

## Anti-padrões

:::danger Evite
- VOs vazios (sem comportamento)
- VOs que mudam de estado
- VOs com identidade
- Expor atributos internos sem necessidade
:::

## Próximos Passos

- [Agregados](/docs/conceitos/aggregates) - Agrupando entidades e VOs
- [Módulo archbase-value-objects](/docs/modulos/value-objects) - VOs prontos do framework
