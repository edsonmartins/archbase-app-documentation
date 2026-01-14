---
title: archbase-plugin-manager
sidebar_position: 14
---

# archbase-plugin-manager

O módulo **archbase-plugin-manager** fornece um sistema robusto de gerenciamento de plugins para aplicações baseadas no Archbase, permitindo carregamento dinâmico, gestão de dependências e extensibilidade modular.

## Instalação

```xml
<dependency>
    <groupId>br.com.archbase</groupId>
    <artifactId>archbase-plugin-manager</artifactId>
    <version>${archbase.version}</version>
</dependency>
```

## Configuração

```yaml
archbase:
  plugin:
    enabled: true
    plugins-root: ./plugins
    runtime-mode: development  # ou deployment
    system-version: 2.0.0
```

---

## Visão Geral

O sistema de plugins permite:

- **Carregamento Dinâmico** - Plugins em tempo de execução
- **Extensibilidade** - Extension Points com descoberta automática
- **Dependências** - Resolução automática entre plugins
- **Versionamento** - Suporte a SemVer
- **Isolamento** - ClassLoaders separados por plugin

```
┌─────────────────────────────────────────────────────────────┐
│                  Aplicação Principal                         │
│  ┌───────────────────────────────────────────────────────┐  │
│  │              ArchbasePluginManager                      │  │
│  │                                                         │  │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐           │  │
│  │  │ Plugin 1 │  │ Plugin 2 │  │ Plugin 3 │  ...      │  │
│  │  └──────────┘  └──────────┘  └──────────┘           │  │
│  └───────────────────────────────────────────────────────┘  │
│                                                              │
│  ┌───────────────────────────────────────────────────────┐  │
│  │              Extension Points                          │  │
│  │  ┌──────────────────┐  ┌──────────────────┐          │  │
│  │  │ ExtensionPoint A │  │ ExtensionPoint B │  ...      │  │
│  │  └──────────────────┘  └──────────────────┘          │  │
│  └───────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

---

## Criando um Plugin

### Estrutura de um Plugin

```
meu-plugin/
├── plugin.properties
└── target/classes/
    └── br/com/meu/plugin/
        ├── MeuPlugin.class
        └── MinhaExtension.class
```

### plugin.properties

```properties
# Identificador único do plugin
plugin.id=meu-plugin

# Versão (SemVer)
plugin.version=1.0.0

# Classe principal
plugin.class=br.com.meu.plugin.MeuPlugin

# Descrição
plugin.description=Meu plugin de exemplo

# Provedor
plugin.provider=Minha Empresa

# Dependências (opcionais)
plugin.dependencies=outro-plugin>=1.0.0

# Versão mínima do sistema
plugin.requires=2.0.0

# Licença
plugin.license=MIT
```

### Classe do Plugin

```java
package br.com.meu.plugin;

import br.com.archbase.plugin.arch.ArchbasePlugin;
import br.com.archbase.plugin.arch.PluginWrapper;

public class MeuPlugin extends ArchbasePlugin {

    public MeuPlugin(PluginWrapper wrapper) {
        super(wrapper);
    }

    @Override
    public void start() {
        log.info("MeuPlugin iniciado!");
        // Lógica de inicialização
    }

    @Override
    public void stop() {
        log.info("MeuPlugin parado!");
        // Lógica de parada
    }

    @Override
    public void delete() {
        log.info("MeuPlugin excluído!");
        // Lógica de limpeza
    }
}
```

---

## Extension Points

Extension points definem pontos de extensibilidade na aplicação:

```java
package br.com.minhaapp.extension;

import br.com.archbase.plugin.api.ExtensionPoint;

public interface NotificacaoExtensionPoint extends ExtensionPoint {
    void enviar(String mensagem, String destinatario);
}
```

### Criando uma Extensão

```java
package br.com.meu.plugin.extension;

import br.com.archbase.plugin.api.Extension;
import br.com.minhaapp.extension.NotificacaoExtensionPoint;

@Extension
public class EmailNotificacao implements NotificacaoExtensionPoint {

    @Override
    public void enviar(String mensagem, String destinatario) {
        log.info("Enviando email para {}: {}", destinatario, mensagem);
        // Lógica de envio
    }
}
```

### Ordem de Extensões

Use `ordinal` para definir a ordem de carregamento:

```java
@Extension(ordinal = 10)
public class ExtensaoPrioritaria implements NotificacaoExtensionPoint {
    // Será carregada primeiro
}

@Extension(ordinal = 1)
public class ExtensaoSecundaria implements NotificacaoExtensionPoint {
    // Será carregada depois
}
```

---

## Gerenciando Plugins

### Inicializando o Plugin Manager

```java
@Configuration
public class PluginConfiguration {

    @Bean
    public ArchbasePluginManager pluginManager() {
        Path pluginsRoot = Paths.get("./plugins");

        DefaultArchbasePluginManager manager =
            new DefaultArchbasePluginManager(pluginsRoot);

        // Modo de execução
        manager.setRuntimeMode(RuntimeMode.DEVELOPMENT);

        // Versão do sistema para compatibilidade
        manager.setSystemVersion("2.0.0");

        return manager;
    }
}
```

### Carregando Plugins

```java
@Service
public class PluginService {

    private final ArchbasePluginManager pluginManager;

    public void carregarPlugins() {
        // Carregar todos os plugins do diretório
        pluginManager.loadPlugins();

        // Iniciar todos os plugins
        pluginManager.startPlugins();

        // Listar plugins carregados
        pluginManager.getPlugins().forEach(wrapper -> {
            log.info("Plugin: {} - v{} - {}",
                wrapper.getPluginId(),
                wrapper.getDescriptor().getVersion(),
                wrapper.getPluginState()
            );
        });
    }

    public void carregarPluginEspecifico(Path pluginPath) {
        String pluginId = pluginManager.loadPlugin(pluginPath);
        pluginManager.startPlugin(pluginId);
    }
}
```

### Descobrindo Extensões

```java
@Service
public class NotificacaoService {

    private final ArchbasePluginManager pluginManager;

    public void enviarNotificacao(String mensagem, String destinatario) {
        // Obter todas as extensões de um tipo
        List<NotificacaoExtensionPoint> extensoes =
            pluginManager.getExtensions(NotificacaoExtensionPoint.class);

        // Executar cada extensão
        for (NotificacaoExtensionPoint ext : extensoes) {
            ext.enviar(mensagem, destinatario);
        }
    }

    public List<NotificacaoExtensionPoint> getExtensoesDoPlugin(String pluginId) {
        return pluginManager.getExtensions(
            NotificacaoExtensionPoint.class,
            pluginId
        );
    }
}
```

---

## Estados de Plugins

| Estado | Descrição |
|--------|-----------|
| `CREATED` | Plugin criado, não carregado |
| `RESOLVED` | Dependências resolvidas |
| `STARTED` | Plugin iniciado e em execução |
| `STOPPED` | Plugin parado |
| `DISABLED` | Plugin desativado |
| `FAILED` | Falha no carregamento/inicialização |

### Gerenciando Ciclo de Vida

```java
// Iniciar um plugin
PluginState state = pluginManager.startPlugin("meu-plugin");

// Parar um plugin
pluginManager.stopPlugin("meu-plugin");

// Descarregar um plugin
pluginManager.unloadPlugin("meu-plugin");

// Verificar estado
PluginWrapper plugin = pluginManager.getPlugin("meu-plugin");
if (plugin != null) {
    PluginState state = plugin.getPluginState();
    log.info("Estado atual: {}", state);
}
```

---

## Modos de Execução

### Modo Desenvolvimento

```java
pluginManager.setRuntimeMode(RuntimeMode.DEVELOPMENT);
```

- Carrega plugins de **diretórios**
- Monitora mudanças nos arquivos
- Recarrega automaticamente
- Útil durante desenvolvimento

### Modo Produção

```java
pluginManager.setRuntimeMode(RuntimeMode.DEPLOYMENT);
```

- Carrega plugins de **arquivos JAR**
- Não monitora mudanças
- Performance otimizada
- Recomendado para produção

---

## Versionamento com SemVer

### Declarando Dependências

```properties
# Versão exata
plugin.dependencies=plugin-a@1.2.3

# Faixa de versão (>= e <)
plugin.dependencies=plugin-a@>=2.0.0 <3.0.0

# Approximate (~): >=1.2.0 <1.3.0
plugin.dependencies=plugin-a@~1.2.0

# Caret (^): >=1.2.0 <2.0.0
plugin.dependencies=plugin-a@^1.2.0
```

### Resolução de Dependências

```java
// Verificar se plugin pode ser carregado
boolean isValid = pluginManager.isPluginValid(pluginWrapper);

if (!isValid) {
    List<PluginDescriptor> unresolved = pluginManager.getUnresolvedDependencies();
    log.error("Dependências não resolvidas: {}", unresolved);
}
```

---

## Eventos de Plugins

### Listener de Mudanças de Estado

```java
@Component
public class PluginStateListener implements PluginStateListener {

    @Override
    public void pluginStateChanged(PluginStateEvent event) {
        log.info("Plugin {} mudou de {} para {}",
            event.getPlugin().getPluginId(),
            event.getOldState(),
            event.getPluginState()
        );
    }
}
```

### Registrando o Listener

```java
pluginManager.addPluginStateListener(new PluginStateListener());
```

---

## Exemplo Completo

### Plugin de Notificação

**1. Extension Point (na aplicação principal):**

```java
package com.minhaapp.extension;

public interface NotificacaoExtensionPoint extends ExtensionPoint {
    void enviar(String mensagem, String destinatario);
}
```

**2. Plugin (módulo separado):**

```java
// plugin.properties
plugin.id=notificacao-email-plugin
plugin.version=1.0.0
plugin.class=com.notificacao.plugin.NotificacaoPlugin
plugin.description=Plugin de notificação por email

// NotificacaoPlugin.java
package com.notificacao.plugin;

import com.minhaapp.extension.NotificacaoExtensionPoint;

public class NotificacaoPlugin extends ArchbasePlugin {

    @Override
    public void start() {
        log.info("Plugin de notificação iniciado");
    }

    @Override
    public void stop() {
        log.info("Plugin de notificação parado");
    }
}

// EmailNotificacao.java
package com.notificacao.plugin.extension;

@Extension(ordinal = 10)
public class EmailNotificacao implements NotificacaoExtensionPoint {

    @Override
    public void enviar(String mensagem, String destinatario) {
        // Lógica de envio de email
        log.info("Email enviado para {}: {}", destinatario, mensagem);
    }
}

// SmsNotificacao.java
@Extension(ordinal = 5)
public class SmsNotificacao implements NotificacaoExtensionPoint {

    @Override
    public void enviar(String mensagem, String destinatario) {
        // Lógica de envio de SMS
        log.info("SMS enviado para {}: {}", destinatario, mensagem);
    }
}
```

**3. Usando as Extensões:**

```java
@Service
public class PedidoService {

    private final ArchbasePluginManager pluginManager;

    public void notificarPedidoCriado(Pedido pedido) {
        List<NotificacaoExtensionPoint> extensoes =
            pluginManager.getExtensions(NotificacaoExtensionPoint.class);

        for (NotificacaoExtensionPoint ext : extensoes) {
            ext.enviar(
                "Pedido " + pedido.getId() + " criado com sucesso!",
                pedido.getCliente().getEmail()
            );
        }
    }
}
```

---

## Boas Práticas

| Prática | Descrição |
|---------|-----------|
| **Versionamento SemVer** | Use versões compatíveis com SemVer |
| **Dependências Claras** | Declare todas as dependências explicitamente |
| **Nomes Únicos** | Cada plugin deve ter um ID único |
| **Estado Limpo** | Implemente start(), stop() e delete() corretamente |
| **Isolamento** | Classes do plugin ficam em classloader separado |
| **Tratamento de Erros** | Sempre trate erros adequadamente |
| **Ordem de Extensões** | Use ordinal para definir ordem de carregamento |

---

## API Reference

### ArchbasePluginManager

```java
// Ciclo de vida
void loadPlugins();
void startPlugins();
void stopPlugins();
void unloadPlugins();

// Plugin específico
String loadPlugin(Path pluginPath);
PluginState startPlugin(String pluginId);
PluginState stopPlugin(String pluginId);
boolean unloadPlugin(String pluginId);

// Extensões
<T> List<T> getExtensions(Class<T> type);
<T> List<T> getExtensions(Class<T> type, String pluginId);

// Informações
List<PluginWrapper> getPlugins();
PluginWrapper getPlugin(String pluginId);
RuntimeMode getRuntimeMode();
```

### @Extension

| Atributo | Tipo | Opcional | Descrição |
|----------|------|----------|-----------|
| `ordinal` | int | Sim | Ordem de carregamento |
| `points` | Class&lt;?&gt;[] | Sim | Extension points implementados |
| `plugins` | String[] | Sim | Plugins dependentes |

---

## Próximos Passos

- [archbase-security](/docs/modulos/security) - Segurança e autenticação
- [Event-Driven](/docs/modulos/event-driven) - CQRS e Event Bus
