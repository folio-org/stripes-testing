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
- [`Pane`](#pane)
- [`KeyValue`](#keyvalue)
- [`Select`](#select)
- [`TextField`](#textfield)
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

#### KeyValue

Key Value are simple label/text pairs.

##### Synopsis

``` javascript
import { KeyValue } from '@folio/stripes-testing';

Accordion("Occupation").has({ value: 'librarian'});
```

##### Locator

KeyValue pairs are identified by their key. E.g.

```javascript
KeyValue("Occupation").exists();
```

##### Filters

- `value`: _string_ = The value associated with the key
- `subValue`: _string_ = KeyValue components can have a subvalue which
  is a slightly less emphasized

#### Pane

The pane element

##### Synopsis

``` javascript
import { Pane } from '@folio/stripes-testing';

Pane("Search Result").is({ visible: true });
```

##### Locator

Panes are identified by their title. For example:

```javascript
Pane("Search Result").exists();
```

##### Actions

- `dismiss`: clicks on close button on the selected pane
- `focus`: focuses the pane
- `blurs`: blurs (removes focus of) the pane

##### Filters

- `id`: _string_ = the DOM element id of this pane. The `id`
  filter is provided for debugging, but should not generally be used
  in tests since it is not a user-facing value
- `title`: _string_ = the user identifying text of this
  pane. This is the same value as the locator.
- `subtitle`: _string_ = an additional user identifying text if needed
  to differentiate between panes.
- `focused`: _boolean_ = `true` if the keyboard focus is anywhere
  inside this pane
- `index`: _number_ = the 0 based index of this pane with in a
  pane set. So for example `Pane("Users").has({ index: 2 })`
  would assert that the "Users" pane was 3rd in its pane set.

#### TextField

Stripes TextField component wraps a standard `input` text element, adding support for things like controls and error states.

##### Synopsis

``` javascript
import { TextField } from '@folio/stripes-testing';

TextField("First Name").exists();
```

##### Locator

Text fields are located by their label:

```javascript
TextField("First Name").has({ label: "First Name" });
```

##### Filters
- `id`: _string_ = the DOM element id of this text field. The `id` filter
  is providerd for debugging, but should not generally be used for
  tests
- `label`: _string_ = the label of the text field
- `type`: _string_ = the type of the text field. should always return `"text"`
- `value`: _string_ = the current value of the text field
- `focused`: _boolean_ = `true` if the text field is currently in focus
- `readOnly`: _boolean_ = `true` if the text field is read-only
- `startControl`: _string_ = the text content of the `startControl` element
- `endControl`: _string_ = the text content of the `endControl` element
- `error`: _string_ = text of the error associated with this
  text field. If there is no error, then this will be undefined
- `warning`: _string_ = text of the warning associated with this
  text field. If there is no warning, then this will be undefined
- `valid`: _boolean_ = is this text field valid?

##### Actions
- `blur()`: removes focus from the text field
- `clear()`: clears the text field's current value
- `fillIn(value: string)`: fills in the text field with a given value
- `focus()`: sets focus on the text field

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

##### Filters

- `id`: _string_ = the DOM element id of this tooltip. The `id` filter
  is providerd for debugging, but should not generally be used for
  tests
- `text`: _string_ = the text of the toolip
- `subtext`: _string_ = subtext of the tooltip
- `visible`: _boolean_ = `true` if the tooltip is currently showing
- `proximity`: _boolean_ = `true` if this tooltip is a proximity
  tooltip in the DOM for the benefit of assitive technology. You
  should not generally need to use this filter in tests

#### Select

Stripes Select component wraps a basic `<select>` tag, but also has
other features to integrate it with forms, including things like error
states, etc..

##### Synopsis

``` javascript
import { Select } from '@folio/stripes-testing';

Select("Currency").choose('USD');
```

##### Locator

Selects are identified by their label

```javascript
Select("Country").exists()
```

##### Actions

- `choose(optionName: string)`: selects the option matching option name

##### Filters

- `id`: _string_ = the DOM element id of the actual html `select`
  element.  Note that this _not the id of the React component_. The `id`
  filter is provided for debugging, but should not generally be used
  in tests since it is not a user-facing value
- `label`: _string_ = the user identifying text of this
  select. This is the same value as the locator.
- `placeholder`: _string_ = The placeholder text of the contained
  `select` element
- `value`: _string_ = the `value` property of the select element. It
  will be the currently selected option
- `error`: _string_ = text of the error associated with this
  `select`. If there is no error, then this will be undefined
- `warning`: _string_ = text of the warning associated with this
  select. If there is no warning, then this will be undefined
- `valid`: _boolean_ = is this select valid?
