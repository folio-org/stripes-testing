/* eslint-disable cypress/no-unnecessary-waiting */
import { HTML, including } from '@interactors/html';
import {
  Accordion,
  Button,
  Form,
  Select,
  TextField,
  SelectionList,
  SelectionOption,
  Dropdown,
  DropdownMenu,
} from '../../../../../interactors';

const selectActionProfile = Select({ name: 'profile.action' });
const criterionValueTypeSelectionList = SelectionList({ id: 'sl-container-criterion-value-type' });
const matchProfileDetailsAccordion = Accordion({ id: 'match-profile-details' });

export default {
  save: () => cy.do(Button('Save as profile & Close').click()),
  verifyScreenName: (profileName) => cy.expect(Form(including(`Edit ${profileName}`)).exists()),

  changeExistingInstanceRecordField: () => {
    cy.do(Button({ id: 'criterion-value-type' }).click());
    cy.expect(criterionValueTypeSelectionList.exists());
    cy.do(
      criterionValueTypeSelectionList.find(SelectionOption('Admin data: Instance UUID')).click(),
    );
    // need to wait until value will be selected
    cy.wait(1000);
  },

  changesNotSaved: () => {
    cy.expect(TextField({ name: 'profile.name' }).exists());
    cy.expect(selectActionProfile.exists());
  },
  verifyIncomingRecordsDropdown: (...names) => {
    cy.do(Dropdown({ id: 'record-selector-dropdown' }).toggle());
    names.forEach((name) => {
      cy.expect([DropdownMenu({ visible: true }).find(HTML(name)).exists()]);
    });
  },
  verifyIncomingRecordsItemDoesNotExist(name) {
    cy.expect([DropdownMenu({ visible: true }).find(HTML(name)).absent()]);
  },
  clickOnExistingRecordByName: (name) => {
    cy.do(matchProfileDetailsAccordion.find(Button({ text: name })).click());
  },
};
