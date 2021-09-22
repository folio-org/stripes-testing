import { createInteractor, HTML } from '@interactors/html';

const childIndex = el => [...el.parentElement.children].indexOf(el);

export const ListItem = HTML.extend('list item')
  .selector('li[class^=list-item-]')
  .filters({
    index: childIndex
  });

export default createInteractor('list')
  .selector('ul[class^=list-]')
  .locator(el => el.id)
  .filters({
    count: el => el.children.length
  });
