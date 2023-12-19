import uuid from 'uuid';
import permissions from '../../support/dictionary/permissions';
import CheckOutActions from '../../support/fragments/check-out-actions/check-out-actions';
import Checkout from '../../support/fragments/checkout/checkout';
import ServicePoints from '../../support/fragments/settings/tenant/servicePoints/servicePoints';
import PatronGroups from '../../support/fragments/settings/users/patronGroups';
import TopMenu from '../../support/fragments/topMenu';
import UserEdit from '../../support/fragments/users/userEdit';
import Users from '../../support/fragments/users/users';
import UsersSearchPane from '../../support/fragments/users/usersSearchPane';
import { getTestEntityValue } from '../../support/utils/stringTools';

describe('Users', () => {
  const patronGroup = {
    name: getTestEntityValue('GroupUser'),
  };
  let userData = {
    password: getTestEntityValue('Password'),
    username: getTestEntityValue('cypressTestUser'),
  };
  const testData = {};

  before('Preconditions', () => {
    cy.getAdminToken().then(() => {
      ServicePoints.getViaApi({ limit: 1, query: 'name=="Circ Desk 1"' }).then((servicePoints) => {
        testData.servicePointId = servicePoints[0].id;
      });
      PatronGroups.createViaApi(patronGroup.name).then((patronGroupResponse) => {
        patronGroup.id = patronGroupResponse;
      });
      cy.getPermissionsApi({
        query: `(${'displayName'}=="${[
          permissions.checkoutAll.gui,
          permissions.uiUsersView.gui,
        ].join(`")or(${'displayName'}=="`)}"))"`,
      }).then((permissionsResponse) => {
        Users.createViaApi({
          active: true,
          patronGroup: patronGroup.id,
          username: userData.username,
          barcode: uuid(),
          personal: {
            preferredContactTypeId: '002',
            firstName: getTestEntityValue('testPermFirst'),
            middleName: getTestEntityValue('testMiddleName'),
            lastName: getTestEntityValue('testLastName'),
            email: 'test@folio.org',
          },
        }).then((newUserProperties) => {
          userData = { ...userData, ...newUserProperties };
          cy.setUserPassword(userData);
          cy.addPermissionsToNewUserApi({
            userId: userData.id,
            permissions: [
              ...permissionsResponse.body.permissions.map(
                (permission) => permission.permissionName,
              ),
            ],
          });
          cy.overrideLocalSettings(userData.id);
          UserEdit.addServicePointViaApi(
            testData.servicePointId,
            userData.id,
            testData.servicePointId,
          );
        });
        cy.login(userData.username, userData.password, {
          path: TopMenu.usersPath,
          waiter: UsersSearchPane.waitLoading,
        });
      });
    });
  });

  after('Deleting created entities', () => {
    cy.getAdminToken();
    UserEdit.changeServicePointPreferenceViaApi(userData.id, [testData.servicePointId]);
    Users.deleteViaApi(userData.id);
    PatronGroups.deleteViaApi(patronGroup.id);
  });

  it('C389464 Search by middle name (volaris)', { tags: ['criticalPath', 'volaris'] }, () => {
    UsersSearchPane.searchByKeywords(userData.middleName);
    Users.verifyMiddleNameOnUserDetailsPane(userData.middleName);
    cy.visit(TopMenu.checkOutPath);
    Checkout.waitLoading();
    CheckOutActions.addPatron(userData.middleName);
  });
});
