import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { AuthService } from 'src/auth/auth.service';
import {
  getModel,
  getListViewByModel,
  getEditViewByModel,
} from './model.store';
import { MddService } from './mdd.service';
import {
  IActionParam,
  IFormActionParam,
  IListActionParam,
  IMetaRequest,
} from 'src/api';

@Controller('mdd')
export class MddController {
  constructor(
    protected readonly auth: AuthService,
    private readonly mddService: MddService,
  ) {
    console.log('AppController: init');
  }

  @Get('model')
  model(@Query('name') name: string) {
    return getModel(name);
  }

  @Post('models')
  models(@Body('names') names: string[]) {
    return this.mddService.getModels(names);
  }

  @Get('list')
  list(@Query('name') name: string) {
    return getListViewByModel(name);
  }

  @Get('view')
  view(@Query('name') name: string, @Query('viewtype') viewType: string) {
    return getEditViewByModel(name, viewType);
  }

  @Post('newsingleaction')
  newSingleAction(@Body() params: IFormActionParam) {
    return this.mddService.submitSingleRecord(params);
  }

  @Post('delsingleaction')
  delSingleAction(@Body() params: IActionParam) {
    return this.mddService.delSingleRecord(params);
  }

  @Post('querylistaction')
  queryListAction(@Body() params: IListActionParam) {
    return this.mddService.queryList(params);
  }

  @Post('querysingleaction')
  querySingleAction(@Body() params: IActionParam) {
    return this.mddService.querySingle(params);
  }
  @Post('dicts')
  getDicts(@Body() { names }: { names: string[] }) {
    return this.mddService.getDicts(names);
  }

  @Post('meta')
  getMeta(@Body() params: IMetaRequest) {
    return this.mddService.getMeta(params);
  }
}
