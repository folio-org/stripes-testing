/* eslint-disable cypress/no-unnecessary-waiting */
import { including } from '@interactors/html';
import {
  Button,
  Form,
  Select,
  TextField,
  SelectionList,
  SelectionOption,
} from '../../../../../interactors';

const selectActionProfile = Select({ name: 'profile.action' });
const criterionValueTypeSelectionList = SelectionList({ id: 'sl-container-criterion-value-type' });

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
};
