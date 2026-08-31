import { TextField, Select } from '@interactors/html';
import HTML from './baseHTML';
import IconButton from './icon-button';

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
    selectedFilterText: (el) => el.querySelector('select option:checked').textContent,
  })
  .actions({
    clear: async ({ perform, find }) => {
      await perform((el) => el.querySelector('input, textarea').focus());
      await find(IconButton({ icon: 'times-circle-solid' })).click();
    },
    fillIn: ({ find }, value) => find(TextField()).fillIn(value),
    selectIndex: ({ find }, value) => find(Select()).choose(value),
  });
