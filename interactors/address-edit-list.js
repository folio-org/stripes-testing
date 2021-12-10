import { Button, HTML, TextField } from '@interactors/html';

export const AddressEdit = HTML.extend('address edit')
  .selector('fieldset[data-test-address-edit]')
  .locator((el) => el.id.replace('addressEdit-', ''))
  .filters({
    index: (el) => [...el.closest('ul').querySelectorAll('fieldset[data-test-address-edit]')].indexOf(el),
    error: TextField().error()
  })
  .actions({
    cancel: ({ find }) => find(Button(/cancel/i)).click(),
    save: ({ find }) => find(Button(/save/i)).click(),
    delete: ({ find }) => find(Button(/remove/i)).click()
  });

export const AddressItem = HTML.extend('address item')
  .selector('[role=tabpanel]')
  .filters({
    index: (el) => [...el.parentElement.children].indexOf(el),
  })
  .actions({
    edit: ({ find }) => find(Button(/edit/i)).click(),
  });


export const AddressList = HTML.extend('address list')
  .selector('[data-test-addressList-container]')
  .filters({
    count: (el) => el.querySelectorAll('role=tabpanel').length,
  })
  .actions({
    toggleMore: ({ perform }) => perform(el => el.querySelector('[data-test-addressList-toggle]')),
    fillAddress: ({ find }, opts) => find(AddressEdit({ index: opts.index })).fillFields(opts.address),
    clickEdit: ({ find }, index) => find(AddressItem({ index })).edit(),
    addAddress: ({ find }) => find(Button('New')).click(),
    deleteAddress: ({ find }, index) => find(AddressEdit({ index })).delete()
  });
