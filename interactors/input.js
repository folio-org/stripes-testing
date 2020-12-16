import { createInteractor, perform, focused } from '@bigtest/interactor';
import { isVisible } from 'element-is-visible';


export default createInteractor('input')({
  selector: 'input',
  locator: (el) => el.type,
  filters: {
    id: (el) => el.id,
    visible: {
      apply: (el) => isVisible(el) || (el.labels && Array.from(el.labels).some(isVisible)),
      default: true
    },
    focused
  },
  actions: {
    focus: perform((el) => el.focus())
  }
});
