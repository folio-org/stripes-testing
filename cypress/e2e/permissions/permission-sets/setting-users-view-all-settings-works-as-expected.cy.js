import uuid from 'uuid';
import devTeams from '../../../support/dictionary/devTeams';
import permissions from '../../../support/dictionary/permissions';
import getRandomPostfix, { getTestEntityValue } from '../../../support/utils/stringTools';
import Arrays from '../../../support/utils/arrays';
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
import Departments from '../../../support/fragments/settings/users/departments';
import Conditions from '../../../support/fragments/settings/users/conditions';
import Limits from '../../../support/fragments/settings/users/limits';
import PermissionSets from '../../../support/fragments/settings/users/permissionSets';

describe('Permission Sets', () => {
  let userData;
  const patronGroup = {
    name: getTestEntityValue('GroupPermissionSets'),
  };
  const testData = {
    userServicePoint: ServicePoints.getDefaultServicePointWithPickUpLocation(),
  };
  const departmentBody = {
    code: getRandomPostfix(),
    id: uuid(),
    name: getTestEntityValue('PSDepartment'),
  };
  const ownerBody = {
    ...UsersOwners.getDefaultNewOwner(),
    servicePointOwner: [
      {
        value: testData.userServicePoint.id,
        label: testData.userServicePoint.name,
      },
    ],
  };
  const waiveReason = WaiveReasons.getDefaultNewWaiveReason(uuid());
  const refundReason = RefundReasons.getDefaultNewRefundReason(uuid());
  const permissionSetBody = {
    displayName: getTestEntityValue('setName'),
    description: getTestEntityValue('setDescription'),
    subPermissions: [
      permissions.uiUsersViewPermissionSets.internal,
      permissions.uiUsersViewAllSettings.internal,
    ],
    mutable: true,
    id: uuid(),
  };

  before('Preconditions', () => {
    cy.getAdminToken().then(() => {
      ServicePoints.createViaApi(testData.userServicePoint);
      UsersOwners.createViaApi(ownerBody);
      WaiveReasons.createViaApi(waiveReason);
      PaymentMethods.createViaApi(ownerBody.id).then((paymentRes) => {
        testData.paymentMethodId = paymentRes.id;
        testData.paymentMethodName = paymentRes.name;
      });
      Departments.createViaApi(departmentBody);
      RefundReasons.createViaApi(refundReason);
      PatronGroups.createViaApi(patronGroup.name).then((patronGroupResponse) => {
        patronGroup.id = patronGroupResponse;
      });
      PermissionSets.createPermissionSetViaApi(permissionSetBody);
      cy.createTempUser([permissions.uiUsersViewAllSettings.gui], patronGroup.name).then(
        (userProperties) => {
          userData = userProperties;
          UserEdit.addServicePointViaApi(
            testData.userServicePoint.id,
            userData.userId,
            testData.userServicePoint.id,
          );
          cy.login(userData.username, userData.password);
        },
      );
    });
  });

  after('Deleting created entities', () => {
    PermissionSets.deletePermissionSetViaApi(permissionSetBody.id);
    UserEdit.changeServicePointPreferenceViaApi(userData.userId, [testData.userServicePoint.id]);
    ServicePoints.deleteViaApi(testData.userServicePoint.id);
    Users.deleteViaApi(userData.userId);
    PatronGroups.deleteViaApi(patronGroup.id);
    Departments.deleteViaApi(departmentBody.id);
    RefundReasons.deleteViaApi(refundReason.id);
    WaiveReasons.deleteViaApi(waiveReason.id);
    PaymentMethods.deleteViaApi(testData.paymentMethodId);
    UsersOwners.deleteViaApi(ownerBody.id);
  });

  it(
    'C402342 Verify that Creating and Editing options are disabled for users with "Setting (Users): View all settings" permission scenario 1 (volaris)',
    { tags: [TestTypes.extendedPath, devTeams.volaris] },
    () => {
      cy.visit(SettingsMenu.permissionSets);
      PermissionSets.waitLoading();
      PermissionSets.checkNewButtonNotAvailable();
      PermissionSets.chooseFromList(permissionSetBody.displayName);
      PermissionSets.checkPermissionSet({
        name: permissionSetBody.displayName,
        description: permissionSetBody.description,
        permissions: [
          permissions.uiUsersViewPermissionSets.gui,
          permissions.uiUsersViewAllSettings.gui,
        ],
      });
      PermissionSets.checkEditButtonNotAvailable();
    },
  );

  it(
    'C402752 Verify that "Settings (Users): View all settings" works as expected Scenario 2 (volaris)',
    { tags: [TestTypes.extendedPath, devTeams.volaris] },
    () => {
      cy.visit(SettingsMenu.usersOwnersPath);
      UsersSettingsGeneral.checkEntityInTable({
        name: ownerBody.owner,
        description: ownerBody.desc,
      });
      UsersSettingsGeneral.checkEditDeleteNewButtonsNotDisplayed();

      cy.visit(SettingsMenu.waiveReasons);
      UsersSettingsGeneral.checkEntityInTable({
        name: waiveReason.nameReason,
        description: waiveReason.description,
      });
      UsersSettingsGeneral.checkEditDeleteNewButtonsNotDisplayed();

      cy.visit(SettingsMenu.paymentsPath);
      PaymentMethods.checkPaymentMethodInTable(ownerBody.owner, testData.paymentMethodName);
      UsersSettingsGeneral.checkEditDeleteNewButtonsNotDisplayed();

      cy.visit(SettingsMenu.refundReasons);
      UsersSettingsGeneral.checkEntityInTable({
        name: refundReason.nameReason,
        description: refundReason.description,
      });
      UsersSettingsGeneral.checkEditDeleteNewButtonsNotDisplayed();
    },
  );

  it(
    'C404380 Verify that "Settings (Users): View all settings" works as expected Scenario 4 (volaris)',
    { tags: [TestTypes.extendedPath, devTeams.volaris] },
    () => {
      cy.visit(SettingsMenu.limitsPath);
      Limits.selectGroup('undergrad');
      Limits.verifyLimitsCantBeChanged();
    },
  );

  it(
    'C404383 Verify that "Settings (Users): View all settings" works as expected Scenario 5 (volaris)',
    { tags: [TestTypes.extendedPath, devTeams.volaris] },
    () => {
      cy.visit(SettingsMenu.conditionsPath);
      Conditions.waitLoading();
      Conditions.select(Arrays.getRandomElement(Conditions.conditionsValues));
      Conditions.verifyConditionsCantBeChanged();
    },
  );

  it(
    'C405545 Verify that "Settings (Users): View all settings" works as expected Scenario 6 (volaris)',
    { tags: [TestTypes.extendedPath, devTeams.volaris] },
    () => {
      cy.visit(SettingsMenu.patronGroups);
      UsersSettingsGeneral.checkEntityInTable({
        name: 'undergrad',
        description: 'Undergraduate Student',
      });
      UsersSettingsGeneral.checkEditDeleteNewButtonsNotDisplayed();

      cy.visit(SettingsMenu.addressTypes);
      UsersSettingsGeneral.checkEntityInTable({ name: 'Work', description: 'Work Address' });
      UsersSettingsGeneral.checkEditDeleteNewButtonsNotDisplayed();

      cy.visit(SettingsMenu.departments);
      Departments.waitLoading();
      UsersSettingsGeneral.checkEditDeleteNewButtonsNotDisplayed();
    },
  );
});
