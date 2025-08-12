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
              name: getTestEntityValue('C411335_centralSharedStatisticalCodeType'),
            },
          },
          centralLocalStatisticalCodeType: {
            name: getTestEntityValue('C411335_centralLocalStatisticalCodeType'),
            source: 'local',
          },
          collegeLocalStatisticalCodeType: {
            name: getTestEntityValue('C411335_collegeLocalStatisticalCodeType'),
            source: 'local',
          },
          universityLocalStatisticalCodeType: {
            name: getTestEntityValue('C411335_universityLocalStatisticalCodeType'),
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
              cy.resetTenant();
              cy.createTempUser([
                Permissions.consortiaSettingsConsortiumManagerView.gui,
                Permissions.uiSettingsStatisticalCodeTypesCreateEditDelete.gui,
              ]).then((userProperties) => {
                testData.user = userProperties;

                cy.assignAffiliationToUser(Affiliations.College, testData.user.userId);
                cy.assignAffiliationToUser(Affiliations.University, testData.user.userId);
                cy.setTenant(Affiliations.College);
                cy.assignPermissionsToExistingUser(testData.user.userId, [
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
              ConsortiumManager.checkCurrentTenantInTopMenu(tenantNames.central);
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
          Users.deleteViaApi(testData.user.userId);
          cy.setTenant(Affiliations.College);
          StatisticalCodeTypes.deleteViaApi(testData.collegeLocalStatisticalCodeType.id);
          cy.setTenant(Affiliations.University);
          StatisticalCodeTypes.deleteViaApi(testData.universityLocalStatisticalCodeType.id);
        });

        it(
          'C411335 User with "Consortium manager: Can view existing settings" permission is able to view the list of statistical code types of affiliated tenants in "Consortium manager" app (consortia) (thunderjet)',
          { tags: ['extendedPathECS', 'thunderjet', 'C411335'] },
          () => {
            // Step 1: Navigate to Consortium manager and select all members
            TopMenuNavigation.navigateToApp(APPLICATION_NAMES.CONSORTIUM_MANAGER);
            ConsortiumManagerApp.verifyStatusOfConsortiumManager();
            SelectMembers.selectAllMembers();
            ConsortiumManagerApp.verifyStatusOfConsortiumManager(3);

            // Step 2: Navigate to Statistical code types settings
            ConsortiumManagerApp.chooseSettingsItem(settingsItems.inventory);
            StatisticalCodeTypesConsortiumManager.choose();
            ConsortiaControlledVocabularyPaneset.verifyNewButtonShown(false);

            // Step 3: Verify shared statistical code type is displayed
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

            // Step 4: Verify central local statistical code type is displayed
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

            // Step 5: Verify college local statistical code type is displayed
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

            // Step 6: Verify university local statistical code type is displayed
            ConsortiaControlledVocabularyPaneset.verifyRecordIsInTheList(
              testData.universityLocalStatisticalCodeType.name,
              tenantNames.university,
              [
                testData.universityLocalStatisticalCodeType.name,
                constants.source.local,
                `${moment().format('l')} by`,
                tenantNames.university,
              ],
            );

            // Step 7-9: Open Select members modal, uncheck Central tenant, and save
            ConsortiumManagerApp.clickSelectMembers();
            SelectMembers.verifyStatusOfSelectMembersModal(3, 3, true);
            SelectMembers.checkMember(tenantNames.central, false);
            SelectMembers.verifyStatusOfSelectMembersModal(3, 2, false);
            SelectMembers.saveAndClose();
            ConsortiumManagerApp.verifyStatusOfConsortiumManager(2);

            // Step 10: Verify shared statistical code type is still displayed
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

            // Step 11: Verify central local statistical code type is NOT displayed
            ConsortiaControlledVocabularyPaneset.verifyRecordNotInTheList(
              testData.centralLocalStatisticalCodeType.name,
            );

            // Step 12: Verify college local statistical code type is still displayed
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

            // Step 13: Verify university local statistical code type is still displayed
            ConsortiaControlledVocabularyPaneset.verifyRecordIsInTheList(
              testData.universityLocalStatisticalCodeType.name,
              tenantNames.university,
              [
                testData.universityLocalStatisticalCodeType.name,
                constants.source.local,
                `${moment().format('l')} by`,
                tenantNames.university,
              ],
            );
          },
        );
      });
    });
  });
});
