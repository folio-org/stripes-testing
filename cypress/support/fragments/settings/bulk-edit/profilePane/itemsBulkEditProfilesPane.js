import BulkEditProfilesPane from './bulkEditProfilesPane';
import { Pane } from '../../../../../../interactors';

const profilesPane = Pane('Items bulk edit profiles');

export default {
  ...BulkEditProfilesPane,

  waitLoading() {
    cy.expect(profilesPane.exists());
  },
};
