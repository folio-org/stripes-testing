import { including } from 'bigtest';
import {
  Pane,
  NavListItem,
  Button,
  MultiColumnListCell,
  MultiColumnListRow,
  TextField,
  HTML,
} from '../../../../../interactors';
import exportNewJobProfile from './exportNewJobProfile';

const jobProfilesPane = Pane('Job profiles');
const newButton = Button('New');
const searchField = TextField('Search Job profiles');
const openNewJobProfileForm = () => {
  cy.do(newButton.click());
};

export default {
  openNewJobProfileForm,
  createJobProfile: (profileName, mappingProfile) => {
    openNewJobProfileForm();
    exportNewJobProfile.fillJobProfile(profileName, mappingProfile);
    exportNewJobProfile.saveJobProfile();
  },

  goToJobProfilesTab() {
    cy.do(NavListItem('Data export').click());
    cy.expect(Pane('Data export').exists());
    cy.do(NavListItem('Job profiles').click());
    cy.expect(jobProfilesPane.exists());
  },

  verifyJobProfileInTheTable(jobProfileName) {
    cy.expect(jobProfilesPane.find(MultiColumnListCell({ content: `${jobProfileName}` })));
  },

  verifyJobProfileSearchResult(text) {
    cy.get('body').then((body) => {
      const element = body.find('[class^=mclEndOfListContainer]');
      if (element) {
        const itemAmount = element.attr('data-end-of-list');
        for (let i = 0; i < itemAmount; i++) {
          cy.expect(
            jobProfilesPane
              .find(MultiColumnListCell({ column: 'Name', content: including(text) }))
              .exists(),
          );
        }
      } else cy.expect(HTML('The list contains no items').exists());
    });
  },

  clickProfileNameFromTheList(name) {
    cy.do(MultiColumnListCell(including(name)).click());
  },

  getJobProfile: (searchParams) => {
    return cy
      .okapiRequest({
        path: 'data-export/job-profiles',
        searchParams,
        isDefaultSearchParamsRequired: false,
      })
      .then((response) => {
        return response.body.jobProfiles[0];
      });
  },

  deleteJobProfileViaApi: (id) => cy.okapiRequest({
    method: 'DELETE',
    path: `data-export/job-profiles/${id}`,
    isDefaultSearchParamsRequired: false,
  }),

  verifyDefaultProfiles() {
    cy.expect([
      MultiColumnListRow(including('Default authority export job profile')).exists(),
      MultiColumnListRow(including('Default holdings export job profile')).exists(),
      MultiColumnListRow(including('Default instances export job profile')).exists(),
    ]);
  },

  waitLoading() {
    cy.expect(jobProfilesPane.exists());
    this.verifyDefaultProfiles();
  },

  searchJobProfile(text) {
    cy.do(searchField.fillIn(text));
  },
};
