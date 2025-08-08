import moment from 'moment';
import { APPLICATION_NAMES } from '../../../../../support/constants';
import Affiliations, { tenantNames } from '../../../../../support/dictionary/affiliations';
import Permissions from '../../../../../support/dictionary/permissions';
import ConsortiaControlledVocabularyPaneset from '../../../../../support/fragments/consortium-manager/consortiaControlledVocabularyPaneset';
import ConsortiumManagerApp, {
  settingsItems,
} from '../../../../../support/fragments/consortium-manager/consortiumManagerApp';
import StatisticalCodesConsortiumManager from '../../../../../support/fragments/consortium-manager/inventory/instances-holdings-items/statisticalCodesConsortiumManager';
import SelectMembers from '../../../../../support/fragments/consortium-manager/modal/select-members';
import StatisticalCodes from '../../../../../support/fragments/settings/inventory/instance-holdings-item/statisticalCodes';
import TopMenuNavigation from '../../../../../support/fragments/topMenuNavigation';
import Users from '../../../../../support/fragments/users/users';
import { getTestEntityValue } from '../../../../../support/utils/stringTools';

describe('Consortia', () => {
  describe('Consortium manager', () => {
    describe('View settings', () => {
      describe('View Statistical codes', () => {
        const testData = {
          centralSharedStatisticalCode: {
            payload: {
              name: getTestEntityValue('C411580_centralSharedStatisticalCode'),
              code: getTestEntityValue('C411580_centralSharedCode'),
            },
          },
          centralLocalStatisticalCode: {
            name: getTestEntityValue('C411580_centralLocalStatisticalCode'),
            code: getTestEntityValue('C411580_centralLocalCode'),
            source: 'local',
          },
          collegeLocalStatisticalCode: {
            name: getTestEntityValue('C411580_collegeLocalStatisticalCode'),
            code: getTestEntityValue('C411580_collegeLocalCode'),
            source: 'local',
          },
          universityLocalStatisticalCode: {
            name: getTestEntityValue('C411580_universityLocalStatisticalCode'),
            code: getTestEntityValue('C411580_universityLocalCode'),
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
            university: tenantNames.university,
            college: tenantNames.college,
            central: tenantNames.central,
          },
        };

        let statisticalCodeType;

        before('Create test data', () => {
          cy.getAdminToken()
            .then(() => {
              cy.createTempUser([
                Permissions.consortiaSettingsConsortiumManagerView.gui,
                Permissions.uiSettingsStatisticalCodesCreateEditDelete.gui,
              ]).then((userProperties) => {
                testData.user = userProperties;

                cy.assignAffiliationToUser(Affiliations.College, testData.user.userId);
                cy.assignAffiliationToUser(Affiliations.University, testData.user.userId);

                cy.setTenant(Affiliations.College);
                cy.assignPermissionsToExistingUser(testData.user.userId, [
                  Permissions.uiSettingsStatisticalCodesCreateEditDelete.gui,
                ]);
                cy.setTenant(Affiliations.University);
                cy.assignPermissionsToExistingUser(testData.user.userId, [
                  Permissions.uiSettingsStatisticalCodesCreateEditDelete.gui,
                ]);
              });
            })
            .then(() => {
              cy.resetTenant();
              cy.getAdminToken();
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
                // Create central local statistical code
                testData.centralLocalStatisticalCode.statisticalCodeTypeId = statisticalCodeType.id;
                StatisticalCodes.createViaApi(testData.centralLocalStatisticalCode).then(
                  (response) => {
                    testData.centralLocalStatisticalCode.id = response.id;
                  },
                );
              });
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
              cy.resetTenant();
              cy.login(testData.user.username, testData.user.password);
              // Without waiter, permissions aren't loading
              cy.wait(10000);
            });
        });

        after('Delete test data', () => {
          cy.resetTenant();
          cy.getAdminToken();
          StatisticalCodesConsortiumManager.deleteViaApi(testData.centralSharedStatisticalCode);
          StatisticalCodes.deleteViaApi(testData.centralLocalStatisticalCode.id);
          Users.deleteViaApi(testData.user.userId);
          cy.setTenant(Affiliations.College);
          StatisticalCodes.deleteViaApi(testData.collegeLocalStatisticalCode.id);
          cy.setTenant(Affiliations.University);
          StatisticalCodes.deleteViaApi(testData.universityLocalStatisticalCode.id);
        });

        it(
          'C411580 User with "Consortium manager: Can view existing settings" permission is able to view the list of statistical codes of affiliated tenants in "Consortium manager" app (consortia) (thunderjet)',
          { tags: ['criticalPathECS', 'thunderjet', 'C411580'] },
          () => {
            // Step 1: User opens "Consortium manager" app
            TopMenuNavigation.navigateToApp(APPLICATION_NAMES.CONSORTIUM_MANAGER);
            ConsortiumManagerApp.verifyStatusOfConsortiumManager();

            // Step 2: User expands "Members selection" accordion
            SelectMembers.selectAllMembers();
            ConsortiumManagerApp.verifyStatusOfConsortiumManager(3);

            // Step 3: User clicks on "Inventory" settings
            ConsortiumManagerApp.chooseSettingsItem(settingsItems.inventory);

            // Step 4: User clicks on "Instances, Holdings & Items" > "Statistical codes"
            StatisticalCodesConsortiumManager.choose();
            // Note: New button is NOT displayed since Trillium
            ConsortiaControlledVocabularyPaneset.verifyNewButtonShown(false);

            // Step 3: Verify shared statistical code from Central tenant
            ConsortiaControlledVocabularyPaneset.verifyRecordIsInTheList(
              testData.centralSharedStatisticalCode.payload.code,
              constants.memberLibraries.all,
              [
                testData.centralSharedStatisticalCode.payload.code,
                testData.centralSharedStatisticalCode.payload.name,
                statisticalCodeType.name,
                constants.source.consortium,
                `${moment().format('l')} by`,
                constants.memberLibraries.all,
              ],
            );

            // Step 4: Verify central local statistical code (without Edit/Delete actions since Trillium)
            ConsortiaControlledVocabularyPaneset.verifyRecordIsInTheList(
              testData.centralLocalStatisticalCode.code,
              constants.memberLibraries.central,
              [
                testData.centralLocalStatisticalCode.code,
                testData.centralLocalStatisticalCode.name,
                statisticalCodeType.name,
                constants.source.local,
                `${moment().format('l')} by`,
                constants.memberLibraries.central,
              ],
            );

            // Step 5: Verify college local statistical code (without Edit/Delete actions since Trillium)
            ConsortiaControlledVocabularyPaneset.verifyRecordIsInTheList(
              testData.collegeLocalStatisticalCode.code,
              constants.memberLibraries.college,
              [
                testData.collegeLocalStatisticalCode.code,
                testData.collegeLocalStatisticalCode.name,
                statisticalCodeType.name,
                constants.source.local,
                `${moment().format('l')} by`,
                constants.memberLibraries.college,
              ],
            );

            // Step 6: Verify university local statistical code (without Edit/Delete actions since Trillium)
            ConsortiaControlledVocabularyPaneset.verifyRecordIsInTheList(
              testData.universityLocalStatisticalCode.code,
              constants.memberLibraries.university,
              [
                testData.universityLocalStatisticalCode.code,
                testData.universityLocalStatisticalCode.name,
                statisticalCodeType.name,
                constants.source.local,
                `${moment().format('l')} by`,
                constants.memberLibraries.university,
              ],
            );

            // Step 7: Click Select members button
            ConsortiumManagerApp.clickSelectMembers();
            SelectMembers.verifyStatusOfSelectMembersModal(3, 3, true);

            // Step 8: Uncheck central tenant
            SelectMembers.checkMember(tenantNames.central, false);
            SelectMembers.verifyStatusOfSelectMembersModal(3, 2, false);

            // Step 9: Save with only member tenants selected
            SelectMembers.saveAndClose();
            ConsortiumManagerApp.verifyStatusOfConsortiumManager(2);

            // Step 10: Verify shared statistical code still visible
            ConsortiaControlledVocabularyPaneset.verifyRecordIsInTheList(
              testData.centralSharedStatisticalCode.payload.code,
              constants.memberLibraries.all,
              [
                testData.centralSharedStatisticalCode.payload.code,
                testData.centralSharedStatisticalCode.payload.name,
                statisticalCodeType.name,
                constants.source.consortium,
                `${moment().format('l')} by`,
                constants.memberLibraries.all,
              ],
            );

            // Step 11: Verify central local statistical code is NOT visible
            ConsortiaControlledVocabularyPaneset.verifyRecordNotInTheList(
              testData.centralLocalStatisticalCode.code,
            );

            // Step 12: Verify college local statistical code still visible (without Edit/Delete actions since Trillium)
            ConsortiaControlledVocabularyPaneset.verifyRecordIsInTheList(
              testData.collegeLocalStatisticalCode.code,
              constants.memberLibraries.college,
              [
                testData.collegeLocalStatisticalCode.code,
                testData.collegeLocalStatisticalCode.name,
                statisticalCodeType.name,
                constants.source.local,
                `${moment().format('l')} by`,
                constants.memberLibraries.college,
              ],
            );

            // Step 13: Verify university local statistical code still visible (without Edit/Delete actions since Trillium)
            ConsortiaControlledVocabularyPaneset.verifyRecordIsInTheList(
              testData.universityLocalStatisticalCode.code,
              constants.memberLibraries.university,
              [
                testData.universityLocalStatisticalCode.code,
                testData.universityLocalStatisticalCode.name,
                statisticalCodeType.name,
                constants.source.local,
                `${moment().format('l')} by`,
                constants.memberLibraries.university,
              ],
            );
          },
        );
      });
    });
  });
});
