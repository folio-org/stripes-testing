import { Button as ButtonInteractor, createInteractor, perform, focused, isVisible } from '@bigtest/interactor';

export default createInteractor('button')({
  selector: ['a[href]', ButtonInteractor().specification.selector].join(','),
  filters: {
    id: (el) => el.id,
    text: (el) => el.textContent,
    href: (el) => el.getAttribute('href'),
    button: (el) => el.tagName === 'BUTTON',
    anchor: (el) => el.tagName === 'A',
    default: (el) => el.classList.contains('default'),
    visible: { apply: isVisible, default: true },
    focused,
  },
  actions: {
    click: perform((el) => el.click()),
  }
});
