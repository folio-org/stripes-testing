import {
  Button,
  including,
  HTML,
  TextField,
  Select,
  SelectionList,
  Accordion,
  TextArea, Callout, calloutTypes, Spinner,
} from '../../../../interactors';

const rootForm = HTML({ className: including('holdingsForm-') });
const holdingsHrId = rootForm.find(TextField({ name: 'hrid' }));
const sourceSelect = rootForm.find(Select({ name: 'sourceId' }));
const readonlyFields = [holdingsHrId, sourceSelect];
const callNumber = rootForm.find(TextArea({ name: 'callNumber' }));

export default {
  saveAndClose: () => {
    cy.do(rootForm.find(Button('Save & close')).click());
    cy.expect(rootForm.absent());
  },
  waitLoading: () => {
    cy.expect(rootForm.exists());
    cy.expect(Spinner().absent());
    cy.expect(callNumber.exists());
  },
  checkReadOnlyFields: () => readonlyFields.forEach((element) => cy.expect(element.has({ disabled: true }))),
  closeWithoutSave: () => cy.do(rootForm.find(Button('Cancel')).click()),
  changePermanentLocation: (location) => {
    cy.do([
      Button({ id: 'additem_permanentlocation' }).click(),
      SelectionList().filter(location),
      SelectionList().select(including(location)),
    ]);
  },
  clearTemporaryLocation: () => {
    cy.do([
      Button({ id: 'additem_temporarylocation' }).click(),
      SelectionList().select('Select location'),
    ]);
  },
  addHoldingsNotes: (text, type = 'Action note') => {
    cy.do([
      Accordion('Holdings notes').find(Button('Add note')).click(),
      Select('Note type*').choose(type),
      TextArea({ ariaLabel: 'Note' }).fillIn(text),
    ]);
  },
  fillCallNumber(callNumberValue) {
    cy.do(callNumber.fillIn(callNumberValue));
  },
  verifyNoCalloutErrorMessage() {
    cy.expect(Callout({ type: calloutTypes.error }).absent());
  },
};
