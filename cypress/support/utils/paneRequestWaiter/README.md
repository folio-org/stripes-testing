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

| Constant | Profile | UI |
| --- | --- | --- |
| `ORDERS` | `orders` | Orders |
| `ORDER_LINES` | `orderLines` | Order lines |
| `ORGANIZATIONS` | `organizations` | Organizations |
| `RECEIVING` | `receiving` | Receiving |
| `INVOICES` | `invoices` | Invoices |
| `CLAIMING` | `claiming` | Claiming |
| `FISCAL_YEARS` | `fiscalYears` | Finance fiscal years |
| `LEDGERS` | `ledgers` | Finance ledgers |
| `GROUPS` | `groups` | Finance groups |
| `FUNDS` | `funds` | Finance funds |
| `FIND_PO_LINE` | `findPoLine` | Find PO line plugin |
| `FIND_ORGANIZATION` | `findOrganization` | Find organization plugin |
| `FIND_FUND` | `findFund` | Find fund plugin |

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
invalid HTTP methods and matchers, duplicate route IDs, missing callbacks,
dependency cycles or incorrect dependency order, and invalid optional
callbacks. Runtime validation also rejects non-positive batch counts.

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

## Filter panes

Filter resources are requested when their components render. Some resources
may not be sent because React Query already cached them, a setting disabled the
filter, the filter is hidden, or the current tenant mode does not use it.

For `phase: PANE_REQUEST_PHASES.FILTERS`, the utility temporarily tracks matching `fetch` calls in
the application window. It waits until every matching call that was actually
sent has completed and the profile has remained quiet for a short interval. It
then restores the original `fetch` function. This avoids waiting for aliases
that correctly never occur.

```js
PaneRequestWaiter.waitForPaneRequests({
  pane: PANE_REQUEST_PROFILE_NAMES.FIND_PO_LINE,
  phase: PANE_REQUEST_PHASES.FILTERS,
  trigger: () => Invoices.openPolSearchPlugin(),
});
```

Tag data is conditional on the tags setting. Central-ordering and default
Receiving-search settings are also tracked only when the UI requests them.

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

Find Fund caches fetched ledgers while its plugin instance remains open. The
profile remembers those ledger IDs and does not wait for a repeated lookup. Its
cache is reset when a new filter phase opens the plugin.

## Runtime conditions

Conditions are necessary only when the request choice cannot be determined
from a preceding response. Receiving currently needs the tenant mode to choose
between local and consortium holdings endpoints:

```js
PaneRequestWaiter.waitForPaneRequests({
  pane: PANE_REQUEST_PROFILE_NAMES.RECEIVING,
  conditions: { crossTenant: true },
  trigger: () => FiltersPane.filterBySelection(filtersPane, 'Status', 'Open'),
});
```

Do not add conditions for IDs visible in response bodies; model those as
`responseDependencies` in the profile instead.

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

## Extending a profile

Each route has a stable `id`, exact `pathname`, HTTP `method`, and optional
built-in matcher. A response dependency defines:

- `route` — the linked endpoint.
- `dependsOn` — response route IDs required before evaluation.
- `when` — whether prior responses require the request.
- `requestCount` — optional number of requests, normally used for batching.
- `phase` — optional `PANE_REQUEST_PHASES.FILTERS`; dependencies otherwise
  belong to `PANE_REQUEST_PHASES.RESULTS`.
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
