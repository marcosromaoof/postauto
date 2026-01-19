import { Controller, Get, Post, Body, Param, UseGuards } from '@nestjs/common';
import { AppService } from './app.service';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  getHealth() {
    return { status: 'ok', timestamp: new Date().toISOString() };
  }

  @Get('health')
  healthCheck() {
    return { status: 'ok', timestamp: new Date().toISOString() };
  }
}

@Controller('posts')
@UseGuards(JwtAuthGuard)
export class PostsController {
  constructor(private readonly appService: AppService) {}

  @Get()
  async getAllPosts() {
    return this.appService.getAllPosts();
  }

  @Get(':id')
  async getPost(@Param('id') id: string) {
    return this.appService.getPost(id);
  }

  @Post()
  async createPost(@Body() body: { subject: string }) {
    return this.appService.createPost(body.subject);
  }

  @Post(':id/approve')
  async approvePost(@Param('id') id: string) {
    return this.appService.approvePost(id);
  }

  @Post(':id/cancel')
  async cancelPost(@Param('id') id: string) {
    return this.appService.cancelPost(id);
  }
}

@Controller('test')
@UseGuards(JwtAuthGuard)
export class TestController {
  constructor(private readonly appService: AppService) {}

  @Get('connections')
  async testAllConnections() {
    return this.appService.testAllConnections();
  }
}
