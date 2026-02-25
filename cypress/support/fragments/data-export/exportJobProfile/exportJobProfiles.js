import { including, matching } from '@interactors/html';
import {
  Pane,
  NavListItem,
  Button,
  MultiColumnListCell,
  MultiColumnListRow,
  TextField,
  HTML,
  MultiColumnListHeader,
} from '../../../../../interactors';
import ExportNewJobProfile from './exportNewJobProfile';
import SettingsDataExport from '../settingsDataExport';
import { defaultJobProfiles } from '../exportFile';
import DateTools from '../../../utils/dateTools';

const jobProfilesPane = Pane('Job profiles');
const newButton = Button('New');
const searchField = TextField('Search Job profiles');
const searchButton = Button('Search');
const openNewJobProfileForm = () => {
  cy.do(newButton.click());
};

export default {
  openNewJobProfileForm,
  createJobProfile: (profileName, mappingProfile) => {
    openNewJobProfileForm();
    ExportNewJobProfile.fillJobProfile(profileName, mappingProfile);
    ExportNewJobProfile.saveJobProfile();
  },

  goToJobProfilesTab() {
    SettingsDataExport.goToSettingsDataExport();
    cy.do(NavListItem('Job profiles').click());
    cy.expect(jobProfilesPane.exists());
  },

  verifyJobProfilesElements() {
    cy.do(NavListItem('Job profiles').click());
    ['Name', 'Updated', 'Updated by'].forEach((title) => {
      cy.expect(jobProfilesPane.find(MultiColumnListHeader(title)).exists());
    });
    cy.expect([
      searchField.exists(),
      searchButton.has({ disabled: true }),
      jobProfilesPane.has({ subtitle: including('job profiles') }),
      HTML('End of list').exists(),
    ]);
  },

  scrollDownIfListOfResultsIsLong() {
    cy.wait(2000);
    // Scroll in case the list of results is long
    const scrollableSelector = '#search-results-list [class^=mclScrollable]';

    cy.get(scrollableSelector).then(($element) => {
      // Check if the element is scrollable
      const hasVerticalScrollbar = $element.get(0).scrollHeight > $element.get(0).clientHeight;

      if (hasVerticalScrollbar) {
        cy.get(scrollableSelector).scrollTo('bottom');
      }
    });
  },

  verifyJobProfileInTheTable(jobProfileName) {
    this.scrollDownIfListOfResultsIsLong();

    cy.expect(jobProfilesPane.find(MultiColumnListCell({ content: `${jobProfileName}` })));
  },

  verifyProfileInTable(name, userObject) {
    const targetProfileRow = MultiColumnListRow({ content: including(name), isContainer: false });

    cy.expect(
      targetProfileRow
        .find(MultiColumnListCell({ column: 'Name' }))
        .has({ content: including(name) }),
    );
    cy.expect(
      targetProfileRow.find(MultiColumnListCell({ column: 'Updated' })).has({
        content: DateTools.getFormattedDateWithSlashes({
          date: new Date(),
        }),
      }),
    );
    cy.expect(
      targetProfileRow.find(MultiColumnListCell({ column: 'Updated by' })).has({
        content: including(`${userObject.personal.firstName} ${userObject.personal.lastName}`),
      }),
    );
    cy.expect(
      targetProfileRow.find(MultiColumnListCell({ column: 'Status' })).has({ content: '' }),
    );
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
    this.scrollDownIfListOfResultsIsLong();

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
    failOnStatusCode: false,
  }),

  verifyDefaultProfiles() {
    this.scrollDownIfListOfResultsIsLong();

    const datePattern = /^\d{1,2}\/\d{1,2}\/\d{4}$/;

    defaultJobProfiles.forEach((profileName) => {
      const targetRow = MultiColumnListRow(including(profileName), { isContainer: false });

      cy.expect(
        targetRow
          .find(MultiColumnListCell({ column: 'Updated by', content: 'System Process' }))
          .exists(),
      );
      cy.expect(
        targetRow
          .find(
            MultiColumnListCell({ column: 'Updated', content: matching(new RegExp(datePattern)) }),
          )
          .exists(),
      );
    });
  },

  waitLoading() {
    cy.expect(jobProfilesPane.exists());
    this.verifyDefaultProfiles();
  },

  searchJobProfile(text) {
    cy.do(searchField.fillIn(text));
  },

  verifyNewButtonAbsent() {
    cy.expect(newButton.absent());
  },

  verifyNewButtonEnabled() {
    cy.expect(newButton.has({ disabled: false }));
  },

  verifyJobProfilesCount() {
    cy.get('#search-results-list').then((elem) => {
      const rowCount = parseInt(elem.attr('aria-rowcount'), 10);
      const expectedCount = rowCount - 1;
      cy.get('#paneHeaderpane-results-subtitle').should(
        'have.text',
        `${expectedCount} job profiles`,
      );
    });
  },
};
