import Button from './button';
import HTML from './baseHTML';

function title(el) { return el.querySelector('[class^=modalHeader]').textContent; }

export default HTML.extend('modal')
  .selector('[class^=modal-]')
  .locator(title)
  .filters({
    title,
    id: (el) => el.getAttribute('id')
  })
  .actions({
    dismiss: (interactor) => interactor.find(Button({ ariaLabel: 'Dismiss modal' })).click(),
  });
