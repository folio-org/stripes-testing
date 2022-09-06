import HTML from './baseHTML';

export default HTML.extend('button')
  .selector('a[href],button,input[type=button],input[type=submit],input[type=reset],input[type=image],a[role=button],div[role=button]')
  .filters({
    // some buttons don't have attribute href
    href: (el) => el.getAttribute('href') ?? '',
    name: (el) => el.getAttribute('name'),
    type: (el) => el.getAttribute('type'),
    icon: (el) => el.getAttribute('icon'),
    button: (el) => el.tagName === 'BUTTON',
    anchor: (el) => el.tagName === 'A',
    default: (el) => el.classList.contains('default'),
    ariaLabel: (el) => el.ariaLabel,
    ariaExpanded: (el) => el.getAttribute('aria-expanded'),
    dataId:(el) => el.getAttribute('data-id'),
    disabled: {
      apply: (el) => {
        if (el.disabled !== undefined) return el.disabled;
        return el.getAttribute('aria-disabled') === 'true';
      },
      default: false
    }
  });
