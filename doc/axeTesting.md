# Axe Testing Utility

To facilitate axe testing, we expose a simple helper function to easily add axe testing to any markup-rendering test.

## Synopsis

```js
import { runAxeTest } from '@folio/stripes-testing';
...

// Given an example where a component or page is rendered. (Mocha/BigTest tests)
describe('render component', () => {
  beforeEach(async () => {
    await mount(
      <Datepicker />
    );
  });

  // defaults can be used as a standalone callback to 'it()' calls.
  it('render with no axe errors', runAxeTest);
});

//Jest style tests/unit tests that stand up their tests within 'it()' calls should use an async callback.
it('should have no axe issues', async () => {
  const { container } = renderResourceEdit();
  await runAxeTest({
    rootNode: container,
  });
});


// --- options object example ---

// custom configuration usage -
// a test-specific axe configuration can be set up. See axe documentation for available fields.
// https://www.deque.com/axe/core-documentation/api-documentation/#options-parameter
const localAxeConfig = {
  rules: {
    'scrollable-region-focusable': { enabled: false },
  }
};

it('render with no axe errors', () => runAxeTest({
  config: axeConfig, // custom axe configuration
  rootNode: container // target element to check (defaults to div#root)
});

```

## Options

### config

A custom axe configuration. See [axe documentation](https://www.deque.com/axe/core-documentation/api-documentation/#options-parameter) for more detail on what to include in a configuration.

### rootNode

defaults to `div#root` - can be set to any element for focused testing.

## Error feedback

![image](https://user-images.githubusercontent.com/20704067/139138969-c30f185a-f56d-49a7-9f2c-ccbae38d5f75.png)
Row/Field | Description
-- | --
issue number, the issue id (in italics) and rule text. | The issue id is important as it can be used to modify axe configuration and turn rules off if the problems they point out are not directly resolveable.
description | A more detailed description of the rule.
helpUrl | links to additional documentation on the axe website for the rule as well as solutions.
sample issue, issue count | The first issue of the list. Many issues are repeated over multiple elements, so its possible that resolving the issue in a single place resolves multiple detections.
html | Provided for DOM inspection to locate the offending element.
target | A selector for the offending element.
Failure Summary | A list of simply stated solutions to the issue. More prescriptive solutions are available at the helpUrl field.
