import { HTML, Link } from '@interactors/html';

function label(element) {
  const labelEl = element.querySelector('[class^=NavListItem]');
  return labelEl ? labelEl.textContent.trim() : '';
}

function title(el) {
  return el.querySelector('[class^=header-]')?.textContent || '';
}

export default HTML.extend('Nav List')
  .selector('[data-test-nav-list]')
  .filters({
    count: (el) => el.querySelectorAll('a').length,
    title,
    content: (el) => el.textContent,
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
    opensNewTab: (el) => el.getAttribute('target') === '_blank',
  });

export const NavItemList = HTML.extend('Nav Item List')
  .selector('[class^=navItemsList-]')
  .filters({
    label: (el) => el.querySelector('[class^=label]').textContent,
  });
