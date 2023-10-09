import { TextField, Select } from '@interactors/html';
import HTML from './baseHTML';

const label = (el) => {
  const labelText = el.querySelector('label');
  return labelText ? labelText.textContent : undefined;
};

export default HTML.extend('search field')
  .selector('[class^=searchField]')
  .locator(label)
  .filters({
    id: (el) => el.querySelector('input, textarea').getAttribute('id'),
    readOnly: (el) => el.querySelector('input, textarea').hasAttribute('readOnly'),
    value: (el) => el.querySelector('input, textarea').value,
    selectedFilter: (el) => el.querySelector('select').value,
    placeholder: (el) => el.querySelector('input, textarea').placeholder,
    disabled: (el) => el.querySelector('select').disabled,
  })
  .actions({
    fillIn: ({ find }, value) => find(TextField()).fillIn(value),
    selectIndex: ({ find }, value) => find(Select()).choose(value),
  });
