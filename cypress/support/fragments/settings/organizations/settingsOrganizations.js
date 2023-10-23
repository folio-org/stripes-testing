import { Button, NavListItem, Section } from '../../../../../interactors';

const organizationsSettingsSection = Section({ id: 'settings-nav-pane' });

export default {
  waitLoadingOrganizationSettings: () => {
    cy.expect(organizationsSettingsSection.exists());
  },

  checkButtonNewInTypesIsDisabled: () => {
    cy.expect(
      Section({ id: 'controlled-vocab-pane' })
        .find(Button({ id: 'clickable-add-types' }))
        .is({ disabled: true }),
    );
  },

  checkButtonNewInCategoriesIsDisabled: () => {
    cy.expect(
      Section({ id: 'controlled-vocab-pane' })
        .find(Button({ id: 'clickable-add-categories' }))
        .is({ disabled: true }),
    );
  },

  selectCategories: () => {
    cy.do(NavListItem('Categories').click());
  },

  selectTypes: () => {
    cy.do(NavListItem('Types').click());
  },
};
