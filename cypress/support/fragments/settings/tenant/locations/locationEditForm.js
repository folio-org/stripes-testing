import { Button, Form, Select } from '../../../../../../interactors';

const editFormRoot = Form({ id: 'form-locations' });
const fieldSet = {
  servicePoints: editFormRoot.find(Select({ id: 'servicePointSelect' })),
  status: editFormRoot.find(Select({ id: 'input-location-status' })),
};

// footer section
const cancelButton = editFormRoot.find(Button('Cancel'));
const saveButton = editFormRoot.find(Button('Save & close'));

export default {
  waitLoading() {
    cy.expect(editFormRoot.exists());
  },
  fillLocationForm({ servicePoint }) {
    this.waitLoading();

    cy.do(fieldSet.servicePoints.focus());
    cy.do(fieldSet.servicePoints.choose(servicePoint));
    cy.expect(fieldSet.servicePoints.has({ value: servicePoint }));

    this.clickSaveButton();
  },
  checkLocationDetails({ servicePoint }) {
    this.waitLoading();

    cy.expect(fieldSet.servicePoints.has({ value: servicePoint }));
  },
  clickCancelButton() {
    cy.do(cancelButton.click());
    cy.expect(editFormRoot.absent());
  },
  clickSaveButton() {
    cy.expect(saveButton.has({ disabled: false }));
    cy.do(saveButton.click());
    // need to wait for changes to be applied
    cy.wait(900);
    cy.expect(editFormRoot.absent());
  },
};
