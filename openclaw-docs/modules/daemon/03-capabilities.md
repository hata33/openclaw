# daemon — API

```typescript
function installService(options: ServiceInstallOptions): Promise<ServiceInstallResult>
function uninstallService(): Promise<void>
function startService(): Promise<void>
function stopService(): Promise<void>
function getServiceStatus(): Promise<ServiceStatus>
function getServiceLogs(options?: LogOptions): Promise<string[]>
```
