# ekkOS Connect Test Suite

Comprehensive E2E and integration tests for the ekkOS Connect extension.

## Test Structure

```
tests/
├── e2e/                      # Playwright E2E tests
│   ├── auth.setup.ts         # Authentication setup
│   ├── auth.spec.ts          # OAuth flow tests
│   ├── mcp-deploy.spec.ts    # MCP config deployment
│   └── full-flow.spec.ts     # Complete user journeys
│
├── integration/              # API integration tests
│   └── mcp-tools.test.ts     # MCP tool execution
│
├── utils/                    # Test utilities
│   ├── api-client.ts         # ekkOS API wrapper
│   └── platform.ts           # Cross-platform helpers
│
├── fixtures/                 # Test data
├── .auth/                    # Auth state (gitignored)
├── playwright.config.ts      # Playwright config
├── vitest.config.ts          # Vitest config
└── package.json              # Test dependencies
```

## Running Tests

### Prerequisites

```bash
cd extensions/ekkos-connect/tests
npm install
npx playwright install
```

### Run All Tests

```bash
npm run test:all
```

### Run E2E Tests Only

```bash
npm run test:e2e

# With UI
npm run test:e2e:ui

# Debug mode
npm run test:e2e:debug
```

### Run Integration Tests Only

```bash
npm run test:integration
```

## Environment Variables

### For E2E Tests (Optional)

```bash
EKKOS_TEST_EMAIL=test@example.com
EKKOS_TEST_PASSWORD=yourpassword
```

Without credentials, tests run in mock mode.

### For Integration Tests (Required)

```bash
EKKOS_TEST_TOKEN=your-oauth-token
EKKOS_TEST_API_KEY=your-api-key
EKKOS_TEST_USER_ID=your-user-id
```

Integration tests are skipped without credentials.

## CI/CD

Tests run automatically via GitHub Actions:

- **On push to main** (when extension files change)
- **On PR to main** (when extension files change)
- **Manual trigger** via workflow_dispatch

### GitHub Secrets Required

| Secret | Purpose |
|--------|---------|
| `EKKOS_TEST_EMAIL` | E2E login email |
| `EKKOS_TEST_PASSWORD` | E2E login password |
| `EKKOS_TEST_TOKEN` | Integration test OAuth token |
| `EKKOS_TEST_API_KEY` | Integration test API key |
| `EKKOS_TEST_USER_ID` | Integration test user ID |

## Test Coverage

### E2E Tests Cover:
- OAuth authentication flow
- MCP config deployment to all IDEs
- Hook and skill template validation
- Full user journeys
- Error handling
- Performance benchmarks

### Integration Tests Cover:
- All 44 MCP tools
- Pattern forging and retrieval
- Secret management
- Session handling
- Plan management

## Cross-Platform Testing

Tests validate:
- **Windows**: Path handling, config locations
- **macOS**: Path handling, config locations
- **Linux**: Path handling, config locations

Each platform has different config paths that are validated.
