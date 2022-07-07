import { Button, including, HTML, TextField, Select, SelectionList } from '../../../../interactors';

const rootForm = HTML({ className: including('holdingsForm-') });
const holdingsHrId = rootForm.find(TextField({ name: 'hrid' }));
const sourceSelect = rootForm.find(Select({ name: 'sourceId' }));
const readonlyFields = [holdingsHrId, sourceSelect];

export default {
  saveAndClose : () => {
    cy.do(rootForm.find(Button('Save and close')).click());
    cy.expect(rootForm.absent());
  },
  waitLoading: () => {
    cy.expect(rootForm.exists());
  },
  checkReadOnlyFields:() => readonlyFields.forEach(element => cy.expect(element.has({ disabled: true }))),
  closeWithoutSave : () => cy.do(rootForm.find(Button('Cancel')).click()),
  changePermanentLocation: (location) => {
    cy.do([
      Button({ id:'additem_permanentlocation' }).click(),
      SelectionList().filter(location),
      SelectionList().select(including(location)),
    ]);
  },
};
