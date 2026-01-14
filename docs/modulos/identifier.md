---
title: archbase-identifier
sidebar_position: 13
---

# archbase-identifier

Módulo para **identificação de entidades** com anotação e serialização otimizada.

## Instalação

```xml
<dependency>
    <groupId>br.com.archbase</groupId>
    <artifactId>archbase-identifier</artifactId>
    <version>${archbase.version}</version>
</dependency>
```

## Configuração

```yaml
archbase:
  identifier:
    enabled: false  # Desabilitado por padrão
```

## @ArchbaseIdentifier

Anotação para marcar campos que representam identificadores de entidades:

```java
@Entity
@DomainEntity
public class Cliente extends PersistenceEntityBase<Cliente, UUID> {

    @ArchbaseIdentifier
    private UUID id;

    private String nome;
}
```

## Interface Identifier

Interface marcadora para identificadores customizados:

```java
public class ClienteId implements Identifier<UUID> {

    private final UUID value;

    public ClienteId(UUID value) {
        this.value = Objects.requireNonNull(value);
    }

    @Override
    public UUID getValue() {
        return value;
    }
}
```

## Serialização Jackson

Com o módulo habilitado, identificadores são serializados como o valor direto:

```java
// Sem módulo: {"id": {"value": "123e4567-e89b-12d3-a456-426614174000"}}
// Com módulo:  {"id": "123e4567-e89b-12d3-a456-426614174000"}
```

## Uso Manual

Para registrar manualmente o módulo Jackson:

```java
@Configuration
public class JacksonConfig {

    @Bean
    public ObjectMapper objectMapper() {
        ObjectMapper mapper = new ObjectMapper();
        mapper.registerModule(new IdentifierModule());
        return mapper;
    }
}
```

## Exemplos

### Identificador UUID

```java
public class PedidoId implements Identifier<UUID> {

    private final UUID value;

    public PedidoId() {
        this(UUID.randomUUID());
    }

    public UUID getValue() {
        return value;
    }
}
```

### Identificador String

```java
public class Cnpj implements Identifier<String> {

    private final String value;

    public Cnpj(String value) {
        this.value = Objects.requireNonNull(value);
    }

    @Override
    public String getValue() {
        return value;
    }
}
```

## Próximos Passos

- [archbase-jackson](/docs/modulos/jackson) - Serialização de Value Objects
- [archbase-domain-driven-design](/docs/modulos/domain-driven-design) - Entidades e Agregados
