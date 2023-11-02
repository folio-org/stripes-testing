import { HTML, Link } from '@interactors/html';

// eslint-disable-next-line import/prefer-default-export
export const AppList = HTML.extend('App List')
  .selector('[data-test-app-list]')
  .actions({
    choose: ({ find }, linkText) => find(Link(linkText)).click(),
  });
