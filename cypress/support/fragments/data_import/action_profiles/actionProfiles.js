import { including } from '@interactors/html';
import {
  Button,
  TextField,
  MultiColumnListCell,
  Pane,
  MultiColumnListRow,
  Callout,
  PaneContent,
  HTML,
  MultiColumnList,
} from '../../../../../interactors';
import NewActionProfile from './newActionProfile';

const actionsButton = Button('Actions');
const iconButton = Button({ icon: 'times' });
const resultsPane = Pane({ id: 'pane-results' });
const viewPane = Pane({ id: 'view-action-profile-pane' });
const searchField = TextField({ id: 'input-search-action-profiles-field' });

const openNewActionProfileForm = () => {
  cy.do([resultsPane.find(actionsButton).click(), Button('New action profile').click()]);
};
const close = (profileName) => cy.do(Pane({ title: profileName }).find(iconButton).click());

const search = (profileName) => {
  // TODO: clarify with developers what should be waited
  cy.wait(1500);
  cy.expect(resultsPane.find(searchField).exists());
  cy.do(searchField.focus());
  cy.wait(1500);
  cy.expect(resultsPane.find(searchField).exists());
  cy.do(searchField.fillIn(profileName));
  cy.wait(1000);
  cy.do(Pane('Action profiles').find(Button('Search')).click());
};

export default {
  openNewActionProfileForm,
  close,
  search,
  clearSearchField: () => {
    cy.do(searchField.focus());
    cy.do(Button({ id: 'input-action-profiles-search-field-clear-button' }).click());
  },
  waitLoading: () => cy.expect(MultiColumnListRow({ index: 0 }).exists()),
  create: (actionProfile, mappingProfileName) => {
    openNewActionProfileForm();
    NewActionProfile.fill(actionProfile);
    NewActionProfile.linkMappingProfile(mappingProfileName);
  },

  selectActionProfileFromList: (profileName) => cy.do(MultiColumnListCell(profileName).click()),

  checkActionProfilePresented: (profileName) => {
    search(profileName);
    cy.expect(MultiColumnListCell(profileName).exists());
  },

  verifyActionProfileOpened: () => {
    cy.expect(resultsPane.exists());
    cy.expect(viewPane.exists());
  },

  checkCalloutMessage: (message) => {
    cy.expect(
      Callout({
        textContent: including(message),
      }).exists(),
    );
  },

  createWithoutLinkedMappingProfile: (actionProfile) => {
    openNewActionProfileForm();
    NewActionProfile.fill(actionProfile);
    cy.do(Button('Save as profile & Close').click());
  },

  checkListOfExistingProfilesIsDisplayed: () => {
    cy.wait(2000);
    cy.expect(
      PaneContent({ id: 'pane-results-content' })
        .find(MultiColumnList({ id: 'action-profiles-list' }))
        .exists(),
    );
  },
  verifyActionMenuAbsent: () => cy.expect(resultsPane.find(actionsButton).absent()),
  verifyActionProfileAbsent: () => cy.expect(resultsPane.find(HTML(including('The list contains no items'))).exists()),
  verifySearchFieldIsEmpty: () => cy.expect(searchField.has({ value: '' })),
  verifySearchResult: (profileName) => {
    cy.expect(resultsPane.find(MultiColumnListCell({ row: 0, content: profileName })).exists());
  },
};
