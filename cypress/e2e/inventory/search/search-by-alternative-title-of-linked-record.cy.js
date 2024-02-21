import { including } from '@interactors/html';
import { Permissions } from '../../../support/dictionary';
import DataImport from '../../../support/fragments/data_import/dataImport';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
import MarcAuthorities from '../../../support/fragments/marcAuthority/marcAuthorities';
import MarcAuthority from '../../../support/fragments/marcAuthority/marcAuthority';
import QuickMarcEditor from '../../../support/fragments/quickMarcEditor';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import { randomFourDigitNumber } from '../../../support/utils/stringTools';

const testData = {
  user: {},
  createdRecordIDs: [],
  tags: ['130', '240'],
  instanceRecords: [
    'Prayer Bible (Test record with 130 linked field).',
    'Prayer Bible (Test record with 240 linked field).',
  ],
  searchQueries: ['Bible. Polish. Biblia Płocka 1992', 'Abraham, Angela, 1958- Hosanna Bible'],
  alternativeTitles: ['Biblia Płocka', 'Hosanna Bible'],
  searchResults: [
    'Prayer Bible (Test record with 130 linked field).',
    'Prayer Bible (Test record with 240 linked field).',
    'Prayer Bible (Test record without linked field: 246).',
    'Prayer Bible (Test record without linked field: 270).',
  ],
  marcFiles: [
    {
      marc: 'marcBibC375255.mrc',
      fileName: `testMarcFileC375255.${randomFourDigitNumber()}.mrc`,
      jobProfileToRun: 'Default - Create instance and SRS MARC Bib',
      numberOfRecords: 4,
      propertyName: 'relatedInstanceInfo',
    },
    {
      marc: 'marcAuth130C375255.mrc',
      fileName: `testMarcFileAuth130C375255.${randomFourDigitNumber()}.mrc`,
      jobProfileToRun: 'Default - Create SRS MARC Authority',
      numberOfRecords: 1,
      propertyName: 'relatedAuthorityInfo',
    },
    {
      marc: 'marcAuth240C375255.mrc',
      fileName: `testMarcFileAuth240C375255.${randomFourDigitNumber()}.mrc`,
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
        InventoryInstances.getInstancesViaApi({
          limit: 100,
          query: 'title="Prayer Bible"',
        }).then((instances) => {
          if (instances) {
            instances.forEach(({ id }) => {
              InventoryInstance.deleteInstanceViaApi(id);
            });
          }
        });
        testData.searchQueries.forEach((query) => {
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
              testData.createdRecordIDs.push(record[marcFile.propertyName].idList[0]);
            });
          });
        });
      });
      cy.visit(TopMenu.inventoryPath);
      for (let i = 0; i < testData.instanceRecords.length; i++) {
        InventoryInstances.searchByTitle(testData.instanceRecords[i]);
        InventoryInstances.selectInstance();
        InventoryInstance.editMarcBibliographicRecord();
        InventoryInstance.verifyAndClickLinkIcon(testData.tags[i]);
        MarcAuthorities.switchToSearch();
        InventoryInstance.verifySelectMarcAuthorityModal();
        InventoryInstance.searchResults(testData.searchQueries[i]);
        InventoryInstance.clickLinkButton();
        QuickMarcEditor.verifyAfterLinkingAuthority(testData.tags[i]);
        QuickMarcEditor.pressSaveAndClose();
        InventoryInstance.verifyAlternativeTitle(0, 1, including(testData.alternativeTitles[i]));
        InventoryInstances.resetAllFilters();
      }
      cy.createTempUser([Permissions.inventoryAll.gui]).then((userProperties) => {
        testData.user = userProperties;
      });
      cy.logout();
    });

    after('Delete test data', () => {
      cy.getAdminToken();
      Users.deleteViaApi(testData.user.userId);
      for (let i = 0; i < 4; i++) {
        InventoryInstance.deleteInstanceViaApi(testData.createdRecordIDs[i]);
      }
      MarcAuthority.deleteViaAPI(testData.createdRecordIDs[4]);
      MarcAuthority.deleteViaAPI(testData.createdRecordIDs[5]);
    });

    it(
      'C375255 Title (all) | Search by "Alternative title" field of linked "MARC Bib" record (spitfire) (TaaS)',
      { tags: ['criticalPath', 'spitfire'] },
      () => {
        cy.login(testData.user.username, testData.user.password, {
          path: TopMenu.inventoryPath,
          waiter: InventoryInstances.waitContentLoading,
        });
        InventoryInstances.searchByTitle('Bible');
        InventorySearchAndFilter.checkRowsCount(4);
        testData.searchResults.forEach((result) => {
          InventorySearchAndFilter.verifyInstanceDisplayed(result, true);
        });
      },
    );
  });
});
