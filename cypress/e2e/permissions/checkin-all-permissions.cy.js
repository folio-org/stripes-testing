import { PaneHeader } from '../../../interactors';
import Permissions from '../../support/dictionary/permissions';
import CheckInActions from '../../support/fragments/check-in-actions/checkInActions';
import Requests from '../../support/fragments/requests/requests';
import ServicePoints from '../../support/fragments/settings/tenant/servicePoints/servicePoints';
import SettingsMenu from '../../support/fragments/settingsMenu';
import TopMenu from '../../support/fragments/topMenu';
import UserEdit from '../../support/fragments/users/userEdit';
import Users from '../../support/fragments/users/users';
import UsersCard from '../../support/fragments/users/usersCard';
import UsersSearchPane from '../../support/fragments/users/usersSearchPane';

describe('Permissions', () => {
  const testData = {
    checkin: {},
    requests: {},
    feefines: {},
    viewRequests: {},
  };
  let servicePoint;

  before('Create test data', () => {
    cy.getAdminToken().then(() => {
      servicePoint = ServicePoints.getDefaultServicePointWithPickUpLocation();
      ServicePoints.createViaApi(servicePoint);
    });

    cy.createTempUser([Permissions.checkinAll.gui]).then((userProperties) => {
      testData.checkin.user = userProperties;
      UserEdit.addServicePointViaApi(
        servicePoint.id,
        testData.checkin.user.userId,
        servicePoint.id,
      );
    });

    cy.createTempUser([Permissions.uiRequestsAll.gui]).then((userProperties) => {
      testData.requests.user = userProperties;
      UserEdit.addServicePointViaApi(
        servicePoint.id,
        testData.requests.user.userId,
        servicePoint.id,
      );
    });

    cy.createTempUser([Permissions.uiUsersSettingsAllFeeFinesRelated.gui]).then(
      (userProperties) => {
        testData.feefines.user = userProperties;
      },
    );

    cy.createTempUser([Permissions.usersViewRequests.gui, Permissions.uiUsersView.gui]).then(
      (userProperties) => {
        testData.viewRequests.user = userProperties;
      },
    );
  });

  after('Delete test data', () => {
    cy.getAdminToken();
    UserEdit.changeServicePointPreferenceViaApi(testData.checkin.user.userId, [servicePoint.id]);
    UserEdit.changeServicePointPreferenceViaApi(testData.requests.user.userId, [servicePoint.id]);
    ServicePoints.deleteViaApi(servicePoint.id);
    Users.deleteViaApi(testData.checkin.user.userId);
    Users.deleteViaApi(testData.requests.user.userId);
    Users.deleteViaApi(testData.feefines.user.userId);
    Users.deleteViaApi(testData.viewRequests.user.userId);
  });

  it('C488 Check in: All permissions (vega)', { tags: ['extendedPath', 'vega', 'C488'] }, () => {
    cy.login(testData.checkin.user.username, testData.checkin.user.password, {
      path: TopMenu.checkInPath,
      waiter: CheckInActions.waitLoading,
    });
    CheckInActions.waitLoading();
  });

  it('C524 Requests: All permissions (vega)', { tags: ['extendedPath', 'vega', 'C524'] }, () => {
    cy.login(testData.requests.user.username, testData.requests.user.password, {
      path: TopMenu.requestsPath,
      waiter: Requests.waitLoading,
    });
    Requests.waitLoading();
  });

  it(
    'C533 Settings (Users): Can create, edit and remove all feefines-related entries (vega)',
    { tags: ['extendedPath', 'vega', 'C533'] },
    () => {
      cy.login(testData.feefines.user.username, testData.feefines.user.password, {
        path: SettingsMenu.usersOwnersPath,
        waiter: PaneHeader('Fee/fine: Owners').exists,
      });
    },
  );

  it('C536 Users: View requests (vega)', { tags: ['extendedPath', 'vega', 'C536'] }, () => {
    cy.login(testData.viewRequests.user.username, testData.viewRequests.user.password, {
      path: TopMenu.usersPath,
      waiter: UsersSearchPane.waitLoading,
    });
    UsersSearchPane.searchByUsername(testData.viewRequests.user.username);
    UsersSearchPane.selectUserFromList(testData.viewRequests.user.username);
    UsersCard.waitLoading();
    UsersCard.verifyRequestsAccordionExists();
  });
});
