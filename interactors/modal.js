import Button from './button';
import HTML from './baseHTML';

function title(el) {
  return el.querySelector('[class^=modalHeader]').textContent;
}

export default HTML.extend('modal')
  .selector('[class^=modal-]')
  .locator(title)
  .filters({
    title,
    id: (el) => el.getAttribute('id'),
    content: (el) => el.textContent,
    header: (el) => el.querySelector('[class^=modalHeader]').textContent,
    message: (el) => el.querySelector('[class^=modalContent]').textContent,
    footer: (el) => el.querySelector('[class^=modalFooter]').textContent,
    numberOfRows: (el) => el.querySelectorAll('[class^=mclRowFormatterContainer-]').length,
  })
  .actions({
    dismiss: (interactor) => interactor.find(Button({ ariaLabel: 'Dismiss modal' })).click(),
  });
