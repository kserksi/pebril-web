# 工程原则与技术方向

[Wiki 首页](Home.md) · [来源与维护](Maintenance-Guide.md)

> 产品长期愿景分区。来源：design-philosophy.md 的日期快照；保留英文原文，避免翻译引入范围变化。愿景不等于已实现功能或发布承诺；交付范围仍由开发仓库的维护规范决定。

## 3. Engineering Principles

### A Stable Core and Open Interfaces

The architectural direction is API-first. The backend remains responsible for images, accounts, permissions, and the data lifecycle. Mature Go libraries and necessary native image-processing components support that core.

The supplied vision proposes React as the official reference interface and OpenAPI as the description of standardized API contracts. These are directions recorded here, not claims of an implemented frontend or an adopted contract toolchain. Framework inputs, contract authority, and delivery details remain subject to the maintained frontend/API agreement.

Standard configuration files and environment variables should provide useful customization while respecting the boundaries of each setting.

The official web interface should not be the only way to use Pebril. Documented APIs should allow independent frontends, command-line tools, automation, and other clients to perform the core workflows without bypassing authentication or authorization.

### Extend Where There Is a Real Need

The first version does not need to make everything a plugin. Keep business rules, backend APIs, and security boundaries coherent. Replacing or building a frontend and integrating external programs through documented APIs are the initial forms of openness.

A broader plugin system is a future research direction, not a prerequisite for the first release.

### Protect People and Their Images

The core service should maintain consistent identity, permission, and resource-access rules. These cover ownership, administrator authority, public and private images, authorization scope, expiry, access tokens, sharing, and sensitive operations.

An independent client must not acquire a route around those rules. Technical openness should preserve the safety of users' data.

### Be a Good Neighbor on the Server

Pebril should remain useful in resource-constrained environments and coexist with blogs, databases, and other services.

Under pressure, use backpressure, bounded concurrency, and paused admission to protect existing work and data. Do not consume host resources without restraint. Support for modest hardware must be established through measurement; it is not a blanket promise of performance or immunity from out-of-memory failures.
