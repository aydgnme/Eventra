# Eventra E2E Tests

Comprehensive end-to-end test suite using Playwright for UI testing, feature testing, performance monitoring, and accessibility checks.

## Setup

Tests are already configured in `playwright.config.js` and dependencies installed.

## Running Tests

### Run all tests
```bash
npm run test:e2e
```

### Run tests with UI
```bash
npm run test:e2e:ui
```

### Run tests in debug mode
```bash
npm run test:e2e:debug
```

### Run specific test file
```bash
npx playwright test e2e/auth.spec.js
```

### Run tests in specific browser
```bash
npx playwright test --project=chromium
npx playwright test --project=firefox
npx playwright test --project=webkit
```

## Test Files

### `auth.spec.js`
- Login form elements and validation
- Registration form elements
- Password reset flow
- Navigation between auth pages
- Email format validation

### `events.spec.js`
- Events list page rendering
- Event search and filtering
- Event detail page navigation
- QR code visibility
- Pagination
- Responsive design
- Category and date range filters

### `features.spec.js`
- QR code display and download
- ICS calendar export
- Attendance statistics
- Event status display
- Registration buttons
- API data loading and caching
- Error handling for failed API calls
- Network error handling

### `ui-components.spec.js`
- Heading hierarchy
- Form label accessibility
- Navigation structure
- Footer content
- Error messages
- Button states
- Loading states
- Form placeholders
- Keyboard navigation
- Focus indicators
- Image alt text
- Mobile responsiveness
- Touch targets

### `performance.spec.js`
- Page load time measurements
- Cumulative Layout Shift (CLS) measurement
- CSS optimization
- Image lazy loading
- JavaScript bundle efficiency
- Broken image detection
- API request efficiency
- Resource cleanup on navigation
- Memory leak detection

## Test Environment

- Base URL: `http://localhost:5050`
- Starts Vite dev server automatically
- Runs on chromium, firefox, and webkit
- Takes screenshots on failure
- Records traces on first retry (CI only)

## Debugging

### View test report
After running tests, open the HTML report:
```bash
npx playwright show-report
```

### Debug specific test
```bash
npx playwright test e2e/auth.spec.js --debug
```

### View test trace
```bash
npx playwright show-trace trace.zip
```

## Best Practices

1. Tests use `data-testid` attributes when available
2. Fallback to visible text for element selection
3. Tests handle missing elements gracefully
4. Performance metrics use realistic thresholds
5. Accessibility checks follow WCAG guidelines
6. Tests are independent and can run in any order

## CI Integration

Tests are configured to run in CI environments with:
- Single worker (sequential execution)
- 2 automatic retries
- Screenshots on failure
- Full traces on first retry

## Expected API Endpoints

The tests expect the following API endpoints to be available:
- `GET /api/events` - List events
- `GET /api/events/:id` - Get event details
- `POST /api/auth/login` - User login
- `POST /api/auth/register` - User registration
- `POST /api/auth/forgot-password` - Password reset request
- `GET /api/me` - Get current user

## Notes

- Tests use relative URLs (baseURL configured in playwright.config.js)
- Mock/test data should be available in dev environment
- Tests are non-destructive and read-only where possible
- Some features may be behind authentication - configure test user if needed
