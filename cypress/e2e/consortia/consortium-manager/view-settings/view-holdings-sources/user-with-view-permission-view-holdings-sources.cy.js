import moment from 'moment';
import { APPLICATION_NAMES } from '../../../../../support/constants';
import Affiliations, { tenantNames } from '../../../../../support/dictionary/affiliations';
import CapabilitySets from '../../../../../support/dictionary/capabilitySets';
import ConsortiaControlledVocabularyPaneset from '../../../../../support/fragments/consortium-manager/consortiaControlledVocabularyPaneset';
import ConsortiumManagerApp, {
  settingsItems,
} from '../../../../../support/fragments/consortium-manager/consortiumManagerApp';
import HoldingsSourcesConsortiumManager from '../../../../../support/fragments/consortium-manager/inventory/holdings/holdingsSourcesConsortiumManager';
import SelectMembers from '../../../../../support/fragments/consortium-manager/modal/select-members';
import ConsortiumManager from '../../../../../support/fragments/settings/consortium-manager/consortium-manager';
import HoldingsSources from '../../../../../support/fragments/settings/inventory/holdings/holdingsSources';
import TopMenuNavigation from '../../../../../support/fragments/topMenuNavigation';
import Users from '../../../../../support/fragments/users/users';
import { getTestEntityValue } from '../../../../../support/utils/stringTools';

const HOLDINGS_SOURCES_PANE = 'Holdings sources';

describe('Consortium manager', () => {
  describe('View settings', () => {
    describe('View Holdings sources', () => {
      const testData = {
        centralSharedSource: {
          payload: {
            name: getTestEntityValue('C648469_centralSharedSource'),
          },
        },
        centralLocalSource: {
          name: getTestEntityValue('C648469_centralLocalSource'),
          source: 'local',
        },
        collegeLocalSource: {
          name: getTestEntityValue('C648469_collegeLocalSource'),
          source: 'local',
        },
        universityLocalSource: {
          name: getTestEntityValue('C648469_universityLocalSource'),
          source: 'local',
        },
      };
      const capabSetsToAssignCentral = [
        CapabilitySets.uiConsortiaSettingsConsortiumManagerView,
        CapabilitySets.uiInventorySettingsHoldingsSourcesView,
      ];
      const capabSetsToAssignMembers = [CapabilitySets.uiInventorySettingsHoldingsSourcesView];

      before('Create test data', () => {
        cy.resetTenant();
        cy.getAdminToken();
        HoldingsSourcesConsortiumManager.createViaApi(testData.centralSharedSource);
        HoldingsSources.createViaApi(testData.centralLocalSource).then((response) => {
          testData.centralLocalSource.id = response.body.id;
        });

        cy.createTempUser([]).then((userProperties) => {
          testData.user = userProperties;
          cy.assignCapabilitiesToExistingUser(testData.user.userId, [], capabSetsToAssignCentral);

          cy.assignAffiliationToUser(Affiliations.College, testData.user.userId);
          cy.setTenant(Affiliations.College);
          cy.assignCapabilitiesToExistingUser(testData.user.userId, [], capabSetsToAssignMembers);
          HoldingsSources.createViaApi(testData.collegeLocalSource).then((response) => {
            testData.collegeLocalSource.id = response.body.id;
          });

          cy.resetTenant();
          cy.assignAffiliationToUser(Affiliations.University, testData.user.userId);
          cy.setTenant(Affiliations.University);
          cy.assignCapabilitiesToExistingUser(testData.user.userId, [], capabSetsToAssignMembers);
          HoldingsSources.createViaApi(testData.universityLocalSource).then((response) => {
            testData.universityLocalSource.id = response.body.id;
          });
          cy.resetTenant();
          cy.login(testData.user.username, testData.user.password);
          ConsortiumManager.checkCurrentTenantInTopMenu(tenantNames.central);
        });
      });

      after('Delete test data', () => {
        cy.resetTenant();
        cy.getAdminToken();
        cy.withinTenant(Affiliations.University, () => {
          HoldingsSources.deleteViaApi(testData.universityLocalSource.id);
        });
        cy.withinTenant(Affiliations.College, () => {
          HoldingsSources.deleteViaApi(testData.collegeLocalSource.id);
        });
        HoldingsSources.deleteViaApi(testData.centralLocalSource.id);
        HoldingsSourcesConsortiumManager.deleteViaApi(testData.centralSharedSource);
        Users.deleteViaApi(testData.user.userId);
      });

      it(
        'C648469 User with "Consortium manager: Can view existing settings" permission is able to view the list of holdings sources of affiliated tenants in "Consortium manager" app (consortia) (thunderjet)',
        { tags: ['criticalPathECS', 'thunderjet', 'C648469'] },
        () => {
          const lastUpdated = `${moment().format('l')} by`;
          const sharedSourceRow = [
            testData.centralSharedSource.payload.name,
            'consortium',
            lastUpdated,
            'All',
          ];
          const centralLocalSourceRow = [
            testData.centralLocalSource.name,
            'local',
            lastUpdated,
            tenantNames.central,
          ];
          const collegeLocalSourceRow = [
            testData.collegeLocalSource.name,
            'local',
            lastUpdated,
            tenantNames.college,
          ];
          const universityLocalSourceRow = [
            testData.universityLocalSource.name,
            'local',
            lastUpdated,
            tenantNames.university,
          ];

          // Step 1: Open "Consortium manager" and select all members
          TopMenuNavigation.navigateToApp(APPLICATION_NAMES.CONSORTIUM_MANAGER);
          SelectMembers.selectAllMembers();
          ConsortiumManagerApp.verifyStatusOfConsortiumManager(3);

          // Step 2: Open "Inventory" => "Holdings sources"
          ConsortiumManagerApp.chooseSettingsItem(settingsItems.inventory);
          HoldingsSourcesConsortiumManager.choose();
          ConsortiaControlledVocabularyPaneset.waitLoading(HOLDINGS_SOURCES_PANE);
          ConsortiaControlledVocabularyPaneset.verifyNewButtonShown(false);

          // Step 3: Shared holdings source is listed as a single entry, "Actions" column is empty
          ConsortiaControlledVocabularyPaneset.verifyRecordIsInTheList(
            testData.centralSharedSource.payload.name,
            'consortium',
            sharedSourceRow,
          );
          ConsortiaControlledVocabularyPaneset.verifyRecordHasNoDuplicatesInTheList(
            testData.centralSharedSource.payload.name,
          );

          // Steps 4-6: Local holdings sources of all members are listed without "Edit"/"Delete" icons
          ConsortiaControlledVocabularyPaneset.verifyRecordIsInTheList(
            testData.centralLocalSource.name,
            tenantNames.central,
            centralLocalSourceRow,
          );
          ConsortiaControlledVocabularyPaneset.verifyRecordIsInTheList(
            testData.collegeLocalSource.name,
            tenantNames.college,
            collegeLocalSourceRow,
          );
          ConsortiaControlledVocabularyPaneset.verifyRecordIsInTheList(
            testData.universityLocalSource.name,
            tenantNames.university,
            universityLocalSourceRow,
          );

          // Step 7: Open "Select members" modal
          ConsortiumManagerApp.clickSelectMembers();
          SelectMembers.verifyStatusOfSelectMembersModal(3, 3, true);

          // Step 8: Uncheck central tenant
          SelectMembers.selectMembers(tenantNames.central);
          SelectMembers.verifyMembersFound(3);
          SelectMembers.verifyTotalSelected(2);
          SelectMembers.verifyMemberIsSelected(tenantNames.central, false);
          SelectMembers.verifyMemberIsSelected(tenantNames.college, true);
          SelectMembers.verifyMemberIsSelected(tenantNames.university, true);

          // Step 9: Save and close the modal
          SelectMembers.saveAndClose();
          ConsortiumManagerApp.verifyStatusOfConsortiumManager(2);
          ConsortiumManagerApp.verifySettingsItemIsSelected(settingsItems.inventory);
          ConsortiaControlledVocabularyPaneset.waitLoading(HOLDINGS_SOURCES_PANE);

          // Step 10: Shared holdings source is still listed as a single entry
          ConsortiaControlledVocabularyPaneset.verifyRecordIsInTheList(
            testData.centralSharedSource.payload.name,
            'consortium',
            sharedSourceRow,
          );
          ConsortiaControlledVocabularyPaneset.verifyRecordHasNoDuplicatesInTheList(
            testData.centralSharedSource.payload.name,
          );

          // Steps 11-13: Local holdings sources of member tenants are listed, central one is NOT listed
          ConsortiaControlledVocabularyPaneset.verifyRecordIsInTheList(
            testData.collegeLocalSource.name,
            tenantNames.college,
            collegeLocalSourceRow,
          );
          ConsortiaControlledVocabularyPaneset.verifyRecordIsInTheList(
            testData.universityLocalSource.name,
            tenantNames.university,
            universityLocalSourceRow,
          );
          ConsortiaControlledVocabularyPaneset.verifyRecordNotInTheList(
            testData.centralLocalSource.name,
          );
        },
      );
    });
  });
});
