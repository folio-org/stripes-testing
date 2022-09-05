import { Button, TextField, MultiColumnListCell, Modal, HTML, including, Section, PaneHeader, MultiColumnList, Pane } from '../../../../../interactors';
import { getLongDelay } from '../../../utils/cypressTools';
import newJobProfile from './newJobProfile';

const actionsButton = Button('Actions');
const runButton = Button('Run');
const waitSelector = Pane({ id:'view-job-profile-pane' });
const closeButton = Button({ icon: 'times' });

const openNewJobProfileForm = () => {
  cy.do([
    actionsButton.click(),
    Button('New job profile').click(),
  ]);
  cy.expect(HTML({ className: including('form-'), id:'job-profiles-form' }).exists());
};

const closeJobProfile = (profileName) => {
  cy.do(Pane({ title: profileName }).find(closeButton).click());
};

const waitLoadingList = () => {
  cy.get('[id="job-profiles-list"]', getLongDelay())
    .should('be.visible');
};

const waitLoading = (selector) => {
  cy.expect(selector.exists());
};

const deleteJobProfile = (profileName) => {
  // get all job profiles
  cy
    .okapiRequest({
      path: 'data-import-profiles/jobProfiles',
      searchParams: {
        query:'cql.allRecords=1   ',
        limit: 1000
      },
    })
    .then(({ body: { jobProfiles } }) => {
      // find profile to delete
      const profileToDelete = jobProfiles.find(profile => profile.name === profileName);

      // delete profile with its id
      cy
        .okapiRequest({
          method: 'DELETE',
          path: `data-import-profiles/jobProfiles/${profileToDelete.id}`,
          searchParams: {
            query:'cql.allRecords=1   sortBy name',
          },
        })
        .then(({ status }) => {
          if (status === 204) cy.log('###DELETED JOB PROFILE###');
        });
    });
};

const createJobProfile = (jobProfile) => {
  openNewJobProfileForm();
  newJobProfile.fillJobProfile(jobProfile);
};

export default {
  defaultInstanceAndSRSMarcBib:'Default - Create instance and SRS MARC Bib',
  openNewJobProfileForm: () => {
    cy.do([
      actionsButton.click(),
      Button('New job profile').click(),
    ]);
  },

  waitLoadingList,
  waitLoading,

  checkJobProfilePresented:(jobProfileTitle) => {
    cy.get('[id="job-profiles-list"]')
      .should('contains.text', jobProfileTitle);
  },

  searchJobProfileForImport:(jobProfileTitle) => {
    cy.do(TextField({ id:'input-search-job-profiles-field' }).fillIn(jobProfileTitle));
    cy.do(Button('Search').click());
  },

  runImportFile:(fileName) => {
    waitLoading(waitSelector);
    cy.do([
      actionsButton.click(),
      runButton.click(),
      Modal('Are you sure you want to run this job?').find(runButton).click(),
    ]);
    // wait until uploaded file is displayed in the list
    cy.expect(MultiColumnList({ id:'job-logs-list' }).find(Button(fileName)).exists());
  },

  deleteJobProfile,
  createJobProfile,

  createJobProfileWithLinkingProfiles: (jobProfile, actionProfileName, matchProfileName) => {
    openNewJobProfileForm();
    newJobProfile.fillJobProfile(jobProfile);
    if (!matchProfileName) {
      newJobProfile.linkActionProfile(actionProfileName);
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
  select:(jobProfileTitle) => {
    cy.do(MultiColumnListCell(jobProfileTitle).click());
  },
  openFileRecords:(fileName) => {
    cy.do(Button(fileName).click());
    cy.expect(Section({ id:'pane-results' }).exists());
    cy.expect(PaneHeader(fileName).exists());
  },
  closeJobProfile,
};
