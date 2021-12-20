## Stripes Component Interactors

One of the advantages of having a custom design system and component
library is that we don't start from scratch when writing tests that
target an application using it. We know very precicesly what shape the
structure the DOM will take, and we can use that knowledge to our
advantage when it comes to writing tests.

For most components in the
[stripes-components](https://github.com/folio-org/stripes-components#stripes-components)
library, there is a corresponding interactor that can be used in your
tests. For example, to interact with a stripes Button in a Jest test,
you would do something like the following:

```js
import { Button, Heading } from '@folio/stripes-testing';
import { App } from '../app';

describe('My Page', () => {
  beforeEach(() => render(<App>));

  it('can click a button to reveal a secret message', async () => {
    await Button('Click Me!').click();

    await Heading('Thank You!').exists();
  });
})
```

You can use these interactors inside any testing framework that runs
in the same runtime environment as the DOM such as Karma, Jest,
Cypress, or BigTest Platform. However, they cannot be used with test
runners that runs tests in a remote runtime environment that does not
include the DOM under test such as Selenium, or Nightmare.

See the [general guide for working with
interactors](https://frontside.com/interactors) for more information


### How do I write interactors for my own application?

The simplest answer to this question is that in the vast majority of
cases, you should not need to write your own interactors for your
application.

One of the goals of the `@stripes/testing` library is that if your
application is built with stripes components, then the ability to
simulate any user interaction is baked in for free. Even though your
application is built out of many complex components, your user still
interacts _directly_ with the low-level input components like
"button", "textfield".

### What about complex, repetitive actions like filling out a form?

Sometimes there are interactions that span many different components
that need to be captured so that they can be used multiple times in
multiple test cases. In this instance, you might be tempted to make a
custom interactor to encapsulate this process. However, consider using
a simple `async` function instead that itself uses interactors under
the hood to manipulate the actual components:

```js
export async function Login(username, password) {
  await TextField('username').fillIn(useranme);
  await TextField({ placeholder: 'password' }).fillIn(password);
}
```

you can now use this function anywhere inside your test code:

```js
beforeEach(Login('abfab', 'absolutely-fabulous'));
```

## What if I still think that there is an interactor missing?

If an `async` function won't do, and you think that what's called for
is an interactor, then you might have found a gap in the
`@stripes/testing` library itself. In that case, you can follow the
guide for [creating a custom
interactor](https://frontside.com/bigtest/docs/interactors/write-your-own)
and make a pull request to this package.

### Table of Contents

#### Stripes-components
- [`Accordion`](#accordion)
- [`AutoSuggest`](#autosuggest)
- [`Avatar`](#avatar)
- [`Badge`](#badge)
- [`Button`](#button)
- [`ButtonGroup`](#buttongroup)
- [`Checkbox`](#checkbox)
- [`Dropdown`](#dropdown)
- [`Datepicker`](#datepicker) ([`Calendar Widget`](#calendar-widget))
- [`IconButton`](#iconbutton)
- [`KeyValue`](#keyvalue)
- [`Layer`](#layer)
- [`List`](#list) ([`ListItem`](#listitem))
- [`MultiColumnList`](#multicolumnlist) ([`MultiColumnListCell`](#multicolumnlistcell))
- [`MultiSelect`](#multiselect) ([`MultiSelectOption](#multiselectoption))
- [`Pane`](#pane) ([`PaneHeader`](#paneheader))
- [`RadioButton`](#radiobutton)
- [`RichTextEditor`](#richtexteditor)
- [`SearchField`](#searchField)
- [`Select`](#select)
- [`Selection`](#selection)
- [`TextArea`](#textarea)
- [`TextField`](#textfield)
- [`Tooltip`](#tooltip)

#### Stripes-smart-components
-[`AddressList`](#addresslist)
-[`AddressEdit`](#addressedit)
-['EditableList'](#editablelist)
-['EditableListRow'](#editablelistrow)

#### Accordion

The accordion element

##### Synopsis

```js
import { Accordion } from '@folio/stripes-testing';

Accordion('Location').is({ open: true });
```

##### Locator

Accordions are identified by their header. For example:

```js
Accordion('Categories').exists();
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
  pane set. So for example `Accordion('Users').has({ index: 2 })`
  would assert that the "Users" accordion was 3rd in its accordion
  set.

#### AddressList
Renders a fieldgroup of common address form fields.

Related: [AddressEdit](#addressedit), [AddressView](#addressview)

##### Synopsis

```js
import { AddressList } from '@folio/stripes-testing';

// expand collapsed address list
AddressList().toggleMore();

// add address to address list...
AddressList().addAddress();

// assert that Address list displays 2 addresses
AddressList().has({ count: 3});
```

##### actions

- `toggleMore`: clicks the expansions 
- `clickEdit`: _number_ - clicks the edit button at the given index
- `addAddress`: clicks the add button, exposes a new address form
- `deleteAddress`: _number_ - deletes the address at a given index

##### filters

count: number of visible address views in the list

#### AddressEdit

##### Synopsis

```js
import { AddressEdit } from '@folio/stripes-testing';

// find address form at index 1
AddressEdit({ index: 1 });

// find address form with validation errors
AddressEdit({ error: true });

// save the values (click the save button on the address form)
AddressEdit().save()
```

##### Actions

- `save` - Clicks the save button
- `cancel` - Clicks the cancel button
- `delete` - Clicks the delete button

##### Filters

- `index`: _number_ - filters by index.
- `error`: _boolean_ - whether or not the form contains an error.

#### AutoSuggest

Type-ahead suggestion list component using a text field.

##### Synopsis

```js
// find via visible label
AutoSuggest('country').exists();
// fill in value to the field
AutoSuggest.fillIn('blue');
```

##### Locator

Located via the visible label text.

##### Filters

- `open`: _boolean_ = `true` if the avatar is rendering its fallback svg graphic.
- `selected`: _string_ = filter by the selected option from the suggestion list.
- `value`: _string_ = filter/assert by the value of the text input.

##### Actions

- `fillIn`: _string_ = focuses, fills, blurs the text field.
- `enterFilter`: _string_ = focuses, and fills the text field with a string (opens suggestion list).
- `select`: _string_ = clicks the suggestion labeled with the provided string.

#### Avatar

Avatar component used for displaying a profile picture.

##### Synopsis

```js
// interact with a single Avatar instance...
Avatar().exists();
// interact with an avatar instance containing image with filename containing 'pic'
Avatar(including('pic')).exists();
```

##### Locator

A specific avatar can be located via the image filename, via `including` or `matches`.

##### Filters

- `placeholder`: _boolean_ = `true` if the avatar is rendering its fallback svg graphic.
- `image`: _boolean_ = `true` if the avatar is rendering an `<img>` tag.

#### Badge

Renders a circular icon with small text content (a number/count).

##### Locator

Locate via the containing text ('1').

##### Synopsis

```js
// interact with a single Badge instance...
Badge().exists();
// badge containing the number 2...
Badge('2');
// assert value....
Badge.has({ value: 2 });
```

##### Locator
Locate via the text content/number within the badge.

##### Filters
- `color`: _string_ = one of `primary`, `red`, `default` - use with `including` or `matches`
- `value`: _string_ = text rendered within the badge.

#### Button

The Button element

##### Synopsis

```js
import { Button } from '@folio/stripes-testing';

Button('Click Me').click();
```

##### Locator

Buttons are located by their text content. For example:

```js
Button('Click Me').has({ text: 'Click Me' });
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

##### ButtonGroup

Component used for styling a set of buttons.

##### Synopsis

```js
// click the button with the label 'holdings'
ButtonGroup().click('holdings');
```

##### Filters

- `buttonCount`: _number_ = number of child buttons in buttonGroup.

##### Actions

- `click`: _string_ = click the child button with the provided label.

#### Callout

User notification component. Informs on success/failure of actions within the system.

##### Synopsis

```js
Callout('There was a problem').exists();
// check type of callout
Callout.has({ type: calloutType.error });
```

##### Filters

- `id`: _string_ = the id of the callout element.
- `type`: _string_ = one of 'success', 'error', 'info', 'warning' - different callout types that set corresponding styles to the callout.

##### Actions

- `dismiss`: clicks the dismiss (X) button in the callout.

#### Card

Card is a presentational component representing a box of related information.

##### Synopsis
```js
Card().exists();
// card with certain text exists...
Card('Card content text').exists();
```

##### Filters

- `headerStart`: _string_= text contained in 'header start' element of the card.
- `headerEnd`: _string_= text contained in the 'header end' element of the card.
- `style`: _string_= style of the card. One of 'default' 'positive' 'negative'

#### Checkbox

The checkbox element

##### Synopsis

```js
import { checkbox } from '@folio/stripes-testing';

Checkbox('Label').is({ checked: true });
```

##### Locator

A checkbox is identified by the label. For example:

```js
Checkbox('Label').exists();
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
- `ariaInvalid`: _boolean_ = `true` is rendered with `'true'`, otherwise false
- `feedbackText`: _string_ = the text related to the validation warning or error
- `hasWarning`: _boolean_ = `true` if the checkbox has a warning [class]
- `hasError`: _boolean_ = `true` if the checkbox has an error [class]
#### Datepicker

The datepicker and related elements

##### Datepicker (input element)
###### Synopsis

```javascript
import { Datepicker } from '@folio/stripes-testing';

Datepicker().has({ today: true, required: true });
```

###### Locator

Datepickers can be identified by their label. For example:

```javascript
Datepicker('Start Date').is({ visible: true });
```

###### Actions

- `openCalendar`: clicks the icon that opens the calendar widget
- `clear`: removes the value from the field
- `click`: clicks the field
- `focusInput`: focuses the input
- `fillIn(value: string)`: fill in a specific date value as if the user typed in the field
- `focus`: focuses the input field
- `blur`: blurs the input field

###### Filters

- `id`: _string_ = the DOM element id of this datepciker. The `id` filter is provided for debugging, but should not generally be used in tests since it is not a user-facing value
- `label`: _string_ = the user identifying text of this datepicker. This is the same value as the locator.
- `placeholder`: _string_ = the input placeholder which is a user identifying text if label is not sufficiently unique.
- `focused`: _boolean_ = `true` if the keyboard focus targets the input
- `warning`: _boolean_ = `true` if in a warning state
- `error`: _boolean_ = `true` if in an error state
- `inputValue`: _string_ = the value in input
- `inputDay`: _number_ = the day that is in the input
- `today`: _boolean_ = `true` if the date in the input is today's date
- `empty`: _boolean_ = `true` if the date in the input is cleared
- `visible`: _boolean_ = `true` if the input is visible
- `disabled`: _boolean_ = `true` if the input is disabled
- `readOnly`: _boolean_ = `true` if the input is set to read only
- `required`: _boolean_ = `true` if the input is a required field

##### Calendar Widget
###### Synopsis

```javascript
import { Calendar } from '@folio/stripes-testing';

Calendar().is({ visible: true });
```

###### Locator

The calendar widget does not have a locator. Only one widget may be visible at a time.

###### Actions

- `click`: clicks on the calendar widget container
- `focus`: focuses on the calendar widget container
- `clickDay(value: string)`: clicks the day passed on the calendar widget
- `focusDay(value: string)`: focuses on a day passed within the calendar widget
- `setYear(value: string)`: sets the year passed within the year input field in the widget

###### Filters

- `today`: _boolean_ = `true` if the input today's date
- `month`: _string_ = the currently selected month
- `year`: _string_ = the currently selected year
- `days`: [_string_, _string_, ...] = an array of strings representing all of the days present (and not excluded) as two digits, `03` for the third day of the month. Note that days which are shown that are not within the currently selected month are surrounded by underscores, e.g. `_31_`, `_01_`
- `excludedDays`: [_string_, _string_, ...] = the inverse of `days`, an array of strings representing all of the dates that are excluded
- `portal`: _boolean_ = `true` if the widget is created within the `#OverlayContainer` portal
- `visible`: _boolean_ = `true` if the input is visible
- `focused`: _boolean_ = `true` if the calendar widget container is focused
- `focusedWithin`: _boolean_ = `true` if anything within the widget has focus

#### Dropdown

The Stripes Dropdown component

##### Synopsis

```js
import { Dropdown } from '@folio/stripes-testing';

Dropdown('Menu').choose('Contact Us');
```

Dropdowns are identified by their label, or trigger

```js
Dropdown('Menu').exists();
```

##### Actions

- `choose(optionName: string)`: clicks a given option in the dropdown

##### Filters

- `open`: _boolean_ = `true` if the dropdown is open
- `visible`: _boolean_ = `true` if the dropdown is visible
- `label`: _string_ = the user identifying text of this
  dropdown. This is the same value as the locator.

#### EditableList

Editable table component.

##### Synopsis

```js
import { EditableList, ColumnHeader, TextField } from '@folio/stripes-testing';

// Assert that a particular column is present
EditableList().find(ColumnHeader('name')).exists();

// Assert that editing is disabled on rows
EditableList().has({ editDisabled: true });

// Fill in a value...
EditableListRow().find(TextField(including('name'))).fillIn('test');
```
##### Filters

- `rowCount`: _number_ the number of rows in the table (includes editable rows)
- `addDisabled`: _boolean_ Whether or not the add button is disabled
- `editDisabled`: _boolean_ Whether or not the row-level edit buttons are disabled
- `deleteDisabled`: _boolean_ Whether or not the row-level delete buttons are disabled
- `addButton`: _boolean_ Whether or not the Add button is present.
- `editButtons`: _boolean_ Whether or not the Edit buttons are present.
- `deleteButtons`: _boolean_ Whether or not the Delete buttons are present.

##### Actions
- `add`: clicks the add button, addint an item to the list.

#### EditableListRow
For use within the Editable list...

```
// Fill in a value...
EditableListRow().find(TextField(including('name'))).fillIn('test');
```

##### Filters

- `index`: _number_ the number of the row - 0-based. Defaults to 0.
- `saveDisabled`: _boolean_ Whether or not the save button is disabled.

##### Actions

- `edit`: clicks the edit button on a non-edit row, activating edit mode.
- `delete`: clicks the delete button on a non-edit row.
- `cancel`: clicks the cancel button on a row in edit mode.
- `save`: clicks the save button on a row in edit mode.

#### IconButton

The IconButton element

##### Synopsis

```js
import { IconButton } from '@folio/stripes-testing';

IconButton('Close').click();
```

##### Locator

An IconButton is located by its aria-label. For example:

```js
IconButton('Close').has({ ariaLabel: 'Close' });
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

```js
import { KeyValue } from '@folio/stripes-testing';

KeyValue('Occupation').has({ value: 'librarian' });
```

##### Locator

KeyValue pairs are identified by their key. E.g.

```js
KeyValue('Occupation').exists();
```

##### Filters

- `value`: _string_ = The value associated with the key
- `subValue`: _string_ = KeyValue components can have a subvalue which
  is a slightly less emphasized

#### Layer

The layer element

##### Synopsis

```js
import { Layer } from '@folio/stripes-testing';
Layer('layer label').is({ visible: true });
```

##### Locator

Layers are hidden initially and more structural in nature. As such,
they can be identified by visual context. This is not applicable to
screen readers however so the component requires an aria-label to suit.
For example:

```js
Layer('layer label').exists();
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

#### List

##### List (Container)

The list element

###### Synopsis

```js
import { List } from '@folio/stripes-testing';
List('list-id').is({ count: 10 });
```

###### Locator

The List is able to be located by the `id` due the structural nature of the element.

```js
List('list-id').exists();
```

###### Actions

None.

###### Filters

- `count`: _number_ = the number of items in the List, counting from 0, e.g. `Array.length`

##### ListItem

###### Synopsis

```js
import { ListItem } from '@folio/stripes-testing';
ListItem('list-id').has({ index: 10 });
```

###### Locator

The ListItem is located by the text content.

```js
ListItem('Jane Doe').exists();
```

###### Actions

- `click()`: clicks the list item

###### Filters

- `index`: _number_ = find an item within a list based on the index

#### MultiColumnList

The MultiColumnList element contains two interactors: an interactor for the overall container, `MultiColumnList`, and an interactor that let's you target specific cells, `MultiColumnListCell`.

##### MultiColumnList (Container)

###### Synopsis

```js
import { MultiColumnList } from '@folio/stripes-testing';
MultiColumnList().is({ visible: true });
```

###### Locator

The MultiColumnList is able to be located by the `id` due the structural nature of the element.

```js
MultiColumnList('mcl-container').exists();
```

Alternatively when only one is rendered on the page, you will likely prefer to omit the locator.

```js
MultiColumnList().exists();
```

###### Actions

- `clickHeader`: clicks on the overall header element
- `scrollBy(int)`: scrolls the container by the specified pixels entered as an integer, will trigger the related scroll events
- `click({row: int, column: string})`: clicks a cell within the MCL with the specified to row and column. Both row and column default to the cell in the first row and first column

###### Filters

- `id`: _string_ = the DOM element id of this layer. The `id`
  filter is provided for debugging, but should not generally be used
  in tests since it is not a user-facing value
- `columns`: [_string_, _string_, ...] = an array of strings representing each column header text
- `headerInteractivity`: [_boolean_, _boolean_, ...] = an array of boolean representing if each column header is clickable
- `columnCount`: _number_ = the number of columns in the MCL
- `rowCount`: _number_ = the number of rows in the MCL, counting from 0, e.g. `Array.length`
- `height`: _number_ = the container height, e.g. `el.offsetHeight`
- `width`: _number_ = the container width, e.g. `el.offsetWidth`
- `visible`: _boolean_ = `true` if the button is visible

##### MultiColumnListCell

###### Synopsis

```js
import { MultiColumnListCell } from '@folio/stripes-testing';
MultiColumnListCell('Jane Doe').is({ content: true });
```

###### Locator

The MultiColumnListCell is located by the text content.

```js
MultiColumnListCell('Jane Doe').is({ selected: true });
```

###### Actions

- `click`: clicks on the cell

###### Filters

- `content`: _string_ = the content within a cell
- `row`: _number_ = find a cell within a row based on the index
- `column`: _string_ = find a cell within a column, preferred over `columnIndex`
- `columnIndex`: _number_ = find a cell within a column based on the index, prefer use of `column` as that is user facing
- `selected`: _boolean_ = `true` if the cell is selected
- `measured`: _boolean_ = if the width of the cell has been measured

#### MultiSelect

The MultiSelect element with autocompletion

##### Synopsis

```js
import { MultiSelect } from '@folio/stripes-testing';
MultiSelect('Tags').select(['important', 'urgent'])
```

##### Locator

The MultiSelect is located by the label.

```js
MultiSelect('Tags')
```

##### Actions

- `open`: opens the menu with all available values
- `fillIn(string)`: filters values for selection by substring
- `select(string[])`: selects multiple values from a menu

##### Filters

- `selected`: _string[]_ = the current selected values

#### Pane

##### Pane (Container)

The pane element

###### Synopsis

```js
import { Pane } from '@folio/stripes-testing';

Pane('Search Result').is({ visible: true });
```

###### Locator

Panes are identified by their title. For example:

```js
Pane('Search Result').exists();
```

###### Actions

- `dismiss`: clicks on close button on the selected pane
- `focus`: focuses the pane
- `blurs`: blurs (removes focus of) the pane

###### Filters

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
  pane set. So for example `Pane('Users').has({ index: 2 })`
  would assert that the "Users" pane was 3rd in its pane set.

##### PaneHeader

The header element of Pane

###### Synopsis

```js
import { PaneHeader } from '@folio/stripes-testing';

PaneHeader('EBSCO').is({ visible: true });
```

###### Locator

Headers are identified by their title. For example:

```js
Pane('EBSCO').exists();
```

#### RadioButton

The RadioButton element

##### Synopsis

```js
import { RadioButton } from '@folio/stripes-testing';

RadioButton('Label').is({ checked: true });
```

##### Locator

A RadioButton is identified by the label. For example:

```js
RadioButton('Label').exists();
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
- `ariaInvalid`: _boolean_ = `true` is rendered with `'true'`, otherwise false
- `feedbackText`: _string_ = the text related to the validation warning or error
- `hasWarning`: _boolean_ = `true` if the radio button has a warning [class]
- `hasError`: _boolean_ = `true` if the radio button has an error [class]

#### RadioButtonGroup

Wrapper component for set of RadioButton components.

```js
RadioButtonGroup('Label').exists();
// set an option (labeled 'Blue') in a RadioButtonGroup
RadioButtonGroup('Label').choose('Blue');
```

##### Locator

RadioButtonGroups are primarily selected from their `label` prop (rendered as a `<legend>`)

##### Filters

- `id`: _string_ = Dom element id of RadioButtonGroup
- `option`: _string_ = interact with the corresponding labeled option within the RadioButtonGroup
- `checkedOption`: _string_ = interact with given option (label), if checked
- `feedbackText`: _string_ = interact/assert against error text.

##### Actions
- `choose`: _string_ = chooses option at corresponding label.
- `focus`: _string_ = focuses the radio button at the corresponding label.
- `blur`: blurs the focus from the currently focused radio button.

#### RepeatableField

Field component for list of objects containing the same fields/properties. Users can add or remove individual items.

##### Synopsis

```js
// a RepeatableField can be located via its level/legend
const rf = RepeatableField('Modes of Issuance').exists();
// assert against the item count
rf.has({ itemCount: 2 });
// click the add button
rf.clickAddButton();
// since item fields can vary, an item can be filled in via a function...
const fillFields = (interactor) => {
  interactor.find(TextField('name')).fillIn('Thomas');
  interactor.find(Select('honorific')).chooseAndBlur('Mr');
};
rf.fillItem({ index: 1, fillFn: fillFields });
```

##### Locator

A RepeatableField can be located via its level/legend innerText.

##### Filters

- `id`: _string_ = Dom element id of the RepeatableField's fieldset.
- `emptyMessage`: _string_ = the empty message of the repeatable field, if present.
- `removeButton`: _boolean_ = whether or not the delete button is present
- `addButton`: _boolean_ = whether or not the add button is present
- `addDisabled`: _boolean_ = whether or not the add button is disabled.
- `remvoeDisabled`: _boolean_ = whether or not the remove button(s) is/are disabled.
- `itemCount`: _number_ = filter/assert against an item count.
- `headLabels`: _boolean_ = head labels present.

##### Actions

- `clickAddButton`: clicks the add button, adding a blank item.
- `clickRemoveButton`: _number_ = clicks the remove button on an item at the supplied index.
- `fillItem`: `index`-_number_, `fillFn`-_function_ = fills fields within an item via the `fillFn` function - use additional interactors for fields.

#### RichTextEditor

The Rich text editor component

##### Synopsis

```js
import { RichTextEditor } from '@folio/stripes-testing';

RichTextEditor('Body').has({ text: 'Note body' });
```

##### Locator

A RichTextEditor is identified by the label. For example:

```js
RichTextEditor('Body').exists();
```

##### Actions

- `fillIn(string): fills in the editor with a given value

##### Filters

- `value`: _string_ = the current value of the editor

#### SearchField

Stripes SearchField component for initiating queries

##### Synopsis

```js
import { SearchField } from '@folio/stripes-testing';

SearchField().has({ id: 'searchFieldTest' });
```

##### Locator

A SearchField is located by ___. For example:

```js
SearchField('Label').exists();
```

##### Actions

- `selectIndex(string)`: selects the searchable index to perform this search on. For example "users" or "locations"
- `fillIn(value: string)`: fills in the text field with a given value

##### Filters

- `id`: _string_ = the DOM element id of the contained `select`
  element. Note that this _not the id of the React component_. The `id`
  filter is provided for debugging, but should not generally be used
  in tests since it is not a user-facing value.
- `placeholder`: _string_ = The placeholder text of the contained `input` element.
- `value`: _string_ = the `value` property of the contained `input` element.
- `readOnly`: _boolean_ = `true` if the contained `input` is read-only.
- `disabled`: _boolean_ = `true` if the contained `input` is disabled.

#### Select

Stripes Select component wraps a basic `<select>` tag, but also has
other features to integrate it with forms, including things like error
states, etc..

##### Synopsis

```js
import { Select } from '@folio/stripes-testing';

Select('Currency').choose('USD');
```

##### Locator

Selects are identified by their label

```js
Select('Country').exists();
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

#### Selection

Stripes-components Select substitute with filterable options list.

##### Locator

Selection components are located via their label.

##### Filters

- `id`: _string_ = DOM element id of the button which the user interacts with.
- `value`: _string_ = the inner text of the button, set as the value of the component.
- `error`: _string_ = text of the error associated with this control.
- `warning`: _string_ = text of the warning associated with this control.
- `open`: _boolean_ = whether or not the options list is open.
- `focused`: _boolean_ = whether or not the control is in focus.

##### Actions

- `toggle`: open/close the options list.
- `filterOptions`: _string_ = conditionally open the list (if closed) and enter a string into the filter field.
- `choose`: _string_ = conditionally open the options list and choose an item corresponding to the provided label.
- `focus`: focuses the control.

#### TextArea

Stripes TextArea component wraps a standard `textarea` element,
adding support for things like controls and error states.

##### Synopsis

```js
import { TextArea } from '@folio/stripes-testing';

TextArea('leave a comment').exists();
```

##### Locator

A TextArea is located by its label property:

```js
TextArea('leave a comment').has({ text: 'leave a comment' });
```

##### Filters

- `id`: _string_ = the DOM element id of this textarea. The `id` filter
  is provided for debugging, but should not generally be used for
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

```js
import { TextField } from '@folio/stripes-testing';

TextField('First Name').exists();
```

##### Locator

Text fields are located by their label or by the `aria-label` attribute overwise:

```js
TextField('First Name').has({ label: 'First Name' });
```

##### Filters

- `id`: _string_ = the DOM element id of this text field. The `id` filter
  is providerd for debugging, but should not generally be used for
  tests
- `label`: _string_ = the label of the text field
- `type`: _string_ = the type of the text field. should always return `'text'`
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

```js
import { Tooltip } from '@folio/stripes-testing';

Tooltip('Throw this user to the trash').exists();
```

##### Locator

Tooltips are located by their text property:

```js
Tooltip('save this document').has({ text: 'save this document' });
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
