---
title: archbase-mapper
sidebar_position: 11
---

# archbase-mapper

Módulo para **mapeamento objeto-objeto** entre entidades e DTOs.

## Instalação

```xml
<dependency>
    <groupId>br.com.archbase</groupId>
    <artifactId>archbase-mapper</artifactId>
    <version>${archbase.version}</version>
</dependency>
```

## Configuração

```yaml
archbase:
  mapper:
    enabled: true
    strict-mapping: true  # Lança exceção se campo não mapeado
```

## ArchbaseMapper

Interface base para mappers customizados:

```java
import br.com.archbase.mapper.ArchbaseMapper;

@Mapper
public interface PedidoMapper extends ArchbaseMapper<Pedido, PedidoDTO> {

    @Override
    Pedido toEntity(PedidoDTO dto);

    @Override
    PedidoDTO toDto(Pedido entity);

    @Mapping(target = "itens", ignore = true)
    Pedido toEntitySemItens(PedidoDTO dto);

    default List<ItemPedidoDTO> toItemList(List<ItemPedido> itens) {
        return itens.stream()
            .map(this::toItemDto)
            .collect(Collectors.toList());
    }

    @Mapping(target = "produto", source = "produtoId")
    ItemPedidoDTO toItemDto(ItemPedido item);
}
```

## Usando o Mapper

```java
@Service
public class PedidoService {

    private final PedidoRepository repository;
    private final PedidoMapper mapper;

    public PedidoDTO criar(CriarPedidoRequest request) {
        Pedido pedido = mapper.toEntity(request.toDto());
        pedido.validar();
        Pedido salvo = repository.save(pedido);
        return mapper.toDto(salvo);
    }

    public Page<PedidoDTO> listar(Pageable pageable) {
        return repository.findAll(pageable)
            .map(mapper::toDto);
    }
}
```

## Mapeamento com ModelMapper

Se o ModelMapper estiver no classpath, ele será usado automaticamente:

```java
@Configuration
public class MapperConfig {

    @Bean
    public ArchbaseMapper<Object, Object> modelMapper() {
        ModelMapper modelMapper = new ModelMapper();
        modelMapper.getConfiguration()
            .setFieldMatchingEnabled(true)
            .setFieldAccessLevel(PRIVATE);

        return new ModelMapperArchbaseMapper(modelMapper);
    }
}
```

## Mapeamento com MapStruct

Adicione a dependência:

```xml
<dependency>
    <groupId>org.mapstruct</groupId>
    <artifactId>mapstruct</artifactId>
    <version>1.5.5.Final</version>
</dependency>
```

Crie o mapper:

```java
@Mapper(componentModel = "spring")
public interface ClienteMapper extends ArchbaseMapper<Cliente, ClienteDTO> {
    // Implementação gerada automaticamente
}
```

## Mapeamento Condicional

```java
@Mapper
public interface ProdutoMapper extends ArchbaseMapper<Produto, ProdutoDTO> {

    @Mapping(target = "precoComDesconto",
             expression = "java(entity.getPreco() * (1 - entity.getDesconto()))")
    ProdutoDTO toDto(Produto entity);

    @Mapping(target = "estoque",
             condition = "java(entity.isExibirEstoque())")
    ProdutoDTO toDtoComEstoque(Produto entity);
}
```

## Collections

```java
@Mapper
public interface ClienteMapper extends ArchbaseMapper<Cliente, ClienteDTO> {

    default List<ClienteDTO> toDtoList(List<Cliente> entidades) {
        return entidades.stream()
            .map(this::toDto)
            .collect(Collectors.toList());
    }

    default Set<ClienteDTO> toDtoSet(Set<Cliente> entidades) {
        return entidades.stream()
            .map(this::toDto)
            .collect(Collectors.toSet());
    }
}
```

## Testes de Mapper

```java
@SpringBootTest
class ClienteMapperTest {

    @Autowired
    private ClienteMapper mapper;

    @Test
    void deveMapearParaDto() {
        Cliente cliente = new Cliente("João Silva", "joao@email.com");

        ClienteDTO dto = mapper.toDto(cliente);

        assertThat(dto.getNome()).isEqualTo("João Silva");
        assertThat(dto.getEmail()).isEqualTo("joao@email.com");
    }

    @Test
    void deveMapearParaEntidade() {
        ClienteDTO dto = new ClienteDTO("João Silva", "joao@email.com");

        Cliente cliente = mapper.toEntity(dto);

        assertThat(cliente.getNome()).isEqualTo("João Silva");
        assertThat(cliente.getEmail()).isEqualTo("joao@email.com");
    }
}
```

---

## Exceção MappingException

Exceção lançada quando ocorre erro no mapeamento:

```java
try {
    ClienteDTO dto = mapper.toDto(cliente);
} catch (MappingException e) {
    // Trata erro de mapeamento
    logger.error("Erro ao mapear cliente: {}", e.getMessage());
    throw new BusinessException("Erro ao processar dados do cliente");
}
```

**Causas comuns:**

- Tipos incompatíveis entre origem e destino
- Campos não mapeados com `strict-mapping: true`
- Erro de conversão de tipos complexos
- Null pointer em cadeias de mapeamento

---

## Auto-configuração

O módulo `archbase-mapper` oferece auto-configuração via Spring Boot:

### ArchbaseMapperAutoConfiguration

Configuração automática é ativada quando o módulo está no classpath:

```yaml
archbase:
  mapper:
    enabled: true
    strict-mapping: true  # Lança exceção se campo não mapeado
```

### Configuração Programática

```java
@Configuration
public class MapperConfiguration {

    @Bean
    public ArchbaseMapper<Object, Object> modelMapper() {
        ModelMapper modelMapper = new ModelMapper();

        // Configurações de mapeamento
        modelMapper.getConfiguration()
            .setFieldMatchingEnabled(true)
            .setFieldAccessLevel(PRIVATE)
            .setSkipNullEnabled(true)
            .setDeepCopyEnabled(false);

        return new ModelMapperArchbaseMapper(modelMapper);
    }
}
```

### Integração com MapStruct

```java
@Mapper(
    componentModel = "spring",
    uses = { /* outros mappers */ }
)
public interface ClienteMapper extends ArchbaseMapper<Cliente, ClienteDTO> {
    // Implementação gerada automaticamente em tempo de compilação
}
```

---

## Próximos Passos

- [ModelMapper Docs](http://modelmapper.org/) - Documentação ModelMapper
- [MapStruct Docs](https://mapstruct.org/) - Documentação MapStruct
