import { createInteractor, perform, focused, Button } from '@bigtest/interactor';
import { isVisible } from 'element-is-visible';

const log = x => {
  console.log(x);
  return x;
};

const row = el => +el.parentElement.getAttribute('data-row-inner');

const childIndex = el => [...el.parentElement.children].indexOf(el);

const content = el => el.textContent;

export const MultiColumnListCell = createInteractor('multi column list cell')({
  selector: 'div[class*=mclCell-]',
  locator: content,
  filters: {
    content,
    row,
    column: childIndex,
    xy: el => [row(el), childIndex(el)],
    selected: (el) => !!el.parentElement.className.match(/mclSelected/),
    measured: (el) => el.style && el.style.width !== ''
  },
  actions: {
    click: perform((el) => el.click)
  }
});

const MultiColumnListHeader = createInteractor('multi column list header')({
  selector: 'div[class*=mclHeader-]',
  filters: {
    index: childIndex,
  },
  actions: {
    click: perform(el => el.querySelector('[role=button]').click()),
  }
});

const id = el => el.id;

const columns = el => [...el.querySelectorAll('[class*=mclHeader-]')].map(x => x.textContent);

export const MultiColumnList = createInteractor('multi column list')({
  selector: 'div[class*=mclContainer-]',
  locator: id,
  filters: {
    id,
    columns,
    columnCount: el => columns(el).length,
    rowCount: el => el.querySelectorAll('[class*=mclRow-]').length,
    height: el => el.offsetHeight,
    width: el => el.offsetWidth,
    visible: isVisible,
    headerInteractivity: (el) => [...el.querySelectorAll('div[class*=mclHeader-]')].map((d) => !!d.querySelector('[data-test-clickable-header]'))
  },
  actions: {
    clickHeader: (interactor, header) => interactor.find(MultiColumnListHeader(header)).click(),
    scrollBy: (interactor, value) => interactor.perform(
      async (el) => {
        const scrollable = el.querySelector('div[class^=mclScrollable-');
        const fired = scrollable.dispatchEvent(new CustomEvent('scroll'));
        if (fired) await scrollable.scrollBy({ top: value });
      }
    ),
  }
});

export default MultiColumnList;
