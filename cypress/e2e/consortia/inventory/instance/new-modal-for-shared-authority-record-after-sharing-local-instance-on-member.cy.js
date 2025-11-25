import { APPLICATION_NAMES, DEFAULT_JOB_PROFILE_NAMES } from '../../../../support/constants';
import Affiliations, { tenantNames } from '../../../../support/dictionary/affiliations';
import CapabilitySets from '../../../../support/dictionary/capabilitySets';
import DataImport from '../../../../support/fragments/data_import/dataImport';
import InventoryInstance from '../../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../../support/fragments/inventory/inventoryInstances';
import InventorySearchAndFilter from '../../../../support/fragments/inventory/inventorySearchAndFilter';
import LinkedToLocalAuthoritiesModal from '../../../../support/fragments/inventory/modals/linkedToLocalAuthoritiesModal';
import MarcAuthorities from '../../../../support/fragments/marcAuthority/marcAuthorities';
import QuickMarcEditor from '../../../../support/fragments/quickMarcEditor';
import ConsortiumManager from '../../../../support/fragments/settings/consortium-manager/consortium-manager';
import TopMenuNavigation from '../../../../support/fragments/topMenuNavigation';
import Users from '../../../../support/fragments/users/users';
import getRandomPostfix from '../../../../support/utils/stringTools';

describe('Inventory', () => {
  describe('Instance', () => {
    describe('Consortia', () => {
      const testData = {
        createdRecordIDs: [],
        rowIndex: 16,
        authorityHeading: 'C405559 Lentz Shared',
        sectionId: 'list-contributors',
        instanceSearchOption: 'Keyword (title, contributor, identifier, HRID, UUID)',
        heldByAccordionName: 'Held by',
        instanceTitle: 'C405559 Instance Local M1',
      };
      const authFileForCentral = {
        marc: 'marcAuthFileForC405559.mrc',
        fileNameImported: `C411721 testMarcFile${getRandomPostfix()}.mrc`,
        propertyName: 'authority',
        jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_AUTHORITY,
      };
      const marcFileForMember = {
        marc: 'marcBibFileForC405559_2.mrc',
        fileNameImported: `C411721 testMarcFile${getRandomPostfix()}.mrc`,
        propertyName: 'instance',
        jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_INSTANCE_AND_SRS,
      };

      before('Create test data and login', () => {
        cy.getAdminToken();
        MarcAuthorities.deleteMarcAuthorityByTitleViaAPI('C405559*');
        DataImport.uploadFileViaApi(
          authFileForCentral.marc,
          authFileForCentral.fileNameImported,
          authFileForCentral.jobProfileToRun,
        ).then((response) => {
          testData.createdRecordIDs.push(response[0].authority.id);
        });
        cy.setTenant(Affiliations.College)
          .then(() => {
            DataImport.uploadFileViaApi(
              marcFileForMember.marc,
              marcFileForMember.fileNameImported,
              marcFileForMember.jobProfileToRun,
            ).then((response) => {
              testData.createdRecordIDs.push(response[0].instance.id);
            });
          })
          .then(() => {
            cy.resetTenant();
            cy.loginAsAdmin();
            ConsortiumManager.switchActiveAffiliation(tenantNames.central, tenantNames.college);
            TopMenuNavigation.openAppFromDropdown(APPLICATION_NAMES.INVENTORY);
            InventoryInstances.waitContentLoading();
            InventorySearchAndFilter.clearDefaultFilter(testData.heldByAccordionName);
            InventorySearchAndFilter.searchByParameter(
              testData.instanceSearchOption,
              testData.createdRecordIDs[1],
            );
            InventoryInstances.selectInstance();
            InventoryInstance.editMarcBibliographicRecord();
            QuickMarcEditor.clickLinkIconInTagField(testData.rowIndex);
            MarcAuthorities.switchToSearch();
            InventoryInstance.verifySelectMarcAuthorityModal();
            InventoryInstance.verifySearchOptions();
            InventoryInstance.searchResults(testData.authorityHeading);
            InventoryInstance.clickLinkButton();
            cy.wait(2000);
            QuickMarcEditor.clickSaveAndKeepEditing();
          });
        cy.resetTenant();

        cy.getAdminToken();
        cy.createTempUser([]).then((userProperties) => {
          testData.user = userProperties;

          cy.assignCapabilitiesToExistingUser(
            testData.user.userId,
            [],
            [CapabilitySets.uiInventory, CapabilitySets.uiMarcAuthoritiesAuthorityRecordView],
          );

          cy.assignAffiliationToUser(Affiliations.College, testData.user.userId);
          cy.setTenant(Affiliations.College);
          cy.assignCapabilitiesToExistingUser(
            testData.user.userId,
            [],
            [
              CapabilitySets.uiInventory,
              CapabilitySets.uiMarcAuthoritiesAuthorityRecordView,
              CapabilitySets.uiConsortiaInventoryLocalSharingInstances,
            ],
          );
          cy.resetTenant();

          cy.login(testData.user.username, testData.user.password);
          ConsortiumManager.switchActiveAffiliation(tenantNames.central, tenantNames.college);
          TopMenuNavigation.navigateToApp(APPLICATION_NAMES.INVENTORY);
          InventoryInstances.waitContentLoading();
        });
      });

      after('Delete test data', () => {
        cy.getAdminToken();
        Users.deleteViaApi(testData.user.userId);
        cy.setTenant(Affiliations.College);
        InventoryInstance.deleteInstanceViaApi(testData.createdRecordIDs[1]);
      });

      it(
        'C411721 (CONSORTIA) Verify the new modal for shared authority record after sharing the local instance on Member tenant (consortia) (folijet)',
        { tags: ['extendedPathECS', 'folijet', 'C411721'] },
        () => {
          InventorySearchAndFilter.clearDefaultFilter(testData.heldByAccordionName);
          InventorySearchAndFilter.searchByParameter(
            testData.instanceSearchOption,
            testData.createdRecordIDs[1],
          );
          InventoryInstances.selectInstance();
          InventoryInstance.waitLoading();
          InventoryInstance.clickShareLocalInstanceButton();
          InventoryInstance.clickShareInstance();
          LinkedToLocalAuthoritiesModal.isNotDisplayed();
          InventoryInstance.verifyCalloutMessage(
            `Local instance ${testData.instanceTitle} has been successfully shared`,
          );
          InventoryInstance.checkSharedTextInDetailView(true);
          InventoryInstance.checkExpectedMARCSource();
          InventoryInstance.checkAuthorityAppIconLink(
            testData.sectionId,
            testData.authorityHeading,
            testData.createdRecordIDs[0],
          );
        },
      );
    });
  });
});
