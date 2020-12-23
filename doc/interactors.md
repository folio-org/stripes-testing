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

```javascript
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
in the same runtime environment as the DOM such as Karma, Jest,
Cypress, or BigTest Platform. However, they cannot be used with test
runners that runs tests in a remote runtime environment that does not
include the DOM under test such as Selenium, or Nightmare.

### Table of Contents

- [`Accordion`](#accordion)
- [`Button`](#button)
- [`Checkbox`](#checkbox)
- [`Dropdown`](#dropdown)
- [`IconButton`](#iconbutton)
- [`KeyValue`](#keyvalue)
- [`Layer`](#layer)
- [`Pane`](#pane)
- [`RadioButton`](#radiobutton)
- [`Select`](#select)
- [`TextArea`](#textarea)
- [`TextField`](#textfield)
- [`Tooltip`](#tooltip)

#### Accordion

The accordion element

##### Synopsis

```javascript
import { Accordion } from "@folio/stripes-testing";

Accordion("Location").is({ open: true });
```

##### Locator

Accordions are identified by their header. For example:

```javascript
Accordion("Categories").exists();
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

#### Button

The Button element

##### Synopsis

``` javascript
import { Button } from '@folio/stripes-testing';

Button("Click Me").click();
```

##### Locator

Buttons are located by their text content. For example:

```javascript
Button("Click Me").has({ text: "Click Me" });
```

##### Actions

- `click()`: clicks the button

##### Filters

- `id`: _string_ = the DOM element id of this button. The `id`
  filter is provided for debugging, but should not generally be used
  in tests since it is not a user-facing value
- `text`: _string_ = the text content of the button. This is the same value as the locator.
- `href`: _string_ = the `href` of the button, if provided
- `button`: _boolean_ = `true` if the button is a `<button>` button element
- `anchor`: _boolean_ = `true` if the button is a `<a>` anchor element
- `default`: _boolean_ = `true` if the button contains the `default` class
- `ariaLabel`: _string_ = the button's `ariaLabel` attribute
- `visible`: _boolean_ = `true` if the button is visible
- `focused`: _boolean_ = `true` if the button is in-focus

#### Checkbox

The checkbox element

##### Synopsis

```javascript
import { checkbox } from "@folio/stripes-testing";

Checkbox("Label").is({ checked: true });

##### Locator

A checkbox is identified by the label. For example:

```javascript
Checkbox("Label").exists();
```

##### Actions

- `click`: clicks on checkbox label to toggle the checked status
- `focus`: transfers focus to the enclosing label of this checkbox
- `clickInput`: clicks on the actual checkbox (helpful if there is no label)
- `clickAndBlur`: clicking also focuses the checkbox, this will immediately blur
  after the click which will trigger the field validation

##### Filters

- `id`: _string_ = the DOM element id of this checkbox. The `id`
  filter is provided for debugging, but should not generally be used
  in tests since it is not a user-facing value
- `title`: _string_ = the element title
- `label`: _string_ = the user identifying text of this
  checkbox. This is the same value as the locator.
- `checked`: _boolean_ = `true` if this checkbox is expanded, `false`,
  if not
- `valid`: _boolean_ = `true` is valid
- `value`: _string_ = the checkbox value if defined
- `focused`: _boolean_ = `true` if the keyboard focus is anywhere
  inside this checkbox
- `ariaLabel`: _boolean_ = the aria label as passed via the props
- `ariaInvalid`: _boolean_ = `true` is rendered with `"true"`, otherwise false
- `feedbackText`: _string_ = the text related to the validation warning or error
- `hasWarning`: _boolean_ = `true` if the checkbox has a warning [class]
- `hasError`: _boolean_ = `true` if the checkbox has an error [class]

#### Dropdown

The Stripes Dropdown component

##### Synopsis

```javascript
import { Dropdown } from "@folio/stripes-testing";

Dropdown("Menu").choose("Contact Us");
```

Dropdowns are identified by their label, or trigger

```javascript
Dropdown("Menu").exists();
```

##### Actions

- `choose(optionName: string)`: clicks a given option in the dropdown

##### Filters
- `open`: _boolean_ = `true` if the dropdown is open
- `visible`: _boolean_ = `true` if the dropdown is visible
- `label`: _string_ = the user identifying text of this
  dropdown. This is the same value as the locator.

#### IconButton

The IconButton element

##### Synopsis

``` javascript
import { IconButton } from '@folio/stripes-testing';

IconButton("Close").click();
```

##### Locator

An IconButton is located by its aria-label. For example:

```javascript
IconButton("Close").has({ ariaLabel: "Close" });
```

##### Actions

- `focus()`: sets focus on the icon button
- `click()`: clicks the icon button

##### Filters

- `id`: _string_ = the DOM element id of this icon button. The `id`
  filter is provided for debugging, but should not generally be used
  in tests since it is not a user-facing value
- `href`: _string_ = the `href` of the icon button, if provided
- `hash`: _string_ = the `hash` of the icon button, if provided
- `button`: _boolean_ = `true` if the icon button is a `<button>` button element
- `anchor`: _boolean_ = `true` if the icon button is a `<a>` anchor element
- `ariaLabel`: _string_ = the button's `ariaLabel` attribute
- `focused`: _boolean_ = `true` if the button is in-focus

#### KeyValue

Key Value are simple label/text pairs.

##### Synopsis

```javascript
import { KeyValue } from "@folio/stripes-testing";

KeyValue("Occupation").has({ value: "librarian" });
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

#### Layer

The layer element

##### Synopsis

```javascript
import { Layer } from "@folio/stripes-testing";
Layer("layer label").is({ visible: true });
```

##### Locator

Layers are hidden initially and more structural in nature. As such,
they can be identified by visual context. This is not applicable to
screen readers however so the component requires an aria-label to suit.
For example:

```javascript
Layer("layer label").exists();
```

##### Actions

None.

##### Filters

- `id`: _string_ = the DOM element id of this layer. The `id`
  filter is provided for debugging, but should not generally be used
  in tests since it is not a user-facing value
- `ariaLabel`: _string_ = the user identifying text of this
  layer. This is the same value as the locator.
- `visible`: _boolean_ = the state of the layer's visibility. Note that
  with the initial state of this element, it does not exist in the DOM,
  and it will be unable to find an element with `{ visible: false }`.
- `focused`: _boolean_ = `true` if the keyboard focus is anywhere
  inside this layer

#### Pane

The pane element

##### Synopsis

```javascript
import { Pane } from "@folio/stripes-testing";

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

#### RadioButton

The RadioButton element

##### Synopsis

```javascript
import { RadioButton } from "@folio/stripes-testing";

RadioButton("Label").is({ checked: true });
```

##### Locator

A RadioButton is identified by the label. For example:

```javascript
RadioButton("Label").exists();
```

##### Actions

- `click`: clicks on RadioButton label to toggle the checked status
- `focus`: transfers focus to the RadioButton input
- `blur`: blurs (removes focus of) the RadioButton

##### Filters

- `id`: _string_ = the DOM element id of this radio button. The `id`
  filter is provided for debugging, but should not generally be used
  in tests since it is not a user-facing value
- `title`: _string_ = the element title
- `label`: _string_ = the user identifying text of this
  radio button. This is the same value as the locator.
- `checked`: _boolean_ = `true` if this radio button is checked, `false`,
  if not
- `valid`: _boolean_ = `true` if the radio button is valid
- `value`: _string_ = the radio button value if defined
- `focused`: _boolean_ = `true` if the keyboard focus is anywhere
  inside this radio button
- `ariaLabel`: _boolean_ = the aria label as passed via the props
- `ariaInvalid`: _boolean_ = `true` is rendered with `"true"`, otherwise false
- `feedbackText`: _string_ = the text related to the validation warning or error
- `hasWarning`: _boolean_ = `true` if the radio button has a warning [class]
- `hasError`: _boolean_ = `true` if the radio button has an error [class]

#### Select

Stripes Select component wraps a basic `<select>` tag, but also has
other features to integrate it with forms, including things like error
states, etc..

##### Synopsis

```javascript
import { Select } from "@folio/stripes-testing";

Select("Currency").choose("USD");
```

##### Locator

Selects are identified by their label

```javascript
Select("Country").exists();
```

##### Actions

- `choose(optionName: string)`: selects the option matching option name

##### Filters

- `id`: _string_ = the DOM element id of the actual html `select`
  element. Note that this _not the id of the React component_. The `id`
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


#### TextArea

Stripes TextArea component wraps a standard `textarea` element,
adding support for things like controls and error states.

##### Synopsis

``` javascript
import { TextArea } from '@folio/stripes-testing';

TextArea("leave a comment").exists();
```

##### Locator

A TextArea is located by its label property:

```javascript
TextArea("leave a comment").has({ text: "leave a comment" });
```

##### Filters
- `id`: _string_ = the DOM element id of this textarea. The `id` filter
  is providerd for debugging, but should not generally be used for
  tests
- `label`: _string_ = the label of the textarea
- `value`: _string_ = the current value of the textarea
- `error`: _string_ = text of the error associated with this
  textarea. If there is no error, then this will be undefined
- `warning`: _string_ = text of the warning associated with this
  textarea. If there is no warning, then this will be undefined
- `valid`: _boolean_ = is this textarea valid?

##### Actions
- `blur()`: removes focus from the textarea
- `fillIn(value: string)`: fills in the textarea with a given value
- `focus()`: sets focus on the textarea


#### TextField

Stripes TextField component wraps a standard `input` text element, adding support for things like controls and error states.

##### Synopsis

```javascript
import { TextField } from "@folio/stripes-testing";

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

```javascript
import { Tooltip } from "@folio/stripes-testing";

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
