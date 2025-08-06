import moment from 'moment';
import { APPLICATION_NAMES } from '../../../../../support/constants';
import Affiliations, { tenantNames } from '../../../../../support/dictionary/affiliations';
import Permissions from '../../../../../support/dictionary/permissions';
import ConsortiaControlledVocabularyPaneset from '../../../../../support/fragments/consortium-manager/consortiaControlledVocabularyPaneset';
import ConsortiumManagerApp, {
  settingsItems,
} from '../../../../../support/fragments/consortium-manager/consortiumManagerApp';
import HoldingsTypesConsortiumManager from '../../../../../support/fragments/consortium-manager/inventory/holdings/holdingsTypesConsortiumManager';
import SelectMembers from '../../../../../support/fragments/consortium-manager/modal/select-members';
import HoldingsTypes from '../../../../../support/fragments/settings/inventory/holdings/holdingsTypes';
import TopMenuNavigation from '../../../../../support/fragments/topMenuNavigation';
import Users from '../../../../../support/fragments/users/users';
import { getTestEntityValue } from '../../../../../support/utils/stringTools';
import ConsortiumManager from '../../../../../support/fragments/settings/consortium-manager/consortium-manager';

describe('Consortia', () => {
  describe('Consortium manager', () => {
    describe('View settings', () => {
      describe('View Holdings types', () => {
        const testData = {
          centralSharedHoldingsType: {
            payload: {
              name: getTestEntityValue('C411479_centralSharedHoldingsType'),
            },
          },
          centralLocalHoldingsType: {
            name: getTestEntityValue('C411479_centralLocalHoldingsType'),
            source: 'local',
          },
          collegeLocalHoldingsType: {
            name: getTestEntityValue('C411479_collegeLocalHoldingsType'),
            source: 'local',
          },
          universityLocalHoldingsType: {
            name: getTestEntityValue('C411479_universityLocalHoldingsType'),
            source: 'local',
          },
        };

        const constants = {
          source: {
            consortium: 'consortium',
          },
          memberLibraries: {
            all: 'All',
          },
        };

        before('Create test data', () => {
          cy.getAdminToken()
            .then(() => {
              HoldingsTypesConsortiumManager.createViaApi(testData.centralSharedHoldingsType).then(
                (newHoldingsType) => {
                  testData.centralSharedHoldingsType = newHoldingsType;
                },
              );
            })
            .then(() => {
              cy.resetTenant();
              HoldingsTypes.createViaApi(testData.centralLocalHoldingsType).then((response) => {
                testData.centralLocalHoldingsType.id = response.body.id;
              });
            })
            .then(() => {
              cy.setTenant(Affiliations.College);
              HoldingsTypes.createViaApi(testData.collegeLocalHoldingsType).then((response) => {
                testData.collegeLocalHoldingsType.id = response.body.id;
              });
            })
            .then(() => {
              cy.setTenant(Affiliations.University);
              HoldingsTypes.createViaApi(testData.universityLocalHoldingsType).then((response) => {
                testData.universityLocalHoldingsType.id = response.body.id;
              });
            })
            .then(() => {
              cy.resetTenant();
              cy.createTempUser([
                Permissions.consortiaSettingsConsortiumManagerView.gui,
                Permissions.inventoryCRUDHoldingsTypes.gui,
              ]).then((userProperties) => {
                testData.user = userProperties;

                cy.assignAffiliationToUser(Affiliations.College, testData.user.userId);
                cy.assignAffiliationToUser(Affiliations.University, testData.user.userId);
                cy.setTenant(Affiliations.College);
                cy.assignPermissionsToExistingUser(testData.user.userId, [
                  Permissions.inventoryCRUDHoldingsTypes.gui,
                ]);
                cy.setTenant(Affiliations.University);
                cy.assignPermissionsToExistingUser(testData.user.userId, [
                  Permissions.inventoryCRUDHoldingsTypes.gui,
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
          HoldingsTypesConsortiumManager.deleteViaApi(testData.centralSharedHoldingsType);
          HoldingsTypes.deleteViaApi(testData.centralLocalHoldingsType.id);
          Users.deleteViaApi(testData.user.userId);
          cy.setTenant(Affiliations.College);
          HoldingsTypes.deleteViaApi(testData.collegeLocalHoldingsType.id);
          cy.setTenant(Affiliations.University);
          HoldingsTypes.deleteViaApi(testData.universityLocalHoldingsType.id);
        });

        it(
          'C411479 User with "Consortium manager: Can view existing settings" permission is able to view the list of holdings types of affiliated tenants in "Consortium manager" app (consortia) (thunderjet)',
          { tags: ['extendedPathECS', 'thunderjet', 'C411479'] },
          () => {
            // User opens "Consortium manager" app
            TopMenuNavigation.navigateToApp(APPLICATION_NAMES.CONSORTIUM_MANAGER);
            ConsortiumManagerApp.verifyStatusOfConsortiumManager();
            // User expands "Members selection" accordion
            SelectMembers.selectAllMembers();
            ConsortiumManagerApp.verifyStatusOfConsortiumManager(3);
            // User clicks on "Inventory" settings
            ConsortiumManagerApp.chooseSettingsItem(settingsItems.inventory);
            // User clicks on "Holdings" > "Holdings types"
            HoldingsTypesConsortiumManager.choose();
            ConsortiaControlledVocabularyPaneset.verifyNewButtonShown(false);

            // User sees central tenant shared holdings type
            ConsortiaControlledVocabularyPaneset.verifyRecordIsInTheList(
              testData.centralSharedHoldingsType.payload.name,
              constants.source.consortium,
              [
                testData.centralSharedHoldingsType.payload.name,
                constants.source.consortium,
                `${moment().format('l')} by`,
                constants.memberLibraries.all,
              ],
            );
            // User sees central tenant local holdings type
            ConsortiaControlledVocabularyPaneset.verifyRecordIsInTheList(
              testData.centralLocalHoldingsType.name,
              tenantNames.central,
              [
                testData.centralLocalHoldingsType.name,
                '',
                `${moment().format('l')} by`,
                tenantNames.central,
              ],
            );
            // Verify College local holdings type appears
            ConsortiaControlledVocabularyPaneset.verifyRecordIsInTheList(
              testData.collegeLocalHoldingsType.name,
              tenantNames.college,
              [
                testData.collegeLocalHoldingsType.name,
                '',
                `${moment().format('l')} by`,
                tenantNames.college,
              ],
            );
            // Verify University local holdings type appears
            ConsortiaControlledVocabularyPaneset.verifyRecordIsInTheList(
              testData.universityLocalHoldingsType.name,
              tenantNames.university,
              [
                testData.universityLocalHoldingsType.name,
                '',
                `${moment().format('l')} by`,
                tenantNames.university,
              ],
            );

            // Uncheck central tenant
            ConsortiumManagerApp.clickSelectMembers();
            SelectMembers.verifyStatusOfSelectMembersModal(3, 3, true);
            SelectMembers.checkMember(tenantNames.central, false);
            SelectMembers.verifyStatusOfSelectMembersModal(3, 2, false);
            SelectMembers.saveAndClose();
            ConsortiumManagerApp.verifyStatusOfConsortiumManager(2);

            // User sees central tenant shared holdings type
            ConsortiaControlledVocabularyPaneset.verifyRecordIsInTheList(
              testData.centralSharedHoldingsType.payload.name,
              constants.source.consortium,
              [
                testData.centralSharedHoldingsType.payload.name,
                constants.source.consortium,
                `${moment().format('l')} by`,
                constants.memberLibraries.all,
              ],
            );
            // Verify central tenant local holdings type does not appear
            ConsortiaControlledVocabularyPaneset.verifyRecordNotInTheList(
              testData.centralLocalHoldingsType.name,
            );
            // Verify College local holdings type appears
            ConsortiaControlledVocabularyPaneset.verifyRecordIsInTheList(
              testData.collegeLocalHoldingsType.name,
              tenantNames.college,
              [
                testData.collegeLocalHoldingsType.name,
                '',
                `${moment().format('l')} by`,
                tenantNames.college,
              ],
            );
            // Verify University local holdings type appears
            ConsortiaControlledVocabularyPaneset.verifyRecordIsInTheList(
              testData.universityLocalHoldingsType.name,
              tenantNames.university,
              [
                testData.universityLocalHoldingsType.name,
                '',
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
