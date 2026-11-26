# Indicadores administrativos

Definições técnicas adotadas para a visualização (não alteram regras de transporte): o período é filtrado pela saída planejada, com início inclusivo e fim exclusivo. A interface converte as datas locais para instantes e inclui o dia final. A evolução mensal usa o fuso America/Sao_Paulo e inclui todos os estados, inclusive canceladas.

Viagens por município contam cada viagem uma vez para cada município de consulta informado nas participações não canceladas; uma viagem pode aparecer em vários municípios. Viagens sem município informado não integram esse gráfico.

A ocupação planejada é a soma dos pacientes e acompanhantes ativos dividida pela soma da capacidade dos veículos nas viagens não canceladas do período. O denominador é capacidade por viagem, não veículos distintos. A capacidade usada é a atual do cadastro, pois não há histórico de capacidade no schema. O número de pacientes com embarque registrado é informado separadamente; não há dado de embarque de acompanhante suficiente para calcular a ocupação efetiva completa.

Os totais de veículos ativos refletem a situação atual do cadastro, não uma fotografia histórica. Na agenda, o status de manutenção também reflete o estado atual; não há calendário histórico de manutenção.
