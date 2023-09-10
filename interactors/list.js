import { createInteractor, HTML } from '@interactors/html';

const childIndex = (el) => [...el.parentElement.children].indexOf(el);

export const ListItem = HTML.extend('list item')
  .selector('li')
  .filters({
    index: childIndex,
    h3Value: (el) => el.querySelector('a[href]>h3').textContent,
    h4Value: (el) => el.querySelector('a[href]>h4').textContent,
  });

export default createInteractor('list')
  .selector('ul[class^=list-]')
  .locator((el) => el.id)
  .filters({
    count: (el) => el.children.length,
  });
