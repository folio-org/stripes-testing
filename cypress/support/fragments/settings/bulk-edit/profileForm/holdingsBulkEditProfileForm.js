import { Pane } from '../../../../../../interactors';
import BulkEditProfileForm from './bulkEditProfileForm';

const newProfilePane = Pane('New holdings bulk edit profile');

export default {
  ...BulkEditProfileForm,

  waitLoading() {
    cy.expect(newProfilePane.exists());
  },

  verifyNewProfilePaneAbsent() {
    cy.expect(newProfilePane.absent());
  },
};
