import permissions from '../../support/dictionary/permissions';
import devTeams from '../../support/dictionary/devTeams';
import { getTestEntityValue } from '../../support/utils/stringTools';
import TestTypes from '../../support/dictionary/testTypes';
import TopMenu from '../../support/fragments/topMenu';
import SearchPane from '../../support/fragments/circulation-log/searchPane';
import SearchResults from '../../support/fragments/circulation-log/searchResults';
import PatronGroups from '../../support/fragments/settings/users/patronGroups';
import ServicePoints from '../../support/fragments/settings/tenant/servicePoints/servicePoints';
import Users from '../../support/fragments/users/users';
import UserEdit from '../../support/fragments/users/userEdit';

const patronGroup = {
  name: getTestEntityValue('groupToTestNotices'),
};
let userData;
const testData = {
  userServicePoint: ServicePoints.getDefaultServicePointWithPickUpLocation(),
  ruleProps: {},
};

describe('Circulation log', () => {
  before('Preconditions', () => {
    cy.getAdminToken().then(() => {
      ServicePoints.createViaApi(testData.userServicePoint);
      PatronGroups.createViaApi(patronGroup.name).then((res) => {
        patronGroup.id = res;
        cy.createTempUser([permissions.circulationLogView.gui], patronGroup.name)
          .then((userProperties) => {
            userData = userProperties;
          })
          .then(() => {
            UserEdit.addServicePointViaApi(
              testData.userServicePoint.id,
              userData.userId,
              testData.userServicePoint.id,
            );
            cy.login(userData.username, userData.password, {
              path: TopMenu.circulationLogPath,
              waiter: SearchPane.waitLoading,
            });
          });
      });
    });
  });

  after('Deleting created entities', () => {
    UserEdit.changeServicePointPreferenceViaApi(userData.userId, [testData.userServicePoint.id]);
    ServicePoints.deleteViaApi(testData.userServicePoint.id);
    Users.deleteViaApi(userData.userId);
    PatronGroups.deleteViaApi(patronGroup.id);
  });

  it(
    'C365625 Verify that users can select filters, but not the Actions menus with "Circulation log: View permission " (volaris)',
    { tags: [TestTypes.criticalPath, devTeams.volaris] },
    () => {
      SearchPane.filterByLastWeek();
      SearchResults.checkTableWithoutLinks();
      SearchResults.checkTableWithoutColumns(['Action']);
      SearchPane.checkExportResultIsUnavailable();
      // needed for the data to be updated
      // eslint-disable-next-line cypress/no-unnecessary-waiting
      cy.wait(1000);
      SearchPane.setFilterOptionFromAccordion('loan', 'Checked out');
      SearchPane.checkResultSearch({ object: 'Loan' });
      SearchPane.checkExportResultIsUnavailable();
      SearchPane.resetResults();

      SearchPane.filterByLastWeek();
      // needed for the data to be updated
      // eslint-disable-next-line cypress/no-unnecessary-waiting
      cy.wait(1000);
      SearchPane.setFilterOptionFromAccordion('notice', 'Send');
      SearchPane.checkResultSearch({ object: 'Notice' });
      SearchPane.checkExportResultIsUnavailable();
      SearchPane.resetResults();

      SearchPane.filterByLastWeek();
      // needed for the data to be updated
      // eslint-disable-next-line cypress/no-unnecessary-waiting
      cy.wait(1000);
      SearchPane.setFilterOptionFromAccordion('fee', 'Paid fully');
      SearchPane.checkResultSearch({ object: 'Fee/fine' });
      SearchPane.checkExportResultIsUnavailable();
      SearchPane.resetResults();

      SearchPane.filterByLastWeek();
      // needed for the data to be updated
      // eslint-disable-next-line cypress/no-unnecessary-waiting
      cy.wait(1000);
      SearchPane.setFilterOptionFromAccordion('request', 'Created');
      SearchPane.checkResultSearch({ object: 'Request' });
      SearchPane.checkExportResultIsUnavailable();
    },
  );
});
