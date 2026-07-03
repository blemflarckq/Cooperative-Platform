import { Injectable, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
//import { Channel, Connection, connect } from "amqplib";
import * as amqp from "amqplib";

/**
 * A small, explicit RabbitMQ wrapper for the worker.
 * Keeping it minimal makes it easy to reason about reliability.
 */
@Injectable()
export class RabbitMQProvider implements OnModuleInit, OnModuleDestroy {
  private connection!: amqp.ChannelModel;
  private channel!: amqp.Channel;

  get ch(): amqp.Channel {
    if (!this.channel) {
        throw new Error("RabbitMQ channel has not been initialized yet.");
    }
    return this.channel;
  }

  async onModuleInit() {
    this.connection = await amqp.connect(process.env.RABBITMQ_URL!);
    this.channel = (await this.connection.createChannel());

    // Ensure exchange exists (idempotent).
    await this.channel.assertExchange(process.env.RABBITMQ_EXCHANGE!, "topic", { durable: true });

    // Projections queue consumes all events for now.
    await this.channel.assertQueue("coop.projections", { durable: true });
    await this.channel.bindQueue("coop.projections", process.env.RABBITMQ_EXCHANGE!, "#");
  }

  async onModuleDestroy() {
    await this.channel?.close();
    await this.connection?.close();
  }
}