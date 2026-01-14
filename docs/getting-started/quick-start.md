---
title: Quick Start
sidebar_position: 2
---

# Quick Start

Este guia vai ajudá-lo a criar seu primeiro projeto com Archbase Framework em minutos.

## Criar um Novo Projeto

### Usando Spring Initializr

1. Acesse [start.spring.io](https://start.spring.io)
2. Configure:
   - **Maven Project** com **Java 17**
   - **Spring Boot 3.5.x**
   - Adicione dependências: **Spring Web**, **Spring Data JPA**, **PostgreSQL Driver** (ou seu banco preferido)

3. Gere e extraia o projeto

### Adicionar Archbase

Adicione a dependência do Archbase Starter ao seu `pom.xml`:

```xml title="pom.xml"
<dependencies>
    <dependency>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-starter-web</artifactId>
    </dependency>
    <dependency>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-starter-data-jpa</artifactId>
    </dependency>

    <!-- Archbase Starter -->
    <dependency>
        <groupId>br.com.archbase</groupId>
        <artifactId>archbase-starter</artifactId>
        <version>1.0.0</version>
    </dependency>
</dependencies>
```

## Configurar a Aplicação

```yaml title="src/main/resources/application.yml"
spring:
  application:
    name: minha-primeira-app
  datasource:
    url: jdbc:postgresql://localhost:5432/meudb
    username: usuario
    password: senha
  jpa:
    hibernate:
      ddl-auto: update
    show-sql: true

archbase:
  multitenancy:
    enabled: false
  security:
    enabled: false
```

## Criar uma Entidade

```java title="src/main/java/com/exemplo/domain/Produto.java"
package com.exemplo.domain;

import br.com.archbase.ddd.domain.entity.PersistenceEntityBase;
import br.com.archbase.ddd.domain.annotation.DomainEntity;
import jakarta.persistence.*;
import java.util.UUID;

@Entity
@DomainEntity
@Table(name = "produtos")
public class Produto extends PersistenceEntityBase<Produto, UUID> {

    @Column(nullable = false)
    private String nome;

    @Column(nullable = false)
    private Double preco;

    @Column
    private Integer estoque;

    // Construtores
    public Produto() {
    }

    public Produto(String nome, Double preco, Integer estoque) {
        this.nome = nome;
        this.preco = preco;
        this.estoque = estoque;
    }

    // Getters e Setters
    public String getNome() {
        return nome;
    }

    public void setNome(String nome) {
        this.nome = nome;
    }

    public Double getPreco() {
        return preco;
    }

    public void setPreco(Double preco) {
        this.preco = preco;
    }

    public Integer getEstoque() {
        return estoque;
    }

    public void setEstoque(Integer estoque) {
        this.estoque = estoque;
    }

    @Override
    public String toString() {
        return "Produto{" +
                "id=" + getId() +
                ", nome='" + nome + '\'' +
                ", preco=" + preco +
                ", estoque=" + estoque +
                '}';
    }
}
```

## Criar um Repository

```java title="src/main/java/com/exemplo/repository/ProdutoRepository.java"
package com.exemplo.repository;

import br.com.archbase.ddd.domain.aggregate.Repository;
import br.com.archbase.ddd.domain.annotation.DomainRepository;
import com.exemplo.domain.Produto;
import java.util.UUID;

@DomainRepository
public interface ProdutoRepository extends Repository<Produto, UUID, Long> {
    // Queries automáticas estão disponíveis
    // Você pode adicionar queries customizadas aqui
}
```

## Criar um Service

```java title="src/main/java/com/exemplo/service/ProdutoService.java"
package com.exemplo.service;

import br.com.archbase.query.domain.ArchbaseQuery;
import br.com.archbase.query.domain.specification.ArchbaseSpecification;
import br.com.archbase.query.domain.specification.impl.EqualSpecification;
import br.com.archbase.shared.ddd.validation.ValidationResult;
import com.exemplo.domain.Produto;
import com.exemplo.repository.ProdutoRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;

@Service
public class ProdutoService {

    private final ProdutoRepository repository;

    public ProdutoService(ProdutoRepository repository) {
        this.repository = repository;
    }

    public Produto criar(Produto produto) {
        ValidationResult validationResult = produto.validate();
        if (!result.isValid()) {
            throw new IllegalArgumentException validationResult.getErrors());
        }
        return repository.save(produto);
    }

    public Produto buscarPorId(UUID id) {
        return repository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Produto não encontrado"));
    }

    public Page<Produto> listarTodos(Pageable pageable) {
        return repository.findAll(pageable);
    }

    public Page<Produto> buscarPorNome(String nome, Pageable pageable) {
        ArchbaseSpecification<Produto> spec = new EqualSpecification<>("nome", nome);
        return repository.findAll(spec, pageable);
    }

    public Produto atualizar(UUID id, Produto produtoAtualizado) {
        Produto produto = buscarPorId(id);
        produto.setNome(produtoAtualizado.getNome());
        produto.setPreco(produtoAtualizado.getPreco());
        produto.setEstoque(produtoAtualizado.getEstoque());
        return repository.save(produto);
    }

    public void deletar(UUID id) {
        repository.deleteById(id);
    }
}
```

## Criar um Controller

```java title="src/main/java/com/exemplo/controller/ProdutoController.java"
package com.exemplo.controller;

import com.exemplo.domain.Produto;
import com.exemplo.service.ProdutoService;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/api/produtos")
public class ProdutoController {

    private final ProdutoService service;

    public ProdutoController(ProdutoService service) {
        this.service = service;
    }

    @PostMapping
    public ResponseEntity<Produto> criar(@RequestBody Produto produto) {
        Produto salvo = service.criar(produto);
        return ResponseEntity.ok(salvo);
    }

    @GetMapping("/{id}")
    public ResponseEntity<Produto> buscarPorId(@PathVariable UUID id) {
        return ResponseEntity.ok(service.buscarPorId(id));
    }

    @GetMapping
    public ResponseEntity<Page<Produto>> listarTodos(Pageable pageable) {
        return ResponseEntity.ok(service.listarTodos(pageable));
    }

    @PutMapping("/{id}")
    public ResponseEntity<Produto> atualizar(
            @PathVariable UUID id,
            @RequestBody Produto produto) {
        return ResponseEntity.ok(service.atualizar(id, produto));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deletar(@PathVariable UUID id) {
        service.deletar(id);
        return ResponseEntity.noContent().build();
    }
}
```

## Executar a Aplicação

```bash
mvn spring-boot:run
```

## Testar a API

```bash
# Criar um produto
curl -X POST http://localhost:8080/api/produtos \
  -H "Content-Type: application/json" \
  -d '{
    "nome": "Notebook Gamer",
    "preco": 4500.00,
    "estoque": 10
  }'

# Listar todos os produtos
curl http://localhost:8080/api/produtos

# Buscar por ID
curl http://localhost:8080/api/produtos/{id}

# Atualizar produto
curl -X PUT http://localhost:8080/api/produtos/{id} \
  -H "Content-Type: application/json" \
  -d '{
    "nome": "Notebook Gamer Pro",
    "preco": 5000.00,
    "estoque": 8
  }'

# Deletar produto
curl -X DELETE http://localhost:8080/api/produtos/{id}
```

## Estrutura do Projeto

```
meu-projeto/
├── src/main/
│   ├── java/com/exemplo/
│   │   ├── domain/           # Entidades DDD
│   │   │   └── Produto.java
│   │   ├── repository/       # Repositories
│   │   │   └── ProdutoRepository.java
│   │   ├── service/          # Serviços de domínio
│   │   │   └── ProdutoService.java
│   │   └── controller/       # Controllers REST
│   │       └── ProdutoController.java
│   └── resources/
│       └── application.yml
└── pom.xml
```

## Próximos Passos

- [Estrutura do Projeto](/docs/getting-started/project-structure) - Organização completa
- [Conceitos DDD](/docs/category/conceitos-ddd) - Entenda os fundamentos
- [Criando Entidades](/docs/guias/creating-entities) - Padrões avançados
- [Criando Repositories](/docs/guias/creating-repositories) - Queries e Specifications

## Recursos Adicionais

- [Spring Initializr](https://start.spring.io)
- [Documentação Spring Boot](https://spring.io/projects/spring-boot)
- [GitHub Archbase](https://github.com/archbase-framework/archbase-app-framework)
