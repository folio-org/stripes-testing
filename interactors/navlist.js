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
    content: (el) => el.textContent,
    icon: (el) => {
      const img = el.querySelector('img');
      return img ? img.getAttribute('alt') : '';
    },
  });

export const NavItemList = HTML.extend('Nav Item List')
  .selector('[class^=navItemsList-]')
  .filters({
    label: (el) => el.querySelector('[class^=label]').textContent,
  });
