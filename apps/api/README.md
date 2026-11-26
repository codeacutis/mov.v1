<p align="center">
  <a href="http://nestjs.com/" target="blank"><img src="https://nestjs.com/img/logo-small.svg" width="120" alt="Nest Logo" /></a>
</p>

[circleci-image]: https://img.shields.io/circleci/build/github/nestjs/nest/master?token=abc123def456
[circleci-url]: https://circleci.com/gh/nestjs/nest

  <p align="center">A progressive <a href="http://nodejs.org" target="_blank">Node.js</a> framework for building efficient and scalable server-side applications.</p>
    <p align="center">
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/v/@nestjs/core.svg" alt="NPM Version" /></a>
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/l/@nestjs/core.svg" alt="Package License" /></a>
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/dm/@nestjs/common.svg" alt="NPM Downloads" /></a>
<a href="https://circleci.com/gh/nestjs/nest" target="_blank"><img src="https://img.shields.io/circleci/build/github/nestjs/nest/master" alt="CircleCI" /></a>
<a href="https://coveralls.io/github/nestjs/nest?branch=master" target="_blank"><img src="https://coveralls.io/repos/github/nestjs/nest/badge.svg?branch=master#9" alt="Coverage" /></a>
<a href="https://discord.gg/G7Qnnhy" target="_blank"><img src="https://img.shields.io/badge/discord-online-brightgreen.svg" alt="Discord"/></a>
<a href="https://opencollective.com/nest#backer" target="_blank"><img src="https://opencollective.com/nest/backers/badge.svg" alt="Backers on Open Collective" /></a>
<a href="https://opencollective.com/nest#sponsor" target="_blank"><img src="https://opencollective.com/nest/sponsors/badge.svg" alt="Sponsors on Open Collective" /></a>
  <a href="https://paypal.me/kamilmysliwiec" target="_blank"><img src="https://img.shields.io/badge/Donate-PayPal-ff3f59.svg" alt="Donate us"/></a>
    <a href="https://opencollective.com/nest#sponsor"  target="_blank"><img src="https://img.shields.io/badge/Support%20us-Open%20Collective-41B883.svg" alt="Support us"></a>
  <a href="https://twitter.com/nestframework" target="_blank"><img src="https://img.shields.io/twitter/follow/nestframework.svg?style=social&label=Follow" alt="Follow us on Twitter"></a>
</p>
  <!--[![Backers on Open Collective](https://opencollective.com/nest/backers/badge.svg)](https://opencollective.com/nest#backer)
  [![Sponsors on Open Collective](https://opencollective.com/nest/sponsors/badge.svg)](https://opencollective.com/nest#sponsor)-->

## Description

[Nest](https://github.com/nestjs/nest) framework TypeScript starter repository.

## Project setup

```bash
$ npm install
```

## Compile and run the project

```bash
# development
$ npm run start

# watch mode
$ npm run start:dev

# production mode
$ npm run start:prod
```

## Run tests

```bash
# unit tests
$ npm run test

# e2e tests
$ npm run test:e2e

# test coverage
$ npm run test:cov
```

## Deployment

When you're ready to deploy your NestJS application to production, there are some key steps you can take to ensure it runs as efficiently as possible. Check out the [deployment documentation](https://docs.nestjs.com/deployment) for more information.

If you are looking for a cloud-based platform to deploy your NestJS application, check out [Mau](https://mau.nestjs.com), our official platform for deploying NestJS applications on AWS. Mau makes deployment straightforward and fast, requiring just a few simple steps:

```bash
$ npm install -g mau
$ mau deploy
```

With Mau, you can deploy your application in just a few clicks, allowing you to focus on building features rather than managing infrastructure.

## Resources

Check out a few resources that may come in handy when working with NestJS:

- Visit the [NestJS Documentation](https://docs.nestjs.com) to learn more about the framework.
- For questions and support, please visit our [Discord channel](https://discord.gg/G7Qnnhy).
- To dive deeper and get more hands-on experience, check out our official video [courses](https://courses.nestjs.com/).
- Deploy your application to AWS with the help of [NestJS Mau](https://mau.nestjs.com) in just a few clicks.
- Visualize your application graph and interact with the NestJS application in real-time using [NestJS Devtools](https://devtools.nestjs.com).
- Need help with your project (part-time to full-time)? Check out our official [enterprise support](https://enterprise.nestjs.com).
- To stay in the loop and get updates, follow us on [X](https://x.com/nestframework) and [LinkedIn](https://linkedin.com/company/nestjs).
- Looking for a job, or have a job to offer? Check out our official [Jobs board](https://jobs.nestjs.com).

## Support

Nest is an MIT-licensed open source project. It can grow thanks to the sponsors and support by the amazing backers. If you'd like to join them, please [read more here](https://docs.nestjs.com/support).

## Stay in touch

- Author - [Kamil Myśliwiec](https://twitter.com/kammysliwiec)
- Website - [https://nestjs.com](https://nestjs.com/)
- Twitter - [@nestframework](https://twitter.com/nestframework)

## License

Nest is [MIT licensed](https://github.com/nestjs/nest/blob/master/LICENSE).

## Participações em viagens

As rotas abaixo exigem o papel `ADMIN`.

| Rota | Operação |
| --- | --- |
| `GET /trips/:tripId/patient-trips` | Lista participações e prioridades. |
| `POST /trips/:tripId/patient-trips` | Inclui paciente ativo em viagem agendada, com dados da consulta, prioridade e justificativa. Cada paciente só pode aparecer uma vez na viagem. Pacientes e acompanhantes ocupam vagas. |
| `PATCH /patient-trips/:id` | Atualiza dados planejados antes do início. Para definir prioridade, envie `priority` e `priorityJustification`. |
| `PATCH /patient-trips/:id/cancel` | Cancela logicamente antes do início com `reason` obrigatório, autor e instante do servidor, liberando vagas sem excluir o registro. |
| `PATCH /patient-trips/:id/outbound-status` | Altera somente o estado de ida da participação indicada. |
| `PATCH /patient-trips/:id/return-status` | Altera somente o estado de retorno da participação indicada. |

As rotas de estado recebem `status`. No retorno, envie também `reason` para `NOT_RETURNING` (aviso prévio) ou `NO_SHOW` (ausência constatada). O backend registra autor e horário. A participação continua na viagem e a ida permanece independente. A falta de confirmação não aciona alteração automática. O registro administrativo de ausência não define quando o motorista pode seguir viagem.

A tela **Participantes e detalhes** centraliza consulta, prioridade, acompanhante e ocupação; confirmação é somente leitura. A participação cancelada permanece única por paciente/viagem, sem reinclusão automática. A remoção de acompanhante agora mantém o registro com `removedAt` e gera auditoria. Participações canceladas e acompanhantes removidos não ocupam vagas nem integram a lista operacional do motorista. Alterações planejadas de acompanhantes exigem participação ativa e viagem agendada. Registros excluídos antes desta versão não são recuperados.

Aplicar a migration `20261126150000_participation_history` antes de executar esta versão.


### Manuten??o administrativa de motoristas

`POST /users` recusa `MOTORISTA`: utilize `POST /drivers`, que cria conta e cadastro em uma transa??o com auditoria. A edi??o em `PATCH /drivers/:id` inclui dados da conta e habilita??o. A inativa??o mant?m o hist?rico e desativa Driver e User juntos.

`GET /drivers/inconsistencies` ? exclusivo do ADMIN e retorna identificadores de contas MOTORISTA sem Driver e v?nculos com papel ou situa??o divergentes. ? uma consulta para revis?o manual; n?o remove nem corrige registros existentes automaticamente.

As listagens administrativas aceitam `q`, `page` e `limit`, com ordena??o definida no servidor. N?o h? contrato para filtros adicionais ou ordena??o escolhida pelo cliente. A interface de viagens utiliza essa busca paginada e oferece edi??o/cancelamento em `SCHEDULED` e interrup??o em `IN_PROGRESS`; o backend revalida a situa??o em cada opera??o.
