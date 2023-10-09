import { including } from '@interactors/html';
import {
  Button,
  MultiColumnList,
  MultiColumnListCell,
  Form,
  Select,
  TextField,
} from '../../../../../interactors';

const selectActionProfile = Select({ name: 'profile.action' });

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
  changeAction: () => cy.do(
    selectActionProfile.choose(
      'Update (all record types except Orders, Invoices, or MARC Holdings)',
    ),
  ),

  changesNotSaved: () => {
    cy.expect(TextField({ name: 'profile.name' }).exists());
    cy.expect(selectActionProfile.exists());
  },
};
