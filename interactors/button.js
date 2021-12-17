import HTML from './baseHTML';

export default HTML.extend('button')
  .selector('a[href],button,input[type=button],input[type=submit],input[type=reset],input[type=image],a[role=button]')
  .filters({
    href: (el) => el.getAttribute('href'),
    icon: (el) => el.getAttribute('icon'),
    button: (el) => el.tagName === 'BUTTON',
    anchor: (el) => el.tagName === 'A',
    default: (el) => el.classList.contains('default'),
    ariaLabel: (el) => el.ariaLabel,
    disabled: {
      apply: (el) => {
        if (el.disabled !== undefined) return el.disabled;
        return el.getAttribute('aria-disabled') === 'true';
      },
      default: false
    }
  });
