import { including } from '@interactors/html';
import {
  Button,
  MultiColumnList,
  MultiColumnListCell,
  Form,
  Select,
  TextField,
  Option,
} from '../../../../../interactors';

const selectActionProfile = Select({ name: 'profile.action' });
const recordTypeselect = Select({ name: 'profile.folioRecord' });

export default {
  unlinkFieldMappingProfile: () => cy.do(Button({ title: 'Unlink this profile' }).click()),
  save: () => cy.do(Button('Save as profile & Close').click()),

  fieldMappingProfilePresented: (profileName) => {
    cy.expect(
      MultiColumnList({ id: 'edit-associated-mappingProfiles-list' })
        .find(MultiColumnListCell({ content: profileName }))
        .exists(),
    );
  },

  fieldMappingProfileAbsent: () => cy.expect(Button('Link Profile').exists()),
  verifyScreenName: (profileName) => cy.expect(Form(including(`Edit ${profileName}`)).exists()),
  changeAction: (action = 'Update (all record types except Orders, Invoices, or MARC Holdings)') => cy.do(selectActionProfile.choose(action)),

  changesNotSaved: () => {
    cy.expect(TextField({ name: 'profile.name' }).exists());
    cy.expect(selectActionProfile.exists());
  },

  verifyFOLIORecordTypeOptionExists(type) {
    cy.expect(recordTypeselect.find(Option(type)).exists());
  },

  changeRecordType: (type) => cy.do(recordTypeselect.choose(type)),
};
