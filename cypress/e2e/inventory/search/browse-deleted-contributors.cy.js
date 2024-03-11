import Permissions from '../../../support/dictionary/permissions';
import DataImport from '../../../support/fragments/data_import/dataImport';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
import BrowseContributors from '../../../support/fragments/inventory/search/browseContributors';
import QuickMarcEditor from '../../../support/fragments/quickMarcEditor';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import getRandomPostfix from '../../../support/utils/stringTools';

describe('inventory', () => {
  describe('Contributors Browse', () => {
    const testData = {
      contributorName: 'Snow, Jon',
      instanceTitle:
        'Anglo-Saxon manuscripts in microfiche facsimile Volume 25 Corpus Christi College, Cambridge II, MSS 12, 144, 162, 178, 188, 198, 265, 285, 322, 326, 449 microform A. N. Doane (editor and director), Matthew T. Hussey (associate editor), Phillip Pulsiano (founding editor)',
    };

    const fileName = `testMarcFile.${getRandomPostfix()}.mrc`;
    const jobProfileToRun = 'Default - Create instance and SRS MARC Bib';
    const propertyName = 'relatedInstanceInfo';

    const importedInstanceID = [];

    before('Creating user and importing record', () => {
      cy.createTempUser([
        Permissions.inventoryAll.gui,
        Permissions.moduleDataImportEnabled.gui,
        Permissions.uiQuickMarcQuickMarcBibliographicEditorAll.gui,
      ]).then((createdUserProperties) => {
        testData.userProperties = createdUserProperties;

        cy.loginAsAdmin({ path: TopMenu.dataImportPath, waiter: DataImport.waitLoading }).then(
          () => {
            DataImport.uploadFileViaApi(
              'oneMarcBib.mrc',
              fileName,
              jobProfileToRun,
            ).then((response) => {
              response.entries.forEach((record) => {
                importedInstanceID.push(record[propertyName].idList[0]);
              });
            });
          },
        );
      });
    });

    beforeEach('Login to the application', () => {
      cy.login(testData.userProperties.username, testData.userProperties.password, {
        path: TopMenu.inventoryPath,
        waiter: InventoryInstances.waitContentLoading,
      });
    });

    after('Deleting created user and record', () => {
      cy.getAdminToken();
      Users.deleteViaApi(testData.userProperties.userId);
      InventoryInstance.deleteInstanceViaApi(importedInstanceID[0]);
    });

    it(
      'C357021 Verify that deleted Contributor from "MARC Bibliographic" record not displayed at browse result list (spitfire)',
      { tags: ['criticalPath', 'spitfire'] },
      () => {
        InventoryInstances.searchByTitle(importedInstanceID[0]);
        InventoryInstances.selectInstance();
        InventoryInstance.editMarcBibliographicRecord();

        QuickMarcEditor.addEmptyFields(10);
        QuickMarcEditor.addEmptyFields(11);

        QuickMarcEditor.addValuesToExistingField(
          10,
          '100',
          '$a Snow, Jon $4 Act $e King of North',
          '\\',
          '\\',
        );
        QuickMarcEditor.addValuesToExistingField(
          11,
          '700',
          '$a Poter, Hary $4 Wit $e Wizard',
          '\\',
          '\\',
        );
        QuickMarcEditor.pressSaveAndClose();
        QuickMarcEditor.checkAfterSaveAndClose();

        InventorySearchAndFilter.switchToBrowseTab();
        BrowseContributors.select();
        BrowseContributors.searchRecordByName(testData.contributorName);
        BrowseContributors.checkSearchResultRecord(testData.contributorName);

        BrowseContributors.openRecord(testData.contributorName);
        InventoryInstance.checkInstanceButtonExistence();
        InventorySearchAndFilter.verifyInstanceDetailsView();
        InventorySearchAndFilter.verifyInstanceDisplayed(testData.instanceTitle);
        InventoryInstance.checkPresentedText(testData.instanceTitle);
        InventoryInstance.checkContributor(testData.contributorName);

        InventoryInstance.editMarcBibliographicRecord();
        QuickMarcEditor.deleteField(11);
        QuickMarcEditor.deleteField(12);
        QuickMarcEditor.pressSaveAndClose();
        QuickMarcEditor.constinueWithSaveAndCheckInstanceRecord();

        InventorySearchAndFilter.switchToBrowseTab();
        BrowseContributors.select();
        BrowseContributors.browse(testData.contributorName);
        InventorySearchAndFilter.verifySearchResult(`${testData.contributorName}would be here`);
      },
    );
  });
});
