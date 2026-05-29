# tasks — API

## 任务注册表

```typescript
function createTask(params: CreateTaskParams): Promise<Task>
function getTask(taskId: string): Task | null
function listTasks(filter?: TaskFilter): Task[]
function cancelTask(taskId: string): Promise<void>
function retryTask(taskId: string): Promise<void>
```

## 任务执行器

```typescript
function enqueueTask(task: Task): Promise<void>
function getExecutorStatus(): ExecutorStatus
```

## TaskFlow

```typescript
function createTaskFlow(params: CreateTaskFlowParams): Promise<TaskFlow>
function addFlowStep(flowId: string, step: FlowStep): Promise<void>
function waitForCondition(flowId: string, condition: WaitCondition): Promise<void>
```

## 存储

```typescript
interface TaskStore {
  save(task: Task): Promise<void>
  load(taskId: string): Promise<Task | null>
  query(filter: TaskFilter): Promise<Task[]>
  delete(taskId: string): Promise<void>
}
```
