import Permissions from '../../../../support/dictionary/permissions';
import DataImport from '../../../../support/fragments/data_import/dataImport';
import InventoryInstance from '../../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../../support/fragments/inventory/inventoryInstances';
import MarcAuthorities from '../../../../support/fragments/marcAuthority/marcAuthorities';
import MarcAuthority from '../../../../support/fragments/marcAuthority/marcAuthority';
import TopMenu from '../../../../support/fragments/topMenu';
import Users from '../../../../support/fragments/users/users';
import getRandomPostfix from '../../../../support/utils/stringTools';

describe('MARC', () => {
  describe('plug-in MARC authority', () => {
    describe('plug-in MARC authority | Search', () => {
      const testData = {
        forC359233: {
          searchOptionA: "Children's subject heading",
          searchOptionB: 'Name-title',
          value: 'C359233María de Jesús, de Agreda, sister, 1602-1665',
          valueInDetailView: '$a C359233María de Jesús, $c de Agreda, sister, $d 1602-1665',
          markedValue: 'C359233María de Jesús,',
          noResults:
            'No results found for "C359233María de Jesús, de Agreda, sister, 1602-1665". Please check your spelling and filters.',
        },
      };

      const marcFiles = [
        {
          marc: 'oneMarcBib.mrc',
          fileName: `testMarcFile.${getRandomPostfix()}.mrc`,
          jobProfileToRun: 'Default - Create instance and SRS MARC Bib',
          numOfRecords: 1,
          propertyName: 'relatedInstanceInfo',
        },
        {
          marc: 'marcFileForC359233.mrc',
          fileName: `testMarcFile.${getRandomPostfix()}.mrc`,
          jobProfileToRun: 'Default - Create SRS MARC Authority',
          numOfRecords: 1,
          propertyName: 'relatedAuthorityInfo',
        },
      ];

      const createdAuthorityIDs = [];

      before('Creating user', () => {
        cy.createTempUser([
          Permissions.inventoryAll.gui,
          Permissions.uiMarcAuthoritiesAuthorityRecordView.gui,
          Permissions.uiQuickMarcQuickMarcAuthoritiesEditorAll.gui,
          Permissions.uiQuickMarcQuickMarcBibliographicEditorAll.gui,
          Permissions.uiQuickMarcQuickMarcAuthorityLinkUnlink.gui,
        ]).then((createdUserProperties) => {
          testData.userProperties = createdUserProperties;

          cy.getAdminToken();
          marcFiles.forEach((marcFile) => {
            DataImport.uploadFileViaApi(
              marcFile.marc,
              marcFile.fileName,
              marcFile.jobProfileToRun,
            ).then((response) => {
              response.entries.forEach((record) => {
                createdAuthorityIDs.push(record[marcFile.propertyName].idList[0]);
              });
            });
          });
        });
      });

      beforeEach('Login to the application', () => {
        cy.login(testData.userProperties.username, testData.userProperties.password, {
          path: TopMenu.inventoryPath,
          waiter: InventoryInstances.waitContentLoading,
        });
      });

      after('Deleting created user', () => {
        cy.getAdminToken();
        Users.deleteViaApi(testData.userProperties.userId);
        InventoryInstance.deleteInstanceViaApi(createdAuthorityIDs[0]);
        createdAuthorityIDs.forEach((id, index) => {
          if (index) MarcAuthority.deleteViaAPI(id);
        });
      });

      it(
        'C359233 MARC Authority plug-in | Search using "Children\'s subject heading" option (spitfire)',
        { tags: ['criticalPath', 'spitfire'] },
        () => {
          InventoryInstances.searchByTitle(createdAuthorityIDs[0]);
          InventoryInstances.selectInstance();
          InventoryInstance.editMarcBibliographicRecord();
          InventoryInstance.verifyAndClickLinkIcon('700');
          MarcAuthorities.switchToSearch();
          InventoryInstance.verifySearchOptions();
          MarcAuthorities.searchBy(testData.forC359233.searchOptionA, testData.forC359233.value);
          MarcAuthorities.checkFieldAndContentExistence(
            '100',
            testData.forC359233.valueInDetailView,
          );
          MarcAuthorities.checkRecordDetailPageMarkedValue(testData.forC359233.markedValue);
          MarcAuthorities.searchBy(testData.forC359233.searchOptionB, testData.forC359233.value);
          MarcAuthorities.checkNoResultsMessage(testData.forC359233.noResults);
        },
      );
    });
  });
});
