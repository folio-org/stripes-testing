# Pane request waiter

`PaneRequestWaiter` synchronizes Cypress actions with the network requests used
by Acquisitions list panes and find-record plugins. Request definitions live in
one place, so tests do not need to repeat endpoint intercepts or manually model
references fetched from result IDs.

> **Scope:** This utility has been audited and end-to-end tested only with the
> supported Acquisitions (ACQ) modules and plugins listed below. Treat support
> for non-ACQ applications as unverified until their profiles and tests are added.

The utility is exported by `cypress/support/utils/index.js`:

```js
import { PaneRequestWaiter } from '../../support/utils';

const { PANE_REQUEST_PHASES, PANE_REQUEST_PROFILE_NAMES } = PaneRequestWaiter;
```

## Supported profiles

| Constant | Profile | Result/reference behavior |
| --- | --- | --- |
| `ORDERS` | `orders` | Composite orders → vendors, acquisition units, users |
| `ORDER_LINES` | `orderLines` | Order lines → orders → acquisition units; optional ISBN conversion first |
| `ORGANIZATIONS` | `organizations` | Organization list |
| `RECEIVING` | `receiving` | Titles → PO lines → holdings/locations and orders |
| `INVOICES` | `invoices` | Invoices → vendor organizations |
| `CLAIMING` | `claiming` | Wrapper pieces → vendor organizations |
| `FISCAL_YEARS` | `fiscalYears` | Fiscal-year list |
| `LEDGERS` | `ledgers` | Ledger list |
| `GROUPS` | `groups` | Group list |
| `FUNDS` | `funds` | Funds → ledgers |
| `FIND_PO_LINE` | `findPoLine` | Order lines; optional ISBN conversion first |
| `FIND_ORGANIZATION` | `findOrganization` | Organization list |
| `FIND_FUND` | `findFund` | Funds → uncached ledgers |

Use these constants instead of profile-name string literals in tests.

## Architecture

The public API remains in `index.js`; implementation details are separated by
responsibility:

```text
paneRequestWaiter/
├── index.js                 public API
├── constants.js            profile names and shared limits
├── routes.js               reusable endpoint definitions
├── core/                   Cypress observation and waiting engine
├── profiles/               application-specific declarative profiles
└── utils/                  pure response and batching helpers
```

The engine depends on profile data rather than application-specific endpoints.
Consequently, adding or changing an application normally affects only its file
under `profiles/` and, when needed, a shared definition in `routes.js`.

Profiles are validated and frozen when the module loads. Validation rejects
invalid HTTP methods, accepted statuses and matchers; duplicate route IDs;
empty result variants; missing callbacks; dependency cycles or incorrect
dependency order; and invalid optional callbacks. Runtime validation also
rejects non-positive batch counts and unknown caller-supplied matcher IDs.

## Waiting for an action

`waitForPaneRequests` registers the profile immediately before running
`trigger`, then waits for the relevant requests.

```js
PaneRequestWaiter.waitForPaneRequests({
  pane: PANE_REQUEST_PROFILE_NAMES.ORDERS,
  trigger: () => FiltersPane.filterBySelection(
    filtersPane,
    'Acquisition unit',
    unitName,
  ),
});
```

Options:

- `pane` — a value from `PANE_REQUEST_PROFILE_NAMES`.
- `trigger` — the function that performs the UI action after request tracking
  is installed.
- `phase` — `PANE_REQUEST_PHASES.RESULTS` by default; use
  `PANE_REQUEST_PHASES.FILTERS` while opening a pane or plugin.
- `conditions` — runtime facts that cannot be learned from API responses.
- `matchers` — optional route-specific predicates for distinguishing unrelated
  calls to the same endpoint.
- `timeout` — optional Cypress request timeout override in milliseconds.

The result phase yields the primary Cypress interceptions. The filters phase
yields the URLs of completed filter-resource requests.

## Asserting that no request runs

Some behavior is defined by a request the application must *not* send, such as a
search index change that only takes effect when the user submits the search.
`assertNoPaneRequests` runs the action, keeps watching the profile for a quiet
period, and fails if any of its requests were sent.

```js
PaneRequestWaiter.assertNoPaneRequests({
  pane: PANE_REQUEST_PROFILE_NAMES.FIND_PO_LINE,
  trigger: () => SelectOrderLinesModal.selectSearchIndex('POL number'),
});
```

Options match `waitForPaneRequests`, except `timeout` is replaced by
`quietPeriod` — the time in milliseconds the pane must stay silent after the
action (2000 by default). An absent request cannot be awaited, so raise it only
when an application is known to schedule requests later than that.

## Filter panes

Filter resources are requested when their components render. Some resources
may not be sent because React Query already cached them, a setting disabled the
filter, the filter is hidden, or the current tenant mode does not use it.

For `phase: PANE_REQUEST_PHASES.FILTERS`, the utility observes matching requests
through Cypress's network layer. It waits until every matching request that was
actually sent has completed and the profile has remained quiet for a short
interval. Because tracking is outside the application window, it continues
across `cy.visit()` navigation and covers both `fetch` and XHR. It also leaves
later test intercepts free to inspect or stub the same requests. This avoids
waiting for aliases that correctly never occur.

```js
PaneRequestWaiter.waitForPaneRequests({
  pane: PANE_REQUEST_PROFILE_NAMES.FIND_PO_LINE,
  phase: PANE_REQUEST_PHASES.FILTERS,
  trigger: () => Invoices.openPolSearchPlugin(),
});
```

Tag settings and tag data are both registered as possible filter routes; tag
data is awaited only when the enabled setting causes the UI to request it.
Central-ordering and default Receiving-search settings are likewise tracked
only when the UI requests them.

## Result dependencies

Result profiles first wait for the primary list request. They inspect its
response and wait for reference requests only when returned records contain the
corresponding IDs. Dependencies can depend on other dependencies.

Examples include:

- Orders → organizations, acquisition units, and assigned users.
- Order lines → orders → acquisition units.
- Invoices and Claiming → organizations.
- Funds → ledgers.
- Receiving → order lines → holdings → locations, plus orders.

The application batches ID lookups in groups of 25. Profiles calculate the
number of batches from the returned IDs and wait for every batch.

All responses must be below HTTP 400 unless their route explicitly declares an
accepted validation status. Requests canceled during a query-state replacement
are skipped, and the waiter awaits the replacement request with the same alias.

Find Fund caches fetched ledgers while its plugin instance remains open. The
profile remembers those ledger IDs and does not wait for a repeated lookup. Its
cache is reset when a new filter phase opens the plugin.

Order lines and Find PO line also support an ISBN-conversion result variant.
With `conditions.isbnConversion`, the waiter first awaits
`/isbn/convertTo13`. A successful conversion is followed by the order-line
request; the expected 400 response for an invalid ISBN completes the chain
without waiting for an order-line request the application will not send.

## Runtime conditions

Conditions are necessary only when the request choice cannot be determined
from a preceding response. They are also used to select a primary result
variant before the first response exists. Receiving needs the tenant mode to
choose between local and consortium holdings endpoints:

```js
PaneRequestWaiter.waitForPaneRequests({
  pane: PANE_REQUEST_PROFILE_NAMES.RECEIVING,
  conditions: { crossTenant: true },
  trigger: () => FiltersPane.filterBySelection(filtersPane, 'Status', 'Open'),
});
```

Do not add conditions for IDs visible in response bodies; model those as
`responseDependencies` in the profile instead.

Order Line and Find PO Line callers set `isbnConversion: true` only when the
selected search index is Product ID ISBN. The conversion response itself then
decides whether the order-line request is expected.

## Matchers

A matcher receives the parsed request URL and returns whether the request
belongs to the current action:

```js
PaneRequestWaiter.waitForPaneRequests({
  pane: PANE_REQUEST_PROFILE_NAMES.ORDERS,
  matchers: {
    orders: ({ query }) => query.query?.includes('poNumber'),
  },
  trigger: () => Orders.searchByPoNumber(poNumber),
});
```

Matcher input contains:

- `url` — complete request URL.
- `pathname` — URL path without the query string.
- `query` — parsed query parameters.

Profiles can also define built-in matchers when several resources use the same
endpoint, as the settings profiles do.

## Registering aliases separately

Use `interceptPaneRequests` only when registration and the action cannot be
kept together. It returns route IDs mapped to action-scoped Cypress aliases.
The caller is responsible for triggering the action and waiting on the aliases.

```js
const aliases = PaneRequestWaiter.interceptPaneRequests({
  pane: PANE_REQUEST_PROFILE_NAMES.INVOICES,
});

Invoices.searchByNumber(invoiceNumber);
cy.wait(aliases.invoices);
```

Prefer `waitForPaneRequests` for normal tests because it also resolves linked
requests, validates HTTP statuses, handles batching, and supports cached filter
resources.

When registering a conditional result separately, pass the same `conditions`
that `waitForPaneRequests` would receive so the correct primary aliases are
created.

## Extending a profile

Each route has a stable `id`, exact `pathname`, HTTP `method`, and optional
built-in matcher. A route may also declare `acceptedErrorStatuses` when a
validation endpoint intentionally uses an HTTP error as a terminal result.
Do not use that option to tolerate ordinary backend failures.

A `resultVariant` contains a `when` predicate over runtime conditions and the
replacement primary `routes`. Variants are checked in declaration order; the
first match wins, otherwise the profile's normal `results` routes are used.

A response dependency defines:

- `route` — the linked endpoint.
- `dependsOn` — response route IDs required before evaluation.
- `when` — whether prior responses require the request.
- `requestCount` — optional number of requests, normally used for batching.
- `remember` — optional UI-cache bookkeeping after a successful request.

Register all dependency endpoints before `trigger` runs. Keep dependency order
topological: a dependency must appear after any dependency named in
`dependsOn`.

Place pane definitions with their owning application:

- `orders.js` — Orders and Order Lines.
- `receiving.js` — Receiving and its reference chain.
- `finance.js` — fiscal years, ledgers, groups, funds, and shared fund logic.
- `plugins.js` — find-record plugins.
- The remaining files contain their matching application profile.

Keep endpoint paths in `routes.js`, record extraction in `utils/responses.js`,
and generic request behavior under `core/`. Application-specific response
fields and conditions belong in profiles, not in the waiting engine.
