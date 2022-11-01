import { Button, MultiColumnListCell, Section, Pane, DropdownMenu, HTML } from '../../../../../interactors';
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
  cy.expect(Pane({ id:'pane-results' }).find(Button('Actions')).exists());
  cy.expect(Pane({ id:'view-match-profile-pane' }).exists());
};

export default {
  openNewMatchProfileForm,
  deleteMatchProfile,

  createMatchProfile(profile) {
    openNewMatchProfileForm();
    NewMatchProfile.fillMatchProfileForm(profile);
    cy.do(Button('Save as profile & Close').click());
    waitCreatingMatchProfile();
  },

  checkMatchProfilePresented:(profileName) => {
    waitCreatingMatchProfile();
    cy.get('#input-search-match-profiles-field').clear().type(profileName);
    cy.do(Pane('Match profiles').find(Button('Search')).click());
    cy.expect(MultiColumnListCell(profileName).exists());
  },

  createMatchProfileWithMatchingBy999Field:(profile) => {
    openNewMatchProfileForm();
    NewMatchProfile.fillMatchBy999Field(profile);
    cy.do(Button('Save as profile & Close').click());
    waitCreatingMatchProfile();
  },

  createMatchProfileWithExistingPart:(profile) => {
    openNewMatchProfileForm();
    NewMatchProfile.fillMatchProfileWithExistingPart(profile);
    cy.do(Button('Save as profile & Close').click());
    waitCreatingMatchProfile();
  }
};
