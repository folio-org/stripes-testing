import { including } from '@interactors/html';
import {
  Button,
  MultiColumnListCell,
  Section,
  Pane,
  DropdownMenu,
  HTML,
  Callout,
  TextField,
  MultiColumnList,
} from '../../../../../interactors';
import NewMatchProfile from './newMatchProfile';

const actionsButton = Button('Actions');
const viewPane = Pane({ id: 'view-match-profile-pane' });
const resultsPane = Pane({ id: 'pane-results' });

const openNewMatchProfileForm = () => {
  cy.do(Section({ id: 'pane-results' }).find(actionsButton).click());
  cy.do(DropdownMenu().find(HTML('New match profile')).exists());
  cy.do(Button('New match profile').click());
  cy.expect(Pane('New match profile').exists());
};

const deleteMatchProfile = (profileName) => {
  // get all match profiles
  cy.okapiRequest({
    path: 'data-import-profiles/matchProfiles',
    searchParams: {
      query: '(cql.allRecords=1) sortby name',
      limit: 1000,
    },
  }).then(({ body: { matchProfiles } }) => {
    // find profile to delete
    const profileToDelete = matchProfiles.find((profile) => profile.name === profileName);
    // delete profile with its id
    cy.okapiRequest({
      method: 'DELETE',
      path: `data-import-profiles/matchProfiles/${profileToDelete.id}`,
    }).then(({ status }) => {
      if (status === 204) cy.log('###DELETED MATCH PROFILE###');
    });
  });
};

const waitCreatingMatchProfile = () => {
  cy.expect(resultsPane.find(actionsButton).exists());
  cy.expect(viewPane.exists());
};

const search = (profileName) => {
  cy.get('#input-search-match-profiles-field').clear().type(profileName);
  cy.do(Pane('Match profiles').find(Button('Search')).click());
};

export default {
  openNewMatchProfileForm,
  deleteMatchProfile,
  search,
  clearSearchField: () => {
    cy.do(TextField({ id: 'input-search-match-profiles-field' }).focus());
    cy.do(Button({ id: 'input-match-profiles-search-field-clear-button' }).click());
  },
  createMatchProfile(profile) {
    openNewMatchProfileForm();
    NewMatchProfile.fillMatchProfileForm(profile);
    NewMatchProfile.saveAndClose();
    waitCreatingMatchProfile();
  },

  createMatchProfileWithExistingPart: (profile) => {
    openNewMatchProfileForm();
    NewMatchProfile.fillMatchProfileWithExistingPart(profile);
    NewMatchProfile.saveAndClose();
    waitCreatingMatchProfile();
  },

  createMatchProfileWithQualifier: (profile) => {
    openNewMatchProfileForm();
    NewMatchProfile.fillMatchProfileWithQualifierInIncomingAndExistingRecords(profile);
    NewMatchProfile.saveAndClose();
    waitCreatingMatchProfile();
  },

  createMatchProfileWithQualifierAndComparePart: (profile) => {
    openNewMatchProfileForm();
    NewMatchProfile.fillMatchProfileWithStaticValueAndComparePartValue(profile);
    NewMatchProfile.saveAndClose();
    waitCreatingMatchProfile();
  },

  createMatchProfileWithQualifierAndExistingRecordField: (profile) => {
    openNewMatchProfileForm();
    NewMatchProfile.fillMatchProfileWithQualifierInIncomingRecordsAndValueInExistingRecord(profile);
    NewMatchProfile.saveAndClose();
    waitCreatingMatchProfile();
  },

  createMatchProfileWithStaticValue: (profile) => {
    openNewMatchProfileForm();
    NewMatchProfile.fillMatchProfileWithStaticValue(profile);
    NewMatchProfile.saveAndClose();
    waitCreatingMatchProfile();
  },

  checkMatchProfilePresented: (profileName) => {
    search(profileName);
    cy.expect(MultiColumnListCell(profileName).exists());
  },

  checkCalloutMessage: (message) => {
    cy.expect(
      Callout({
        textContent: including(message),
      }).exists(),
    );
  },

  verifyListOfExistingProfilesIsDisplayed: () => {
    cy.wait(2000);
    cy.expect(resultsPane.find(MultiColumnList({ id: 'match-profiles-list' })).exists());
  },
  selectMatchProfileFromList: (profileName) => cy.do(MultiColumnListCell(profileName).click()),
  verifyActionMenuAbsent: () => cy.expect(resultsPane.find(actionsButton).absent()),
  verifyMatchProfileAbsent: () => cy.expect(resultsPane.find(HTML(including('The list contains no items'))).exists()),
  verifySearchFieldIsEmpty: () => cy.expect(TextField({ id: 'input-search-match-profiles-field' }).has({ value: '' })),
  verifySearchResult: (profileName) => {
    cy.expect(resultsPane.find(MultiColumnListCell({ row: 0, content: profileName })).exists());
  },
};
