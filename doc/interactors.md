## Stripes Component Interactors

One of the advantages of having a custom design system and component
library is that we don't start from scratch when writing tests that
target an application using it. We know very precicesly what shape the
structure the DOM will take, and we can use that knowledge to our
advantage when it comes to writing tests.

For every component in the
[stripes-components](https://github.com/folio-org/stripes-components#stripes-components)
library, there is a corresponding interactor that can be used in your
tests. For example, to interact with a stripes Button in a Jest test,
you would do something like the following:

``` javascript
import { Button, Heading } from '@folio/stripes-testing';
import { App } from '../app';

describe("My Page", () => {
  beforEach(() => render(<App>));

  it('can click a button to reveal a secret message', async () => {
    await Button("Click Me!").click();

    await Heading("Thank You!").exists();
  });
})
```

You can use these interactors inside any testing framework that runs
in the same runtime environment as the DOM  such as Karma, Jest,
Cypress, or BigTest Platform. However, they cannot be used with test
runners that runs tests in a remote runtime environment that does not
include the DOM under test such as Selenium, or Nightmare.

### Table of Contents

- [`Accordion`](#accordion)
- [`Tooltip`](#tooltip)

#### Accordion

The accordion element

##### Synopsis

``` javascript
import { Accordion } from '@folio/stripes-testing';

Accordion("Location").is({ open: true });
```

##### Locator

Accordions are identified by their header. For example:

```javascript
Accordion("Categories").exists()
```

##### Actions

- `clickHeader()`: clicks on an accordion to either open or close it
- `focus`: transfers focus to the open/close toggle of this accordion

##### Filters

- `id`: _string_ = the DOM element id of this accordion. The `id`
  filter is provided for debugging, but should not generally be used
  in tests since it is not a user-facing value
- `label`: _string_ = the user identifying text of this
  accordion. This is the same value as the locator.
- `open`: _boolean_ = `true` if this accordion is expanded, `false`,
  if not
- `focused`: _boolean_ = `true` if the keyboard focus is anywhere
  inside this accordion
- `index`: _number_ = the 0 based index of this accordion with in a
  pane set. So for example `Accordion("Users").has({ index: 2 })`
  would assert that the "Users" accordion was 3rd in its accordion
  set.

#### Tooltip

Informational text that appears next to an element on mouseover in
order to provide additional instructions

##### Synopsis

``` javascript
import { Tooltip } from '@folio/stripes-testing';

Tooltip("Throw this user to the trash").exists();
```

##### Locator

Tooltips are located by their text property:

```javascript
Tooltip("save this document").has({ text: "save this document" });
```

### Filters

- `id`: _string_ = the DOM element id of this tooltip. The `id` filter
  is providerd for debugging, but should not generally be used for
  tests
- `text`: _string_ = the text of the toolip
- `subtext`: _string_ = subtext of the tooltip
- `visible`: _boolean_ = `true` if the tooltip is currently showing
- `proximity`: _boolean_ = `true` if this tooltip is a proximity
  tooltip in the DOM for the benefit of assitive technology. You
  should not generally need to use this filter in tests
