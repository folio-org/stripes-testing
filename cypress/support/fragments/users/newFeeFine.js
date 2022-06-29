import { Button, Modal, Option, Select, TextArea, TextField } from '../../../../interactors';

const rootModal = Modal({ id: 'new-modal' });
const feefineOwnerSelect = rootModal.find(Select({ id: 'ownerId' }));
const feeFineTypeSelect = rootModal.find(Select({ id: 'feeFineType' }));

export default {
  waitLoading:() => {
    cy.expect(rootModal.exists());
  },
  checkInitialState:({ lastName: userLastName, middleName: userMiddleName, firstName: userFirstName, barcode: userBarcode }, ownerName = '') => {
    cy.expect(rootModal.find(Button(`${userLastName}, ${userFirstName} ${userMiddleName}`)).exists());
    console.log(userBarcode);
    cy.expect(rootModal.find(Button(userBarcode)).exists());
    cy.expect(feefineOwnerSelect.has({ value:ownerName }));
    cy.expect(feeFineTypeSelect.has({ value:'' }));
    cy.expect(rootModal.find(TextField({ id:'amount' })).has({ value: '' }));
    cy.expect(rootModal.find(TextField({ placeholder:'Scan or enter item barcode' })).has({ value: '' }));
    cy.expect(rootModal.find(TextArea({ id:'comments' })).has({ value:'' }));
  },
  setFeeFineOwner: (ownerName) => {
    // TODO: fix iterators issue related with select
    cy.get('div[id=new-modal] select[name=ownerId]').select(ownerName);
  },
  checkFilteredOptions:(feefineTypeName) => {
    cy.expect(feeFineTypeSelect.find(Option(feefineTypeName)).exists());
  },
  close: () => cy.do(rootModal.find(Button({ id :'cancelCharge' })).click())
};

