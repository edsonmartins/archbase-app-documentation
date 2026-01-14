---
title: Testes
sidebar_position: 8
---

# Testes

O Archbase fornece utilitários para facilitar testes de entidades, repositórios e serviços.

## Estrutura de Testes

```
src/test/java/
├── domain/                    # Testes de domínio
│   ├── entity/
│   │   ├── ClienteTest.java
│   │   └── PedidoTest.java
│   └── valueobject/
│       └── MoneyTest.java
├── application/               # Testes de aplicação
│   ├── command/
│   └── query/
└── infrastructure/            # Testes de infraestrutura
    └── persistence/
        └── PedidoRepositoryTest.java
```

## Testes de Domínio

### Testando Entidades

```java
package com.exemplo.domain.entity;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.DisplayName;
import static org.assertj.core.api.Assertions.*;

@DisplayName("Testes de Entidade Cliente")
class ClienteTest {

    @Test
    @DisplayName("Deve criar cliente válido")
    void deveCriarClienteValido() {
        // Given
        String nome = "João Silva";
        String email = "joao@example.com";
        String cpf = "12345678900";

        // When
        Cliente cliente = new Cliente(nome, email, cpf);

        // Then
        assertThat(cliente.getNome()).isEqualTo(nome);
        assertThat(cliente.getEmail()).isEqualTo(email);
        assertThat(cliente.getCpf()).isEqualTo(cpf);
        assertThat(cliente.isAtivo()).isTrue();
    }

    @Test
    @DisplayName("Não deve criar cliente com nome vazio")
    void naoDeveCriarClienteComNomeVazio() {
        // Given
        Cliente cliente = new Cliente("", "email@example.com", "12345678900");

        // When
        ValidationResult result = cliente.validate();

        // Then
        assertThat(result.isValid()).isFalse();
        assertThat(result.getErrors("nome"))
            .contains("Nome é obrigatório");
    }

    @Test
    @DisplayName("Deve desativar cliente sem pedidos em aberto")
    void deveDesativarCliente() {
        // Given
        Cliente cliente = new Cliente("João", "joao@example.com", "12345678900");
        cliente.setPossuiPedidosEmAberto(false);

        // When
        cliente.desativar();

        // Then
        assertThat(cliente.isAtivo()).isFalse();
    }

    @Test
    @DisplayName("Não deve desativar cliente com pedidos em aberto")
    void naoDeveDesativarClienteComPedidosEmAberto() {
        // Given
        Cliente cliente = new Cliente("João", "joao@example.com", "12345678900");
        cliente.setPossuiPedidosEmAberto(true);

        // When/Then
        assertThatThrownBy(() -> cliente.desativar())
            .isInstanceOf(IllegalStateException.class)
            .hasMessageContaining("não pode ser desativado");
    }
}
```

### Testando Value Objects

```java
@DisplayName("Testes de Value Object Money")
class MoneyTest {

    @Test
    @DisplayName("Deve criar money com valor válido")
    void deveCriarMoney() {
        Money money = Money.reais(100.50);

        assertThat(money.getValor()).isEqualByComparingTo("100.50");
    }

    @Test
    @DisplayName("Não deve criar money com valor negativo")
    void naoDeveCriarMoneyNegativo() {
        assertThatThrownBy(() -> Money.of(BigDecimal.valueOf(-10)))
            .isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    @DisplayName("Deve somar money")
    void deveSomar() {
        Money m1 = Money.reais(100);
        Money m2 = Money.reais(50);

        Money resultado = m1.soma(m2);

        assertThat(resultado).isEqualByComparingTo(Money.reais(150));
    }

    @Test
    @DisplayName("Money deve ser value object")
    void moneyDeveSerValueObject() {
        Money m1 = Money.reais(100);
        Money m2 = Money.reais(100);

        assertThat(m1).isEqualTo(m2);
        assertThat(m1.hashCode()).isEqualTo(m2.hashCode());
    }
}
```

## Testes de Repositório

```java
@DataJpaTest
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
@TestPropertySource(properties = {
    "spring.datasource.url=jdbc:h2:mem:testdb",
    "spring.jpa.hibernate.ddl-auto=create-drop"
})
class PedidoRepositoryTest {

    @Autowired
    private TestEntityManager entityManager;

    @Autowired
    private PedidoRepository pedidoRepository;

    @Test
    void deveSalvarPedido() {
        // Given
        Pedido pedido = new Pedido(UUID.randomUUID());
        pedido.adicionarItem(criarProduto(), 2);

        // When
        Pedido salvo = pedidoRepository.save(pedido);

        // Then
        assertThat(salvo.getId()).isNotNull();
        assertThat(salvo.getStatus()).isEqualTo(StatusPedido.CRIADO);
    }

    @Test
    void deveBuscarPorCliente() {
        // Given
        UUID clienteId = UUID.randomUUID();
        Pedido pedido1 = criarPedido(clienteId);
        Pedido pedido2 = criarPedido(clienteId);

        entityManager.persist(pedido1);
        entityManager.persist(pedido2);

        // When
        List<Pedido> pedidos = pedidoRepository.findByClienteId(clienteId);

        // Then
        assertThat(pedidos).hasSize(2);
    }

    @Test
    void deveContarPorStatus() {
        // Given
        Pedido pedido = criarPedido(UUID.randomUUID());
        pedido.confirmar();
        entityManager.persist(pedido);

        // When
        long count = pedidoRepository.countByStatus(StatusPedido.CONFIRMADO);

        // Then
        assertThat(count).isGreaterThan(0);
    }

    private Produto criarProduto() {
        Produto produto = new Produto();
        produto.setNome("Produto Teste");
        produto.setPreco(BigDecimal.TEN);
        return produto;
    }

    private Pedido criarPedido(UUID clienteId) {
        Pedido pedido = new Pedido(clienteId);
        pedido.adicionarItem(criarProduto(), 1);
        return pedido;
    }
}
```

## Testes de Integração

```java
@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class PedidoControllerIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private PedidoRepository pedidoRepository;

    @Autowired
    private ClienteRepository clienteRepository;

    @Test
    @WithMockUser(username = "teste", roles = {"USER"})
    void deveCriarPedido() throws Exception {
        // Given
        UUID clienteId = UUID.randomUUID();
        Cliente cliente = new Cliente("João", "joao@teste.com", "12345678900");
        clienteRepository.save(cliente);

        String requestJson = """
            {
                "clienteId": "%s",
                "itens": [
                    {"produtoId": "prod-1", "quantidade": 2}
                ]
            }
            """.formatted(clienteId);

        // When/Then
        mockMvc.perform(post("/api/v1/pedidos")
                .contentType(MediaType.APPLICATION_JSON)
                .content(requestJson))
            .andExpect(status().isCreated())
            .andExpect(jsonPath("$.id").exists())
            .andExpect(jsonPath("$.status").value("CRIADO"));
    }

    @Test
    void deveRetornar401SemAutenticacao() throws Exception {
        mockMvc.perform(get("/api/v1/pedidos"))
            .andExpect(status().isUnauthorized());
    }
}
```

## Mockando Repositórios

```java
@ExtendWith(MockitoExtension.class)
class PedidoServiceTest {

    @Mock
    private PedidoRepository pedidoRepository;

    @Mock
    private ClienteRepository clienteRepository;

    @InjectMocks
    private PedidoService pedidoService;

    @Test
    void deveCriarPedidoQuandoClienteExiste() {
        // Given
        UUID clienteId = UUID.randomUUID();
        Cliente cliente = new Cliente("João", "joao@teste.com", "12345678900");

        when(clienteRepository.findById(clienteId))
            .thenReturn(Optional.of(cliente));

        when(pedidoRepository.save(any()))
            .thenAnswer(invocation -> invocation.getArgument(0));

        CriarPedidoCommand command = new CriarPedidoCommand(clienteId, List.of());

        // When
        UUID pedidoId = pedidoService.criar(command);

        // Then
        assertThat(pedidoId).isNotNull();
        verify(pedidoRepository).save(any(Pedido.class));
    }

    @Test
    void deveLancarExcecaoQuandoClienteNaoExiste() {
        // Given
        UUID clienteId = UUID.randomUUID();
        when(clienteRepository.findById(clienteId))
            .thenReturn(Optional.empty());

        CriarPedidoCommand command = new CriarPedidoCommand(clienteId, List.of());

        // When/Then
        assertThatThrownBy(() -> pedidoService.criar(command))
            .isInstanceOf(ClienteNaoEncontradoException.class);
    }
}
```

## Testando com Multi-Tenancy

```java
@SpringBootTest
@AutoConfigureMockMvc
class MultiTenancyTest {

    @Autowired
    private MockMvc mockMvc;

    @Test
    @WithMockTenant(tenantId = "tenant-1")
    void deveIsolarDadosPorTenant() throws Exception {
        // Criar produto para tenant-1
        mockMvc.perform(post("/api/v1/produtos")
                .header("X-Tenant-ID", "tenant-1")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"nome\": \"Produto Tenant 1\"}"))
            .andExpect(status().isCreated());

        // Tentar buscar com tenant-2 não deve retornar
        mockMvc.perform(get("/api/v1/produtos")
                .header("X-Tenant-ID", "tenant-2"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.content").isEmpty());
    }
}
```

## Testando Segurança

```java
@SpringBootTest
@AutoConfigureMockMvc
class SecurityTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private JwtTokenProvider tokenProvider;

    @Test
    void endpointProtegidoRequerAutenticacao() {
        mockMvc.perform(get("/api/v1/pedidos"))
            .andExpect(status().isUnauthorized());
    }

    @Test
    void usuarioComPermissaoPodeAcessar() throws Exception {
        Usuario usuario = criarUsuarioComPermissao("VIEW", "PEDIDO");
        String token = tokenProvider.generateToken(usuario);

        mockMvc.perform(get("/api/v1/pedidos")
                .header("Authorization", "Bearer " + token))
            .andExpect(status().isOk());
    }

    @Test
    void usuarioSemPermissaoNaoPodeAcessar() throws Exception {
        Usuario usuario = criarUsuarioComPermissao("CREATE", "PEDIDO");
        String token = tokenProvider.generateToken(usuario);

        mockMvc.perform(delete("/api/v1/pedidos/123")
                .header("Authorization", "Bearer " + token))
            .andExpect(status().isForbidden());
    }

    private Usuario criarUsuarioComPermissao(String action, String resource) {
        // Criar usuário para teste...
    }
}
```

## Testcontainers

```java
@Testcontainers
@SpringBootTest
class PostgresIntegrationTest {

    @Container
    static PostgreSQLContainer<?> postgres =
        new PostgreSQLContainer<>("postgres:16")
            .withDatabaseName("testdb")
            .withUsername("test")
            .withPassword("test");

    @DynamicPropertySource
    static void configureProperties(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", postgres::getJdbcUrl);
        registry.add("spring.datasource.username", postgres::getUsername);
        registry.add("spring.datasource.password", postgres::getPassword);
    }

    @Test
    void devePersistirDadosNoPostgres() {
        // Teste com PostgreSQL real
    }
}
```

## Boas Práticas

| Prática | Descrição |
|---------|-----------|
| **Testes de domínio primeiro** | Teste a lógica de negócio antes da persistência |
| **Testes rápidos** | Use mocks para testes de unidade |
| **Testes de integração** | Teste fluxos completos |
| **@DataJpaTest** | Para testes de repositório |
| **@WebMvcTest** | Para testes de controllers |
| **Nomes descritivos** | Use @DisplayName |
| **AssertJ** | Use asserções fluentes |

## Próximos Passos

- [Test Utils Module](/docs/modulos/test-utils) - Utilitários de teste
- [Testing](/docs/modulos/test-utils) - More testing utilities
- [Security](/docs/guias/security-setup) - Testando segurança
