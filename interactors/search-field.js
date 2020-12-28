import { createInteractor, TextField, Select } from '@bigtest/interactor';

export default createInteractor('search field')({
  selector: '[class^=searchField]',
  filters: {
    id: el => el.querySelector('input').getAttribute('id'),
    readOnly: el => el.querySelector('input').hasAttribute('readOnly'),
    value: el => el.querySelector('input').value,
    placeholder: el => el.querySelector('input').placeholder,
    isDisabledIndex: el => el.querySelector('select').disabled,
    isDisabled: el => el.querySelector('input').disabled,
  },
  actions: {
    fillIn: (interactor, value) => interactor.find(TextField()).fillIn(value),
    selectIndex: (interctor, value) => interctor.find(Select()).choose(value),
  }
});
