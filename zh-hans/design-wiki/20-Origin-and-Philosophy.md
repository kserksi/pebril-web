# 产品起源与理念

[Wiki 首页](Home.md) · [来源与维护](Maintenance-Guide.md)

> 产品长期愿景分区。来源：design-philosophy.md 的日期快照；保留英文原文，避免翻译引入范围变化。愿景不等于已实现功能或发布承诺；交付范围仍由开发仓库的维护规范决定。

**Positioning:** A lightweight, reliable, open-source, self-hosted image management platform built for choice.

**Core idea:** Give pictures a place to belong, and memories a way to be found.

**Brand spirit:** Professional with warmth. Freedom with boundaries.

> Internal vision document, prepared from the owner's supplied text on 2026-10-19. Principles describe intent; technical directions and thematic stages describe a vision, not shipped capabilities or an additional release checklist. The maintained product specification (`docs/01-product.md`), development plan (`docs/05-validation.md`, section 7) and frontend/API agreement (`docs/06-frontend-api-contract.md`) in the product repository govern delivery scope, current decisions, and acceptance.

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
