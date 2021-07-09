import { HTML } from '@bigtest/interactor';

const childIndex = el => [...el.parentElement.children].indexOf(el);

export const ListItem = HTML.extend('list item')
  .selector('li[class^=list-item-]')
  .filters({
    index: childIndex
  });

export default HTML.extend('list')
  .selector('ul[class^=list-]')
  .locator(el => el.id)
  .filters({
    count: el => el.children.length
  });
