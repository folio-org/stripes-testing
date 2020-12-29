import { createInteractor, TextField, Select } from '@bigtest/interactor';

const label = (el) => {
  const labelText = el.querySelector('label');
  return labelText ? labelText.innerText : undefined;
};

export default createInteractor('search field')({
  selector: '[class^=searchField]',
  locator: label,
  filters: {
    id: el => el.querySelector('input').getAttribute('id'),
    readOnly: el => el.querySelector('input').hasAttribute('readOnly'),
    value: el => el.querySelector('input').value,
    placeholder: el => el.querySelector('input').placeholder,
    isDisabled: el => el.querySelector('select').disabled,
  },
  actions: {
    fillIn: (interactor, value) => interactor.find(TextField()).fillIn(value),
    selectIndex: (interactor, value) => interactor.find(Select()).choose(value),
  }
});
