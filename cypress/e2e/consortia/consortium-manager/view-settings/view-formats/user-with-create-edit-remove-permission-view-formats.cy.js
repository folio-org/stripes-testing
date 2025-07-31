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
import FormatsConsortiumManager from '../../../../../support/fragments/consortium-manager/inventory/instances/formatsConsortiumManager';
import SelectMembers from '../../../../../support/fragments/consortium-manager/modal/select-members';
import Formats from '../../../../../support/fragments/settings/inventory/instances/formats';
import TopMenuNavigation from '../../../../../support/fragments/topMenuNavigation';
import Users from '../../../../../support/fragments/users/users';
import { getTestEntityValue } from '../../../../../support/utils/stringTools';
import ConsortiumManager from '../../../../../support/fragments/settings/consortium-manager/consortium-manager';

describe('Consortia', () => {
  describe('Consortium manager', () => {
    describe('View settings', () => {
      describe('View Formats', () => {
        const testData = {
          centralSharedFormat: {
            payload: {
              name: getTestEntityValue('C410719_centralSharedFormat'),
              code: getTestEntityValue('C410719_sharedCode'),
            },
          },
          centralLocalFormat: {
            name: getTestEntityValue('C410719_centralLocalFormat'),
            code: getTestEntityValue('C410719_centralCode'),
            source: 'local',
          },
          collegeLocalFormat: {
            name: getTestEntityValue('C410719_collegeLocalFormat'),
            code: getTestEntityValue('C410719_collegeCode'),
            source: 'local',
          },
          universityLocalFormat: {
            name: getTestEntityValue('C410719_universityLocalFormat'),
            code: getTestEntityValue('C410719_universityCode'),
            source: 'local',
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
            resource: 'UI-Inventory Settings Instance-Formats',
            action: CAPABILITY_ACTIONS.VIEW,
          },
        ];
        const capabSetsToAssignMembers = [
          {
            type: CAPABILITY_TYPES.SETTINGS,
            resource: 'UI-Inventory Settings Instance-Formats',
            action: CAPABILITY_ACTIONS.VIEW,
          },
        ];
        let tempUserC410719;

        before('Create test data', () => {
          cy.clearCookies({ domain: null });
          cy.resetTenant();
          cy.getAdminToken();
          FormatsConsortiumManager.createViaApi(testData.centralSharedFormat).then((newFormat) => {
            testData.centralSharedFormat.id = newFormat.id;
          });
          Formats.createViaApi(testData.centralLocalFormat).then((formatId) => {
            testData.centralLocalFormat.id = formatId.body.id;
          });

          cy.setTenant(Affiliations.College);
          cy.createTempUser([]).then((userProperties) => {
            tempUserC410719 = userProperties;
            // Set up capabilities in College (member-1) tenant - user's home tenant
            cy.assignCapabilitiesToExistingUser(
              tempUserC410719.userId,
              [],
              capabSetsToAssignMembers,
            );
            Formats.createViaApi(testData.collegeLocalFormat).then((formatId) => {
              testData.collegeLocalFormat.id = formatId.body.id;
            });

            cy.resetTenant();
            // Assign affiliations: user created in College (member-1), affiliated with Central and University (member-2)
            cy.assignAffiliationToUser(Affiliations.University, tempUserC410719.userId);
            cy.assignCapabilitiesToExistingUser(
              tempUserC410719.userId,
              [],
              capabSetsToAssignCentral,
            );

            // Set up capabilities in University (member-2) tenant
            cy.setTenant(Affiliations.University);
            cy.assignCapabilitiesToExistingUser(
              tempUserC410719.userId,
              [],
              capabSetsToAssignMembers,
            );
            Formats.createViaApi(testData.universityLocalFormat).then((formatId) => {
              testData.universityLocalFormat.id = formatId.body.id;
            });
          });
        });

        after('delete test data', () => {
          cy.resetTenant();
          cy.getAdminToken();
          cy.withinTenant(Affiliations.University, () => {
            Formats.deleteViaApi(testData.universityLocalFormat.id);
          });
          cy.withinTenant(Affiliations.College, () => {
            Formats.deleteViaApi(testData.collegeLocalFormat.id);
          });

          cy.resetTenant();
          Formats.deleteViaApi(testData.centralLocalFormat.id);
          FormatsConsortiumManager.deleteViaApi(testData.centralSharedFormat);
          Users.deleteViaApi(tempUserC410719.userId);
        });

        it(
          'C410719 User with "Consortium manager: Can create, edit and remove settings" permission is able to view the list of formats of affiliated tenants in "Consortium manager" app (consortia) (thunderjet)',
          { tags: ['criticalPathECS', 'thunderjet', 'C410719'] },
          () => {
            cy.resetTenant();
            cy.waitForAuthRefresh(() => {
              cy.login(tempUserC410719.username, tempUserC410719.password);
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

            // Step 5: Navigate to Formats
            ConsortiumManagerApp.chooseSettingsItem(settingsItems.inventory);
            FormatsConsortiumManager.choose();

            // Step 6: Verify shared format
            ConsortiaControlledVocabularyPaneset.verifyRecordIsInTheList(
              testData.centralSharedFormat.payload.name,
              'consortium',
              [
                testData.centralSharedFormat.payload.name,
                testData.centralSharedFormat.payload.code,
                'consortium',
                `${moment().format('l')} by`,
                'All',
              ],
            );

            // Step 7: Verify central local format
            ConsortiaControlledVocabularyPaneset.verifyRecordIsInTheList(
              testData.centralLocalFormat.name,
              tenantNames.central,
              [
                testData.centralLocalFormat.name,
                testData.centralLocalFormat.code,
                '',
                `${moment().format('l')} by`,
                tenantNames.central,
              ],
              [actionIcons.edit, actionIcons.trash],
            );

            // Step 8: Verify college (member-1) local format
            ConsortiaControlledVocabularyPaneset.verifyRecordIsInTheList(
              testData.collegeLocalFormat.name,
              tenantNames.college,
              [
                testData.collegeLocalFormat.name,
                testData.collegeLocalFormat.code,
                '',
                `${moment().format('l')} by`,
                tenantNames.college,
              ],
              [actionIcons.edit, actionIcons.trash],
            );

            // Step 9: Verify university (member-2) format is NOT shown
            ConsortiaControlledVocabularyPaneset.verifyRecordNotInTheList(
              testData.universityLocalFormat.name,
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

            // Step 13: Verify shared format still shown
            ConsortiaControlledVocabularyPaneset.verifyRecordIsInTheList(
              testData.centralSharedFormat.payload.name,
              'consortium',
              [
                testData.centralSharedFormat.payload.name,
                testData.centralSharedFormat.payload.code,
                'consortium',
                `${moment().format('l')} by`,
                'All',
              ],
            );

            // Step 14: Verify central local format still shown
            ConsortiaControlledVocabularyPaneset.verifyRecordIsInTheList(
              testData.centralLocalFormat.name,
              tenantNames.central,
              [
                testData.centralLocalFormat.name,
                testData.centralLocalFormat.code,
                '',
                `${moment().format('l')} by`,
                tenantNames.central,
              ],
              [actionIcons.edit, actionIcons.trash],
            );

            // Step 15: Verify college (member-1) format is NOT shown
            ConsortiaControlledVocabularyPaneset.verifyRecordNotInTheList(
              testData.collegeLocalFormat.name,
            );

            // Step 16: Verify university (member-2) format is NOT shown
            ConsortiaControlledVocabularyPaneset.verifyRecordNotInTheList(
              testData.universityLocalFormat.name,
            );
          },
        );
      });
    });
  });
});
