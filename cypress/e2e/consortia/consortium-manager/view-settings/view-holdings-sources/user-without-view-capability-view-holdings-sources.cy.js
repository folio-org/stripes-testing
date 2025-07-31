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
  // messages,
} from '../../../../../support/fragments/consortium-manager/consortiumManagerApp';
import HoldingsSourcesConsortiumManager from '../../../../../support/fragments/consortium-manager/inventory/holdings/holdingsSourcesConsortiumManager';
import SelectMembers from '../../../../../support/fragments/consortium-manager/modal/select-members';
import HoldingsSources from '../../../../../support/fragments/settings/inventory/holdings/holdingsSources';
import TopMenuNavigation from '../../../../../support/fragments/topMenuNavigation';
import Users from '../../../../../support/fragments/users/users';
import { getTestEntityValue } from '../../../../../support/utils/stringTools';
import ConsortiumManager from '../../../../../support/fragments/settings/consortium-manager/consortium-manager';
// import interactorsTools from '../../../../../support/utils/interactorsTools';

describe('Consortia', () => {
  describe('Consortium manager', () => {
    describe('View settings', () => {
      describe('View Holdings sources', () => {
        const testData = {
          centralSharedSource: {
            payload: {
              name: getTestEntityValue('C648471_centralSharedSource'),
            },
          },
          centralLocalSource: {
            name: getTestEntityValue('C648471_centralLocalSource'),
          },
          collegeLocalSource: {
            name: getTestEntityValue('C648471_collegeLocalSource'),
          },
          universityLocalSource: {
            name: getTestEntityValue('C648471_universityLocalSource'),
          },
        };

        const capabSetsToAssignCentral = [
          {
            type: CAPABILITY_TYPES.DATA,
            resource: 'UI-Consortia-Settings Consortium-Manager',
            action: CAPABILITY_ACTIONS.VIEW,
          },
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
        const capabSetsToAssignMember = [
          {
            type: CAPABILITY_TYPES.DATA,
            resource: 'UI-Finance Fiscal-Year',
            action: CAPABILITY_ACTIONS.VIEW,
          },
        ];
        let tempUserC648471;

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

          cy.createTempUser([]).then((userProperties) => {
            tempUserC648471 = userProperties;
            cy.assignCapabilitiesToExistingUser(
              tempUserC648471.userId,
              [],
              capabSetsToAssignCentral,
            );

            // Assign affiliation to College (member-1) but NOT University (member-2)
            cy.assignAffiliationToUser(Affiliations.College, tempUserC648471.userId);

            // Set up College (member-1) tenant with different capabilities (no holdings source view)
            cy.setTenant(Affiliations.College);
            cy.assignCapabilitiesToExistingUser(
              tempUserC648471.userId,
              [],
              capabSetsToAssignMember,
            );
            HoldingsSources.createViaApi(testData.collegeLocalSource).then((sourceId) => {
              testData.collegeLocalSource.id = sourceId.body.id;
            });

            // Set up University (member-2) tenant - user has no affiliation here
            cy.setTenant(Affiliations.University);
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
          Users.deleteViaApi(tempUserC648471.userId);
        });

        it(
          'C648471 User without View holding source capability is NOT able to view the list of holdings sources of affiliated tenants in "Consortium manager" app (consortia) (thunderjet)',
          { tags: ['criticalPathECS', 'thunderjet', 'C648471'] },
          () => {
            cy.resetTenant();
            cy.login(tempUserC648471.username, tempUserC648471.password);
            ConsortiumManager.checkCurrentTenantInTopMenu(tenantNames.central);
            // Without waiter, permissions aren't loading
            cy.wait(10000);

            // Step 1: Navigate to Consortium Manager and select all members
            TopMenuNavigation.navigateToApp(APPLICATION_NAMES.CONSORTIUM_MANAGER);
            SelectMembers.selectAllMembers();
            // Only 2 members should be available (Central and College) since user has no affiliation to University
            ConsortiumManagerApp.verifyStatusOfConsortiumManager(2);

            // Step 2: Navigate to Holdings sources and expect permission error
            ConsortiumManagerApp.chooseSettingsItem(settingsItems.inventory);
            HoldingsSourcesConsortiumManager.choose();

            // Verify permission error toast message appears
            // TO DO: uncomment after EUREKA-536 is done
            // interactorsTools.checkCalloutExists(messages.noPermission(tenantNames.college));

            // Step 3: Verify shared holdings source is visible
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

            // Step 4: Verify central local holdings source is visible
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

            // Step 5: Verify college (member-1) local holdings source is NOT visible
            // TO DO: uncomment after EUREKA-536 is done
            // ConsortiaControlledVocabularyPaneset.verifyRecordNotInTheList(
            //   testData.collegeLocalSource.name,
            // );

            // Step 6: Verify university (member-2) local holdings source is NOT visible
            ConsortiaControlledVocabularyPaneset.verifyRecordNotInTheList(
              testData.universityLocalSource.name,
            );

            // Step 7: Click Select members to verify modal state
            ConsortiumManagerApp.clickSelectMembers();
            SelectMembers.verifyStatusOfSelectMembersModal(2, 2, true);

            // Step 8: Uncheck all members
            SelectMembers.selectMembers(tenantNames.central);
            SelectMembers.selectMembers(tenantNames.college);
            SelectMembers.verifyStatusOfSelectMembersModal(2, 0, false);

            // Step 9: Save with 0 members selected
            SelectMembers.saveAndClose();
            ConsortiumManagerApp.verifyStatusOfConsortiumManager(0);

            // Verify "The list contains no items" message and disabled New button
            ConsortiumManagerApp.verifyListIsEmpty();
            ConsortiaControlledVocabularyPaneset.verifyNewButtonShown(false);
          },
        );
      });
    });
  });
});
