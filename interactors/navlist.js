import { HTML, Link } from '@interactors/html';

export default HTML.extend('Nav List')
  .selector('[data-test-nav-list]')
  .filters({
    count: el => el.querySelectorAll('a').length,
  })
  .actions({
    navTo: ({ find }, linkText) => find(Link(linkText)).click(),
  });
