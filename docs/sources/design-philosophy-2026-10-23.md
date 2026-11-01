# Pebril: Design Philosophy and Long-Term Vision

**Positioning:** A lightweight, reliable, open-source, self-hosted image management platform built for choice.

**Core idea:** Give pictures a place to belong, and memories a way to be found.

**Brand spirit:** Professional with warmth. Freedom with boundaries.

> Internal vision document, prepared from the owner's supplied text on 2026-10-19. Principles describe intent; technical directions and thematic stages describe a vision, not shipped capabilities or an additional release checklist. The maintained [product specification](01-product.md), [development plan](05-validation.md#7-development-plan-through-100), and [frontend/API agreement](06-frontend-api-contract.md) govern delivery scope, current decisions, and acceptance.

## 1. Why Pebril Exists

Pebril began with a personal experience.

As a blogger who enjoys photography and collecting images, I watched my collection grow while finding a particular picture became increasingly difficult. Existing galleries did not make that search easy enough.

I tried several open-source image management tools. Some required complicated Docker configuration, databases, cache services, and storage mappings. Others were still immature or gradually stopped receiving maintenance.

The image host I eventually used struggled with large batches of uploads. An out-of-memory failure made the hosted images inaccessible.

That experience raised a simple question:

**Why should saving, managing, and finding pictures be so complicated?**

Pebril grew from that question. It is not an attempt to prove that one programming language or architecture is better than another, or to dismiss the work of other open-source projects. It aims to offer another dependable choice to people who need a home for their images.

## 2. The Philosophy

Pebril brings together the imagery of a pebble and a river.

Time moves forward like a long river. Pictures carry moments from our lives that we want to keep. Pebril hopes to be a small pebble in that river: an anchor that helps people preserve those moments and find them again.

Technology can also be a lamp in a long night. Its shape, color, and source of light may change, but it still serves the person who needs that light.

Pebril should work the same way. Its code, architecture, interface, and maintenance practices may evolve. The real needs of the people using it should remain its concern.

**We do not seek to decide how everyone should preserve their memories. We want people to have the means to preserve them in their own way.**

### Respect Different Choices

Different technologies and applications serve different situations. Pebril should earn its place through its design and actual behavior, giving people another choice without diminishing the alternatives.

### Lightweight by Design

Lightweight does not mean lacking useful features. It means reducing unnecessary dependencies, resource use, and maintenance effort. Developers should carry as much of the software's complexity as practical, instead of passing it on to users.

### Image-First

Images are the center of Pebril. Uploading, conversion, search, management, and sharing should answer real image-related needs. Images should not become a secondary feature inside an oversized system.

### Reliability

Pictures are more than files. They may hold memories that cannot be replaced.

Pebril should take data integrity, access security, recovery, backups, and resource management seriously. Failures will happen; the system should make them observable, contain their impact, and support recovery wherever possible.

### Freedom with Boundaries

Users should have meaningful choices about interfaces, deployment environments, configuration, and extensions. Authentication, data integrity, permissions, and security boundaries must remain protected.

Openness means giving people freedom within dependable rules.

### Community over Ownership

One person may create Pebril, but the project should not remain confined to that person's imagination. When a trusted contributor community can govern it responsibly, stewardship should be able to move toward that community.

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

## 4. Product Vision and the Path to 1.0

The intended first stable release is a complete image management system that serves the project's original purpose and can be used and verified in practice.

The following stages preserve the themes of the supplied vision. They are not replacements for the current iteration sequence. Batch gallery management, image trash/recovery, configurable backup automation, Docker, and Cloudflare-native deployment remain broader proposals here; they do not enter the first release merely by appearing in this vision. MySQL compatibility, optional Redis caching, and generic S3-compatible storage already have their own first-version requirements in the maintained specifications.

### Stage 0: Core Foundations

The supplied draft uses `0.0.8-dev` as a historical reference for foundations developed to varying degrees: the Go service, SQLite, configuration reload, authentication and partial user administration, image reception and validation, format processing, a basic gallery, individual image management, public links and Markdown copying, Linux binary startup, memory-aware concurrency, and basic recovery.

That snapshot does not establish complete-product acceptance. Consult the development plan for current implementation and verification evidence.

### Stage 1: A Complete Image Management Experience

Address the difficulty that first motivated Pebril: finding the right picture in a growing collection.

The vision includes timeline browsing, user-defined tags, time-range and basic metadata search, useful image details, and coherent gallery operations. Broader batch management and the proposed React reference frontend require their own scope and implementation decisions.

**Acceptance direction:** People with large collections can find the images they need without unnecessary effort.

### Stage 2: Data Safety and Recovery

Treat saving, backing up, migrating, and restoring data as connected responsibilities.

Keep image and database data separate from application replacement. Retain SQLite as a lightweight option, support the confirmed database/storage adapters, and verify migration and consistent backup/restore procedures. Redis remains an optional cache rather than the owner of critical business state.

The wider vision also explores configurable backup frequency and retention, soft deletion, grace periods, and image recovery. These proposals must remain distinct from existing account-deletion rules and the current immediate image-deletion contract.

Design synchronization, backup retention, and deletion separately so an accidental deletion does not immediately destroy every recovery copy.

**Acceptance direction:** Users can restore verified database and image backups in a fresh environment.

### Stage 3: Standard APIs and Frontend Freedom

Work toward complete, documented core APIs for authentication, image management, and discovery, with clear versioning, compatibility expectations, and error behavior. The proposed OpenAPI description and official reference frontend should follow the same contracts that independent clients use.

**Acceptance direction:** An independent client can complete the core image workflow through documented APIs with the appropriate permissions.

### Stage 4: Deployment Choices

The vision considers three deployment forms:

- **Linux binaries:** Precompiled applications and straightforward startup scripts reduce the burden on personal VPS operators.
- **Docker:** Container deployment with explicit persistent-data handling can offer another installation and maintenance path.
- **Cloudflare-native:** Explore a separate design using Pages, Workers, D1, R2, and Images, subject to feasibility, compatibility, and cost evaluation.

These forms may differ internally while aiming to preserve core API semantics, security boundaries, and a coherent user experience. Linux binaries remain the maintained first-release target; the other forms retain their separate planning status. Connecting the existing backend to S3-compatible R2 storage does not, by itself, make it a Cloudflare-native application.

### Stage 5: Performance, Reliability, and Stable Release

Complete end-to-end verification before declaring the product stable.

The supplied vision highlights a shared VPS with 1 vCPU and 1 GB RAM, running a blog, web services, and other necessary components alongside Pebril. This is a proposed realistic coexistence scenario, not a new minimum-system guarantee or a replacement for the maintained normal and extreme test profiles.

Evaluate sustained uploads, conversion, concurrency, discovery, resource use, and backpressure. Exercise process crashes, power loss, disk failures, backup, migration, recovery, and API/permission consistency. Public evaluation should report actual security and stability limits.

**Release readiness should follow functional acceptance and engineering evidence, not a date chosen in advance.**

## 5. Beyond 1.0

These are possibilities to investigate, not implementation promises.

### Stage 6: An Open Ecosystem

Explore a standardized plugin architecture, third-party frontends and tools, Agent Skills and Harness integration, Markdown guidance for agents, intelligent image discovery, automation, and additional deployment/storage integrations where real demand supports them.

Each direction needs requirements research, security review, and technical validation. New trends should not displace the reliability and maintainability of the core product.

### Stage 7: Community Stewardship

The founder carries the initial development and maintenance responsibility. As trusted contributors establish the ability to govern the project, code review, release, and decision-making responsibilities can gradually broaden.

Independent community governance is a possible destination, with the founder continuing as an ordinary contributor. There is no deadline for that transition. Openness should not become a reason to transfer sensitive authority before the community is ready.

## 6. Sustainability

Commercialization is not Pebril's immediate priority. Sponsorship, hosting, deployment assistance, and professional services may eventually help sustain maintenance.

Revenue should not depend on artificially weakening the open-source core, closing data formats, or restricting APIs and migration to lock people in. Commercial services can support the project without automatically receiving authority over its community.

The aim is to keep openness and sustainable maintenance in balance.

## 7. The Vision

Pebril does not need to become the world's only image management tool. It does not need the most users or an everlasting commitment to one language, framework, or deployment platform.

It may evolve with technology, be redesigned by its community, and take forms its creator never imagined.

A lamp can change from an incandescent bulb into countless forms of LED light. Technology and needs change; the light still serves the person who needs it.

I hope that, years from now, when people want to save, manage, or find their pictures, they remember that there is still an open-source project called Pebril they can choose.

It need not belong to one person or become exactly what anyone once prescribed. One person can light it; many people can help keep it shining.

**A pebble to hold our memories. A small light to guide us home.**

May Pebril begin with a glimmer and grow freely.
