import moment from 'moment';
import { APPLICATION_NAMES } from '../../../../../support/constants';
import Affiliations, { tenantNames } from '../../../../../support/dictionary/affiliations';
import Permissions from '../../../../../support/dictionary/permissions';
import ConsortiaControlledVocabularyPaneset, {
  actionIcons,
} from '../../../../../support/fragments/consortium-manager/consortiaControlledVocabularyPaneset';
import ConsortiumManagerApp, {
  settingsItems,
  // messages,
} from '../../../../../support/fragments/consortium-manager/consortiumManagerApp';
import FormatsConsortiumManager from '../../../../../support/fragments/consortium-manager/inventory/instances/formatsConsortiumManager';
import SelectMembers from '../../../../../support/fragments/consortium-manager/modal/select-members';
import Formats from '../../../../../support/fragments/settings/inventory/instances/formats';
import TopMenuNavigation from '../../../../../support/fragments/topMenuNavigation';
import Users from '../../../../../support/fragments/users/users';
import { getTestEntityValue } from '../../../../../support/utils/stringTools';
// import InteractorsTools from '../../../../../support/utils/interactorsTools';

describe('Consortia', () => {
  describe('Consortium manager', () => {
    describe('View settings', () => {
      describe('View Formats', () => {
        const testData = {
          centralSharedFormat: {
            payload: {
              name: getTestEntityValue('C410720_centralSharedFormat'),
              code: getTestEntityValue('C410720_sharedCode'),
            },
          },
          centralLocalFormat: {
            name: getTestEntityValue('C410720_centralLocalFormat'),
            code: getTestEntityValue('C410720_centralCode'),
            source: 'local',
          },
          collegeLocalFormat: {
            name: getTestEntityValue('C410720_collegeLocalFormat'),
            code: getTestEntityValue('C410720_collegeCode'),
            source: 'local',
          },
          universityLocalFormat: {
            name: getTestEntityValue('C410720_universityLocalFormat'),
            code: getTestEntityValue('C410720_universityCode'),
            source: 'local',
          },
        };

        let tempUserC410720;

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

          cy.createTempUser([
            Permissions.consortiaSettingsConsortiumManagerView.gui,
            Permissions.consortiaSettingsConsortiumManagerEdit.gui,
            Permissions.crudFormats.gui,
          ]).then((userProperties) => {
            tempUserC410720 = userProperties;

            // Assign affiliation to College (member-1) but NOT University (member-2)
            cy.assignAffiliationToUser(Affiliations.College, tempUserC410720.userId);

            // Set up College (member-1) tenant with organizations permissions
            cy.setTenant(Affiliations.College);
            cy.assignPermissionsToExistingUser(tempUserC410720.userId, [
              Permissions.uiOrganizationsView.gui,
            ]);
            Formats.createViaApi(testData.collegeLocalFormat).then((formatId) => {
              testData.collegeLocalFormat.id = formatId.body.id;
            });

            // Set up University (member-2) tenant - user has no affiliation here
            cy.setTenant(Affiliations.University);
            Formats.createViaApi(testData.universityLocalFormat).then((formatId) => {
              testData.universityLocalFormat.id = formatId.body.id;
            });
          });
        });

        after('Delete test data', () => {
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
          Users.deleteViaApi(tempUserC410720.userId);
        });

        it(
          'C410720 User without "inventory-storage.instance-formats.collection.get" permission is NOT able to view the list of formats of affiliated tenants in "Consortium manager" app (consortia) (thunderjet)',
          { tags: ['extendedPathECS', 'thunderjet', 'C410720'] },
          () => {
            cy.resetTenant();
            cy.login(tempUserC410720.username, tempUserC410720.password);
            // Without waiter, permissions aren't loading
            cy.wait(10000);

            // Step 1: Navigate to Consortium Manager and select all members
            TopMenuNavigation.navigateToApp(APPLICATION_NAMES.CONSORTIUM_MANAGER);
            SelectMembers.selectAllMembers();
            // Only 2 members should be available (Central and College) since user has no affiliation to University
            ConsortiumManagerApp.verifyStatusOfConsortiumManager(2);

            // Step 2: Navigate to Formats and expect permission error
            ConsortiumManagerApp.chooseSettingsItem(settingsItems.inventory);
            FormatsConsortiumManager.choose();

            // Verify permission error toast message appears
            // TO DO: uncomment after EUREKA-536 is done
            // InteractorsTools.checkCalloutExists(messages.noPermission(tenantNames.college));

            // Step 3: Verify shared format is visible
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

            // Step 4: Verify central local format is visible
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

            // Step 5: Verify college (member-1) local holdings source is NOT visible
            // TO DO: uncomment after EUREKA-536 is done
            // ConsortiaControlledVocabularyPaneset.verifyRecordNotInTheList(
            //   testData.centralLocalFormat.name,
            // );

            // Step 6: Verify university (member-2) local format is NOT visible
            ConsortiaControlledVocabularyPaneset.verifyRecordNotInTheList(
              testData.universityLocalFormat.name,
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
