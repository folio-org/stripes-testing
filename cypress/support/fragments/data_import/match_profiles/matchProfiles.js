import { Button, MultiColumnListCell, TextField, Section, Pane, DropdownMenu, HTML } from '../../../../../interactors';
import NewMatchProfile from './newMatchProfile';

const openNewMatchProfileForm = () => {
  cy.do(Section({ id: 'pane-results' }).find(Button('Actions')).click());
  cy.do(DropdownMenu().find(HTML('New match profile')).exists());
  cy.do(Button('New match profile').click());
  cy.expect(Pane('New match profile').exists());
};

const deleteMatchProfile = (profileName) => {
  // get all match profiles
  cy
    .okapiRequest({
      path: 'data-import-profiles/matchProfiles',
      searchParams: {
        query: '(cql.allRecords=1) sortby name',
        limit: 1000
      },
    })
    .then(({ body: { matchProfiles } }) => {
      // find profile to delete
      const profileToDelete = matchProfiles.find(profile => profile.name === profileName);

      // delete profile with its id
      cy
        .okapiRequest({
          method: 'DELETE',
          path: `data-import-profiles/matchProfiles/${profileToDelete.id}`,
        })
        .then(({ status }) => {
          if (status === 204) cy.log('###DELETED MATCH PROFILE###');
        });
    });
};

const waitCreatingMatchProfile = () => {
  cy.expect(Pane({ id:'view-match-profile-pane' }).exists());
  cy.expect(Pane({ id:'pane-results' }).find(Button('Actions')).exists());
};

const clearSearchField = () => {
  cy.do(TextField({ id:'input-search-match-profiles-field' }).focus());
  cy.do(TextField({ id:'input-search-match-profiles-field' }).clear());
};

export default {
  openNewMatchProfileForm,
  deleteMatchProfile,
  clearSearchField,

  createMatchProfile(profile) {
    openNewMatchProfileForm();
    NewMatchProfile.fillMatchProfileForm(profile);
    cy.do(Button('Save as profile & Close').click());
  },

  checkMatchProfilePresented:(profileName) => {
    waitCreatingMatchProfile();
    cy.do(TextField({ id:'input-search-match-profiles-field' }).fillIn(profileName));
    cy.expect(Pane('Match profiles').find(Button('Search')).has({ visible: true }));
    // waiting for activite search button
    cy.wait(1000);
    cy.do(Pane('Match profiles').find(Button('Search')).click());
    cy.expect(MultiColumnListCell(profileName).exists());
    clearSearchField();
  },

  createMatchProfileForPol(profile) {
    openNewMatchProfileForm();
    NewMatchProfile.fillMatchProfileFormForPol(profile);
    cy.do(Button('Save as profile & Close').click());
    clearSearchField();
  }
};
