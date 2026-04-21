export function dlqMessagePk(): "OPS#DLQ#" {
  return "OPS#DLQ#";
}

export function dlqMessageSk(sourceQueueName: string, id: string): string {
  return `QUEUE#${sourceQueueName}#MESSAGE#${id}`;
}
