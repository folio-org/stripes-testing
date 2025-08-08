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
import ClassificationIdentifierTypesConsortiumManager from '../../../../../support/fragments/consortium-manager/inventory/instances/classificationIdentifierTypesConsortiumManager';
import SelectMembers from '../../../../../support/fragments/consortium-manager/modal/select-members';
import ClassificationIdentifierTypes from '../../../../../support/fragments/settings/inventory/instances/classificationIdentifierTypes';
import TopMenuNavigation from '../../../../../support/fragments/topMenuNavigation';
import Users from '../../../../../support/fragments/users/users';
import { getTestEntityValue } from '../../../../../support/utils/stringTools';
// import InteractorsTools from '../../../../../support/utils/interactorsTools';

describe('Consortia', () => {
  describe('Consortium manager', () => {
    describe('View settings', () => {
      describe('View Classification identifier types', () => {
        const testData = {
          centralSharedClassificationIdentifierType: {
            payload: {
              name: getTestEntityValue('C410887_centralSharedClassificationIdentifierType'),
            },
          },
          centralLocalClassificationIdentifierType: {
            name: getTestEntityValue('C410887_centralLocalClassificationIdentifierType'),
          },
          collegeLocalClassificationIdentifierType: {
            name: getTestEntityValue('C410887_collegeLocalClassificationIdentifierType'),
          },
          universityLocalClassificationIdentifierType: {
            name: getTestEntityValue('C410887_universityLocalClassificationIdentifierType'),
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
        let tempUserC410887;

        before('Create test data', () => {
          cy.clearCookies({ domain: null });
          cy.resetTenant();
          cy.getAdminToken();
          ClassificationIdentifierTypesConsortiumManager.createViaApi(
            testData.centralSharedClassificationIdentifierType,
          ).then((newType) => {
            testData.centralSharedClassificationIdentifierType.id = newType.id;
          });
          ClassificationIdentifierTypes.createViaApi({
            name: testData.centralLocalClassificationIdentifierType.name,
            source: 'local',
          }).then((response) => {
            testData.centralLocalClassificationIdentifierType.id = response.body.id;
          });

          cy.createTempUser([
            Permissions.consortiaSettingsConsortiumManagerView.gui,
            Permissions.consortiaSettingsConsortiumManagerEdit.gui,
            Permissions.crudClassificationIdentifierTypes.gui,
          ]).then((userProperties) => {
            tempUserC410887 = userProperties;

            // Assign affiliation to College (member-1) but NOT University (member-2)
            cy.assignAffiliationToUser(Affiliations.College, tempUserC410887.userId);

            // Set up College (member-1) tenant with Orders permissions (no classification identifier types permission)
            cy.setTenant(Affiliations.College);
            cy.assignPermissionsToExistingUser(tempUserC410887.userId, [
              Permissions.uiOrdersView.gui,
            ]);
            ClassificationIdentifierTypes.createViaApi({
              name: testData.collegeLocalClassificationIdentifierType.name,
              source: 'local',
            }).then((response) => {
              testData.collegeLocalClassificationIdentifierType.id = response.body.id;
            });

            // Set up University (member-2) tenant - user has no affiliation here
            cy.setTenant(Affiliations.University);
            ClassificationIdentifierTypes.createViaApi({
              name: testData.universityLocalClassificationIdentifierType.name,
              source: 'local',
            }).then((response) => {
              testData.universityLocalClassificationIdentifierType.id = response.body.id;
            });
          });
        });

        after('Delete test data', () => {
          cy.resetTenant();
          cy.getAdminToken();
          ClassificationIdentifierTypes.deleteViaApi(
            testData.centralLocalClassificationIdentifierType.id,
          );
          ClassificationIdentifierTypesConsortiumManager.deleteViaApi(
            testData.centralSharedClassificationIdentifierType,
          );
          Users.deleteViaApi(tempUserC410887.userId);

          cy.withinTenant(Affiliations.College, () => {
            ClassificationIdentifierTypes.deleteViaApi(
              testData.collegeLocalClassificationIdentifierType.id,
            );
          });
          cy.withinTenant(Affiliations.University, () => {
            ClassificationIdentifierTypes.deleteViaApi(
              testData.universityLocalClassificationIdentifierType.id,
            );
          });
        });

        it(
          'C410887 User without "inventory-storage.classification-types.collection.get" permission is NOT able to view the list of classification identifier types of affiliated tenants in "Consortium manager" app (consortia) (thunderjet)',
          { tags: ['extendedPathECS', 'thunderjet', 'C410887'] },
          () => {
            cy.resetTenant();
            cy.login(tempUserC410887.username, tempUserC410887.password);
            // Without waiter, permissions aren't loading
            cy.wait(10000);

            // Step 1: Navigate to Consortium Manager and select all members
            TopMenuNavigation.navigateToApp(APPLICATION_NAMES.CONSORTIUM_MANAGER);
            ConsortiumManagerApp.verifyStatusOfConsortiumManager();
            SelectMembers.selectAllMembers();
            // Only 2 members should be available (Central and College) since user has no affiliation to University
            ConsortiumManagerApp.verifyStatusOfConsortiumManager(2);

            // Step 2: Navigate to Inventory settings
            ConsortiumManagerApp.chooseSettingsItem(settingsItems.inventory);

            // Step 3: Navigate to classification identifier types and expect permission error
            ClassificationIdentifierTypesConsortiumManager.choose();
            ConsortiaControlledVocabularyPaneset.verifyNewButtonShown();

            // Verify permission error toast message appears
            // TO DO: uncomment after EUREKA-536 is done
            // InteractorsTools.checkCalloutExists(messages.noPermission(tenantNames.college));

            // Step 4: Verify shared classification identifier type is visible
            ConsortiaControlledVocabularyPaneset.verifyRecordIsInTheList(
              testData.centralSharedClassificationIdentifierType.payload.name,
              constants.memberLibraries.all,
              [
                testData.centralSharedClassificationIdentifierType.payload.name,
                constants.source.consortium,
                `${moment().format('l')} by`,
                constants.memberLibraries.all,
              ],
            );

            // Step 5: Verify central local classification identifier type is visible with actions
            ConsortiaControlledVocabularyPaneset.verifyRecordIsInTheList(
              testData.centralLocalClassificationIdentifierType.name,
              tenantNames.central,
              [
                testData.centralLocalClassificationIdentifierType.name,
                constants.source.local,
                `${moment().format('l')} by`,
                tenantNames.central,
              ],
              [actionIcons.edit, actionIcons.trash],
            );

            // Step 6: Verify college (member-1) local classification identifier type is NOT visible
            // TO DO: uncomment after EUREKA-536 is done
            // ConsortiaControlledVocabularyPaneset.verifyRecordNotInTheList(
            //   testData.collegeLocalClassificationIdentifierType.name,
            // );

            // Step 7: Verify university (member-2) local classification identifier type is NOT visible
            ConsortiaControlledVocabularyPaneset.verifyRecordNotInTheList(
              testData.universityLocalClassificationIdentifierType.name,
            );

            // Step 8: Click Select members to verify modal state
            ConsortiumManagerApp.clickSelectMembers();
            SelectMembers.verifyStatusOfSelectMembersModal(2, 2, true);

            // Step 9: Uncheck all members
            SelectMembers.checkMember(tenantNames.central, false);
            SelectMembers.checkMember(tenantNames.college, false);
            SelectMembers.verifyStatusOfSelectMembersModal(2, 0, false);

            // Step 10: Save with 0 members selected
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
