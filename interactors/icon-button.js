import HTML from './baseHTML';

const ariaLabel = (el) => el.ariaLabel;

export default HTML.extend('icon button')
  .selector('[class^=iconButton]')
  .locator(ariaLabel)
  .filters({
    href: (el) => el.getAttribute('href'),
    hash: (el) => el.hash,
    icon: (el) => el.getAttribute('icon'),
    button: (el) => el.tagName.toLowerCase() === 'button',
    anchor: (el) => el.tagName.toLowerCase() === 'a',
    ariaLabel,
  })
  .actions({
    click: ({ perform }) => perform((el) => el.click()),
  });
