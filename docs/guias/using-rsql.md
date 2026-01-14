---
title: Usando RSQL
sidebar_position: 4
---

# Usando RSQL

RSQL (RESTful Service Query Language) permite criar **queries dinâmicas** via parâmetros de URL.

## Operadores Básicos

| Operador | Descrição | Exemplo |
|----------|-----------|---------|
| `==` | Igual a | `status==NOVO` |
| `!=` | Diferente de | `status!=CANCELADO` |
| `>=` | Maior ou igual a | `dataCriacao>=2024-01-01` |
| `<=` | Menor ou igual a | `valor<=1000` |
| `>` | Maior que | `idade>18` |
| `<` | Menor que | `quantidade<10` |

## Operadores Lógicos

| Operador | Descrição | Exemplo |
|----------|-----------|---------|
| `;` | E (AND) | `status==NOVO;prioridade==ALTA` |
| `,` | OU (OR) | `status==NOVO,status==EM_ANALISE` |

## Operadores de Lista

| Operador | Descrição | Exemplo |
|----------|-----------|---------|
| `=in=` | Está na lista | `status=in=(NOVO,EM_ANALISE,RESOLVIDO)` |
| `=out=` | Não está na lista | `status=out=(CANCELADO,ARQUIVADO)` |

## Wildcards

| Padrão | Descrição | Exemplo |
|--------|-----------|---------|
| `*valor*` | Contém | `nome==*João*` |
| `valor*` | Começa com | `email==joao*@` |
| `*valor` | Termina com | `cpf==*123` |

## Configuração do Repository

```java
@DomainRepository
public interface ProdutoRepository extends ArchbaseRSQLRepository<Produto, UUID> {

    // Suporte automático a RSQL
}
```

## Controller com Filtro

```java
@RestController
@RequestMapping("/api/v1/produtos")
public class ProdutoController {

    private final ProdutoRepository repository;

    @GetMapping("/search")
    public Page<ProdutoDTO> buscarComFiltro(
            @RequestParam(required = false) String filter,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(defaultValue = "nome,asc") String[] sort) {

        // Criar especificação RSQL
        ArchbaseSpecification<Produto> spec =
            ArchbaseRSQLJPASupport.toSpecification(filter, Produto.class);

        // Criar pageable
        Pageable pageable = PageRequest.of(
            page,
            size,
            Sort.by(Sort.Order.asc(sort[0]))
        );

        // Executar query
        return repository.findAll(spec, pageable)
            .map(ProdutoMapper::toDTO);
    }
}
```

## Exemplos de Requisições HTTP

### Filtro Simples

```bash
# Status igual a ATIVO
GET /api/v1/produtos/search?filter=status==ATIVO&page=0&size=20

# Preço maior que 100
GET /api/v1/produtos/search?filter=preco>100&page=0&size=20

# Nome contém "geladeira"
GET /api/v1/produtos/search?filter=nome==*geladeira*&page=0&size=20
```

### Filtros Compostos (AND)

```bash
# Preço > 100 E Estoque > 0
GET /api/v1/produtos/search?filter=preco>100;estoque>0

# Categoria=ELETRODOMESTICOS E Status=ATIVO
GET /api/v1/produtos/search?filter=categoria==ELETRODOMESTICOS;status==ATIVO
```

### Filtros Compostos (OR)

```bash
# Status NOVO OU EM_ANALISE
GET /api/v1/tickets/search?filter=status==NOVO,status==EM_ANALISE

# Prioridade ALTA OU CRITICA
GET /api/v1/tickets/search?filter=prioridade==ALTA,prioridade==CRITICA
```

### Lista de Valores

```bash
# Status IN (NOVO, EM_ANALISE, RESOLVIDO)
GET /api/v1/tickets/search?filter=status=in=(NOVO,EM_ANALISE,RESOLVIDO)

# Departamento NOT IN (RH, TI)
GET /api/v1/funcionarios/search?filter=departamento=out=(RH,TI)
```

### Com Datas

```bash
# Criado após 01/01/2024
GET /api/v1/pedidos/search?filter=dataCriacao>=2024-01-01

# No período (AND)
GET /api/v1/pedidos/search?filter=dataCriacao>=2024-01-01;dataCriacao<=2024-12-31
```

### Ordenação

```bash
# Ordenar por nome ASC
GET /api/v1/produtos/search?sort=nome,asc

# Ordenar por preco DESC
GET /api/v1/produtos/search?sort=preco,desc

# Ordenação múltipla
GET /api/v1/produtos/search?sort=categoria,asc&sort=preco,desc
```

## Campos Customizados

```java
@DomainRepository
public interface ProdutoRepository extends ArchbaseRSQLRepository<Produto, UUID> {

    @Override
    default ArchbaseSpecification<Produto> toSpecification(String query, Class<Produto> entityClass) {
        // Customizar parser RSQL
        RSQLVisitor<Specification<Produto>, EntityManager> visitor =
            new ArchbaseRSQLVisitor<>(Produto.class);

        return ArchbaseRSQLJPASupport.toSpecification(query, Produto.class);
    }
}
```

## Validação de Campos

```java
@Component
public class RSQLValidator {

    private static final Set<String> CAMPOS_PERMITIDOS = Set.of(
        "nome", "preco", "categoria", "estoque", "status"
    );

    public void validar(String query) {
        // Extrair campos do query RSQL
        Set<String> camposNaQuery = extrairCampos(query);

        // Validar
        Set<String> invalidos = Sets.difference(camposNaQuery, CAMPOS_PERMITIDOS);

        if (!invalidos.isEmpty()) {
            throw new BadRequestException(
                "Campos não permitidos: " + invalidos
            );
        }
    }
}
```

## Quick Search Automático

Quando uma query RSQL inválida é fornecida, faça busca automática em múltiplos campos:

```java
@Service
public class SearchService {

    private final ProdutoRepository repository;

    public Page<ProdutoDTO> buscar(String termo, Pageable pageable) {
        try {
            // Tentar parsear como RSQL
            return repository.buscarComRSQL(termo, pageable);
        } catch (Exception e) {
            // Falhou: fazer busca em múltiplos campos
            return buscarTextoLivre(termo, pageable);
        }
    }

    private Page<ProdutoDTO> buscarTextoLivre(String termo, Pageable pageable) {
        String pattern = "*" + termo + "*";
        String query = String.join(",",
            "nome==" + pattern,
            "descricao==" + pattern,
            "categoria==" + pattern
        );

        return repository.buscarComRSQL(query, pageable);
    }
}
```

## Testando RSQL

```java
@SpringBootTest
class ProdutoRepositoryTest {

    @Autowired
    private ProdutoRepository repository;

    @Test
    void deveFiltrarPorStatus() {
        ArchbaseSpecification<Produto> spec =
            ArchbaseRSQLJPASupport.toSpecification("status==ATIVO", Produto.class);

        List<Produto> produtos = repository.findAll(spec);

        assertThat(produtos).allMatch(p -> p.getStatus() == Status.ATIVO);
    }

    @Test
    void deveFiltrarPorPreco() {
        ArchbaseSpecification<Produto> spec =
            ArchbaseRSQLJPASupport.toSpecification("preco>=100;preco<=1000", Produto.class);

        List<Produto> produtos = repository.findAll(spec);

        assertThat(produtos).allMatch(p ->
            p.getPreco().compareTo(BigDecimal.valueOf(100)) >= 0 &&
            p.getPreco().compareTo(BigDecimal.valueOf(1000)) <= 0
        );
    }
}
```

## Boas Práticas

| Prática | Descrição |
|---------|-----------|
| **Validar campos** | Só permita campos específicos na query |
| **Limitar tamanho** | Use paginação sempre |
| **Sanitizar entrada** | RSQL já protege contra injection |
| **Log de queries** | Registre queries lentas |
| **Cache** | Considere cache para queries frequentes |

## Próximos Passos

- [Query Module](/docs/modulos/query-rsql) - Documentação completa do módulo
- [Repositories](/docs/guias/creating-repositories) - Criando repositórios
- [Specifications](/docs/conceitos/repositories) - Padrão Specification
