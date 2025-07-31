import moment from 'moment';
import {
  APPLICATION_NAMES,
  CAPABILITY_ACTIONS,
  CAPABILITY_TYPES,
} from '../../../../../support/constants';
import Affiliations, { tenantNames } from '../../../../../support/dictionary/affiliations';
import ConsortiaControlledVocabularyPaneset, {
  actionIcons,
} from '../../../../../support/fragments/consortium-manager/consortiaControlledVocabularyPaneset';
import ConsortiumManagerApp, {
  settingsItems,
} from '../../../../../support/fragments/consortium-manager/consortiumManagerApp';
import HoldingsSourcesConsortiumManager from '../../../../../support/fragments/consortium-manager/inventory/holdings/holdingsSourcesConsortiumManager';
import SelectMembers from '../../../../../support/fragments/consortium-manager/modal/select-members';
import HoldingsSources from '../../../../../support/fragments/settings/inventory/holdings/holdingsSources';
import TopMenuNavigation from '../../../../../support/fragments/topMenuNavigation';
import Users from '../../../../../support/fragments/users/users';
import { getTestEntityValue } from '../../../../../support/utils/stringTools';
import ConsortiumManager from '../../../../../support/fragments/settings/consortium-manager/consortium-manager';

describe('Consortia', () => {
  describe('Consortium manager', () => {
    describe('View settings', () => {
      describe('View Holdings sources', () => {
        const testData = {
          centralSharedSource: {
            payload: {
              name: getTestEntityValue('C648470_centralSharedSource'),
            },
          },
          centralLocalSource: {
            name: getTestEntityValue('C648470_centralLocalSource'),
          },
          collegeLocalSource: {
            name: getTestEntityValue('C648470_collegeLocalSource'),
          },
          universityLocalSource: {
            name: getTestEntityValue('C648470_universityLocalSource'),
          },
        };

        const capabSetsToAssignCentral = [
          {
            type: CAPABILITY_TYPES.DATA,
            resource: 'UI-Consortia-Settings Consortium-Manager',
            action: CAPABILITY_ACTIONS.EDIT,
          },
          {
            type: CAPABILITY_TYPES.SETTINGS,
            resource: 'UI-Inventory Settings Holdings-Sources',
            action: CAPABILITY_ACTIONS.VIEW,
          },
        ];
        const capabSetsToAssignMembers = [
          {
            type: CAPABILITY_TYPES.SETTINGS,
            resource: 'UI-Inventory Settings Holdings-Sources',
            action: CAPABILITY_ACTIONS.VIEW,
          },
        ];
        let tempUserC648470;

        before('Create test data', () => {
          cy.clearCookies({ domain: null });
          cy.resetTenant();
          cy.getAdminToken();
          HoldingsSourcesConsortiumManager.createViaApi(testData.centralSharedSource).then(
            (newSource) => {
              testData.centralSharedType = newSource.id;
            },
          );
          HoldingsSources.createViaApi(testData.centralLocalSource).then((sourceId) => {
            testData.centralLocalSource.id = sourceId.body.id;
          });
          cy.setTenant(Affiliations.College);
          cy.createTempUser([]).then((userProperties) => {
            tempUserC648470 = userProperties;
            // Set up capabilities in College (member-1) tenant - user's home tenant
            cy.assignCapabilitiesToExistingUser(
              tempUserC648470.userId,
              [],
              capabSetsToAssignMembers,
            );
            HoldingsSources.createViaApi(testData.collegeLocalSource).then((sourceId) => {
              testData.collegeLocalSource.id = sourceId.body.id;
            });

            cy.resetTenant();
            // Assign affiliations: user created in College (member-1), affiliated with Central and University (member-2)
            cy.assignAffiliationToUser(Affiliations.University, tempUserC648470.userId);
            cy.assignCapabilitiesToExistingUser(
              tempUserC648470.userId,
              [],
              capabSetsToAssignCentral,
            );

            // Set up capabilities in University (member-2) tenant
            cy.setTenant(Affiliations.University);
            cy.assignCapabilitiesToExistingUser(
              tempUserC648470.userId,
              [],
              capabSetsToAssignMembers,
            );
            HoldingsSources.createViaApi(testData.universityLocalSource).then((sourceId) => {
              testData.universityLocalSource.id = sourceId.body.id;
            });
          });
        });

        after('delete test data', () => {
          cy.resetTenant();
          cy.getAdminToken();
          cy.withinTenant(Affiliations.University, () => {
            HoldingsSources.deleteViaApi(testData.universityLocalSource.id);
          });
          cy.withinTenant(Affiliations.College, () => {
            HoldingsSources.deleteViaApi(testData.collegeLocalSource.id);
          });
          cy.setTenant(Affiliations.Consortia);
          HoldingsSources.deleteViaApi(testData.centralLocalSource.id);
          HoldingsSourcesConsortiumManager.deleteViaApi(testData.centralSharedSource);
          Users.deleteViaApi(tempUserC648470.userId);
        });

        it(
          'C648470 User with "Consortium manager: Can create, edit and remove settings" permission is able to view the list of holdings sources of affiliated tenants in "Consortium manager" app (consortia) (thunderjet)',
          { tags: ['extendedPathECS', 'thunderjet', 'C648470'] },
          () => {
            cy.resetTenant();
            cy.waitForAuthRefresh(() => {
              cy.login(tempUserC648470.username, tempUserC648470.password);
              cy.reload();
              ConsortiumManager.checkCurrentTenantInTopMenu(tenantNames.college);
            }, 20_000);
            ConsortiumManager.switchActiveAffiliation(tenantNames.college, tenantNames.central);
            // Without waiter, permissions aren't loading
            cy.wait(10000);

            // Step 1: Navigate to Consortium Manager and select all members
            TopMenuNavigation.navigateToApp(APPLICATION_NAMES.CONSORTIUM_MANAGER);
            SelectMembers.selectAllMembers();
            ConsortiumManagerApp.verifyStatusOfConsortiumManager(3);

            // Step 2: Click Select members button to verify modal
            ConsortiumManagerApp.clickSelectMembers();
            SelectMembers.verifyStatusOfSelectMembersModal(3, 3, true);

            // Step 3: Uncheck member-2 (University) tenant
            SelectMembers.selectMembers(tenantNames.university);
            SelectMembers.verifyStatusOfSelectMembersModal(3, 2, false);

            // Step 4: Save selection with 2 members
            SelectMembers.saveAndClose();
            ConsortiumManagerApp.verifyStatusOfConsortiumManager(2);

            // Step 5: Navigate to Holdings sources
            ConsortiumManagerApp.chooseSettingsItem(settingsItems.inventory);
            HoldingsSourcesConsortiumManager.choose();

            // Step 6: Verify shared holdings source
            ConsortiaControlledVocabularyPaneset.verifyRecordIsInTheList(
              testData.centralSharedSource.payload.name,
              'consortium',
              [
                testData.centralSharedSource.payload.name,
                'consortium',
                `${moment().format('l')} by`,
                'All',
              ],
            );

            // Step 7: Verify central local holdings source
            ConsortiaControlledVocabularyPaneset.verifyRecordIsInTheList(
              testData.centralLocalSource.name,
              tenantNames.central,
              [
                testData.centralLocalSource.name,
                '',
                `${moment().format('l')} by`,
                tenantNames.central,
              ],
              [actionIcons.edit, actionIcons.trash],
            );

            // Step 8: Verify college (member-1) local holdings source
            ConsortiaControlledVocabularyPaneset.verifyRecordIsInTheList(
              testData.collegeLocalSource.name,
              tenantNames.college,
              [
                testData.collegeLocalSource.name,
                '',
                `${moment().format('l')} by`,
                tenantNames.college,
              ],
              [actionIcons.edit, actionIcons.trash],
            );

            // Step 9: Verify university (member-2) source is NOT shown
            ConsortiaControlledVocabularyPaneset.verifyRecordNotInTheList(
              testData.universityLocalSource.name,
            );

            // Step 10: Click Select members again
            ConsortiumManagerApp.clickSelectMembers();
            SelectMembers.verifyStatusOfSelectMembersModal(3, 2, false);

            // Step 11: Uncheck member-1 (College) tenant, leaving only Central
            SelectMembers.selectMembers(tenantNames.college);
            SelectMembers.verifyStatusOfSelectMembersModal(3, 1, false);

            // Step 12: Save selection with 1 member
            SelectMembers.saveAndClose();
            ConsortiumManagerApp.verifyStatusOfConsortiumManager(1);

            // Step 13: Verify shared holdings source still shown
            ConsortiaControlledVocabularyPaneset.verifyRecordIsInTheList(
              testData.centralSharedSource.payload.name,
              'consortium',
              [
                testData.centralSharedSource.payload.name,
                'consortium',
                `${moment().format('l')} by`,
                'All',
              ],
            );

            // Step 14: Verify central local holdings source still shown
            ConsortiaControlledVocabularyPaneset.verifyRecordIsInTheList(
              testData.centralLocalSource.name,
              tenantNames.central,
              [
                testData.centralLocalSource.name,
                '',
                `${moment().format('l')} by`,
                tenantNames.central,
              ],
              [actionIcons.edit, actionIcons.trash],
            );

            // Step 15: Verify college (member-1) source is NOT shown
            ConsortiaControlledVocabularyPaneset.verifyRecordNotInTheList(
              testData.collegeLocalSource.name,
            );

            // Step 16: Verify university (member-2) source is NOT shown
            ConsortiaControlledVocabularyPaneset.verifyRecordNotInTheList(
              testData.universityLocalSource.name,
            );
          },
        );
      });
    });
  });
});
