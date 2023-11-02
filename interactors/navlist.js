import { HTML, Link } from '@interactors/html';

function label(element) {
  const labelEl = element.querySelector('[class^=NavListItem]');
  return labelEl ? labelEl.textContent.trim() : '';
}

export default HTML.extend('Nav List')
  .selector('[data-test-nav-list]')
  .filters({
    count: (el) => el.querySelectorAll('a').length,
  })
  .actions({
    navTo: ({ find }, linkText) => find(Link(linkText)).click(),
  });

export const NavListItem = HTML.extend('Nav List Item')
  .selector('[class^=NavListItem]')
  .filters({
    label,
    href: (el) => el.getAttribute('href'),
  });
