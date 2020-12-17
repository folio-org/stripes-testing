import { Button as ButtonInteractor, createInteractor, perform, focused } from '@bigtest/interactor';
import { isVisible } from 'element-is-visible';

export default createInteractor('button')({
  selector: ['a[href]', ButtonInteractor().specification.selector].join(','),
  filters: {
    id: (el) => el.id,
    text: (el) => el.textContent,
    href: (el) => el.getAttribute('href'),
    button: (el) => el.tagName === 'BUTTON',
    anchor: (el) => el.tagName === 'A',
    default: (el) => el.classList.contains('default'),
    ariaLabel: (el) => el.ariaLabel,
    visible: { apply: isVisible, default: true },
    focused,
  },
  actions: {
    click: perform((el) => el.click()),
    focus: perform((el) => el.focus()),
    blur: perform((el) => el.blur())
  }
});
