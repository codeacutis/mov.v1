import { ApiEndpoint } from './documentation/api-endpoint';

import { ApiTags, ApiProduces } from '@nestjs/swagger';
import { Controller, Get } from '@nestjs/common';
import { Public } from './auth/decorators';
import { AppService } from './app.service';

@ApiTags('Serviço')
@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @ApiEndpoint('Identificação do serviço', {
    access: 'PUBLIC',
    schema: { type: 'string' },
  })
  @ApiProduces('text/plain')
  @Public()
  @Get()
  getHello(): string {
    return this.appService.getHello();
  }
}
