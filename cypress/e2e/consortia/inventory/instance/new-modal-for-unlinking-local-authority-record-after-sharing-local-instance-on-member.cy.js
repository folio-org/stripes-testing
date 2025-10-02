import { APPLICATION_NAMES, DEFAULT_JOB_PROFILE_NAMES } from '../../../../support/constants';
import Affiliations, { tenantNames } from '../../../../support/dictionary/affiliations';
import CapabilitySets from '../../../../support/dictionary/capabilitySets';
import DataImport from '../../../../support/fragments/data_import/dataImport';
import InventoryInstance from '../../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../../support/fragments/inventory/inventoryInstances';
import InventorySearchAndFilter from '../../../../support/fragments/inventory/inventorySearchAndFilter';
import LinkedToLocalAuthoritiesModal from '../../../../support/fragments/inventory/modals/linkedToLocalAuthoritiesModal';
import MarcAuthorities from '../../../../support/fragments/marcAuthority/marcAuthorities';
import MarcAuthority from '../../../../support/fragments/marcAuthority/marcAuthority';
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
        authorityHeading: 'C411716 Lentz Local M1',
        sectionId: 'list-contributors',
        instanceSearchOption: 'Keyword (title, contributor, identifier, HRID, UUID)',
        heldByAccordionName: 'Held by',
      };
      const marcFiles = [
        {
          marc: 'marcBibFileForC411716.mrc',
          fileNameImported: `C411716 testMarcFile${getRandomPostfix()}.mrc`,
          propertyName: 'instance',
          jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_INSTANCE_AND_SRS,
        },
        {
          marc: 'marcAuthFileForC411716.mrc',
          fileNameImported: `C411716 testMarcFile${getRandomPostfix()}.mrc`,
          propertyName: 'authority',
          jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_AUTHORITY,
        },
      ];

      before('Create test data and login', () => {
        cy.getAdminToken();
        MarcAuthorities.deleteMarcAuthorityByTitleViaAPI('C411716*');
        cy.setTenant(Affiliations.College)
          .then(() => {
            MarcAuthorities.deleteMarcAuthorityByTitleViaAPI('C411716*');
            marcFiles.forEach((marcFile) => {
              DataImport.uploadFileViaApi(
                marcFile.marc,
                marcFile.fileNameImported,
                marcFile.jobProfileToRun,
              ).then((response) => {
                response.forEach((record) => {
                  testData.createdRecordIDs.push(record[marcFile.propertyName].id);
                });
              });
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
              testData.createdRecordIDs[0],
            );
            InventoryInstances.selectInstance();
            InventoryInstance.editMarcBibliographicRecord();
            QuickMarcEditor.clickLinkIconInTagField(testData.rowIndex);
            MarcAuthorities.switchToSearch();
            InventoryInstance.verifySelectMarcAuthorityModal();
            InventoryInstance.verifySearchOptions();
            InventoryInstance.searchResults(testData.authorityHeading);
            InventoryInstance.clickLinkButton();
            QuickMarcEditor.clickSaveAndKeepEditingButton();
            cy.wait(4000);
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
        InventoryInstance.deleteInstanceViaApi(testData.createdRecordIDs[0]);
        cy.setTenant(Affiliations.College);
        testData.createdRecordIDs.forEach((id, index) => {
          if (index) MarcAuthority.deleteViaAPI(id, true);
        });
      });

      it(
        'C411716 (CONSORTIA) Verify the new modal for unlinking local authority record after sharing the local instance on Member tenant (consortia) (folijet)',
        { tags: ['extendedPathECS', 'folijet', 'C411716'] },
        () => {
          InventorySearchAndFilter.clearDefaultFilter(testData.heldByAccordionName);
          InventorySearchAndFilter.searchByParameter(
            testData.instanceSearchOption,
            testData.createdRecordIDs[0],
          );
          InventoryInstances.selectInstance();
          InventoryInstance.waitLoading();
          InventoryInstance.clickShareLocalInstanceButton();
          InventoryInstance.clickShareInstance();
          LinkedToLocalAuthoritiesModal.waitLoading();
          LinkedToLocalAuthoritiesModal.verifyModalView(1);
          LinkedToLocalAuthoritiesModal.clickCancel();
          InventoryInstance.checkSharedTextInDetailView(false);
          InventoryInstance.checkAuthorityAppIconLink(
            testData.sectionId,
            testData.authorityHeading,
            testData.createdRecordIDs[1],
          );
          InventoryInstance.checkAuthorityAppIconInSection(
            testData.sectionId,
            testData.authorityHeading,
            true,
          );

          InventoryInstance.clickShareLocalInstanceButton();
          InventoryInstance.clickShareInstance();
          LinkedToLocalAuthoritiesModal.waitLoading();
          LinkedToLocalAuthoritiesModal.verifyModalView(1);
          LinkedToLocalAuthoritiesModal.clickProceed();
          InventoryInstance.checkSharedTextInDetailView(true);
          InventoryInstance.checkAuthorityAppIconInSection(
            testData.sectionId,
            testData.authorityHeading,
            false,
          );
        },
      );
    });
  });
});
