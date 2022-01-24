import { Button, TextField, MultiColumnListCell, Modal } from '../../../../../interactors';
import { getLongDelay } from '../../../utils/cypressTools';
import NewJobProfile from './newJobProfile';

const actionsButton = Button('Actions');

const openNewJobProfileForm = () => {
  cy.do([
    actionsButton.click(),
    Button('New job profile').click(),
  ]);
};

const waitLoadingList = () => {
  cy.get('[id="job-profiles-list"]', getLongDelay())
    .should('be.visible');
  cy.expect(actionsButton.exists());
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

export default {
  checkJobProfilePresented:(jobProfileTitle) => {
    cy.get('[id="job-profiles-list"]')
      .should('contains.text', jobProfileTitle);
  },

  searchJobProfileForImport:(jobProfileTitle) => {
    cy.do(TextField({ id:'input-search-job-profiles-field' }).fillIn(jobProfileTitle));
    cy.do(Button('Search').click());
    cy.expect(MultiColumnListCell(jobProfileTitle).exists());
  },

  runImportFile:(fileName) => {
    cy.do([
      actionsButton.click(),
      Button('Run').click(),
      Modal('Are you sure you want to run this job?').find(Button('Run')).click(),
    ]);

    // wait until uploaded file is displayed in the list
    cy.get('#job-logs-list', getLongDelay()).contains(fileName, getLongDelay());
  },

  deleteJobProfile,

  createJobProfile: (jobProfile, actionProfileName, matchProfileName) => {
    openNewJobProfileForm();
    NewJobProfile.fillJobProfile(jobProfile);
    if (!matchProfileName) {
      NewJobProfile.linkActionProfile(actionProfileName);
    } else {
      NewJobProfile.linkMatchAndActionProfiles(matchProfileName, actionProfileName);
    }
    NewJobProfile.clickSaveAndCloseButton();
    waitLoadingList();
  },
};
