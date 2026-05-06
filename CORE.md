# Core

Rails 8 monolith providing backend services for the Typo ecosystem.

## Infrastructure

- **Database**: SQLite with binary storage optimizations.
- **Job Queue**: Solid Queue.
- **Cache**: Solid Cache.
- **Cable**: Solid Cable.

## UUID Primary Keys

All tables use UUIDs (UUIDv7 format, base36-encoded as 25-char strings):

- Custom fixture UUID generation maintains deterministic ordering for tests
- Fixtures are always "older" than runtime records
- .first/.last work correctly in tests
