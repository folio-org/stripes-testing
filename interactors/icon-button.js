import { createInteractor, focused, perform } from '@bigtest/interactor';

const ariaLabel = el => el.ariaLabel;

export default createInteractor('icon button')({
  selector: '[class^=iconButton]',
  locator: ariaLabel,
  filters: {
    id: (el) => el.id,
    href: (el) => el.getAttribute('href'),
    hash: (el) => el.hash,
    icon: (el) => el.getAttribute('icon'),
    button: (el) => el.tagName.toLowerCase() === 'button',
    anchor: (el) => el.tagName.toLowerCase() === 'a',
    ariaLabel,
    focused,
  },
  actions: {
    focus: perform((el) => el.focus()),
    click: perform((el) => el.click())
  }
});
