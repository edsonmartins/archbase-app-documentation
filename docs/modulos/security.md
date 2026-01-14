---
title: archbase-security
sidebar_position: 4
---

# archbase-security

Módulo de segurança com autenticação JWT, autorização baseada em permissões e suporte a múltiplos contextos de aplicação.

## Instalação

```xml
<dependency>
    <groupId>br.com.archbase</groupId>
    <artifactId>archbase-security</artifactId>
    <version>${archbase.version}</version>
</dependency>
```

## Visão Geral

| Funcionalidade | Descrição |
|----------------|-----------|
| **JWT** | Access e refresh tokens com configuração flexível |
| **Permissões** | Controle de acesso por Resource/Action/Tenant |
| **Contextos** | Autenticação multi-contexto (STORE, CUSTOMER, DRIVER, ADMIN) |
| **API Tokens** | Tokens para integrações serviço-serviço |
| **Intervalos** | Controle de acesso por horário/dia da semana |
| **Grupos** | Organização de usuários com permissões compartilhadas |

---

## Anotações de Segurança

### @HasPermission

Controle de acesso baseado em **Resource + Action**:

```java
@RestController
@RequestMapping("/api/pedidos")
public class PedidoController {

    // No nível do controller - aplica a todos os métodos
    @HasPermission(action = "VIEW", resource = "PEDIDO")
    @GetMapping
    public Page<Pedido> listar(Pageable pageable) {
        return pedidoRepository.findAll(pageable);
    }

    // Sobrepor no nível do método
    @PostMapping
    @HasPermission(action = "CREATE", resource = "PEDIDO")
    public Pedido criar(@RequestBody CriarPedidoRequest request) {
        return pedidoService.criar(request);
    }

    @DeleteMapping("/{id}")
    @HasPermission(action = "DELETE", resource = "PEDIDO")
    public void deletar(@PathVariable UUID id) {
        pedidoService.deletar(id);
    }
}
```

**Parâmetros:**

| Parâmetro | Tipo | Descrição |
|-----------|------|-----------|
| `action` | String | Ação permitida (VIEW, CREATE, UPDATE, DELETE, etc.) |
| `resource` | String | Nome do recurso (PEDIDO, CLIENTE, PRODUTO) |
| `tenantId` | String | ID do tenant (opcional, suporta SpEL) |
| `companyId` | String | ID da empresa (opcional) |
| `projectId` | String | ID do projeto (opcional) |

**Exemplo com Tenant:**

```java
@HasPermission(
    action = "ADMIN",
    resource = "PEDIDO",
    tenantId = "#tenantId"  // SpEL - usa o parâmetro do método
)
public Page<Pedido> listarPorTenant(@PathVariable String tenantId, Pageable pageable) {
    return pedidoService.listarPorTenant(tenantId, pageable);
}
```

### @RequireProfile

Controle baseado em **perfis do Archbase**:

```java
@RequireProfile({"ADMIN", "MANAGER"})
public void metodoAdminOuManager() {
    // Acessível por usuários com profile ADMIN OU MANAGER
}

@RequireProfile(value = {"ADMIN", "FINANCE"}, requireAll = true)
public void metodoRestrito() {
    // Usuário deve ter AMBOS os profiles: ADMIN E FINANCE
}
```

**Parâmetros:**

| Parâmetro | Tipo | Default | Descrição |
|-----------|------|---------|-----------|
| `value` | String[] | - | Perfis necessários |
| `requireAll` | boolean | false | Se true, exige TODOS os perfis |
| `allowSystemAdmin` | boolean | true | Permite bypass para administradores |
| `requireActiveUser` | boolean | true | Verifica se usuário está ativo |

### @RequireRole

Controle baseado em **roles customizadas**:

```java
@RequireRole("STORE_MANAGER")
public void metodoGerenteLoja() {
    // Método para gerentes de loja
}

@RequireRole(value = {"OWNER", "PARTNER"}, requirePlatformAdmin = true)
public void metodoPlataforma() {
    // Requer ser admin da plataforma E ter role OWNER ou PARTNER
}

@RequireRole(value = "MERCHANT", ownerOnly = true)
public void metodoProprietario() {
    // Apenas proprietários podem acessar
}
```

**Parâmetros:**

| Parâmetro | Tipo | Default | Descrição |
|-----------|------|---------|-----------|
| `value` | String[] | - | Roles necessárias |
| `requireAll` | boolean | false | Se true, exige TODAS as roles |
| `requirePlatformAdmin` | boolean | false | Requer admin da plataforma |
| `ownerOnly` | boolean | false | Apenas proprietários |
| `context` | String | - | Contexto específico para validação |

### @RequirePersona

Controle baseado em **personas de negócio**:

```java
@RequirePersona("CUSTOMER")
public void metodoCliente() {
    // Acessível apenas por clientes
}

@RequirePersona(value = "STORE_ADMIN", context = "STORE_APP")
public void metodoAdminLoja() {
    // Para admins de loja no contexto do app da loja
}

@RequirePersona(
    value = {"DRIVER", "DISPATCHER"},
    context = "DELIVERY_APP",
    contextData = "{\"region\": \"#region\"}"
)
public void metodoDelivery(@PathVariable String region) {
    // Motoristas ou despachantes da região especificada
}
```

### Combinando Anotações

```java
@RequireProfile("MANAGER")
@HasPermission(resource = "FINANCIAL", action = "READ")
public FinancialReport getRelatorioFinanceiro() {
    // Usuário deve ter:
    // 1. Profile MANAGER
    // 2. Permissão FINANCIAL:READ
}

@RequirePersona("STORE_ADMIN")
@HasPermission(resource = "ORDER", action = "CANCEL")
public void cancelarPedido(UUID orderId) {
    // Admin da loja COM permissão para cancelar pedidos
}
```

---

## Autenticação Contextual

O Archbase oferece autenticação unificada para múltiplos contextos de aplicação.

### Contextos Disponíveis

| Contexto | Descrição |
|----------|-----------|
| **STORE_APP** | Aplicativo de loja/estabelecimento |
| **CUSTOMER_APP** | Aplicativo do cliente final |
| **DRIVER_APP** | Aplicativo de motorista/entregador |
| **WEB_ADMIN** | Painel administrativo web |

### Login com Contexto

```http
POST /api/v1/auth/login
Content-Type: application/json

{
  "email": "usuario@exemplo.com",
  "password": "senha123",
  "context": "STORE_APP",
  "contextData": "{\"storeId\": \"123\"}"
}
```

### Login Flexível (Email ou Telefone)

```http
POST /api/v1/auth/login-flexible
Content-Type: application/json

{
  "identifier": "usuario@exemplo.com ou 11999999999",
  "password": "senha123",
  "context": "CUSTOMER_APP"
}
```

### Login Social

```http
POST /api/v1/auth/login-social
Content-Type: application/json

{
  "provider": "google",
  "token": "token-do-google",
  "context": "CUSTOMER_APP"
}
```

### Registro com Dados Adicionais

```http
POST /api/v1/auth/register
Content-Type: application/json

{
  "name": "João Silva",
  "email": "joao@exemplo.com",
  "password": "senha123",
  "role": "USER",
  "additionalData": {
    "phone": "+5511999999999",
    "storeId": "123",
    "cpf": "12345678900"
  }
}
```

### Listar Contextos

```http
GET /api/v1/auth/contexts

Response:
{
  "supportedContexts": ["STORE_APP", "CUSTOMER_APP", "DRIVER_APP", "WEB_ADMIN"],
  "defaultContext": "WEB_ADMIN"
}
```

---

## AuthenticationBusinessDelegate

Interface para adicionar **lógica de negócio customizada** durante autenticação:

```java
@Component
@Primary
public class MinhaAppAuthenticationDelegate implements AuthenticationBusinessDelegate {

    @Override
    public String onUserRegistered(User user, Map<String, Object> registrationData) {
        // Criar entidade de negócio (ex: Loja, Cliente)
        Loja loja = lojaService.criar(
            (String) registrationData.get("nomeLoja"),
            (String) registrationData.get("cnpj")
        );

        // Associar usuário à loja
        lojaService.adicionarUsuario(loja.getId(), user.getId());

        return loja.getId();
    }

    @Override
    public AuthenticationResponse enrichAuthenticationResponse(
            AuthenticationResponse baseResponse,
            String context,
            HttpServletRequest request) {

        // Enriquecer resposta baseado no contexto
        switch (context) {
            case "STORE_APP":
                return baseResponse.withAdditionalData(Map.of(
                    "lojaId", getLojaId(baseResponse.getUserId()),
                    "permissoes", getPermissoesLoja(baseResponse.getUserId())
                ));
            case "CUSTOMER_APP":
                return baseResponse.withAdditionalData(Map.of(
                    "clienteId", getClienteId(baseResponse.getUserId()),
                    "favoritos", getFavoritos(baseResponse.getUserId())
                ));
            default:
                return baseResponse;
        }
    }

    @Override
    public boolean supportsContext(String context) {
        return Set.of("STORE_APP", "CUSTOMER_APP").contains(context);
    }

    @Override
    public List<String> getSupportedContexts() {
        return List.of("STORE_APP", "CUSTOMER_APP");
    }

    @Override
    public void preAuthenticate(String email, String context) {
        // Validações pré-autenticação
        if ("STORE_APP".equals(context)) {
            validarLojaAtiva(email);
        }
    }

    @Override
    public void postAuthenticate(User user, String context) {
        // Ações pós-autenticação
        auditoria.registrarLogin(user.getId(), context);
    }

    @Override
    public String onSocialLogin(String provider, Map<String, Object> providerData) {
        // Integração com login social
        return socialLoginService.processar(provider, providerData);
    }
}
```

---

## AuthenticationResponseEnricher

Interface alternativa para enriquecer respostas:

```java
@Component
public class CustomResponseEnricher implements AuthenticationResponseEnricher {

    @Override
    public AuthenticationResponse enrich(
            AuthenticationResponse baseResponse,
            String context,
            HttpServletRequest request) {

        Map<String, Object> additionalData = new HashMap<>();
        additionalData.put("timestamp", Instant.now());
        additionalData.put("version", "1.0");

        return baseResponse.withAdditionalData(additionalData);
    }

    @Override
    public boolean supports(String context) {
        return "CUSTOMER_APP".equals(context);
    }

    @Override
    public int getOrder() {
        return 100; // Ordem de execução
    }
}
```

---

## Intervalos de Acesso

Controle de acesso baseado em **horários e dias da semana**.

### AccessInterval

```java
@Entity
public class AccessInterval extends PersistenceEntityBase<AccessInterval, UUID> {

    private LocalTime startTime;  // Horário de início
    private LocalTime endTime;    // Horário de fim
    private DayOfWeek dayOfWeek;  // Dia da semana
}
```

### AccessSchedule

```java
@Entity
public class AccessSchedule extends PersistenceEntityBase<AccessSchedule, UUID> {

    private String cronExpression;  // Expressão cron
    private String description;     // Descrição do horário
}
```

### Configuração

```yaml
archbase:
  security:
    access-schedule:
      enabled: true
      timezone: America/Sao_Paulo
```

---

## Grupos e Perfis

### Group

```java
@Entity
public class Group extends PersistenceEntityBase<Group, UUID> {

    private String name;
    private String description;
    private List<UserGroup> members;
    private List<Permission> permissions;
}
```

### UserGroup

```java
@Entity
public class UserGroup extends PersistenceEntityBase<UserGroup, UUID> {

    private User user;
    private Group group;
    private LocalDateTime joinedAt;
}
```

### UserProfile

```java
@Entity
public class UserProfile extends PersistenceEntityBase<UserProfile, UUID> {

    private String name;
    private List<Permission> permissions;
    private List<User> users;
}
```

---

## Contexto de Segurança

### Obter Usuário Autenticado

```java
@Service
public class PedidoService {

    public Pedido criar(PedidoRequest request) {
        // Obter usuário do contexto
        ArchbaseAuthentication auth =
            SecurityContextHolder.getAuthentication();

        UUID usuarioId = auth.getUserId();
        String username = auth.getUsername();

        Pedido pedido = new Pedido(usuarioId, request);
        return pedidoRepository.save(pedido);
    }
}
```

### Obter Permissões

```java
@GetMapping("/minhas-permissoes")
public List<Permission> minhasPermissoes() {
    ArchbaseAuthentication auth =
        SecurityContextHolder.getAuthentication();

    return auth.getPermissions();
}
```

---

## Serviços Utilitários

### CryptoUtil

```java
// Gerar hash de senha
String hashedPassword = CryptoUtil.hashPassword("plainPassword");

// Verificar senha
boolean matches = CryptoUtil.verifyPassword("plainPassword", hashedPassword);

// Gerar token seguro
String secureToken = CryptoUtil.generateSecureToken();

// Criptografar dados
String encrypted = CryptoUtil.encrypt("dados-sensiveis");
String decrypted = CryptoUtil.decrypt(encrypted);
```

### TokenGeneratorUtil

```java
// Token UUID padrão
String token = TokenGeneratorUtil.generateToken();

// Token com tamanho específico
String customToken = TokenGeneratorUtil.generateToken(32);

// Token alfanumérico
String alphaToken = TokenGeneratorUtil.generateAlphanumericToken(16);
```

### ArchbaseEmailService

```java
public interface ArchbaseEmailService {
    void sendPasswordResetEmail(String email, String token);
    void sendWelcomeEmail(String email, String name);
    void sendNotificationEmail(String email, String subject, String body);
}
```

### ArchbaseTokenCleanupService

```java
@Service
public class TokenCleanupJob {

    @Scheduled(cron = "0 0 2 * * ?")  // 2h da manhã
    public void cleanupExpiredTokens() {
        cleanupService.cleanupExpiredAccessTokens();
        cleanupService.cleanupExpiredRefreshTokens();
        cleanupService.cleanupExpiredPasswordResetTokens();
    }
}
```

---

## Testando com Segurança

```java
@SpringBootTest
@WithMockArchbaseUser(
    userId = "123e4567-e89b-12d3-a456-426614174000",
    username = "testuser",
    permissions = {"VIEW:PEDIDO", "CREATE:PEDIDO"}
)
class PedidoControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Test
    void deveListarPedidos() throws Exception {
        mockMvc.perform(get("/api/pedidos"))
            .andExpect(status().isOk());
    }
}
```

---

## Próximos Passos

- [Guia de Segurança](/docs/guias/security-setup) - Implementação passo a passo
- [Configuração de Segurança](/docs/configuracao/security-config) - YAML e ambiente
