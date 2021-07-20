import { isVisible, HTML } from '@bigtest/interactor';

const childIndex = el => [...el.parentElement.children].indexOf(el);

const content = el => el.textContent;

export const MultiColumnListCell = HTML.extend('multi column list cell')
  .selector('div[class*=mclCell-]')
  .locator(content)
  .filters({
    content,
    row: el => +el.parentElement.getAttribute('data-row-inner'),
    column: (el) => el.textContent,
    columnIndex: childIndex,
    selected: (el) => !!el.parentElement.className.match(/mclSelected/),
    measured: (el) => el.style && el.style.width !== '',
    visible: (el) => isVisible(el)
  });

const MultiColumnListHeader = HTML.extend('multi column list header')
  .selector('div[class*=mclHeader-]')
  .filters({
    index: childIndex,
  })
  .actions({
    click: ({ perform }) => perform(el => el.querySelector('[role=button]').click()),
  });

const columns = el => [...el.querySelectorAll('[class*=mclHeader-]')].map(x => x.textContent);

export const MultiColumnList = HTML.extend('multi column list')
  .selector('div[class*=mclContainer-]')
  .locator(el => el.id)
  .filters({
    columns,
    columnCount: el => columns(el).length,
    rowCount: el => el.querySelectorAll('[class*=mclRow-]').length,
    height: el => el.offsetHeight,
    width: el => el.offsetWidth,
    headerInteractivity: (el) => [...el.querySelectorAll('div[class*=mclHeader-]')].map((d) => !!d.querySelector('[data-test-clickable-header]')),
    visible: (el) => isVisible(el)
  })
  .actions({
    clickHeader: (interactor, header) => interactor.find(MultiColumnListHeader(header)).click(),
    scrollBy: (interactor, value) => interactor.perform(
      async (el) => {
        const scrollable = el.querySelector('div[class^=mclScrollable-');
        const fired = scrollable.dispatchEvent(new CustomEvent('scroll'));
        if (fired) await scrollable.scrollBy({ top: value });
      }
    ),
    click: (interactor, { row = 0, column }) => {
      const columnSearch = !column ? { columnIndex: 0 } : { column };
      return interactor.find(MultiColumnListCell({ row, ...columnSearch })).click();
    }
  });

export default MultiColumnList;
