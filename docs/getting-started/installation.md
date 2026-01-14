---
title: Instalação
sidebar_position: 1
---

# Instalação

Este guia mostra como instalar e configurar o Archbase Framework em seu projeto Java.

## Requisitos

- **Java** 17 ou superior
- **Spring Boot** 3.2+ ou 3.5+
- **Maven** 3.8+ ou **Gradle** 8.x

## Escolha o Starter Certo

O Archbase oferece três opções de starter, dependendo das suas necessidades:

| Starter | Descrição | Quando Usar |
|---------|-----------|-------------|
| `archbase-starter-core` | Apenas core DDD básico | Projetos simples sem segurança/multi-tenancy |
| `archbase-starter-security` | Core + segurança JWT | Projetos com autenticação mas sem multi-tenancy |
| `archbase-starter` | Todos os módulos | Aplicações corporativas completas |

## Instalação com Maven

### Starter Completo (Recomendado para aplicações corporativas)

```xml title="pom.xml"
<dependencies>
    <!-- Archbase Starter com todos os módulos -->
    <dependency>
        <groupId>br.com.archbase</groupId>
        <artifactId>archbase-starter</artifactId>
        <version>${archbase.version}</version>
    </dependency>
</dependencies>

<properties>
    <archbase.version>1.0.0</archbase.version>
    <java.version>17</java.version>
</properties>
```

### Starter com Segurança (sem multi-tenancy)

```xml title="pom.xml"
<dependency>
    <groupId>br.com.archbase</groupId>
    <artifactId>archbase-starter-security</artifactId>
    <version>${archbase.version}</version>
</dependency>
```

### Starter Core (básico)

```xml title="pom.xml"
<dependency>
    <groupId>br.com.archbase</groupId>
    <artifactId>archbase-starter-core</artifactId>
    <version>${archbase.version}</version>
</dependency>
```

## Instalação com Gradle

### Starter Completo

```groovy title="build.gradle"
dependencies {
    implementation 'br.com.archbase:archbase-starter:1.0.0'
}

java {
    sourceCompatibility = '17'
}
```

### Starter com Segurança

```groovy title="build.gradle"
dependencies {
    implementation 'br.com.archbase:archbase-starter-security:1.0.0'
}
```

### Starter Core

```groovy title="build.gradle"
dependencies {
    implementation 'br.com.archbase:archbase-starter-core:1.0.0'
}
```

## Configuração Básica

### application.yml

```yaml title="src/main/resources/application.yml"
spring:
  application:
    name: minha-aplicacao
  datasource:
    url: jdbc:postgresql://localhost:5432/meudb
    username: usuario
    password: senha
  jpa:
    hibernate:
      ddl-auto: update

archbase:
  # Multi-tenancy (opcional, requer archbase-starter)
  multitenancy:
    enabled: true
    scan-packages: com.minhaempresa.minhaapp

  # Segurança (opcional, requer archbase-starter-security)
  security:
    enabled: true
    jwt:
      secret: ${JWT_SECRET:chave-secreta-minima-32-caracteres}
      expiration: ${JWT_EXPIRATION:86400000}
```

### application.properties

```properties title="src/main/resources/application.properties"
spring.application.name=minha-aplicacao

# Database
spring.datasource.url=jdbc:postgresql://localhost:5432/meudb
spring.datasource.username=usuario
spring.datasource.password=senha
spring.jpa.hibernate.ddl-auto=update

# Archbase Multi-tenancy
archbase.multitenancy.enabled=true
archbase.multitenancy.scan-packages=com.minhaempresa.minhaapp

# Archbase Security
archbase.security.enabled=true
archbase.security.jwt.secret=chave-secreta-minima-32-caracteres
archbase.security.jwt.expiration=86400000
```

## Módulos Individuais

Você também pode adicionar módulos individualmente para ter controle granular:

```xml
<!-- Core DDD -->
<dependency>
    <groupId>br.com.archbase</groupId>
    <artifactId>archbase-domain-driven-design</artifactId>
</dependency>

<!-- Event-Driven / CQRS -->
<dependency>
    <groupId>br.com.archbase</groupId>
    <artifactId>archbase-event-driven</artifactId>
</dependency>

<!-- Multi-tenancy -->
<dependency>
    <groupId>br.com.archbase</groupId>
    <artifactId>archbase-multitenancy</artifactId>
</dependency>

<!-- Security -->
<dependency>
    <groupId>br.com.archbase</groupId>
    <artifactId>archbase-security</artifactId>
</dependency>

<!-- Query com RSQL -->
<dependency>
    <groupId>br.com.archbase</groupId>
    <artifactId>archbase-query</artifactId>
</dependency>

<!-- Validation -->
<dependency>
    <groupId>br.com.archbase</groupId>
    <artifactId>archbase-validation</artifactId>
</dependency>
```

## Verificando a Instalação

Crie uma classe de teste para verificar se tudo está funcionando:

```java title="src/test/java/com/minhaempresa/ArchbaseTest.java"
@SpringBootTest
class ArchbaseInstallationTest {

    @Autowired(required = false)
    private ApplicationContext context;

    @Test
    void contextLoads() {
        assertNotNull(context);
        System.out.println("Archbase instalado com sucesso!");
        System.out.println("Beans disponíveis: " + context.getBeanDefinitionCount());
    }
}
```

## Suporte a Spring Boot

| Versão Archbase | Spring Boot | Java |
|-----------------|-------------|------|
| 1.x | 3.2.x - 3.5.x | 17+ |

## Próximos Passos

- [Quick Start](/docs/getting-started/quick-start) - Crie seu primeiro projeto
- [Estrutura do Projeto](/docs/getting-started/project-structure) - Organização recomendada

## Solução de Problemas

:::danger Erro: NoSuchBeanDefinitionException
Certifique-se de que adicionou `@EnableArchbase` ou está usando o starter correto.
:::

:::danger Erro: Falha na auto-configuração
Verifique se as dependências do Spring Boot estão compatíveis com a versão do Archbase.
:::
