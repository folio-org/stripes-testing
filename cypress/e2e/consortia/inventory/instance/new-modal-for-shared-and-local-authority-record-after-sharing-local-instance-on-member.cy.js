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
// import Users from '../../../../support/fragments/users/users';
import getRandomPostfix from '../../../../support/utils/stringTools';

describe('Inventory', () => {
  describe('Instance', () => {
    describe('Consortia', () => {
      const testData = {
        createdRecordIDs: [],
        rowIndex: 16,
        authorityHeading: 'C411723 Lentz Shared',
        sectionId: 'list-contributors',
        instanceSearchOption: 'Keyword (title, contributor, identifier, HRID, UUID)',
        heldByAccordionName: 'Held by',
        instanceTitle: 'C411723 Instance Local M1',
      };
      const authFileForCentral = {
        marc: 'marcAuthFileForC411723-s.mrc',
        fileNameImported: `C411723 testMarcFile${getRandomPostfix()}.mrc`,
        propertyName: 'authority',
        jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_AUTHORITY,
      };
      const filesForMember = [
        {
          marc: 'marcBibFileForC411723.mrc',
          fileNameImported: `C411723 testMarcFile${getRandomPostfix()}.mrc`,
          propertyName: 'instance',
          jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_INSTANCE_AND_SRS,
        },
        {
          marc: 'marcAuthFileForC411723-l.mrc',
          fileNameImported: `C411723 testMarcFile${getRandomPostfix()}.mrc`,
          propertyName: 'authority',
          jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_AUTHORITY,
        },
      ];

      before('Create test data and login', () => {
        cy.getAdminToken();
        MarcAuthorities.deleteMarcAuthorityByTitleViaAPI('C411723*');
        DataImport.uploadFileViaApi(
          authFileForCentral.marc,
          authFileForCentral.fileNameImported,
          authFileForCentral.jobProfileToRun,
        ).then((response) => {
          testData.createdRecordIDs.push(response[0].authority.id);
        });
        cy.setTenant(Affiliations.College)
          .then(() => {
            MarcAuthorities.deleteMarcAuthorityByTitleViaAPI('C411723*');
            filesForMember.forEach((file) => {
              DataImport.uploadFileViaApi(
                file.marc,
                file.fileNameImported,
                file.jobProfileToRun,
              ).then((response) => {
                response.forEach((record) => {
                  testData.createdRecordIDs.push(record[file.propertyName].id);
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
              testData.createdRecordIDs[1],
            );
            InventoryInstances.selectInstance();
            InventoryInstance.editMarcBibliographicRecord();
            QuickMarcEditor.clickLinkIconInTagField(16);
            MarcAuthorities.switchToSearch();
            InventoryInstance.verifySelectMarcAuthorityModal();
            InventoryInstance.verifySearchOptions();
            InventoryInstance.searchResults(
              'C411723 Lentz Shared',
              // testData.authorityHeading
            );
            InventoryInstance.clickLinkButton();
            cy.wait(1000);
            QuickMarcEditor.clickLinkIconInTagField(32);
            MarcAuthorities.switchToSearch();
            InventoryInstance.verifySelectMarcAuthorityModal();
            InventoryInstance.verifySearchOptions();
            InventoryInstance.searchResults('C411723 Lentz Local M1');
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

      // after('Delete test data', () => {
      //   cy.getAdminToken();
      //   Users.deleteViaApi(testData.user.userId);
      //   cy.setTenant(Affiliations.College);
      //   InventoryInstance.deleteInstanceViaApi(testData.createdRecordIDs[1]);
      // });

      it(
        'C411723 (CONSORTIA) Verify the new modal for shared and local authority record after sharing the local instance on Member tenant (consortia) (folijet)',
        { tags: ['extendedPathECS', 'folijet', 'C411723'] },
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
          cy.pause();
          // InventoryInstance.checkAuthorityAppIconLink(
          //   testData.sectionId,
          //   testData.authorityHeading,
          //   testData.createdRecordIDs[0],
          // );
        },
      );
    });
  });
});
