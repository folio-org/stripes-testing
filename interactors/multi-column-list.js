import { isVisible, Button } from '@interactors/html';
import HTML from './baseHTML';

const childIndex = (el) => [...el.parentElement.children].indexOf(el);

const content = (el) => el.textContent;

export const MultiColumnListRow = HTML.extend('multi column list row')
  .selector('[data-row-inner],[class^=mclRowFormatterContainer-]')
  .locator(content)
  .filters({
    content,
    isContainer: (el) => /mclRowFormatterContainer/.test(el.className),
    selected: (el) => el.className.match(/mclSelected/),
    cellCount: (el) => [...el.querySelectorAll('div[class*=mclCell-]')].length,
    index: (el) => parseInt(el.getAttribute('data-row-inner'), 10),
    // rowIndex filter is needed for cases when we don't have data-row-inner
    rowIndexInParent: (el) => el.getAttribute('data-row-index'),
    // indexRow filter is a workaround for folio parts where we have data-row-inner=true (for some reason)
    indexRow: (el) => el.parentElement.getAttribute('data-row-index'),
    ariaRowIndex: (el) => +el.getAttribute('aria-rowindex'),
  });

export const ListRow = HTML.extend('list row')
  .selector('[class^=mclRowFormatterContainer-]')
  .locator(content);

export const MultiColumnListCell = HTML.extend('multi column list cell')
  .selector('div[class*=mclCell-]')
  .locator(content)
  .filters({
    content,
    row: (el) => (+el.parentElement.getAttribute('data-row-inner')
      ? +el.parentElement.getAttribute('data-row-inner')
      : +el.parentElement.getAttribute('aria-rowindex')),
    column: (el) => {
      const headers = el
        .closest('[class^=mclContainer]')
        .querySelector('[class^=mclHeaderRow]')
        .querySelectorAll('[role=columnheader]');
      return headers ? headers[childIndex(el)]?.textContent : undefined;
    },
    columnIndex: childIndex,
    selected: (el) => !!el.parentElement.className.match(/mclSelected/),
    measured: (el) => el.style && el.style.width !== '',
    visible: (el) => isVisible(el),
    inputTextFieldNames: (el) => [...el.querySelectorAll('input')].map((input) => input.name),
    liValues: (el) => [...el.querySelectorAll('li')].map((li) => li.textContent),
    innerHTML: (el) => el.innerHTML,
    innerText: (el) => el.innerText,
  })
  .actions({ hrefClick: ({ perform }) => perform((el) => el.querySelector('a').click()) });

export const MultiColumnListHeader = HTML.extend('multi column list header')
  .selector('div[class*=mclHeader-]')
  .locator(content)
  .filters({
    content,
    index: childIndex,
    id: (el) => el.getAttribute('id'),
  })
  .actions({
    click: ({ perform }) => perform((el) => el.querySelector('[role=button]').click()),
  });

const columns = (el) => [...el.querySelectorAll('[class*=mclHeader-]')].map((x) => x.textContent);

export const MultiColumnList = HTML.extend('multi column list')
  .selector('div[class^=mclContainer]')
  .locator((el) => el.querySelector('[role=grid]').id)
  .filters({
    columns,
    id: (el) => el.querySelector('[role=grid]').id,
    columnCount: (el) => columns(el).length,
    rowCount: (el) => el.querySelectorAll('[class*=mclRow-]').length,
    height: (el) => el.offsetHeight,
    width: (el) => el.offsetWidth,
    scrollTop: (el) => el.querySelector('div[class^=mclScrollable-]').scrollTop,
    headerInteractivity: (el) => [...el.querySelectorAll('div[class*=mclHeader-]')].map(
      (d) => !!d.querySelector('[data-test-clickable-header]'),
    ),
    visible: (el) => isVisible(el),
    ariaRowCount: (el) => el.querySelector('[role=grid]').getAttribute('aria-rowcount'),
  })
  .actions({
    clickHeader: (interactor, header) => interactor.find(MultiColumnListHeader(header)).click(),
    scrollBy: (interactor, { direction, value }) => interactor.perform(async (el) => {
      const scrollable = el.querySelector('div[class^=mclScrollable-]');
      const fired = scrollable.dispatchEvent(new CustomEvent('scroll'));
      if (fired) await scrollable.scrollBy({ [direction]: value });
    }),
    click: (interactor, { row = 0, column }) => {
      const contentSearch = !column ? { columnIndex: 0 } : { content: column };
      return interactor.find(MultiColumnListCell({ row, ...contentSearch })).click();
    },
    clickNextPagingButton: (interactor, label = 'Next') => {
      return interactor.find(Button(label)).click();
    },
    clickPreviousPagingButton: (interactor, label = 'Previous') => {
      return interactor.find(Button(label)).click();
    },
    clickLoadMoreButton: (interactor, label = 'Load more') => {
      return interactor.find(Button(label)).click();
    },
  });

export default MultiColumnList;
