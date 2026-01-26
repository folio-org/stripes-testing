import Permissions from '../../../../../support/dictionary/permissions';
import Affiliations, { tenantNames } from '../../../../../support/dictionary/affiliations';
import Users from '../../../../../support/fragments/users/users';
import TopMenu from '../../../../../support/fragments/topMenu';
import InventoryInstances from '../../../../../support/fragments/inventory/inventoryInstances';
import getRandomPostfix from '../../../../../support/utils/stringTools';
import InventoryInstance from '../../../../../support/fragments/inventory/inventoryInstance';
import InventoryViewSource from '../../../../../support/fragments/inventory/inventoryViewSource';
import DataImport from '../../../../../support/fragments/data_import/dataImport';
import { DEFAULT_JOB_PROFILE_NAMES } from '../../../../../support/constants';
import QuickMarcEditor from '../../../../../support/fragments/quickMarcEditor';
import ConsortiumManager from '../../../../../support/fragments/settings/consortium-manager/consortium-manager';
import InventorySearchAndFilter from '../../../../../support/fragments/inventory/inventorySearchAndFilter';

describe('MARC', () => {
  describe('MARC Bibliographic', () => {
    describe('Edit MARC bib', () => {
      const testData = {
        sharedBibSourcePaheheaderText: 'C405549 Instance Local M1 Updated',
        instanceSearchOption: 'Keyword (title, contributor, identifier, HRID, UUID)',
        tag245: '245',
        tag500: '500',
        tag245Content: 'C405549 Instance Local M1 Updated',
        tag500Content: 'Proceedings. Updated',
      };

      const users = {};

      const marcFiles = [
        {
          marc: 'marcBibFileForC405549.mrc',
          fileNameImported: `testMarcFileC405549.${getRandomPostfix()}.mrc`,
          propertyName: 'instance',
          jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_INSTANCE_AND_SRS,
        },
      ];

      const createdRecordIDs = [];

      before('Create users, data', () => {
        cy.getAdminToken();

        cy.createTempUser([
          Permissions.inventoryAll.gui,
          Permissions.uiQuickMarcQuickMarcBibliographicEditorAll.gui,
        ])
          .then((userProperties) => {
            users.userProperties = userProperties;
          })
          .then(() => {
            cy.assignAffiliationToUser(Affiliations.University, users.userProperties.userId);
            cy.assignAffiliationToUser(Affiliations.College, users.userProperties.userId);
            cy.setTenant(Affiliations.University);
            cy.assignPermissionsToExistingUser(users.userProperties.userId, [
              Permissions.inventoryAll.gui,
              Permissions.uiQuickMarcQuickMarcBibliographicEditorAll.gui,
            ]);
          })
          .then(() => {
            cy.setTenant(Affiliations.College);
            cy.wait(10_000);
            cy.assignPermissionsToExistingUser(users.userProperties.userId, [
              Permissions.inventoryAll.gui,
              Permissions.uiQuickMarcQuickMarcBibliographicEditorAll.gui,
            ]);
          })
          .then(() => {
            cy.setTenant(Affiliations.University);
            marcFiles.forEach((marcFile) => {
              DataImport.uploadFileViaApi(
                marcFile.marc,
                marcFile.fileNameImported,
                marcFile.jobProfileToRun,
              ).then((response) => {
                response.forEach((record) => {
                  createdRecordIDs.push(record[marcFile.propertyName].id);
                });
              });
            });
          });
      });

      after('Delete users, data', () => {
        cy.resetTenant();
        cy.getAdminToken();
        Users.deleteViaApi(users.userProperties.userId);
        cy.setTenant(Affiliations.University);
        InventoryInstance.deleteInstanceViaApi(createdRecordIDs[0]);
      });

      it(
        'C405549 User can edit local "MARC Bib" in member tenant (consortia) (spitfire)',
        { tags: ['criticalPathECS', 'spitfire', 'C405549'] },
        () => {
          cy.resetTenant();
          cy.login(users.userProperties.username, users.userProperties.password, {
            path: TopMenu.inventoryPath,
            waiter: InventoryInstances.waitContentLoading,
            authRefresh: true,
          }).then(() => {
            ConsortiumManager.switchActiveAffiliation(tenantNames.central, tenantNames.university);
            InventoryInstances.waitContentLoading();
            ConsortiumManager.checkCurrentTenantInTopMenu(tenantNames.university);
          });

          InventoryInstances.searchByTitle(createdRecordIDs[0]);
          InventoryInstances.selectInstance();
          InventoryInstance.editMarcBibliographicRecord();
          QuickMarcEditor.updateExistingField(testData.tag245, `$a ${testData.tag245Content}`);
          QuickMarcEditor.updateExistingField(testData.tag500, `$a ${testData.tag500Content}`);
          QuickMarcEditor.pressSaveAndCloseButton();
          QuickMarcEditor.checkAfterSaveAndClose();
          InventoryInstance.checkInstanceTitle(testData.tag245Content);
          InventoryInstance.viewSource();
          InventoryViewSource.contains(testData.sharedBibSourcePaheheaderText);
          InventoryViewSource.verifyFieldInMARCBibSource(testData.tag245, testData.tag245Content);
          InventoryViewSource.verifyFieldInMARCBibSource(testData.tag500, testData.tag500Content);
          InventoryViewSource.close();

          ConsortiumManager.switchActiveAffiliation(tenantNames.university, tenantNames.central);
          InventoryInstances.waitContentLoading();
          ConsortiumManager.checkCurrentTenantInTopMenu(tenantNames.central);
          InventorySearchAndFilter.searchByParameter(
            testData.instanceSearchOption,
            testData.tag245Content,
          );
          InventoryInstance.verifyNoResultFoundMessage(
            `No results found for "${testData.tag245Content}". Please check your spelling and filters.`,
          );

          ConsortiumManager.switchActiveAffiliation(tenantNames.central, tenantNames.college);
          InventoryInstances.waitContentLoading();
          ConsortiumManager.checkCurrentTenantInTopMenu(tenantNames.college);
          InventorySearchAndFilter.searchByParameter(
            testData.instanceSearchOption,
            testData.tag245Content,
          );
          InventoryInstance.verifyNoResultFoundMessage(
            `No results found for "${testData.tag245Content}". Please check your spelling and filters.`,
          );
        },
      );
    });
  });
});
