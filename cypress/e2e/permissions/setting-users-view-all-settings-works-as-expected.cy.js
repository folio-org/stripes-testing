import uuid from 'uuid';
import permissions from '../../support/dictionary/permissions';
import ServicePoints from '../../support/fragments/settings/tenant/servicePoints/servicePoints';
import Departments from '../../support/fragments/settings/users/departments';
import Limits from '../../support/fragments/settings/users/limits';
import PatronGroups from '../../support/fragments/settings/users/patronGroups';
import PaymentMethods from '../../support/fragments/settings/users/paymentMethods';
import PermissionSets from '../../support/fragments/settings/users/permissionSets';
import RefundReasons from '../../support/fragments/settings/users/refundReasons';
import UsersOwners from '../../support/fragments/settings/users/usersOwners';
import UsersSettingsGeneral from '../../support/fragments/settings/users/usersSettingsGeneral';
import WaiveReasons from '../../support/fragments/settings/users/waiveReasons';
import SettingsMenu from '../../support/fragments/settingsMenu';
import UserEdit from '../../support/fragments/users/userEdit';
import Users from '../../support/fragments/users/users';
import Arrays from '../../support/utils/arrays';
import getRandomPostfix, { getTestEntityValue } from '../../support/utils/stringTools';
import CustomFields from '../../support/fragments/settings/users/customFields';
import ManualCharges from '../../support/fragments/settings/users/manualCharges';
import CommentRequired from '../../support/fragments/settings/users/comment-required';
import Conditions from '../../support/fragments/settings/users/conditions';
import PatronBlockTemplates from '../../support/fragments/settings/users/patronBlockTemplates';

describe('Permissions', () => {
  describe('Permissions', () => {
    describe('Users', () => {
      const waitTimeout = 3 * 1000;
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
      const patronBlockTemplate = {
        name: getTestEntityValue('Template'),
        desc: getTestEntityValue('Description'),
      };

      before('Preconditions', () => {
        cy.getAdminToken().then(() => {
          ServicePoints.createViaApi(testData.userServicePoint);
          PatronBlockTemplates.createViaApi(patronBlockTemplate).then((templateResp) => {
            testData.patronBlockTemplateId = templateResp.id;
          });
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
        cy.getAdminToken();
        PatronBlockTemplates.deleteViaApi(testData.patronBlockTemplateId);
        if (permissionSetBody) {
          PermissionSets.deletePermissionSetViaApi(permissionSetBody.id);
        }
        UserEdit.changeServicePointPreferenceViaApi(userData.userId, [
          testData.userServicePoint.id,
        ]);
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
        'C396393 Verify that new permission to view all user settings are added (volaris)',
        { tags: ['extendedPath', 'volaris', 'C396393'] },
        () => {
          cy.visit(SettingsMenu.permissionSets);
          cy.wait(waitTimeout);
          PermissionSets.waitLoading();
          PermissionSets.checkNewButtonNotAvailable();

          cy.visit(SettingsMenu.patronGroups);
          cy.wait(waitTimeout);
          UsersSettingsGeneral.checkEditDeleteNewButtonsNotDisplayed();

          cy.visit(SettingsMenu.addressTypes);
          cy.wait(waitTimeout);
          UsersSettingsGeneral.checkEditDeleteNewButtonsNotDisplayed();

          cy.visit(SettingsMenu.departments);
          cy.wait(waitTimeout);
          Departments.waitLoading();
          UsersSettingsGeneral.checkEditDeleteNewButtonsNotDisplayed();

          cy.visit(SettingsMenu.customFieldsPath);
          cy.wait(waitTimeout);
          CustomFields.waitLoading();
          CustomFields.verifyEditButtonAbsent();

          cy.visit(SettingsMenu.usersOwnersPath);
          cy.wait(waitTimeout);
          UsersSettingsGeneral.checkEditDeleteNewButtonsNotDisplayed();

          cy.visit(SettingsMenu.manualCharges);
          cy.wait(waitTimeout);
          ManualCharges.waitLoading();
          UsersSettingsGeneral.checkEditDeleteNewButtonsNotDisplayed();

          cy.visit(SettingsMenu.waiveReasons);
          cy.wait(waitTimeout);
          UsersSettingsGeneral.checkEditDeleteNewButtonsNotDisplayed();

          cy.visit(SettingsMenu.paymentsPath);
          cy.wait(waitTimeout);
          UsersSettingsGeneral.checkEditDeleteNewButtonsNotDisplayed();

          cy.visit(SettingsMenu.refundReasons);
          cy.wait(waitTimeout);
          UsersSettingsGeneral.checkEditDeleteNewButtonsNotDisplayed();

          cy.visit(SettingsMenu.commentRequired);
          cy.wait(waitTimeout);
          CommentRequired.waitLoading();
          CommentRequired.verifyEditNotAvailable();

          cy.visit(SettingsMenu.transferAccounts);
          cy.wait(waitTimeout);
          UsersSettingsGeneral.checkEditDeleteNewButtonsNotDisplayed();

          cy.visit(SettingsMenu.conditionsPath);
          cy.wait(waitTimeout);
          Conditions.waitLoading();
          Conditions.select(Arrays.getRandomElement(Conditions.conditionTypes));
          Conditions.verifyConditionsCantBeChanged();

          cy.visit(SettingsMenu.limitsPath);
          cy.wait(waitTimeout);
          Limits.selectGroup('undergrad');
          Limits.verifyLimitsCantBeChanged();

          cy.visit(SettingsMenu.patronBlockTemplates);
          cy.wait(waitTimeout);
          PatronBlockTemplates.verifyAddNewNotAvailable();
        },
      );

      it(
        'C407702 User with "Settings (Users): View all settings" permission only can view "Manual Charges" page on "Users > Settings" - when system has no configured Fee/Fine owners (volaris)',
        { tags: ['extendedPath', 'volaris', 'C407702'] },
        () => {
          cy.visit(SettingsMenu.manualCharges);
          cy.wait(waitTimeout);
          ManualCharges.waitLoading();
          UsersSettingsGeneral.checkEditDeleteNewButtonsNotDisplayed();
        },
      );

      it(
        'C402752 Verify that "Settings (Users): View all settings" works as expected Scenario 2 (volaris)',
        { tags: ['extendedPath', 'volaris', 'C402752'] },
        () => {
          cy.visit(SettingsMenu.usersOwnersPath);
          cy.wait(waitTimeout);
          UsersSettingsGeneral.checkEntityInTable({
            name: ownerBody.owner,
            description: ownerBody.desc,
          });
          UsersSettingsGeneral.checkEditDeleteNewButtonsNotDisplayed();

          cy.visit(SettingsMenu.waiveReasons);
          cy.wait(waitTimeout);
          UsersSettingsGeneral.checkEntityInTable({
            name: waiveReason.nameReason,
            description: waiveReason.description,
          });
          UsersSettingsGeneral.checkEditDeleteNewButtonsNotDisplayed();

          cy.visit(SettingsMenu.paymentsPath);
          cy.wait(waitTimeout);
          PaymentMethods.checkPaymentMethodInTable(ownerBody.owner, testData.paymentMethodName);
          UsersSettingsGeneral.checkEditDeleteNewButtonsNotDisplayed();

          cy.visit(SettingsMenu.refundReasons);
          cy.wait(waitTimeout);
          UsersSettingsGeneral.checkEntityInTable({
            name: refundReason.nameReason,
            description: refundReason.description,
          });
          UsersSettingsGeneral.checkEditDeleteNewButtonsNotDisplayed();
        },
      );

      it(
        'C402779 Verify that "Settings(users):View all settings " allows to only view Templates (volaris)',
        { tags: ['extendedPath', 'volaris', 'C402779'] },
        () => {
          cy.visit(SettingsMenu.patronBlockTemplates);
          cy.wait(waitTimeout);
          PatronBlockTemplates.findPatronTemplate(patronBlockTemplate.name);
          PermissionSets.checkEditButtonNotAvailable();
        },
      );

      it(
        'C404380 Verify that "Settings (Users): View all settings" works as expected Scenario 4 (volaris)',
        { tags: ['extendedPath', 'volaris', 'C404380'] },
        () => {
          cy.visit(SettingsMenu.limitsPath);
          cy.wait(waitTimeout);
          Limits.selectGroup('undergrad');
          Limits.verifyLimitsCantBeChanged();
        },
      );

      it(
        'C404383 Verify that "Settings (Users): View all settings" works as expected Scenario 5 (volaris)',
        { tags: ['extendedPathFlaky', 'volaris', 'C404383'] },
        () => {
          cy.visit(SettingsMenu.conditionsPath);
          cy.wait(waitTimeout);
          Conditions.waitLoading();
          Conditions.select(Arrays.getRandomElement(Conditions.conditionTypes));
          Conditions.verifyConditionsCantBeChanged();
        },
      );
    });
  });
});
