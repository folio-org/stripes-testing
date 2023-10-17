import Button from './button';
import Select from './select';
import TextArea from './textarea';
import HTML from './baseHTML';

const getRowIndex = (el) => parseInt(el.getAttribute('data-row-index'), 10);

export const AdvancedSearchRow = HTML.extend('advanced search row')
  .selector('[class*=AdvancedSearchRow-]')
  .filters({
    index: (el) => getRowIndex(el),
    query: (el) => el.querySelector('textarea').getAttribute('value'),
    bool: (el) => el.querySelectorAll(`select#advanced-search-bool-${getRowIndex(el)}`).value,
    matchOption: (el) => el.querySelectorAll(`select#advanced-search-match-${getRowIndex(el)}`).value,
    option: (el) => el.querySelectorAll(`select#advanced-search-option-${getRowIndex(el)}`).value,
  })
  .actions({
    fillQuery: ({ find }, value) => find(TextArea({ ariaLabel: 'Search for' })).fillIn(value),
    selectBoolean: ({ find }, rowIndex, value) => find(Select({ id: `advanced-search-bool-${rowIndex}` })).choose(value),
    selectMatchOption: ({ find }, rowIndex, value) => find(Select({ id: `advanced-search-match-${rowIndex}` })).choose(value),
    selectSearchOption: ({ find }, rowIndex, value) => find(Select({ id: `advanced-search-option-${rowIndex}` })).choose(value),
  });

const rows = (el) => [...el.querySelectorAll('[class*=AdvancedSearchRow-]')];

export const AdvancedSearch = HTML.extend('advanced search')
  .selector('[id=advanced-search-modal]')
  .filters({
    rows,
    id: (el) => el.getAttribute('id'),
    rowCount: (el) => rows(el).length,
    hasMatchSelect: (el) => [...el.querySelectorAll('[data-test-advanced-search-match]')].length > 0,
  })
  .actions({
    cancel: ({ find }) => find(Button('Cancel')).click(),
    search: ({ find }) => find(Button('Search')).click(),
  });
