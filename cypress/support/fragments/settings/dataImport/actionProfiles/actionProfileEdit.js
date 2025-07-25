import { including } from '@interactors/html';
import {
  Button,
  Form,
  MultiColumnList,
  MultiColumnListCell,
  Option,
  Section,
  Select,
  TextField,
  Pane,
} from '../../../../../../interactors';
import { ACTION_NAMES_IN_ACTION_PROFILE } from '../../../../constants';
import SelectMappingProfile from '../modals/selectProfileModal';

const profileLinkSection = Section({ id: 'actionProfileFormAssociatedMappingProfileAccordion' });
const profileLinkButton = Button('Link Profile');
const selectActionProfile = Select({ name: 'profile.action' });
const recordTypeSelect = Select({ name: 'profile.folioRecord' });

const save = () => cy.do(Button('Save as profile & Close').click());

export default {
  save,
  unlinkFieldMappingProfile: () => cy.do(
    MultiColumnList({ id: 'edit-associated-mappingProfiles-list' })
      .find(Button({ title: 'Unlink this profile' }))
      .click(),
  ),
  linkMappingProfile: (specialMappingProfileName) => {
    cy.do(profileLinkButton.click());
    SelectMappingProfile.searchProfile(specialMappingProfileName);
    SelectMappingProfile.selectProfile(specialMappingProfileName);
    cy.expect(profileLinkSection.find(profileLinkButton).has({ disabled: true }));
    save();
    cy.expect(Pane('Action profiles').find(Button('Actions')).exists());
  },

  fieldMappingProfilePresented: (profileName) => {
    cy.expect(
      MultiColumnList({ id: 'edit-associated-mappingProfiles-list' })
        .find(MultiColumnListCell({ content: profileName }))
        .exists(),
    );
  },

  fieldMappingProfileAbsent: () => cy.expect(Button('Link Profile').exists()),
  verifyScreenName: (profileName) => cy.expect(Form(including(`Edit ${profileName}`)).exists()),
  changeAction: (action = ACTION_NAMES_IN_ACTION_PROFILE.UPDATE) => cy.do(selectActionProfile.choose(action)),

  changesNotSaved: () => {
    cy.expect(TextField({ name: 'profile.name' }).exists());
    cy.expect(selectActionProfile.exists());
  },

  verifyFOLIORecordTypeOptionExists(type) {
    cy.expect(recordTypeSelect.find(Option(type)).exists());
  },

  changeRecordType: (type) => cy.do(recordTypeSelect.choose(type)),
};
