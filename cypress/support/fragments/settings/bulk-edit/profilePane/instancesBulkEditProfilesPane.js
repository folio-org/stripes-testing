import BulkEditProfilesPane from './bulkEditProfilesPane';
import { Button, DropdownMenu, Pane } from '../../../../../../interactors';

const profilesPane = Pane('Instances bulk edit profiles');
const newFolioInstancesBulkEditProfileButton = Button('New FOLIO instances bulk edit profile');
const newInstancesWithSourceMARCProfileButton = Button(
  'New instances with source MARC bulk edit profile',
);

export default {
  ...BulkEditProfilesPane,

  waitLoading() {
    cy.expect(profilesPane.exists());
    cy.wait(1000);
  },

  clickActionsButton() {
    cy.do(Button('Actions').click());
  },

  verifyActionsMenuOptions() {
    cy.expect(DropdownMenu().find(newFolioInstancesBulkEditProfileButton).exists());
    cy.expect(DropdownMenu().find(newInstancesWithSourceMARCProfileButton).exists());
  },

  selectNewFolioInstancesProfile() {
    cy.do(DropdownMenu().find(newFolioInstancesBulkEditProfileButton).click());
  },

  selectNewMarcInstancesProfile() {
    cy.do(DropdownMenu().find(newInstancesWithSourceMARCProfileButton).click());
  },
};
