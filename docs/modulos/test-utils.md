---
title: archbase-test-utils
sidebar_position: 8
---

# archbase-test-utils

O módulo **archbase-test-utils** fornece utilitários para facilitar os testes de aplicações que usam o Archbase Framework.

## Instalação

```xml
<dependency>
    <groupId>br.com.archbase</groupId>
    <artifactId>archbase-test-utils</artifactId>
    <version>${archbase.version}</version>
    <scope>test</scope>
</dependency>
```

## @ArchbaseTest

Anotação composta que configura um contexto de teste completo:

```java
@ArchbaseTest
class MeuTest {

    @Autowired
    private TestEntityManager entityManager;

    @Test
    void deveFuncionar() {
        // Teste aqui
    }
}
```

**Equivalente a:**
```java
@SpringBootTest
@TestPropertySource(locations = "classpath:application-test.yml")
@Transactional
```

## EntityBuilder

Builder genérico para criar entidades de teste:

```java
@Test
void deveCriarCliente() {
    Cliente cliente = EntityBuilder.builder(Cliente.class)
        .set("nome", "João Silva")
        .set("email", "joao@email.com")
        .set("telefone", "(11) 99999-9999")
        .build();

    assertThat(cliente.getNome()).isEqualTo("João Silva");
}
```

### Builder com Objetos Relacionados

```java
@Test
void deveCriarPedidoComItens() {
    Cliente cliente = EntityBuilder.builder(Cliente.class)
        .set("nome", "Maria Santos")
        .build();

    Pedido pedido = EntityBuilder.builder(Pedido.class)
        .set("cliente", cliente)
        .set("status", StatusPedido.CRIADO)
        .build();

    assertThat(pedido.getCliente().getNome()).isEqualTo("Maria Santos");
}
```

## EntityFixture

Registro de factories para entidades:

```java
@Configuration
public class TestFixturesConfig {

    @Bean
    public EntityFixture entityFixture() {
        EntityFixture fixture = new EntityFixture();

        fixture.register(Cliente.class, () -> {
            Cliente cliente = new Cliente();
            cliente.setNome("Cliente Teste");
            cliente.setEmail("teste@email.com");
            return cliente;
        });

        fixture.register(Produto.class, () -> {
            Produto produto = new Produto();
            produto.setNome("Produto Teste");
            produto.setPreco(100.0);
            produto.setEstoque(10);
            return produto;
        });

        return fixture;
    }
}
```

### Usando Fixtures

```java
@SpringBootTest
class ComFixtureTest {

    @Autowired
    private EntityFixture fixture;

    @Test
    void deveUsarFixture() {
        Cliente cliente = fixture.create(Cliente.class);
        Produto produto = fixture.create(Produto.class);

        assertThat(cliente.getNome()).isEqualTo("Cliente Teste");
        assertThat(produto.getPreco()).isEqualTo(100.0);
    }

    @Test
    void deveCriarListaDeFixtures() {
        List<Produto> produtos = fixture.create(Produto.class, 5);
        assertThat(produtos).hasSize(5);
    }
}
```

## @WithMockArchbaseUser

Mock de usuário autenticado para testes de segurança:

```java
@SpringBootTest
@WithMockArchbaseUser(
    userId = "123e4567-e89b-12d3-a456-426614174000",
    username = "testuser",
    permissions = {"VIEW:PEDIDO", "CREATE:PEDIDO"}
)
class ComSegurancaTest {

    @Autowired
    private MockMvc mockMvc;

    @Test
    void deveAcessarRecursoProtegido() throws Exception {
        mockMvc.perform(get("/api/pedidos"))
            .andExpect(status().isOk());
    }
}
```

### Vários Usuários

```java
@Test
@WithMockArchbaseUser(
    username = "admin",
    permissions = {"ADMIN:SYSTEM"}
)
void adminDeveTerAcesso() {
    // Test como admin
}

@Test
@WithMockArchbaseUser(
    username = "user",
    permissions = {"VIEW:PEDIDO"}
})
void usuarioNaoDeveTerAcesso() {
    // Test como usuário comum
}
```

## ArchbaseTenantContext Mock

Mock de contexto multi-tenant:

```java
@SpringBootTest
class MultiTenantTest {

    @Test
    void deveIsolarPorTenant() {
        // Define tenant para o teste
        ArchbaseTenantContext.setTenantId("tenant-test");

        Cliente cliente = new Cliente("João");
        clienteRepository.save(cliente);

        // Limpa após o teste
        ArchbaseTenantContext.clear();
    }
}
```

## Métodos Utilitários

### ArchbaseTestUtils

```java
class TestUtilsTest {

    @Test
    void deveCriarEntidade() {
        Cliente cliente = ArchbaseTestUtils.createEntity(Cliente.class);
        assertThat(cliente).isNotNull();
    }

    @Test
    void deveCriarLista() {
        List<Cliente> clientes = ArchbaseTestUtils.createList(Cliente.class, 10);
        assertThat(clientes).hasSize(10);
    }

    @Test
    void deveGerarUUID() {
        UUID uuid = ArchbaseTestUtils.randomUUID();
        assertThat(uuid).isNotNull();
    }
}
```

## Testes de Integração

```java
@ArchbaseTest
class PedidoIntegrationTest {

    @Autowired
    private PedidoRepository pedidoRepository;

    @Autowired
    private PedidoService pedidoService;

    @Test
    @Transactional
    void deveCriarPedido() {
        // Given
        Cliente cliente = EntityBuilder.builder(Cliente.class)
            .set("nome", "Cliente Teste")
            .build();

        // When
        Pedido pedido = pedidoService.criar(cliente.getId(), itens);

        // Then
        assertThat(pedido.getId()).isNotNull();
        assertThat(pedido.getStatus()).isEqualTo(StatusPedido.CRIADO);
    }
}
```

## Asserts Customizados

```java
class PedidoAssert {

    public static PedidoAssert assertThat(Pedido actual) {
        return new PedidoAssert(actual);
    }

    public PedidoAssert temStatus(StatusPedido esperado) {
        if (!actual.getStatus().equals(esperado)) {
            failWithMessage("Esperado status %s, mas foi %s", esperado, actual.getStatus());
        }
        return this;
    }

    public PedidoAssert temItens(int quantidade) {
        if (actual.getItens().size() != quantidade) {
            failWithMessage("Esperado %s itens, mas foram %s", quantidade, actual.getItens().size());
        }
        return this;
    }
}
```

**Usando o assert customizado:**

```java
@Test
void pedidoDeveTerItens() {
    Pedido pedido = criarPedidoComItens(3);

    PedidoAssert.assertThat(pedido)
        .temStatus(StatusPedido.CRIADO)
        .temItens(3);
}
```

## Próximos Passos

- [Guias: Testing](/docs/guias/testing) - Estratégias de teste
- [JUnit 5 Docs](https://junit.org/junit5/docs/current/user-guide/) - Documentação JUnit
