import Permissions from '../../../support/dictionary/permissions';
import DataImport from '../../../support/fragments/data_import/dataImport';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
import MarcAuthorities from '../../../support/fragments/marcAuthority/marcAuthorities';
import MarcAuthority from '../../../support/fragments/marcAuthority/marcAuthority';
import QuickMarcEditor from '../../../support/fragments/quickMarcEditor';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import getRandomPostfix from '../../../support/utils/stringTools';

describe('MARC', () => {
  describe('MARC Authority', () => {
    const testData = {
      tag: '650',
      marcValue: 'Speaking Oratory debating',
      rowIndex: 15,
      searchOption: 'Keyword',
      instanceTitle:
        'Abraham Lincoln, by Lillian Hertz. Prize essay in Alexander Hamilton junior high school P.S. 186, June 24, 1927.',
    };

    const marcFiles = [
      {
        marc: 'marcBibFileForC375271.mrc',
        fileName: `testMarcFile.${getRandomPostfix()}.mrc`,
        jobProfileToRun: 'Default - Create instance and SRS MARC Bib',
        propertyName: 'relatedInstanceInfo',
      },
      {
        marc: 'marcAuthFileForC375271.mrc',
        fileName: `testMarcFile.${getRandomPostfix()}.mrc`,
        jobProfileToRun: 'Default - Create SRS MARC Authority',
        propertyName: 'relatedAuthorityInfo',
      },
    ];

    const createdAuthorityIDs = [];

    before('Creating user', () => {
      cy.createTempUser([
        Permissions.inventoryAll.gui,
        Permissions.uiMarcAuthoritiesAuthorityRecordView.gui,
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

        cy.loginAsAdmin({
          path: TopMenu.inventoryPath,
          waiter: InventoryInstances.waitContentLoading,
        }).then(() => {
          InventoryInstances.waitContentLoading();
          InventoryInstances.searchByTitle(createdAuthorityIDs[0]);
          InventoryInstances.selectInstance();
          InventoryInstance.editMarcBibliographicRecord();
          QuickMarcEditor.clickLinkIconInTagField(testData.rowIndex);
          MarcAuthorities.switchToSearch();
          InventoryInstance.verifySelectMarcAuthorityModal();
          InventoryInstance.verifySearchOptions();
          InventoryInstance.searchResults(testData.marcValue);
          InventoryInstance.clickLinkButton();
          QuickMarcEditor.verifyAfterLinkingUsingRowIndex(testData.tag, testData.rowIndex);
          QuickMarcEditor.pressSaveAndClose();
          QuickMarcEditor.checkAfterSaveAndClose();
        });

        cy.login(testData.userProperties.username, testData.userProperties.password, {
          path: TopMenu.marcAuthorities,
          waiter: MarcAuthorities.waitLoading,
        });
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
      'C375271 "Number of titles" link in "MARC authority" app opens linked "MARC bib" record with controlled "650" field (spitfire)',
      { tags: ['criticalPath', 'spitfire'] },
      () => {
        MarcAuthorities.searchByParameter(testData.searchOption, testData.marcValue);
        MarcAuthorities.checkRow(testData.marcValue);
        MarcAuthorities.verifyNumberOfTitles(5, '1');
        MarcAuthorities.clickOnNumberOfTitlesLink(5, '1');
        InventorySearchAndFilter.verifySearchResult(testData.instanceTitle);
        InventoryInstance.checkPresentedText(testData.instanceTitle);
      },
    );
  });
});
