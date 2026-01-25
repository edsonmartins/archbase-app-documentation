/** @type {import('@docusaurus/plugin-content-docs').SidebarsConfig} */
const sidebars = {
  docsSidebar: [
    {
      type: 'category',
      label: 'Começando',
      collapsible: true,
      collapsed: false,
      items: [
        'getting-started/installation',
        'getting-started/quick-start',
        'getting-started/project-structure',
      ],
    },
    {
      type: 'category',
      label: 'Conceitos DDD',
      collapsible: true,
      collapsed: false,
      items: [
        'conceitos/ddd',
        'conceitos/bounded-contexts',
        'conceitos/value-objects',
        'conceitos/aggregates',
        'conceitos/repositories',
      ],
    },
    {
      type: 'category',
      label: 'Guias',
      collapsible: true,
      collapsed: false,
      items: [
        'guias/implementing-cqrs',
        'guias/creating-entities',
        'guias/creating-repositories',
        'guias/using-rsql',
        'guias/error-handling',
        'guias/multitenancy-setup',
        'guias/security-setup',
        'guias/testing',
      ],
    },
    {
      type: 'category',
      label: 'Configuração',
      collapsible: true,
      collapsed: true,
      items: [
        'configuracao/security-config',
      ],
    },
    {
      type: 'category',
      label: 'API',
      collapsible: true,
      collapsed: true,
      items: [
        'api/domain-entity-base',
        'api/command-bus',
        'api/event-bus',
      ],
    },
    {
      type: 'category',
      label: 'Módulos',
      collapsible: true,
      collapsed: false,
      items: [
        'modulos/starter',
        'modulos/domain-driven-design',
        'modulos/event-driven',
        'modulos/security',
        'modulos/multitenancy',
        'modulos/query-rsql',
        'modulos/validation',
        'modulos/test-utils',
        'modulos/logging',
        'modulos/value-objects',
        'modulos/mapper',
        'modulos/error-handling',
        'modulos/workflow-process',
        'modulos/plugin-manager',
        'modulos/identifier',
        'modulos/jackson',
        'modulos/archbase-architecture',
        'modulos/architecture-rules',
      ],
    },
  ],
};

export default sidebars;
