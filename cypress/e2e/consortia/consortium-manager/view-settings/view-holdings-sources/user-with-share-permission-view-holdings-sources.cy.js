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
            name: getTestEntityValue('C648472_centralSharedSource'),
          },
        },
        centralLocalSource: {
          name: getTestEntityValue('C648472_centralLocalSource'),
          source: 'local',
        },
        collegeLocalSource: {
          name: getTestEntityValue('C648472_collegeLocalSource'),
          source: 'local',
        },
        universityLocalSource: {
          name: getTestEntityValue('C648472_universityLocalSource'),
          source: 'local',
        },
      };
      const capabSetsToAssignCentral = [
        CapabilitySets.uiConsortiaSettingsConsortiumManagerShare,
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

        cy.setTenant(Affiliations.College);
        HoldingsSources.createViaApi(testData.collegeLocalSource).then((response) => {
          testData.collegeLocalSource.id = response.body.id;
        });
        cy.createTempUser([]).then((userProperties) => {
          testData.user = userProperties;
          cy.assignCapabilitiesToExistingUser(testData.user.userId, [], capabSetsToAssignMembers);

          cy.resetTenant();
          cy.assignAffiliationToUser(Affiliations.University, testData.user.userId);
          cy.assignCapabilitiesToExistingUser(testData.user.userId, [], capabSetsToAssignCentral);

          cy.setTenant(Affiliations.University);
          cy.assignCapabilitiesToExistingUser(testData.user.userId, [], capabSetsToAssignMembers);
          HoldingsSources.createViaApi(testData.universityLocalSource).then((response) => {
            testData.universityLocalSource.id = response.body.id;
          });

          // Precondition 8: User is logged in and switched affiliation to central tenant
          cy.setTenant(Affiliations.College);
          cy.login(testData.user.username, testData.user.password);
          ConsortiumManager.switchActiveAffiliation(tenantNames.college, tenantNames.central);
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
          Users.deleteViaApi(testData.user.userId);
        });
        HoldingsSources.deleteViaApi(testData.centralLocalSource.id);
        HoldingsSourcesConsortiumManager.deleteViaApi(testData.centralSharedSource);
      });

      it(
        'C648472 User with "Consortium manager: Can share settings to all members" permission is able to view the list of holdings sources of affiliated tenants in "Consortium manager" app (consortia) (thunderjet)',
        { tags: ['criticalPathECS', 'thunderjet', 'C648472'] },
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

          // Step 3: Shared holdings source is listed as a single entry, no "Edit"/"Delete" icons
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

          // Step 8: Uncheck member-1 and member-2 tenants
          SelectMembers.selectMembers(tenantNames.college);
          SelectMembers.selectMembers(tenantNames.university);
          SelectMembers.verifyMembersFound(3);
          SelectMembers.verifyTotalSelected(1);
          SelectMembers.verifyMemberIsSelected(tenantNames.central, true);
          SelectMembers.verifyMemberIsSelected(tenantNames.college, false);
          SelectMembers.verifyMemberIsSelected(tenantNames.university, false);

          // Step 9: Save and close the modal
          SelectMembers.saveAndClose();
          ConsortiumManagerApp.verifyStatusOfConsortiumManager(1);
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

          // Steps 11-13: Local holdings source of central tenant is listed, member ones are NOT listed
          ConsortiaControlledVocabularyPaneset.verifyRecordIsInTheList(
            testData.centralLocalSource.name,
            tenantNames.central,
            centralLocalSourceRow,
          );
          ConsortiaControlledVocabularyPaneset.verifyRecordNotInTheList(
            testData.collegeLocalSource.name,
          );
          ConsortiaControlledVocabularyPaneset.verifyRecordNotInTheList(
            testData.universityLocalSource.name,
          );
        },
      );
    });
  });
});
