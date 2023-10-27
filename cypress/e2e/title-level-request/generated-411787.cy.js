import { randomFourDigitNumber } from '../../support/utils/stringTools';
import { DevTeams, Permissions, TestTypes } from '../../support/dictionary';
import TopMenu from '../../support/fragments/topMenu';
import Users from '../../support/fragments/users/users';
import SettingsMenu from '../../support/fragments/settingsMenu';
import TitleLevelRequests from '../../support/fragments/settings/circulation/titleLevelRequests';
import Requests from '../../support/fragments/requests/requests';

describe('Title Level Request', () => {
  const testData = {};

  before('Create test data', () => {
    cy.getAdminToken().then(() => {
      cy.loginAsAdmin({
        path: SettingsMenu.circulationTitleLevelRequestsPath,
        waiter: TitleLevelRequests.waitLoading,
      });
      TitleLevelRequests.changeTitleLevelRequestsStatus('allow');
    });

    cy.createTempUser([Permissions.uiRequestsAll.gui, Permissions.inventoryAll.gui]).then(
      (userProperties) => {
        testData.user = userProperties;
        cy.login(testData.user.username, testData.user.password, {
          path: TopMenu.requestsPath,
          waiter: Requests.waitLoading,
        });
      },
    );
  });

  after('Delete test data', () => {
    Users.deleteViaApi(testData.user.userId);
  });

  it(
    'C411787 Check that user can create TLR Hold for Instance with no Items (vega) (null)',
    { tags: [TestTypes.extendedPath, DevTeams.vega] },
    () => {
      cy.pause();
    },
  );
});
