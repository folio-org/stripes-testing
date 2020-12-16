import { createInteractor, focused, perform } from '@bigtest/interactor';

export default createInteractor('icon button')({
  selector: '[class^=iconButton]',
  locator: (el) => el.ariaLabel,
  filters: {
    focused,
    button: (el) => el.tagName.toLowerCase() === 'button',
    anchor: (el) => el.tagName.toLowerCase() === 'a',
    id: (el) => el.id,
    href: (el) => el.getAttribute('href'),
    hash: (el) => el.hash,
  },
  actions: {
    focus: perform((el) => el.focus()),
    click: perform((el) => el.click())
  }
});
