import { Pane, Select } from '../../../../../../interactors';
import BulkEditProfileForm from './bulkEditProfileForm';

const newProfilePane = Pane('New items bulk edit profile');

export default {
  ...BulkEditProfileForm,

  waitLoading() {
    cy.expect(newProfilePane.exists());
  },

  verifyNewProfilePaneAbsent() {
    cy.expect(newProfilePane.absent());
  },

  selectItemStatus(status) {
    cy.do(Select('Status select').choose(status));
  },
};
