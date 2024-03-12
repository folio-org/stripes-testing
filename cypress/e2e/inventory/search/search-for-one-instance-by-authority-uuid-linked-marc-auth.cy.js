import { Permissions } from '../../../support/dictionary';
import DataImport from '../../../support/fragments/data_import/dataImport';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
import MarcAuthorities from '../../../support/fragments/marcAuthority/marcAuthorities';
import MarcAuthoritiesSearch from '../../../support/fragments/marcAuthority/marcAuthoritiesSearch';
import MarcAuthority from '../../../support/fragments/marcAuthority/marcAuthority';
import QuickMarcEditor from '../../../support/fragments/quickMarcEditor';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import { randomFourDigitNumber } from '../../../support/utils/stringTools';

const testData = {
  user: {},
  recordIDs: [],
  tag: '700',
  searchOptions: {
    AUTHORITY_UUID: 'Authority UUID',
  },
  instanceRecords: ["Pretty woman: director's cut.", 'Runaway bride'],
  searchAuthorityQueries: ['Roberts, Julia, 1967-'],

  marcFiles: [
    {
      marc: 'marcBibC367973_01.mrc',
      fileName: `testMarcFileC367973_01.${randomFourDigitNumber()}.mrc`,
      jobProfileToRun: 'Default - Create instance and SRS MARC Bib',
      numberOfRecords: 1,
      propertyName: 'relatedInstanceInfo',
    },
    {
      marc: 'marcBibC367973_02.mrc',
      fileName: `testMarcFileC367973_02.${randomFourDigitNumber()}.mrc`,
      jobProfileToRun: 'Default - Create instance and SRS MARC Bib',
      numberOfRecords: 1,
      propertyName: 'relatedInstanceInfo',
    },
    {
      marc: 'marcAuthC367973.mrc',
      fileName: `testMarcFileAuthC367973.${randomFourDigitNumber()}.mrc`,
      jobProfileToRun: 'Default - Create SRS MARC Authority',
      numberOfRecords: 1,
      propertyName: 'relatedAuthorityInfo',
    },
  ],
};

describe('inventory', () => {
  describe('Search in Inventory', () => {
    before('Create test data', () => {
      cy.getAdminToken();
      cy.loginAsAdmin({ path: TopMenu.dataImportPath, waiter: DataImport.waitLoading }).then(() => {
        testData.instanceRecords.forEach((record) => {
          InventoryInstances.getInstancesViaApi({
            limit: 100,
            query: `title= ${record}`,
          }).then((instances) => {
            if (instances) {
              instances.forEach(({ id }) => {
                InventoryInstance.deleteInstanceViaApi(id);
              });
            }
          });
        });

        testData.searchAuthorityQueries.forEach((query) => {
          MarcAuthorities.getMarcAuthoritiesViaApi({
            limit: 100,
            query: `keyword="${query}" and (authRefType==("Authorized" or "Auth/Ref"))`,
          }).then((authorities) => {
            if (authorities) {
              authorities.forEach(({ id }) => {
                MarcAuthority.deleteViaAPI(id);
              });
            }
          });
        });
        testData.marcFiles.forEach((marcFile) => {
          DataImport.uploadFileViaApi(
            marcFile.marc,
            marcFile.fileName,
            marcFile.jobProfileToRun,
          ).then((response) => {
            response.entries.forEach((record) => {
              testData.recordIDs.push(record[marcFile.propertyName].idList[0]);
            });
          });
        });
      });
      cy.visit(TopMenu.inventoryPath);
      InventoryInstances.searchByTitle(testData.instanceRecords[0]);
      InventoryInstances.selectInstance();
      InventoryInstance.editMarcBibliographicRecord();
      InventoryInstance.verifyAndClickLinkIcon(testData.tag);
      MarcAuthorities.switchToSearch();
      InventoryInstance.verifySelectMarcAuthorityModal();
      InventoryInstance.searchResults(testData.searchAuthorityQueries[0]);
      MarcAuthoritiesSearch.selectExcludeReferencesFilter();
      InventoryInstance.clickLinkButton();
      QuickMarcEditor.verifyAfterLinkingAuthority(testData.tag);
      QuickMarcEditor.pressSaveAndClose();
      QuickMarcEditor.checkAfterSaveAndClose();

      cy.createTempUser([Permissions.inventoryAll.gui]).then((userProperties) => {
        testData.user = userProperties;
      });
      cy.logout();
    });

    after('Delete test data', () => {
      cy.getAdminToken();
      Users.deleteViaApi(testData.user.userId);
      InventoryInstance.deleteInstanceViaApi(testData.recordIDs[0]);
      InventoryInstance.deleteInstanceViaApi(testData.recordIDs[1]);
      MarcAuthority.deleteViaAPI(testData.recordIDs[2]);
    });

    it(
      'C367973 Search for one "Instance" record by "Authority UUID" value of linked "MARC Authority" record (spitfire) (TaaS)',
      { tags: ['extendedPath', 'spitfire'] },
      () => {
        cy.login(testData.user.username, testData.user.password, {
          path: TopMenu.inventoryPath,
          waiter: InventoryInstances.waitContentLoading,
        });
        InventoryInstances.searchInstancesWithOption(
          testData.searchOptions.AUTHORITY_UUID,
          testData.recordIDs[2],
        );
        InventorySearchAndFilter.checkRowsCount(1);
        InventorySearchAndFilter.verifyInstanceDisplayed(testData.instanceRecords[0], true);
      },
    );
  });
});
