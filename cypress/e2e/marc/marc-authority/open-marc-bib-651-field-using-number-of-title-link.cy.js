import { DEFAULT_JOB_PROFILE_NAMES } from '../../../support/constants';
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
      tag: '651',
      marcValue: 'Clear Creek (Tex.) Place in Texas',
      rowIndex: 20,
      searchOption: 'Keyword',
      instanceTitle: 'Clear Creek and Clear Lake, Tex. [electronic resource].',
    };

    const marcFiles = [
      {
        marc: 'marcBibFileForC375270.mrc',
        fileName: `testMarcFile.${getRandomPostfix()}.mrc`,
        jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_INSTANCE_AND_SRS,
        propertyName: 'instance',
      },
      {
        marc: 'marcAuthFileForC375270.mrc',
        fileName: `testMarcFile.${getRandomPostfix()}.mrc`,
        jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_AUTHORITY,
        propertyName: 'authority',
      },
    ];

    const createdAuthorityIDs = [];

    before('Creating user', () => {
      cy.getAdminToken();
      cy.createTempUser([
        Permissions.inventoryAll.gui,
        Permissions.uiMarcAuthoritiesAuthorityRecordView.gui,
        Permissions.moduleDataImportEnabled.gui,
      ]).then((createdUserProperties) => {
        testData.userProperties = createdUserProperties;

        cy.getUserToken(testData.userProperties.username, testData.userProperties.password);
        marcFiles.forEach((marcFile) => {
          DataImport.uploadFileViaApi(
            marcFile.marc,
            marcFile.fileName,
            marcFile.jobProfileToRun,
          ).then((response) => {
            response.forEach((record) => {
              createdAuthorityIDs.push(record[marcFile.propertyName].id);
            });
          });
        });

        cy.loginAsAdmin({
          path: TopMenu.inventoryPath,
          waiter: InventoryInstances.waitContentLoading,
          authRefresh: true,
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
        cy.waitForAuthRefresh(() => {
          cy.login(testData.userProperties.username, testData.userProperties.password, {
            path: TopMenu.marcAuthorities,
            waiter: MarcAuthorities.waitLoading,
          });
        }, 20_000);
      });
    });

    after('Deleting created user', () => {
      cy.getAdminToken();
      Users.deleteViaApi(testData.userProperties.userId);
      InventoryInstance.deleteInstanceViaApi(createdAuthorityIDs[0]);
      createdAuthorityIDs.forEach((id, index) => {
        if (index) MarcAuthority.deleteViaAPI(id, true);
      });
    });

    it(
      'C375270 "Number of titles" link in "MARC authority" app opens linked "MARC bib" record with controlled "650" field (spitfire)',
      { tags: ['extendedPath', 'spitfire', 'C375270'] },
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
