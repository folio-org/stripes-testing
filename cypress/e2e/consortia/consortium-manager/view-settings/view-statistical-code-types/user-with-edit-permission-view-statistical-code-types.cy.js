import moment from 'moment';
import { APPLICATION_NAMES } from '../../../../../support/constants';
import Affiliations, { tenantNames } from '../../../../../support/dictionary/affiliations';
import Permissions from '../../../../../support/dictionary/permissions';
import ConsortiaControlledVocabularyPaneset from '../../../../../support/fragments/consortium-manager/consortiaControlledVocabularyPaneset';
import ConsortiumManagerApp, {
  settingsItems,
} from '../../../../../support/fragments/consortium-manager/consortiumManagerApp';
import StatisticalCodeTypesConsortiumManager from '../../../../../support/fragments/consortium-manager/inventory/instances-holdings-items/statisticalCodeTypesConsortiumManager';
import SelectMembers from '../../../../../support/fragments/consortium-manager/modal/select-members';
import StatisticalCodeTypes from '../../../../../support/fragments/settings/inventory/instance-holdings-item/statisticalCodeTypes';
import TopMenuNavigation from '../../../../../support/fragments/topMenuNavigation';
import Users from '../../../../../support/fragments/users/users';
import { getTestEntityValue } from '../../../../../support/utils/stringTools';
import ConsortiumManager from '../../../../../support/fragments/settings/consortium-manager/consortium-manager';

describe('Consortia', () => {
  describe('Consortium manager', () => {
    describe('View settings', () => {
      describe('View Statistical code types', () => {
        const testData = {
          centralSharedStatisticalCodeType: {
            payload: {
              name: getTestEntityValue('C411336_centralSharedStatisticalCodeType'),
            },
          },
          centralLocalStatisticalCodeType: {
            name: getTestEntityValue('C411336_centralLocalStatisticalCodeType'),
            source: 'local',
          },
          collegeLocalStatisticalCodeType: {
            name: getTestEntityValue('C411336_collegeLocalStatisticalCodeType'),
            source: 'local',
          },
          universityLocalStatisticalCodeType: {
            name: getTestEntityValue('C411336_universityLocalStatisticalCodeType'),
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

        before('Create test data', () => {
          cy.getAdminToken()
            .then(() => {
              StatisticalCodeTypesConsortiumManager.createViaApi(
                testData.centralSharedStatisticalCodeType,
              ).then((newStatisticalCodeType) => {
                testData.centralSharedStatisticalCodeType = newStatisticalCodeType;
              });
            })
            .then(() => {
              cy.resetTenant();
              StatisticalCodeTypes.createViaApi(testData.centralLocalStatisticalCodeType).then(
                (type) => {
                  testData.centralLocalStatisticalCodeType.id = type.id;
                },
              );
            })
            .then(() => {
              cy.setTenant(Affiliations.College);
              StatisticalCodeTypes.createViaApi(testData.collegeLocalStatisticalCodeType).then(
                (type) => {
                  testData.collegeLocalStatisticalCodeType.id = type.id;
                },
              );
            })
            .then(() => {
              cy.setTenant(Affiliations.University);
              StatisticalCodeTypes.createViaApi(testData.universityLocalStatisticalCodeType).then(
                (type) => {
                  testData.universityLocalStatisticalCodeType.id = type.id;
                },
              );
            })
            .then(() => {
              cy.setTenant(Affiliations.College);
              cy.createTempUser([
                Permissions.uiSettingsStatisticalCodeTypesCreateEditDelete.gui,
              ]).then((userProperties) => {
                testData.user = userProperties;

                cy.resetTenant();
                cy.assignAffiliationToUser(Affiliations.University, testData.user.userId);
                cy.assignPermissionsToExistingUser(testData.user.userId, [
                  Permissions.consortiaSettingsConsortiumManagerEdit.gui,
                  Permissions.uiSettingsStatisticalCodeTypesCreateEditDelete.gui,
                ]);
                cy.setTenant(Affiliations.University);
                cy.assignPermissionsToExistingUser(testData.user.userId, [
                  Permissions.uiSettingsStatisticalCodeTypesCreateEditDelete.gui,
                ]);
              });
            })
            .then(() => {
              cy.resetTenant();
              cy.login(testData.user.username, testData.user.password);
              ConsortiumManager.checkCurrentTenantInTopMenu(tenantNames.college);
              ConsortiumManager.switchActiveAffiliation(tenantNames.college, tenantNames.central);
              // Without waiter, permissions aren't loading
              cy.wait(10000);
            });
        });

        after('Delete test data', () => {
          cy.resetTenant();
          cy.getAdminToken();
          StatisticalCodeTypesConsortiumManager.deleteViaApi(
            testData.centralSharedStatisticalCodeType,
          );
          StatisticalCodeTypes.deleteViaApi(testData.centralLocalStatisticalCodeType.id);
          cy.setTenant(Affiliations.College);
          StatisticalCodeTypes.deleteViaApi(testData.collegeLocalStatisticalCodeType.id);
          Users.deleteViaApi(testData.user.userId);
          cy.setTenant(Affiliations.University);
          StatisticalCodeTypes.deleteViaApi(testData.universityLocalStatisticalCodeType.id);
        });

        it(
          'C411336 User with "Consortium manager: Can create, edit and remove settings" permission is able to view the list of statistical code types of affiliated tenants in "Consortium manager" app (consortia) (thunderjet)',
          { tags: ['extendedPathECS', 'thunderjet', 'C411336'] },
          () => {
            // Step 1: Navigate to Consortium manager and select all members
            TopMenuNavigation.navigateToApp(APPLICATION_NAMES.CONSORTIUM_MANAGER);
            ConsortiumManagerApp.verifyStatusOfConsortiumManager();
            SelectMembers.selectAllMembers();
            ConsortiumManagerApp.verifyStatusOfConsortiumManager(3);

            // Step 2: Open Select members modal to verify modal elements
            ConsortiumManagerApp.clickSelectMembers();
            SelectMembers.verifyStatusOfSelectMembersModal(3, 3, true);

            // Step 3: Uncheck University (member-2) tenant
            SelectMembers.checkMember(tenantNames.university, false);
            SelectMembers.verifyStatusOfSelectMembersModal(3, 2, false);

            // Step 4: Save and close modal
            SelectMembers.saveAndClose();
            ConsortiumManagerApp.verifyStatusOfConsortiumManager(2);

            // Step 5: Navigate to Statistical code types settings
            ConsortiumManagerApp.chooseSettingsItem(settingsItems.inventory);
            StatisticalCodeTypesConsortiumManager.choose();
            ConsortiaControlledVocabularyPaneset.verifyNewButtonShown(true);

            // Step 6: Verify shared statistical code type is displayed (no Actions)
            ConsortiaControlledVocabularyPaneset.verifyRecordIsInTheList(
              testData.centralSharedStatisticalCodeType.payload.name,
              constants.source.consortium,
              [
                testData.centralSharedStatisticalCodeType.payload.name,
                constants.source.consortium,
                `${moment().format('l')} by`,
                constants.memberLibraries.all,
              ],
            );

            // Step 7: Verify central local statistical code type is displayed with Actions
            ConsortiaControlledVocabularyPaneset.verifyRecordIsInTheList(
              testData.centralLocalStatisticalCodeType.name,
              tenantNames.central,
              [
                testData.centralLocalStatisticalCodeType.name,
                constants.source.local,
                `${moment().format('l')} by`,
                tenantNames.central,
              ],
            );

            // Step 8: Verify college local statistical code type is displayed with Actions
            ConsortiaControlledVocabularyPaneset.verifyRecordIsInTheList(
              testData.collegeLocalStatisticalCodeType.name,
              tenantNames.college,
              [
                testData.collegeLocalStatisticalCodeType.name,
                constants.source.local,
                `${moment().format('l')} by`,
                tenantNames.college,
              ],
            );

            // Step 9: Verify university local statistical code type is NOT displayed
            ConsortiaControlledVocabularyPaneset.verifyRecordNotInTheList(
              testData.universityLocalStatisticalCodeType.name,
            );

            // Step 10: Open Select members modal again
            ConsortiumManagerApp.clickSelectMembers();
            SelectMembers.verifyStatusOfSelectMembersModal(3, 2, false);

            // Step 11: Uncheck College (member-1) tenant, leaving only Central
            SelectMembers.checkMember(tenantNames.college, false);
            SelectMembers.verifyStatusOfSelectMembersModal(3, 1, false);

            // Step 12: Save and close modal
            SelectMembers.saveAndClose();
            ConsortiumManagerApp.verifyStatusOfConsortiumManager(1);

            // Step 13: Verify shared statistical code type is still displayed
            ConsortiaControlledVocabularyPaneset.verifyRecordIsInTheList(
              testData.centralSharedStatisticalCodeType.payload.name,
              constants.source.consortium,
              [
                testData.centralSharedStatisticalCodeType.payload.name,
                constants.source.consortium,
                `${moment().format('l')} by`,
                constants.memberLibraries.all,
              ],
            );

            // Step 14: Verify central local statistical code type is still displayed with Actions
            ConsortiaControlledVocabularyPaneset.verifyRecordIsInTheList(
              testData.centralLocalStatisticalCodeType.name,
              tenantNames.central,
              [
                testData.centralLocalStatisticalCodeType.name,
                constants.source.local,
                `${moment().format('l')} by`,
                tenantNames.central,
              ],
            );

            // Step 15: Verify college local statistical code type is NOT displayed
            ConsortiaControlledVocabularyPaneset.verifyRecordNotInTheList(
              testData.collegeLocalStatisticalCodeType.name,
            );

            // Step 16: Verify university local statistical code type is NOT displayed
            ConsortiaControlledVocabularyPaneset.verifyRecordNotInTheList(
              testData.universityLocalStatisticalCodeType.name,
            );
          },
        );
      });
    });
  });
});
