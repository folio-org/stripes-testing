import { including } from '@interactors/html';
import {
  Button,
  Form,
  Select,
  TextField,
  SelectionList,
  SelectionOption
} from '../../../../../interactors';

const selectActionProfile = Select({ name:'profile.action' });

export default {
  save:() => cy.do(Button('Save as profile & Close').click()),
  verifyScreenName:(profileName) => cy.expect(Form(including(`Edit ${profileName}`)).exists()),

  changeExistingInstanceRecordField:() => {
    cy.do(Button({ id:'criterion-value-type' }).click());
    cy.expect(SelectionList({ id: 'sl-container-criterion-value-type' }).exists());
    cy.do(SelectionList({ id:'sl-container-criterion-value-type' })
      .find(SelectionOption('Admin data: Instance UUID')).click());
    cy.wait(1000);
  },

  changesNotSaved:() => {
    cy.expect(TextField({ name:'profile.name' }).exists());
    cy.expect(selectActionProfile.exists());
  }
};
