---
title: Configuração de Segurança
sidebar_position: 7
---

# Guia de Segurança

Guia completo para implementar autenticação e autorização com Archbase Security.

## Fluxo de Autenticação

![Fluxo de Autenticação](/img/authentication-flow.svg)

---

## 1. Configuração Mínima

### application.yml

```yaml
archbase:
  security:
    enabled: true
    jwt:
      secret: minha-chave-secreta-de-pelo-menos-256-bits
      expiration: 900000        # 15 minutos
      refresh-expiration: 604800000  # 7 dias
    method:
      enabled: true              # Habilita @HasPermission
```

---

## 2. Controller de Autenticação

```java
@RestController
@RequestMapping("/api/v1/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthenticationService authenticationService;

    @PostMapping("/login")
    public ResponseEntity<LoginResponse> login(@RequestBody LoginRequest request) {
        LoginResponse response = authenticationService.authenticate(request);
        return ResponseEntity.ok(response);
    }

    @PostMapping("/refresh")
    public ResponseEntity<AccessTokenResponse> refresh(
            @RequestBody RefreshTokenRequest request) {
        AccessTokenResponse response =
            authenticationService.refreshAccessToken(request.getRefreshToken());
        return ResponseEntity.ok(response);
    }

    @PostMapping("/logout")
    public ResponseEntity<Void> logout(@RequestBody RefreshTokenRequest request) {
        authenticationService.logout(request.getRefreshToken());
        return ResponseEntity.ok().build();
    }
}
```

### DTOs

```java
@Data
public class LoginRequest {
    private String email;
    private String password;
    private String context;        // Opcional: STORE_APP, CUSTOMER_APP, etc.
    private String contextData;    // Opcional: JSON com dados adicionais
}

@Data
public class LoginResponse {
    private String accessToken;
    private String refreshToken;
    private String tokenType = "Bearer";
    private Long expiresIn;
    private UsuarioDTO usuario;
    private Map<String, Object> additionalData;  // Dados enriquecidos
}

@Data
public class RefreshTokenRequest {
    private String refreshToken;
}

@Data
public class AccessTokenResponse {
    private String accessToken;
    private String tokenType = "Bearer";
    private Long expiresIn;
}
```

---

## 3. Protegendo Endpoints

### Configuração de Segurança

```java
@Configuration
@EnableWebSecurity
@EnableMethodSecurity
public class SecurityConfiguration extends ArchbaseSecurityConfig {

    @Bean
    public CustomSecurityConfiguration customSecurityConfiguration() {
        return CustomSecurityConfiguration.builder()
            .publicEndpoints(
                "/api/v1/auth/**",
                "/api/v1/public/**",
                "/actuator/health",
                "/error"
            )
            .corsAllowedOrigins("http://localhost:3000")
            .build();
    }
}
```

### Protegendo Controllers

```java
@RestController
@RequestMapping("/api/v1/pedidos")
@HasPermission(action = "VIEW", resource = "PEDIDO")  // Padrão para todos
public class PedidoController {

    @GetMapping
    public Page<PedidoDTO> listar(Pageable pageable) {
        // Herda VIEW:PEDIDO do controller
        return pedidoService.listar(pageable);
    }

    @GetMapping("/{id}")
    public PedidoDTO buscarPorId(@PathVariable UUID id) {
        return pedidoService.buscarPorId(id);
    }

    @PostMapping
    @HasPermission(action = "CREATE", resource = "PEDIDO")  // Sobrescreve
    public ResponseEntity<PedidoDTO> criar(@RequestBody CriarPedidoRequest request) {
        PedidoDTO criado = pedidoService.criar(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(criado);
    }

    @PutMapping("/{id}")
    @HasPermission(action = "UPDATE", resource = "PEDIDO")
    public PedidoDTO atualizar(@PathVariable UUID id,
                                @RequestBody AtualizarPedidoRequest request) {
        return pedidoService.atualizar(id, request);
    }

    @DeleteMapping("/{id}")
    @HasPermission(action = "DELETE", resource = "PEDIDO")
    public ResponseEntity<Void> deletar(@PathVariable UUID id) {
        pedidoService.deletar(id);
        return ResponseEntity.noContent().build();
    }
}
```

### Endpoints Públicos

```java
@RestController
@RequestMapping("/api/v1/public")
public class PublicController {

    @GetMapping("/health")
    @PermitAll
    public String health() {
        return "OK";
    }
}
```

---

## 4. Obtendo Usuário Autenticado

### No Controller

```java
@RestController
public class MeController {

    @GetMapping("/me")
    public ResponseEntity<UsuarioDTO> getMe(
            @AuthenticationPrincipal Usuario usuario) {
        return ResponseEntity.ok(UsuarioDTO.fromEntity(usuario));
    }

    @GetMapping("/me/permissions")
    public ResponseEntity<Set<PermissaoDTO>> getMinhasPermissoes(
            @AuthenticationPrincipal Usuario usuario) {
        return ResponseEntity.ok(
            usuario.getPermissions().stream()
                .map(PermissaoDTO::fromEntity)
                .collect(Collectors.toSet())
        );
    }
}
```

### No Service

```java
@Service
@RequiredArgsConstructor
public class PedidoService {

    private final PedidoRepository pedidoRepository;

    public Pedido criar(CriarPedidoRequest request) {
        // Obter usuário autenticado
        ArchbaseAuthentication auth =
            SecurityContextHolder.getAuthentication();

        UUID usuarioId = auth.getUserId();
        String tenantId = auth.getTenantId();

        Pedido pedido = new Pedido(usuarioId, tenantId, request);
        return pedidoRepository.save(pedido);
    }
}
```

---

## 5. Gerenciando Permissões

### Criando Permissões

```java
@Service
@RequiredArgsConstructor
public class UsuarioService {

    private final UserRepository repository;
    private final PermissionRepository permissionRepository;

    @Transactional
    public void adicionarPermissao(UUID usuarioId, String action, String resource) {
        Usuario usuario = repository.findById(usuarioId)
            .orElseThrow(() -> new NotFoundException("Usuário não encontrado"));

        Permission permissao = permissionRepository
            .findByActionAndResource(action, resource)
            .orElseGet(() -> permissionRepository.save(
                new Permission(action, resource)
            ));

        usuario.addPermission(permissao);
        repository.save(usuario);
    }
}
```

### Permissões com Tenant

```java
@HasPermission(
    action = "ADMIN",
    resource = "PEDIDO",
    tenantId = "#tenantId"  // SpEL - usa parâmetro do método
)
public Page<Pedido> listarPorTenant(@PathVariable String tenantId, Pageable pageable) {
    return pedidoRepository.findByTenantId(tenantId, pageable);
}
```

---

## 6. API Tokens (Integrações)

### Criar API Token

```java
@RestController
@RequestMapping("/api/v1/integration")
@RequiredArgsConstructor
public class ApiTokenController {

    private final ApiTokenService apiTokenService;

    @PostMapping("/tokens")
    @HasPermission(action = "CREATE", resource = "API_TOKEN")
    public ResponseEntity<ApiTokenDTO> criarToken(
            @RequestBody CriarApiTokenRequest request) {

        ApiToken token = apiTokenService.criar(
            request.getNome(),
            request.getExpiracaoEmDias()
        );

        return ResponseEntity.ok(ApiTokenDTO.fromEntity(token));
    }

    @GetMapping("/tokens")
    public List<ApiTokenDTO> listarTokens() {
        return apiTokenService.findByUser(
            SecurityContextHolder.getUserId()
        );
    }
}
```

### Usando API Token

```bash
curl -X GET https://api.example.com/api/v1/pedidos \
  -H "Authorization: Bearer ${API_TOKEN}" \
  -H "X-Tenant-ID: tenant-1"
```

---

## 7. Reset de Senha

### Solicitar Reset

```java
@RestController
@RequestMapping("/api/v1/auth/password")
@RequiredArgsConstructor
public class PasswordResetController {

    private final PasswordResetService passwordResetService;

    @PostMapping("/reset-request")
    public ResponseEntity<Void> solicitarReset(
            @RequestBody PasswordResetRequest request) {

        String token = passwordResetService.criarTokenReset(request.getEmail());
        emailService.enviarEmailReset(request.getEmail(), token);

        return ResponseEntity.ok().build();
    }

    @PostMapping("/reset-confirm")
    public ResponseEntity<Void> confirmarReset(
            @RequestBody ConfirmPasswordResetRequest request) {

        boolean sucesso = passwordResetService.resetarSenha(
            request.getToken(),
            request.getNovaSenha()
        );

        if (!sucesso) {
            throw new BadRequestException("Token inválido ou expirado");
        }

        return ResponseEntity.ok().build();
    }
}
```

### Trocar Senha (Logado)

```java
@PostMapping("/change-password")
public ResponseEntity<Void> trocarSenha(
        @AuthenticationPrincipal Usuario usuario,
        @RequestBody ChangePasswordRequest request) {

    if (!passwordEncoder.matches(request.getSenhaAtual(), usuario.getPassword())) {
        throw new BadRequestException("Senha atual incorreta");
    }

    usuario.setPassword(passwordEncoder.encode(request.getNovaSenha()));
    usuarioRepository.save(usuario);

    return ResponseEntity.ok().build();
}
```

---

## 8. Logout com Revogação

```java
@Service
@RequiredArgsConstructor
public class LogoutService {

    private final RefreshTokenRepository refreshTokenRepository;

    @Transactional
    public void logout(String refreshToken) {
        RefreshToken token = refreshTokenRepository.findByToken(refreshToken)
            .orElseThrow(() -> new BadRequestException("Token inválido"));

        token.setRevoked(true);
        token.setRevokedAt(LocalDateTime.now());

        refreshTokenRepository.save(token);
    }
}
```

---

## 9. Testando Segurança

### Test de Integração

```java
@SpringBootTest
@AutoConfigureMockMvc
class PedidoControllerSecurityTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private JwtTokenProvider tokenProvider;

    @Test
    @WithMockUser(username = "admin", roles = {"ADMIN"})
    void adminPodeCriarPedido() throws Exception {
        mockMvc.perform(post("/api/v1/pedidos")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"clienteId\": \"123\"}"))
            .andExpect(status().isCreated());
    }

    @Test
    void usuarioSemPermissaoNaoPodeCriar() throws Exception {
        String token = criarTokenParaUsuario("user", Set.of());

        mockMvc.perform(post("/api/v1/pedidos")
                .header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{}"))
            .andExpect(status().isForbidden());
    }

    @Test
    void usuarioSemTokenNaoPodeAcessar() throws Exception {
        mockMvc.perform(get("/api/v1/pedidos"))
            .andExpect(status().isUnauthorized());
    }

    private String criarTokenParaUsuario(String username, Set<Role> roles) {
        Usuario usuario = new Usuario(username, roles);
        return tokenProvider.generateToken(usuario);
    }
}
```

---

## 10. Tratamento de Erros

```java
@ControllerAdvice
public class SecurityExceptionHandler {

    @ExceptionHandler(TokenExpiredException.class)
    public ResponseEntity<ErrorResponse> handleTokenExpired() {
        return ResponseEntity
            .status(HttpStatus.UNAUTHORIZED)
            .body(new ErrorResponse("TOKEN_EXPIRED", "Token expirado"));
    }

    @ExceptionHandler(AccessDeniedException.class)
    public ResponseEntity<ErrorResponse> handleAccessDenied() {
        return ResponseEntity
            .status(HttpStatus.FORBIDDEN)
            .body(new ErrorResponse("ACCESS_DENIED", "Acesso negado"));
    }

    @ExceptionHandler(InvalidTokenException.class)
    public ResponseEntity<ErrorResponse> handleInvalidToken() {
        return ResponseEntity
            .status(HttpStatus.UNAUTHORIZED)
            .body(new ErrorResponse("INVALID_TOKEN", "Token inválido"));
    }
}
```

---

## 11. Boas Práticas

| Prática | Descrição |
|---------|-----------|
| **Tokens curtos** | Access tokens de 15-30 minutos |
| **Refresh tokens** | Use refresh tokens de 7-30 dias |
| **HTTPS** | Sempre use HTTPS em produção |
| **Secret forte** | Mínimo 256 bits gerado aleatoriamente |
| **Revogação** | Implemente revogação de tokens no logout |
| **Rate limiting** | Limite requisições de login |
| **Auditoria** | Logue tentativas de acesso |
| **Permissões** | Use o princípio do menor privilégio |

---

## Próximos Passos

- [Configuração de Segurança](/docs/configuracao/security-config) - YAML e ambiente
- [Módulo Security](/docs/modulos/security) - Anotações avançadas
- [Multi-Tenancy](/docs/guias/multitenancy-setup) - Segurança multi-tenant
