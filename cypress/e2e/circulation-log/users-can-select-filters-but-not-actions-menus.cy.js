import permissions from '../../support/dictionary/permissions';
import SearchPane from '../../support/fragments/circulation-log/searchPane';
import SearchResults from '../../support/fragments/circulation-log/searchResults';
import ServicePoints from '../../support/fragments/settings/tenant/servicePoints/servicePoints';
import PatronGroups from '../../support/fragments/settings/users/patronGroups';
import TopMenu from '../../support/fragments/topMenu';
import UserEdit from '../../support/fragments/users/userEdit';
import Users from '../../support/fragments/users/users';
import { getTestEntityValue } from '../../support/utils/stringTools';

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
    cy.getAdminToken();
    UserEdit.changeServicePointPreferenceViaApi(userData.userId, [testData.userServicePoint.id]);
    ServicePoints.deleteViaApi(testData.userServicePoint.id);
    Users.deleteViaApi(userData.userId);
    PatronGroups.deleteViaApi(patronGroup.id);
  });

  it(
    'C365625 Verify that users can select filters, but not the Actions menus with "Circulation log: View permission " (volaris)',
    { tags: ['criticalPath', 'volaris'] },
    () => {
      SearchPane.filterByLastWeek();
      SearchResults.checkTableWithoutLinks();
      SearchResults.checkTableWithoutColumns(['Action']);
      SearchPane.checkExportResultIsUnavailable();
      cy.wait(1000);
      SearchPane.setFilterOptionFromAccordion('loan', 'Checked out');
      SearchPane.checkResultSearch({ object: 'Loan' });
      SearchPane.checkExportResultIsUnavailable();
      SearchPane.resetResults();

      SearchPane.filterByLastWeek();
      cy.wait(1000);
      SearchPane.setFilterOptionFromAccordion('notice', 'Send');
      SearchPane.checkResultSearch({ object: 'Notice' });
      SearchPane.checkExportResultIsUnavailable();
      SearchPane.resetResults();

      SearchPane.filterByLastWeek();
      cy.wait(1000);
      SearchPane.setFilterOptionFromAccordion('fee', 'Billed');
      SearchPane.checkResultSearch({ object: 'Fee/fine' });
      SearchPane.checkExportResultIsUnavailable();
      SearchPane.resetResults();

      SearchPane.filterByLastWeek();
      cy.wait(1000);
      SearchPane.setFilterOptionFromAccordion('request', 'Created');
      SearchPane.checkResultSearch({ object: 'Request' });
      SearchPane.checkExportResultIsUnavailable();
    },
  );
});
