---
sidebar_position: 2
---

# Introdução


## Como escolher uma forma de transação distribuída (TCC, SAGA, 2PC, compensação, consistência eventual baseada em mensagens, etc.)


### Várias formas de transações distribuídas
Existem muitas formas convencionais de transações distribuídas, incluindo:

* Transação distribuída com base em mensagem;
* Transação distribuída baseada em compensação (formulário de compensação automática gts/seata);
* Transação distribuída baseada em TCC;
* Transações distribuídas baseadas em SAGA;
* Transação distribuída baseada em 2PC;

A razão pela qual existem tantos formas é *porque não há bala de prata para nada, apenas a solução mais adequada para a cena atual*.

Os princípios dessas formas foram analisados ​​em muitos documentos. Esta documentação se concentrará em como escolher a distribuição correspondente de acordo a forma do negócio.


### Quando escolher transações autônomas?

Quando as condições permitirem, devemos usar transações autônomas o máximo possível, porque em transações autônomas não há necessidade de coordenar outras fontes de dados, o que reduz o consumo de tempo de interação da rede e consumo de IO de armazenamento necessário para coordenação. No caso de modificar a mesma quantidade de dados de negócios, as transações autônomas terão maior desempenho.

No entanto, depois que o banco de dados autônomo é dividido verticalmente devido a fatores como desacoplamento da lógica de negócios, ou o banco de dados é dividido horizontalmente devido a fatores como pressão de desempenho do banco de dados autônomo, os dados são distribuídos em vários bancos de dados. Para coordenar as alterações, você precisa introduzir transações distribuídas.

Existem muitos formas de transações distribuídas, então como escolher a forma que se adequa ao negócio? A seguir, analisaremos sob os aspectos de cenários de uso, desempenho e custos de desenvolvimento.

### Quando escolher a transação com base na implementação de mensagem?

A transação baseada em mensagem é adequada para a confirmação ou reversão de transações distribuídas, dependendo apenas dos requisitos de negócios do iniciador da transação, e as alterações de dados de outras fontes de dados seguem os cenários de negócios do iniciador.

Por exemplo, suponha que exista uma regra de negócio: após um determinado pedido ser bem-sucedido, uma determinada quantidade de pontos será adicionada ao usuário.

Nesta regra, o serviço que gerencia a fonte de dados do pedido é o iniciador da transação e o serviço que gerencia a fonte de dados dos pontos é o seguidor da transação.

A partir desse processo, podemos ver que a transação baseada na fila de mensagens possui as seguintes operações:

* O serviço de pedidos cria um pedido e executa uma transação local;
* O serviço de pedidos publica uma mensagem;
* Serviço de ponto soma pontos após receber a mensagem;

Podemos ver que seu processo geral é relativamente simples e, ao mesmo tempo, a carga de trabalho do desenvolvimento de negócios não é grande:

* Escreva a lógica de criação do pedido no serviço de pedidos;
* Escreva a lógica de adicionar pontos no serviço de pontos;

Pode-se ver que o processo de transação é simples e o consumo de desempenho é pequeno. Os picos e gaps de tráfego entre o iniciador e o seguidor podem ser preenchidos com filas. Ao mesmo tempo, a carga de trabalho do desenvolvimento de negócios é basicamente a mesma que aquela de transações autônomas e não há necessidade de escrever um processo de lógica de negócios reversa. Portanto, a transação baseada na fila de mensagens é a forma que damos mais prioridade de uso além da transação autônoma.

### Quando Escolher Transações Implementadas com Compensação ?

No entanto, as transações implementadas com base em mensagens não podem resolver todos os cenários de negócios, como o seguinte cenário: quando um pedido é concluído, o dinheiro do usuário é deduzido ao mesmo tempo.

Aqui, o iniciador da transação é o serviço que gerencia a carteira de pedidos, mas o envio de toda a transação não pode ser determinado apenas pelo serviço de pedidos, pois é necessário garantir que o usuário tenha dinheiro suficiente para concluir a transação, e essa informação está no serviço de pagamento. Aqui podemos introduzir transações baseadas em compensação, e o processo é o seguinte:

* Preencha os dados do pedido, mas ainda não execute uma transação local;
* O serviço de pedidos envia uma chamada remota para o serviço de pagamento para deduzir o valor correspondente;
* Envie a transação do pedido após as etapas acima serem bem-sucedidas;

O processo acima seria o normal e concluido com sucesso. Se ocorrer algo anormal o processo precisará ser revertido, uma chamada remota adicional será enviada ao serviço de pagamento para adicionar o valor deduzido anteriormente.

O processo acima é mais complicado do que o processo de transação baseado na implementação da fila de mensagens, e a carga de trabalho do desenvolvimento também é maior:

* Escreva a lógica de criação de um pedido no serviço de pedidos;
* Escreva a lógica de deduzir dinheiro no serviço de pagamento;
* Escreva a lógica de retorno de compensação no serviço de pagamento;

Pode-se ver que o processo de transação é mais complicado do que a transação distribuída baseada em mensagem e requer desenvolvimento adicional de métodos de reversão de negócios relacionados e também perde a função de redução de pico e tráfego de preenchimento de gaps entre os serviços. Mas é apenas um pouco mais complicado do que transações baseadas em mensagens. Se você não pode usar transações de consistência eventual baseadas em filas de mensagens, pode dar prioridade ao uso de formas de transações baseadas em compensação.

### Quando escolher transações usando implementações de TCC

No entanto, o formulário de transação baseado em compensação não pode atender a todos os requisitos, como o seguinte cenário: quando um pedido é concluído, o dinheiro do usuário é deduzido ao mesmo tempo, mas quando a transação não é concluída ou cancelada, o cliente não consegue ver que o dinheiro diminuiu.

Neste momento podemos introduzir o TCC, o processo é o seguinte:

* O serviço de pedidos cria um pedido;
* O serviço de pedidos envia uma chamada remota para o serviço de pagamento, reservando o dinheiro do cliente;
* O serviço envia o pedido;
* O serviço de pedidos envia uma chamada remota para o serviço de pagamento, debitando o dinheiro reservado do cliente;

O processo acima é o normal. Se ocorrer algo de errado, você precisa enviar uma solicitação de chamada remota ao serviço de pagamento para cancelar o valor reservado.

O processo acima é mais complicado do que o processo de transação baseado na implementação de compensação, e a carga de trabalho de desenvolvimento também é maior:

* O serviço de pedidos escreve a lógica para criar um pedido;
* O serviço de pagamento escreve a lógica para reservar o dinheiro;
* O serviço de pagamento escreve a lógica de dedução de dinheiro;
* O serviço de pagamento escreve a lógica para liberar o dinheiro;

TCC é realmente o caso mais complicado, ele pode lidar com todos os cenários de negócios, mas independentemente das considerações de desempenho ou considerações de complexidade de desenvolvimento, tais transações devem ser evitadas tanto quanto possível.

*** Quando escolher transações implementadas com SAGA?

O SAGA pode ser considerado como uma transação de compensação assíncrona implementada usando filas.

É adequado para cenários que não precisam retornar o status final do iniciador de negócios imediatamente, por exemplo: sua solicitação foi enviada, verifique mais tarde ou preste atenção às notificações.

Para reescrever o cenário de transação de compensação acima com SAGA, o processo é o seguinte:

* O serviço de pedidos cria um registro de pedido com um estado final desconhecido e confirma a transação;
* O serviço de pagamento debita o valor necessário e executa uma transação;
* O serviço de pedidos atualiza o status do pedido para sucesso e confirma a transação;

O processo acima seria o normal e concluido com sucesso. Se a dedução do serviço de pagamento falhar, a última etapa do serviço de pedido atualizará o status do pedido para falha.

Sua carga de trabalho de codificação de negócios é um pouco mais do que transações de compensação, incluindo o seguinte:

* O serviço de pedidos cria a lógica para o pedido inicial;
* O serviço de pedidos confirma a lógica do sucesso do pedido;
* A lógica da falha do pedido de confirmação de serviço de pedido;
* A lógica de dedução de serviço de pagamento;
* A lógica de compensação do serviço de pagamento;

No entanto, SAGA possui uma vantagem de desempenho em relação a forma de transação de compensação. Durante a execução de todas as subtransações locais, não há necessidade de aguardar a execução das subtransações chamadas por ele, o que reduz o tempo de bloqueio. O vantagem de desempenho é mais óbvia. Ao mesmo tempo, utiliza filas para comunicação, o que tem o efeito de cortar picos e preencher gaps.

Portanto, esta forma é adequada para cenários de negócios que não precisam retornar ao iniciador para executar o resultado final de forma síncrona, podem ser compensados, têm requisitos de alto desempenho e não se importam com codificação adicional.

Mas é claro que o SAGA também pode ser ligeiramente modificado para se tornar uma forma semelhante ao TCC que pode reservar recursos.


https://engsoftmoderna.info/artigos/sagas.html
https://instruct.com.br/publicacoes/garantindo-transacoes-distribuidas-entre-microsservicos/
https://medium.com/olxbrasiltech/transa%C3%A7%C3%B5es-distribu%C3%ADdas-em-microservi%C3%A7os-345243925da5