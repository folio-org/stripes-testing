import moment from 'moment';
import { APPLICATION_NAMES } from '../../../../../support/constants';
import Affiliations, { tenantNames } from '../../../../../support/dictionary/affiliations';
import Permissions from '../../../../../support/dictionary/permissions';
import ConsortiaControlledVocabularyPaneset, {
  actionIcons,
} from '../../../../../support/fragments/consortium-manager/consortiaControlledVocabularyPaneset';
import ConsortiumManagerApp, {
  settingsItems,
} from '../../../../../support/fragments/consortium-manager/consortiumManagerApp';
import StatisticalCodesConsortiumManager from '../../../../../support/fragments/consortium-manager/inventory/instances-holdings-items/statisticalCodesConsortiumManager';
import SelectMembers from '../../../../../support/fragments/consortium-manager/modal/select-members';
import StatisticalCodes from '../../../../../support/fragments/settings/inventory/instance-holdings-item/statisticalCodes';
import TopMenuNavigation from '../../../../../support/fragments/topMenuNavigation';
import Users from '../../../../../support/fragments/users/users';
import { getTestEntityValue } from '../../../../../support/utils/stringTools';
import ConsortiumManager from '../../../../../support/fragments/settings/consortium-manager/consortium-manager';

describe('Consortia', () => {
  describe('Consortium manager', () => {
    describe('View settings', () => {
      describe('View Statistical codes', () => {
        const testData = {
          centralSharedStatisticalCode: {
            payload: {
              name: getTestEntityValue('C411581_centralSharedStatisticalCode'),
              code: getTestEntityValue('C411581_centralSharedCode'),
            },
          },
          centralLocalStatisticalCode: {
            name: getTestEntityValue('C411581_centralLocalStatisticalCode'),
            code: getTestEntityValue('C411581_centralLocalCode'),
            source: 'local',
          },
          collegeLocalStatisticalCode: {
            name: getTestEntityValue('C411581_collegeLocalStatisticalCode'),
            code: getTestEntityValue('C411581_collegeLocalCode'),
            source: 'local',
          },
          universityLocalStatisticalCode: {
            name: getTestEntityValue('C411581_universityLocalStatisticalCode'),
            code: getTestEntityValue('C411581_universityLocalCode'),
            source: 'local',
          },
        };

        const constants = {
          source: {
            consortium: 'consortium',
            local: 'local',
          },
          memberLibraries: {
            all: 'All',
          },
        };

        let statisticalCodeType;

        before('Create test data', () => {
          cy.getAdminToken()
            .then(() => {
              // Get statistical code type for creating codes
              cy.getStatisticalCodeTypes({ limit: 1, query: 'source=folio' }).then((types) => {
                statisticalCodeType = types[0];
                // Create shared statistical code
                testData.centralSharedStatisticalCode.payload.statisticalCodeTypeId =
                  statisticalCodeType.id;
                StatisticalCodesConsortiumManager.createViaApi(
                  testData.centralSharedStatisticalCode,
                ).then((response) => {
                  testData.centralSharedStatisticalCode = response;
                });
              });
            })
            .then(() => {
              cy.resetTenant();
              // Create central local statistical code
              testData.centralLocalStatisticalCode.statisticalCodeTypeId = statisticalCodeType.id;
              StatisticalCodes.createViaApi(testData.centralLocalStatisticalCode).then(
                (response) => {
                  testData.centralLocalStatisticalCode.id = response.id;
                },
              );
            })
            .then(() => {
              cy.setTenant(Affiliations.College);
              // Create college local statistical code
              testData.collegeLocalStatisticalCode.statisticalCodeTypeId = statisticalCodeType.id;
              StatisticalCodes.createViaApi(testData.collegeLocalStatisticalCode).then(
                (response) => {
                  testData.collegeLocalStatisticalCode.id = response.id;
                },
              );
            })
            .then(() => {
              cy.setTenant(Affiliations.University);
              // Create university local statistical code
              testData.universityLocalStatisticalCode.statisticalCodeTypeId =
                statisticalCodeType.id;
              StatisticalCodes.createViaApi(testData.universityLocalStatisticalCode).then(
                (response) => {
                  testData.universityLocalStatisticalCode.id = response.id;
                },
              );
            })
            .then(() => {
              // Create user in college tenant with affiliations and edit permissions
              cy.setTenant(Affiliations.College);
              cy.createTempUser([Permissions.uiSettingsStatisticalCodesCreateEditDelete.gui]).then(
                (userProperties) => {
                  testData.user = userProperties;

                  cy.resetTenant();
                  cy.assignAffiliationToUser(Affiliations.University, testData.user.userId);
                  cy.assignPermissionsToExistingUser(testData.user.userId, [
                    Permissions.consortiaSettingsConsortiumManagerEdit.gui,
                    Permissions.uiSettingsStatisticalCodesCreateEditDelete.gui,
                  ]);
                  cy.setTenant(Affiliations.University);
                  cy.assignPermissionsToExistingUser(testData.user.userId, [
                    Permissions.uiSettingsStatisticalCodesCreateEditDelete.gui,
                  ]);
                },
              );
            })
            .then(() => {
              cy.resetTenant();
              cy.waitForAuthRefresh(() => {
                cy.login(testData.user.username, testData.user.password);
                ConsortiumManager.checkCurrentTenantInTopMenu(tenantNames.college);
                cy.reload();
                ConsortiumManager.checkCurrentTenantInTopMenu(tenantNames.college);
              }, 20_000);
              ConsortiumManager.switchActiveAffiliation(tenantNames.college, tenantNames.central);
              // Without waiter, permissions aren't loading
              cy.wait(10000);
            });
        });

        after('Delete test data', () => {
          cy.resetTenant();
          cy.getAdminToken();
          StatisticalCodesConsortiumManager.deleteViaApi(testData.centralSharedStatisticalCode);
          StatisticalCodes.deleteViaApi(testData.centralLocalStatisticalCode.id);
          cy.setTenant(Affiliations.College);
          Users.deleteViaApi(testData.user.userId);
          StatisticalCodes.deleteViaApi(testData.collegeLocalStatisticalCode.id);
          cy.setTenant(Affiliations.University);
          StatisticalCodes.deleteViaApi(testData.universityLocalStatisticalCode.id);
        });

        it(
          'C411581 User with "Consortium manager: Can create, edit and remove settings" permission is able to view the list of statistical codes of affiliated tenants in "Consortium manager" app (consortia) (thunderjet)',
          { tags: ['extendedPathECS', 'thunderjet', 'C411581'] },
          () => {
            // Step 1: User opens "Consortium manager" app (already logged in and switched to central tenant)
            TopMenuNavigation.navigateToApp(APPLICATION_NAMES.CONSORTIUM_MANAGER);
            ConsortiumManagerApp.verifyStatusOfConsortiumManager();
            // User expands "Members selection" accordion
            SelectMembers.selectAllMembers();
            ConsortiumManagerApp.verifyStatusOfConsortiumManager(3);

            // Step 3: Uncheck University tenant (member-2)
            ConsortiumManagerApp.clickSelectMembers();
            SelectMembers.verifyStatusOfSelectMembersModal(3, 3, true);
            SelectMembers.checkMember(tenantNames.university, false);
            SelectMembers.verifyStatusOfSelectMembersModal(3, 2, false);
            SelectMembers.saveAndClose();
            ConsortiumManagerApp.verifyStatusOfConsortiumManager(2);

            // Step 5: User clicks on "Inventory" settings and then "Statistical codes"
            ConsortiumManagerApp.chooseSettingsItem(settingsItems.inventory);
            StatisticalCodesConsortiumManager.choose();
            ConsortiaControlledVocabularyPaneset.verifyNewButtonShown(true);

            // Step 6: Verify shared statistical code from Central tenant
            ConsortiaControlledVocabularyPaneset.verifyRecordIsInTheList(
              testData.centralSharedStatisticalCode.payload.code,
              constants.source.consortium,
              [
                testData.centralSharedStatisticalCode.payload.code,
                testData.centralSharedStatisticalCode.payload.name,
                statisticalCodeType.name,
                constants.source.consortium,
                `${moment().format('l')} by`,
                constants.memberLibraries.all,
              ],
            );

            // Step 7: Verify central local statistical code with Edit/Delete actions
            ConsortiaControlledVocabularyPaneset.verifyRecordIsInTheList(
              testData.centralLocalStatisticalCode.code,
              tenantNames.central,
              [
                testData.centralLocalStatisticalCode.code,
                testData.centralLocalStatisticalCode.name,
                statisticalCodeType.name,
                constants.source.local,
                `${moment().format('l')} by`,
                tenantNames.central,
              ],
              [actionIcons.edit, actionIcons.trash],
            );

            // Step 8: Verify college local statistical code with Edit/Delete actions
            ConsortiaControlledVocabularyPaneset.verifyRecordIsInTheList(
              testData.collegeLocalStatisticalCode.code,
              tenantNames.college,
              [
                testData.collegeLocalStatisticalCode.code,
                testData.collegeLocalStatisticalCode.name,
                statisticalCodeType.name,
                constants.source.local,
                `${moment().format('l')} by`,
                tenantNames.college,
              ],
              [actionIcons.edit, actionIcons.trash],
            );

            // Step 9: Verify university local statistical code is NOT visible (member-2 unchecked)
            ConsortiaControlledVocabularyPaneset.verifyRecordNotInTheList(
              testData.universityLocalStatisticalCode.code,
            );

            // Step 11: Uncheck College tenant (member-1)
            ConsortiumManagerApp.clickSelectMembers();
            SelectMembers.verifyStatusOfSelectMembersModal(3, 2, false);
            SelectMembers.checkMember(tenantNames.college, false);
            SelectMembers.verifyStatusOfSelectMembersModal(3, 1, false);
            SelectMembers.saveAndClose();
            ConsortiumManagerApp.verifyStatusOfConsortiumManager(1);

            // Step 13: Verify shared statistical code still visible
            ConsortiaControlledVocabularyPaneset.verifyRecordIsInTheList(
              testData.centralSharedStatisticalCode.payload.code,
              constants.source.consortium,
              [
                testData.centralSharedStatisticalCode.payload.code,
                testData.centralSharedStatisticalCode.payload.name,
                statisticalCodeType.name,
                constants.source.consortium,
                `${moment().format('l')} by`,
                constants.memberLibraries.all,
              ],
            );

            // Step 14: Verify central local statistical code still visible with Edit/Delete actions
            ConsortiaControlledVocabularyPaneset.verifyRecordIsInTheList(
              testData.centralLocalStatisticalCode.code,
              tenantNames.central,
              [
                testData.centralLocalStatisticalCode.code,
                testData.centralLocalStatisticalCode.name,
                statisticalCodeType.name,
                constants.source.local,
                `${moment().format('l')} by`,
                tenantNames.central,
              ],
              [actionIcons.edit, actionIcons.trash],
            );

            // Step 15: Verify college local statistical code is NOT visible (member-1 unchecked)
            ConsortiaControlledVocabularyPaneset.verifyRecordNotInTheList(
              testData.collegeLocalStatisticalCode.code,
            );

            // Step 16: Verify university local statistical code is NOT visible (member-2 unchecked)
            ConsortiaControlledVocabularyPaneset.verifyRecordNotInTheList(
              testData.universityLocalStatisticalCode.code,
            );
          },
        );
      });
    });
  });
});
