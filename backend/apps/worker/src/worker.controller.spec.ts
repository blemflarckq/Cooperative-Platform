import { Test, TestingModule } from '@nestjs/testing';
import { WorkerController } from './worker.controller';

describe('WorkerController', () => {
  let workerController: WorkerController;

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [WorkerController],
    }).compile();

    workerController = app.get<WorkerController>(WorkerController);
  });

  describe('health', () => {
    it('should return an ok status', () => {
      const result = workerController.health();
      expect(result.status).toBe('ok');
      expect(result.service).toBe('worker');
    });
  });
});
