import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
//import * as request from 'supertest';
import request from 'supertest';
import { WorkerModule } from './../src/worker.module';
import type { Server } from "http";

describe('WorkerController (e2e)', () => {
  let app: INestApplication;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [WorkerModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  it('/ (GET)', () => {
    const server = app.getHttpServer() as unknown as Server;
      return request(server)
      .get('/')
      .expect(200)
      .expect('Hello World!');
  });
});
