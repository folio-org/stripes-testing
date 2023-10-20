/* eslint-disable cypress/no-unnecessary-waiting */
import { HTML, including } from '@interactors/html';
import {
  Button,
  TextField,
  MultiColumnListCell,
  Modal,
  Section,
  PaneHeader,
  MultiColumnList,
  Pane,
  MultiColumnListRow,
  Callout,
} from '../../../../../interactors';
import { getLongDelay } from '../../../utils/cypressTools';
import newJobProfile from './newJobProfile';

const actionsButton = Button('Actions');
const runButton = Button('Run');
const waitSelector = Pane({ id: 'view-job-profile-pane' });
const closeButton = Button({ icon: 'times' });
const paneResults = Pane({ id: 'pane-results' });
const searchButton = Button('Search');
const searchField = TextField({ id: 'input-search-job-profiles-field' });

const openNewJobProfileForm = () => {
  cy.do([paneResults.find(actionsButton).click(), Button('New job profile').click()]);
  cy.expect(HTML({ className: including('form-'), id: 'job-profiles-form' }).exists());
};

const closeJobProfile = (profileName) => {
  cy.do(Pane({ title: profileName }).find(closeButton).click());
};

const waitLoadingList = () => {
  cy.get('[id="job-profiles-list"]', getLongDelay()).should('be.visible');
};
const waitLoading = (selector) => cy.expect(selector.exists());
const deleteJobProfile = (profileName) => {
  // get all job profiles
  cy.okapiRequest({
    path: 'data-import-profiles/jobProfiles',
    searchParams: {
      query: 'cql.allRecords=1   ',
      limit: 1000,
    },
    isDefaultSearchParamsRequired: false,
  }).then(({ body: { jobProfiles } }) => {
    // find profile to delete
    const profileToDelete = jobProfiles.find((profile) => profile.name === profileName);

    // delete profile with its id
    cy.okapiRequest({
      method: 'DELETE',
      path: `data-import-profiles/jobProfiles/${profileToDelete.id}`,
      searchParams: {
        query: 'cql.allRecords=1   sortBy name',
      },
      isDefaultSearchParamsRequired: false,
    }).then(({ status }) => {
      if (status === 204) cy.log('###DELETED JOB PROFILE###');
    });
  });
};

const createJobProfile = (jobProfile) => {
  openNewJobProfileForm();
  newJobProfile.fillJobProfile(jobProfile);
};

const search = (jobProfileTitle) => {
  // TODO: clarify with developers what should be waited
  cy.wait(1500);
  cy.do(paneResults.find(searchField).fillIn(jobProfileTitle));
  cy.do(searchButton.click());
};

export default {
  defaultInstanceAndSRSMarcBib: 'Default - Create instance and SRS MARC Bib',
  openNewJobProfileForm: () => {
    cy.do([actionsButton.click(), Button('New job profile').click()]);
  },

  waitLoadingList,
  waitLoading,
  search,
  deleteJobProfile,
  createJobProfile,
  closeJobProfile,
  clearSearchField: () => {
    cy.do(searchField.focus());
    cy.do(Button({ id: 'input-job-profiles-search-field-clear-button' }).click());
  },

  checkJobProfilePresented: (jobProfileTitle) => {
    search(jobProfileTitle);
    cy.expect(MultiColumnListCell(jobProfileTitle).exists());
  },

  selectJobProfile: () => {
    // need to wait until file upload
    cy.wait(1000);
    cy.expect(paneResults.find(MultiColumnListRow({ index: 0 })).exists());
    cy.do(paneResults.find(MultiColumnListRow({ index: 0 })).click());
  },

  runImportFile: () => {
    waitLoading(waitSelector);
    cy.do([
      actionsButton.click(),
      runButton.click(),
      Modal('Are you sure you want to run this job?').find(runButton).click(),
    ]);
  },

  waitFileIsImported: (fileName) => {
    // wait until uploaded file is displayed in the list
    cy.expect(
      MultiColumnList({ id: 'job-logs-list' })
        .find(Button(including(fileName)))
        .exists(),
    );
  },

  createJobProfileWithLinkingProfiles: (jobProfile, actionProfileName, matchProfileName) => {
    openNewJobProfileForm();
    newJobProfile.fillJobProfile(jobProfile);
    if (!matchProfileName) {
      newJobProfile.linkActionProfileByName(actionProfileName);
    } else {
      newJobProfile.linkMatchAndActionProfiles(matchProfileName, actionProfileName);
    }
    newJobProfile.saveAndClose();
    waitLoadingList();
  },

  createJobProfileWithLinkingProfilesForUpdate: (jobProfile) => {
    openNewJobProfileForm();
    newJobProfile.fillJobProfile(jobProfile);
  },
  select: (jobProfileTitle) => {
    search(jobProfileTitle);
    cy.do(MultiColumnListCell(jobProfileTitle).click());
  },
  openFileRecords: (fileName) => {
    cy.do(Button(fileName).click());
    cy.expect(Section({ id: 'pane-results' }).exists());
    cy.expect(PaneHeader(fileName).exists());
  },

  checkListOfExistingProfilesIsDisplayed: () => cy.expect(paneResults.find(MultiColumnList({ id: 'job-profiles-list' })).exists()),

  checkCalloutMessage: (message) => {
    cy.expect(
      Callout({
        textContent: including(message),
      }).exists(),
    );
  },

  verifyActionMenuAbsent: () => cy.expect(paneResults.find(actionsButton).absent()),
  verifyJobProfileAbsent: () => cy.expect(paneResults.find(HTML(including('The list contains no items'))).exists()),
  verifySearchFieldIsEmpty: () => cy.expect(searchField.has({ value: '' })),
  verifySearchResult: (profileName) => {
    cy.expect(paneResults.find(MultiColumnListCell({ row: 0, content: profileName })).exists());
  },
};
