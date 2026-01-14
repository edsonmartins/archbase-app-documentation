---
title: archbase-workflow-process
sidebar_position: 13
---

# archbase-workflow-process

O módulo **archbase-workflow-process** é um motor de fluxos de trabalho para Java que permite orquestrar execuções sequenciais, paralelas, condicionais e repetitivas de forma simples e flexível.

## Instalação

```xml
<dependency>
    <groupId>br.com.archbase</groupId>
    <artifactId>archbase-workflow-process</artifactId>
    <version>${archbase.version}</version>
</dependency>
```

---

## Visão Geral

O workflow process fornece:

- **Unidade de Trabalho (Work)** - Menor unidade executável
- **Contexto Compartilhado (WorkContext)** - Passagem de dados entre trabalhos
- **Tipos de Fluxo** - Sequential, Parallel, Conditional, Repeat
- **Motor de Workflow (WorkFlowEngine)** - Execução dos fluxos

### Conceitos Fundamentais

```
┌─────────────────────────────────────────────────────────────┐
│                      WorkFlow Engine                         │
│  ┌───────────────────────────────────────────────────────┐  │
│  │                    WorkFlow                             │  │
│  │  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐│  │
│  │  │  Work   │→ │  Work   │→ │  Work   │→ │  Work   ││  │
│  │  │   #1    │  │   #2    │  │   #3    │  │   #4    ││  │
│  │  └─────────┘  └─────────┘  └─────────┘  └─────────┘│  │
│  └───────────────────────────────────────────────────────┘  │
│  ┌───────────────────────────────────────────────────────┐  │
│  │                   WorkContext                          │  │
│  │  (dados compartilhados entre trabalhos)               │  │
│  └───────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

---

## Interface Work

A menor unidade executável no framework:

```java
public interface Work {
    default String getName() {
        return UUID.randomUUID().toString();
    }

    WorkReport execute(WorkContext workContext);
}
```

### Implementando uma Work

```java
public class ImprimirMensagemWork implements Work {
    private final String mensagem;

    public ImprimirMensagemWork(String mensagem) {
        this.mensagem = mensagem;
    }

    @Override
    public String getName() {
        return "imprimir: " + mensagem;
    }

    @Override
    public WorkReport execute(WorkContext context) {
        System.out.println(mensagem);

        // Retornar status de conclusão
        return SimpleWorkReport.of(
            WorkStatus.COMPLETED,
            context,
            ResultData.of(mensagem)
        );
    }
}
```

---

## WorkContext

O `WorkContext` permite passar parâmetros iniciais e compartilhar dados entre trabalhos:

```java
// Criar contexto com dados iniciais
WorkContext context = new WorkContext();
context.put("usuarioId", "123e4567-e89b-12d3-a456-426614174000");
context.put("timeout", 30000);

// Recuperar dados em um Work
String usuarioId = (String) context.get("usuarioId");

// Verificar se chave existe
if (context.has("timeout")) {
    int timeout = (int) context.get("timeout");
}

// Armazenar resultado de um trabalho para o próximo
context.put("resultadoEtapa1", dado);
```

---

## Tipos de Fluxos

### SequentialFlow

Executa trabalhos em sequência. Se um falhar, os próximos são ignorados.

```java
ImprimirMensagemWork work1 = new ImprimirMensagemWork("Vasco");
ImprimirMensagemWork work2 = new ImprimirMensagemWork("É");
ImprimirMensagemWork work3 = new ImprimirMensagemWork("Gigante!");

SequentialFlow sequentialFlow = SequentialFlow.Builder.aNewSequentialFlow()
    .named("imprimir mensagem completa")
    .execute(work1)
    .then(work2)
    .then(work3)
    .build();
```

### ParallelFlow

Executa trabalhos em paralelo usando um `ExecutorService`:

```java
ExecutorService executorService = Executors.newFixedThreadPool(3);

ImprimirMensagemWork work1 = new ImprimirMensagemWork("Olá");
ImprimirMensagemWork work2 = new ImprimirMensagemWork("Mundo");
ImprimirMensagemWork work3 = new ImprimirMensagemWork("!");

ParallelFlow parallelFlow = ParallelFlow.Builder.aNewParallelFlow()
    .named("imprimir em paralelo")
    .execute(work1, work2, work3)
    .with(executorService)
    .build();

// Lembrar: gerenciar o ciclo de vida do ExecutorService
executorService.shutdown();
```

### ConditionalFlow

Executa diferentes trabalhos baseado em uma condição:

```java
ImprimirMensagemWork work1 = new ImprimirMensagemWork("Processando...");
ImprimirMensagemWork workSucesso = new ImprimirMensagemWork("Sucesso!");
ImprimirMensagemWork workFalha = new ImprimirMensagemWork("Falha!");

ConditionalFlow conditionalFlow = ConditionalFlow.Builder.aNewConditionalFlow()
    .named("fluxo condicional")
    .execute(work1)                        // Executa primeiro
    .when(WorkReportPredicate.COMPLETED)  // Se COMPLETED
    .then(workSucesso)                    // Executa workSucesso
    .otherwise(workFalha)                  // Caso contrário, workFalha
    .build();
```

### RepeatFlow

Executa um trabalho repetidamente:

```java
ImprimirMensagemWork work = new ImprimirMensagemWork("Vasco");

// Repetir 3 vezes
RepeatFlow repeatFlow = RepeatFlow.Builder.aNewRepeatFlow()
    .named("repetir 3 vezes")
    .repeat(work)
    .times(3)
    .build();

// Repetir até condição ser satisfeita
RepeatFlow repeatFlow = RepeatFlow.Builder.aNewRepeatFlow()
    .named("repetir até sucesso")
    .repeat(work)
    .until(WorkReportPredicate.COMPLETED)
    .build();

// Repetir com delay entre execuções
RepeatFlow repeatFlow = RepeatFlow.Builder.aNewRepeatFlow()
    .named("repetir com delay")
    .repeat(work)
    .times(5)
    .interval(Duration.ofSeconds(2))
    .build();
```

---

## WorkReportPredicate

Predicados para condições baseadas no `WorkReport`:

```java
// Predicados pré-definidos
WorkReportPredicate.ALWAYS_TRUE   // Sempre verdadeiro
WorkReportPredicate.ALWAYS_FALSE  // Sempre falso
WorkReportPredicate.COMPLETED     // Status é COMPLETED
WorkReportPredicate.FAILED        // Status é FAILED

// Predicado customizado
WorkReportPredicate hasError = workReport -> {
    return workReport.getError() != null;
};

// Predicado composto
WorkReportPredicate completedWithError = WorkReportPredicate.COMPLETED
    .and(hasError);
```

---

## WorkFlowEngine

Motor responsável por executar os fluxos de trabalho:

```java
// Criar o motor
WorkFlowEngine engine = WorkFlowEngineBuilder.aNewWorkFlowEngine()
    .build();

// Executar um fluxo
WorkContext context = new WorkContext();
WorkReport report = engine.run(workflow, context);

// Verificar resultado
if (report.getStatus() == WorkStatus.COMPLETED) {
    System.out.println("Fluxo concluído com sucesso!");
} else if (report.getStatus() == WorkStatus.FAILED) {
    System.err.println("Fluxo falhou: " + report.getError());
}
```

---

## Exemplo Completo

Fluxo que:
1. Imprime "Vasco" três vezes
2. Em seguida, imprime "Olá" e "Mundo" em paralelo
3. Se ambos forem bem-sucedidos, imprime "ok", caso contrário "nok"

```java
// 1. Criar as unidades de trabalho
class ImprimirMensagemWork implements Work {
    private final String mensagem;

    public ImprimirMensagemWork(String mensagem) {
        this.mensagem = mensagem;
    }

    @Override
    public String getName() {
        return "imprimir: " + mensagem;
    }

    @Override
    public WorkReport execute(WorkContext context) {
        System.out.println(mensagem);
        return SimpleWorkReport.of(WorkStatus.COMPLETED, context, ResultData.of(mensagem));
    }
}

// 2. Configurar executor para fluxos paralelos
ExecutorService executorService = Executors.newFixedThreadPool(2);

// 3. Criar instâncias de trabalho
ImprimirMensagemWork workVasco = new ImprimirMensagemWork("Vasco");
ImprimirMensagemWork workOla = new ImprimirMensagemWork("Olá");
ImprimirMensagemWork workMundo = new ImprimirMensagemWork("Mundo");
ImprimirMensagemWork workOk = new ImprimirMensagemWork("ok");
ImprimirMensagemWork workNok = new ImprimirMensagemWork("nok");

// 4. Construir o fluxo composto
WorkFlow workflow = SequentialFlow.Builder.aNewSequentialFlow()
    .execute(RepeatFlow.Builder.aNewRepeatFlow()
        .named("imprimindo Vasco 3 vezes")
        .repeat(workVasco)
        .times(3)
        .build())
    .then(ConditionalFlow.Builder.aNewConditionalFlow()
        .execute(ParallelFlow.Builder.aNewParallelFlow()
            .named("imprimindo 'Olá' e 'Mundo' em paralelo")
            .execute(workOla, workMundo)
            .with(executorService)
            .build())
        .when(WorkReportPredicate.COMPLETED)
        .then(workOk)
        .otherwise(workNok)
        .build())
    .build();

// 5. Executar
WorkFlowEngine engine = WorkFlowEngineBuilder.aNewWorkFlowEngine().build();
WorkContext context = new WorkContext();
WorkReport report = engine.run(workflow, context);

// 6. Limpar recursos
executorService.shutdown();

// 7. Verificar resultado
System.out.println("Status final: " + report.getStatus());
```

**Saída:**
```
Vasco
Vasco
Vasco
Olá
Mundo
ok
Status final: COMPLETED
```

---

## WorkStatus

Status possíveis de execução:

| Status | Descrição |
|--------|-----------|
| `STARTED` | Unidade de trabalho iniciada |
| `COMPLETED` | Concluída com sucesso |
| `FAILED` | Falhou durante execução |

---

## Fluxos Personalizados

Você pode criar seus próprios fluxos implementando `WorkFlow`:

```java
public class MeuFlowCustomizado extends AbstractWorkFlow implements WorkFlow {

    public MeuFlowCustomizado(String name) {
        super(name);
    }

    @Override
    public WorkReport execute(WorkContext context) {
        // Lógica customizada aqui
        try {
            // Seu código
            return SimpleWorkReport.of(WorkStatus.COMPLETED, context, null);
        } catch (Exception e) {
            return SimpleWorkReport.of(WorkStatus.FAILED, context, e);
        }
    }
}
```

---

## Boas Práticas

| Prática | Descrição |
|---------|-----------|
| **Nomes únicos** | Cada Work em um fluxo deve ter nome único |
| **Tratamento de exceções** | Capture exceções e retorne no WorkReport |
| **Thread safety** | WorkContext é thread-safe, mas cuidado com estados mutáveis |
| **Gerencie ExecutorService** | Sempre faça shutdown() do executor |
| **Combine fluxos** | WorkFlow estende Work, então fluxos podem ser combinados |

---

## Próximos Passos

- [Event-Driven](/docs/modulos/event-driven) - CQRS e Event Bus
- [Validation](/docs/modulos/validation) - Validação de regras
