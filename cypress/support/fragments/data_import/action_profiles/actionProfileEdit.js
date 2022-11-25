import { Button, MultiColumnList, MultiColumnListCell } from '../../../../../interactors';

export default {
  unlinkFieldMappingProfile:() => {
    cy.do(Button({ title:'Unlink this profile' }).click());
  },

  save:() => {
    cy.do(Button('Save as profile & Close').click());
  },

  fieldMappingProfilePresented:(profileName) => {
    cy.expect(MultiColumnList({ id:'edit-associated-mappingProfiles-list' })
      .find(MultiColumnListCell({ content: profileName }))
      .exists());
  },

  fieldMappingProfileAbsent:() => {
    cy.expect(Button('Link Profile').exists());
  },
};
