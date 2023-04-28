import { HTML, Link } from '@interactors/html';

export const AppList =  HTML.extend('App List')
  .selector('[data-test-app-list]')
  .actions({
    choose: ({ find }, linkText) => find(Link(linkText)).click(),
  });

