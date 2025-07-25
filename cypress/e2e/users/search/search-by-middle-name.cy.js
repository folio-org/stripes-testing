import { APPLICATION_NAMES } from '../../../support/constants';
import permissions from '../../../support/dictionary/permissions';
import CheckOutActions from '../../../support/fragments/check-out-actions/check-out-actions';
import Checkout from '../../../support/fragments/checkout/checkout';
import ServicePoints from '../../../support/fragments/settings/tenant/servicePoints/servicePoints';
import TopMenu from '../../../support/fragments/topMenu';
import TopMenuNavigation from '../../../support/fragments/topMenuNavigation';
import UserEdit from '../../../support/fragments/users/userEdit';
import Users from '../../../support/fragments/users/users';
import UsersSearchPane from '../../../support/fragments/users/usersSearchPane';

describe('Users', () => {
  const testData = {
    user: Users.generateUserModel(),
  };

  before('Preconditions', () => {
    cy.getAdminToken().then(() => {
      cy.createTempUserParameterized(
        testData.user,
        [permissions.checkoutAll.gui, permissions.uiUsersView.gui],
        { userType: 'patron' },
      )
        .then((userProperties) => {
          testData.user = userProperties;
          testData.user = { ...testData.user, ...userProperties };
        })
        .then(() => {
          ServicePoints.getCircDesk1ServicePointViaApi()
            .then((servicePoint) => {
              testData.servicePointId = servicePoint.id;
            })
            .then(() => {
              UserEdit.addServicePointViaApi(
                testData.servicePointId,
                testData.user.userId,
                testData.servicePointId,
              );
            })
            .then(() => {
              cy.login(testData.user.username, testData.user.password, {
                path: TopMenu.usersPath,
                waiter: UsersSearchPane.waitLoading,
              });
            });
        });
    });
  });

  after('Deleting created entities', () => {
    cy.getAdminToken();
    UserEdit.changeServicePointPreferenceViaApi(testData.user.userId, [testData.servicePointId]);
    Users.deleteViaApi(testData.user.userId);
  });

  it(
    'C389464 Search by middle name (volaris)',
    { tags: ['criticalPath', 'volaris', 'C389464', 'eurekaPhase1'] },
    () => {
      UsersSearchPane.searchByKeywords(testData.user.personal.middleName);
      Users.verifyMiddleNameOnUserDetailsPane(testData.user.personal.middleName);

      TopMenuNavigation.navigateToApp(APPLICATION_NAMES.CHECK_OUT);
      Checkout.waitLoading();
      CheckOutActions.addPatron(testData.user.personal.middleName);
    },
  );
});
