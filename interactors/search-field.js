import { TextField, Select } from '@interactors/html';
import HTML from './baseHTML';

const label = (el) => {
  const labelText = el.querySelector('label');
  return labelText ? labelText.innerText : undefined;
};

export default HTML.extend('search field')
  .selector('[class^=searchField]')
  .locator(label)
  .filters({
    id: el => el.querySelector('input').getAttribute('id'),
    readOnly: el => el.querySelector('input').hasAttribute('readOnly'),
    value: el => el.querySelector('input').value,
    placeholder: el => el.querySelector('input').placeholder,
    disabled: el => el.querySelector('select').disabled,
  })
  .actions({
    fillIn: ({ find }, value) => find(TextField()).fillIn(value),
    selectIndex: ({ find }, value) => find(Select()).choose(value),
  });
