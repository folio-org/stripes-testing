import { Button, HTML, including, Select, TextField } from '../../../../interactors';

const title = (el) => el.querySelector('[class^="widgetTitle-"] [class^="headline-"]')?.textContent || '';
const childIndex = (el) => [...el.parentElement.children].indexOf(el);
const content = (el) => el.textContent;

export const Widget = HTML.extend('dashboard widget')
  .selector('[class^="widgetContainer-"]')
  .locator(content)
  .filters({
    title,
    rowsCount: (el) => {
      const text = el.querySelector('[class^="countBadge-"] [class^="label-"]')?.textContent || '';
      const match = text.match(/\d+/);

      return match?.[0] ? Number(match[0]) : null;
    },
  })
  .actions({
    openActions: () => {},
    clickAction: async (interactor, action) => {
      await interactor
        .find(Button({ icon: 'ellipsis', ariaLabel: including('Actions for widget:') }))
        .click();
      await Button(action).click();
    },
  });

/* Simple table implemented for dashboard widgets */
export const WidgetTable = HTML.extend('dashboard widget table')
  .selector('table[class^="table-"]')
  .locator(
    (el) => el.closest('[class^="widgetContainer-"]')?.querySelector('[class^="widgetTitle-"]')
      ?.textContent,
  )
  .filters({
    rowCount: (el) => el.querySelectorAll('tbody tr[role="row"]').length,
    columns: (el) => [...el.querySelectorAll('th[role="columnheader"]')].map(content),
    columnCount: (el) => el.querySelectorAll('th[role="columnheader"]').length,
  });

export const WidgetTableRow = HTML.extend('dashboard widget table row')
  .selector('tbody tr[role="row"]')
  .locator(content)
  .filters({
    content,
    index: (el) => [...el.closest('tbody').querySelectorAll('tr[role="row"]')].indexOf(el),
  });

export const WidgetTableCell = HTML.extend('dashboard widget table cell')
  .selector('td[role="cell"]')
  .locator(content)
  .filters({
    content,
    row: (el) => [...el.closest('tbody').querySelectorAll('tr[role="row"]')].indexOf(el.parentElement),
    column: (el) => {
      const headers = el.closest('table').querySelectorAll('th[role="columnheader"]');

      return headers?.[childIndex(el)]?.textContent;
    },
    columnIndex: childIndex,
    href: (el) => el.querySelector('a')?.getAttribute('href'),
    clickable: (el) => !!el.querySelector('a')?.href,
  })
  .actions({
    hrefClick: ({ perform }) => perform((el) => el.querySelector('a').click()),
  });

/* Widget form filters */
export const WidgetFilter = HTML.extend('dashboard widget filter')
  .selector('[data-testid^="simple-search-field-array"]')
  .locator((el) => el.querySelector('[data-test-card-header-start]')?.textContent?.trim())
  .filters({
    index: (el) => Number.parseInt(el.dataset.testFilterNumber, 10),
    filterBy: (el) => {
      const select = el.querySelector('select[name*=".name"]');

      return select ? select.options[select.selectedIndex]?.text : null;
    },
    ruleCount: (el) => el.querySelectorAll('[data-testid^="simple-search-filter-rule-array"]').length,
  })
  .actions({
    selectFilterBy: (interactor, value) => interactor.find(Select({ name: including('filterColumns') })).choose(value),
    addRule: ({ perform }) => perform((el) => el.querySelector('#simple-search-form-add-filter-rule-button').click()),
    delete: ({ perform }) => perform((el) => el.querySelector('[data-test-card-header-end] button').click()),
  });

export const WidgetFilterRule = HTML.extend('dashboard widget filter rule')
  .selector('[data-testid^="simple-search-filter-rule-array"]')
  .locator((el) => el.querySelector('[data-test-card-header-start]')?.textContent?.trim())
  .filters({
    index: (el) => Number.parseInt(el.dataset.testFilterRuleNumber, 10),
    comparator: (el) => el.querySelector('select[name*=".comparator"]')?.value,
    value: (el) => el.querySelector('input[name*=".filterValue"]')?.value,
  })
  .actions({
    selectComparator: (interactor, value) => interactor.find(Select({ name: including('comparator') })).choose(value),
    fillTextValue: (interactor, value) => interactor.find(TextField({ name: including('filterValue') })).fillIn(value),
  });
