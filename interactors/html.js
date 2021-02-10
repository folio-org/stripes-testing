import { createInteractor, perform, focused } from '@bigtest/interactor';

export default createInteractor('element')({
  selector: '*',
  locator: (el) => el.textContent,
  filters: {
    id: (el) => el.id,
    text: (el) => el.textContent,
    focused
  },
  actions: {
    click: perform((el) => { el.click(); }),
  }
});
