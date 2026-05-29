# pairing — 能力清单与对外接口

## 配对挑战（pairing-challenge.ts）

```typescript
function issuePairingChallenge(params: PairingChallengeParams): Promise<void>
```

## 配对消息（pairing-messages.ts）

```typescript
function buildPairingReply(params: {
  channel: PairingChannel;
  idLine: string;
  code: string;
}): string
```

## 配对存储（pairing-store.ts）

```typescript
function upsertPairingRequest(params: {
  channel: PairingChannel;
  id: string | number;
  accountId: string;
}): Promise<{ code: string; created: boolean }>

function approvePairingRequest(params: {
  channel: PairingChannel;
  code: string;
  accountId: string;
}): Promise<{ approved: boolean; id: string }>

function listPendingPairingRequests(params: {
  channel: PairingChannel;
  accountId: string;
}): Promise<Array<{ id: string; code: string }>>
```

## AllowFrom（allow-from-store-file.ts）

```typescript
function readAllowFromFileWithExists(params: {
  channel: PairingChannel;
  accountId: string;
}): Promise<string[]>

function writeAllowFromFile(params: {
  channel: PairingChannel;
  accountId: string;
  entries: string[];
}): Promise<void>
```

## 设置码（setup-code.ts）

```typescript
function generateSetupCode(params: {
  config: OpenClawConfig;
}): Promise<{ code: string; url: string }>
```

## 标签（pairing-labels.ts）

```typescript
function resolvePairingIdLabel(channel: PairingChannel): string
```
