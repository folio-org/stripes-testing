import uuid from 'uuid';
import devTeams from '../../../support/dictionary/devTeams';
import permissions from '../../../support/dictionary/permissions';
import { getTestEntityValue } from '../../../support/utils/stringTools';
import SettingsMenu from '../../../support/fragments/settingsMenu';
import TestTypes from '../../../support/dictionary/testTypes';
import Users from '../../../support/fragments/users/users';
import PatronGroups from '../../../support/fragments/settings/users/patronGroups';
import ServicePoints from '../../../support/fragments/settings/tenant/servicePoints/servicePoints';
import UserEdit from '../../../support/fragments/users/userEdit';
import UsersOwners from '../../../support/fragments/settings/users/usersOwners';
import WaiveReasons from '../../../support/fragments/settings/users/waiveReasons';
import RefundReasons from '../../../support/fragments/settings/users/refundReasons';
import PaymentMethods from '../../../support/fragments/settings/users/paymentMethods';
import UsersSettingsGeneral from '../../../support/fragments/settings/users/usersSettingsGeneral';

describe('Permission Sets', () => {
  let userData;
  const patronGroup = {
    name: getTestEntityValue('GroupPermissionSets'),
  };
  const testData = {
    userServicePoint: ServicePoints.getDefaultServicePointWithPickUpLocation('autotestPermissionSets', uuid()),
  };
  const ownerBody = {
    ...UsersOwners.getDefaultNewOwner(uuid()),
    servicePointOwner: [
      {
        value: testData.userServicePoint.id,
        label: testData.userServicePoint.name,
      },
    ],
  };
  const waiveReason = WaiveReasons.getDefaultNewWaiveReason(uuid());
  const refundReason = RefundReasons.getDefaultNewRefundReason(uuid());

  before('Preconditions', () => {
    cy.getAdminToken().then(() => {
      ServicePoints.createViaApi(testData.userServicePoint);
      UsersOwners.createViaApi(ownerBody);
      WaiveReasons.createViaApi(waiveReason);
      PaymentMethods.createViaApi(ownerBody.id).then((paymentRes) => {
        testData.paymentMethodId = paymentRes.id;
        testData.paymentMethodName = paymentRes.name;
      });
      RefundReasons.createViaApi(refundReason);
      PatronGroups.createViaApi(patronGroup.name).then((patronGroupResponse) => {
        patronGroup.id = patronGroupResponse;
      });
      cy.createTempUser([permissions.uiUsersViewAllSettings.gui], patronGroup.name).then((userProperties) => {
        userData = userProperties;
        UserEdit.addServicePointViaApi(
          testData.userServicePoint.id,
          userData.userId,
          testData.userServicePoint.id
        );
        cy.login(userData.username, userData.password);
      });
    });
  });

  after('Deleting created entities', () => {
    UserEdit.changeServicePointPreferenceViaApi(userData.userId, [testData.userServicePoint.id]);
    ServicePoints.deleteViaApi(testData.userServicePoint.id);
    Users.deleteViaApi(userData.userId);
    PatronGroups.deleteViaApi(patronGroup.id);
    RefundReasons.deleteViaApi(refundReason.id);
    WaiveReasons.deleteViaApi(waiveReason.id);
    PaymentMethods.deleteViaApi(testData.paymentMethodId);
    UsersOwners.deleteViaApi(ownerBody.id);
  });

  it(
    'C402752 Verify that "Setting (Users): View all settings" works as expected Scenario 2 (volaris)',
    { tags: [TestTypes.extendedPath, devTeams.volaris] },
    () => {
      cy.visit(SettingsMenu.usersOwnersPath);
      UsersSettingsGeneral.checkEntityInTable({ reason: ownerBody.owner, description: ownerBody.desc });
      UsersSettingsGeneral.checkEditDeleteNewButtonsNotDisplayed();

      cy.visit(SettingsMenu.waiveReasons);
      UsersSettingsGeneral.checkEntityInTable({ reason: waiveReason.nameReason, description: waiveReason.description });
      UsersSettingsGeneral.checkEditDeleteNewButtonsNotDisplayed();

      cy.visit(SettingsMenu.paymentsPath);
      PaymentMethods.checkPaymentMethodInTable(ownerBody.owner, testData.paymentMethodName);
      UsersSettingsGeneral.checkEditDeleteNewButtonsNotDisplayed();

      cy.visit(SettingsMenu.refundReasons);
      UsersSettingsGeneral.checkEntityInTable({ reason: refundReason.nameReason, description: refundReason.description });
      UsersSettingsGeneral.checkEditDeleteNewButtonsNotDisplayed();
    }
  );
});
