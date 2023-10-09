import { including } from '@interactors/html';
import Button from './button';
import Modal from './modal';

export default Modal.extend('confirmation modal').actions({
  confirm: ({ find }, label = 'Confirm') => find(Button(including(label))).click(),
  cancel: ({ find }, label = 'Cancel') => find(Button(including(label))).click(),
});
