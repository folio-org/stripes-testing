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

describe('Inventory', () => {
  describe('Search in Inventory', () => {
    const testData = {
      tag010: '010',
      tag700: '700',
      authUUIDSearchOption: 'Authority UUID',
      searchResultsC367974: [
        'C367974 Aviator / Leonardo DiCaprio, Matt Damon, Jack Nicholson, Robert De Niro, Ray Liotta, Martin Scorsese, Barbara De Fina, Brad Grey, Alan Mak, Felix Chong, Nicholas Pileggi, William Monahan.',
        'C367974 Titanic / written and directed by James Cameron.',
      ],
    };

    const marcFiles = [
      {
        marc: 'marcBibFileC367974.mrc',
        fileName: `testMarcFileC367974.${getRandomPostfix()}.mrc`,
        jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_INSTANCE_AND_SRS,
        numberOfRecords: 2,
        propertyName: 'instance',
      },
      {
        marc: 'marcAuthFileC367974.mrc',
        fileName: `testMarcFileC367974.${getRandomPostfix()}.mrc`,
        jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_AUTHORITY,
        authorityHeading: 'DiCaprio, Leonardo C367974',
        authority010FieldValue: 'n94000330367974',
        numberOfRecords: 1,
        propertyName: 'authority',
      },
    ];

    const createdRecordIDs = [];

    before('Importing data, linking Bib fields', () => {
      cy.createTempUser([Permissions.inventoryAll.gui]).then((createdUserProperties) => {
        testData.userProperties = createdUserProperties;

        cy.getAdminToken();
        marcFiles.forEach((marcFile) => {
          DataImport.uploadFileViaApi(
            marcFile.marc,
            marcFile.fileName,
            marcFile.jobProfileToRun,
          ).then((response) => {
            response.forEach((record) => {
              createdRecordIDs.push(record[marcFile.propertyName].id);
            });
          });
        });

        cy.loginAsAdmin({
          path: TopMenu.inventoryPath,
          waiter: InventoryInstances.waitContentLoading,
        }).then(() => {
          InventoryInstances.waitContentLoading();
          InventoryInstances.searchByTitle(createdRecordIDs[1]);
          InventoryInstances.selectInstance();
          // here and below - wait for detail view to be fully loaded
          cy.wait(1500);
          InventoryInstance.editMarcBibliographicRecord();
          InventoryInstance.verifyAndClickLinkIconByIndex(22);
          InventoryInstance.verifySelectMarcAuthorityModal();
          MarcAuthorities.switchToSearch();
          InventoryInstance.searchResults(marcFiles[1].authorityHeading);
          MarcAuthorities.checkFieldAndContentExistence(
            testData.tag010,
            `$a ${marcFiles[1].authority010FieldValue}`,
          );
          InventoryInstance.clickLinkButton();
          QuickMarcEditor.verifyAfterLinkingAuthorityByIndex(22, testData.tag700);
          QuickMarcEditor.pressSaveAndClose();
          QuickMarcEditor.checkAfterSaveAndClose();
          InventoryInstances.searchByTitle(createdRecordIDs[0]);
          InventoryInstances.selectInstance();
          cy.wait(1500);
          InventoryInstance.editMarcBibliographicRecord();
          InventoryInstance.verifyAndClickLinkIconByIndex(65);
          InventoryInstance.verifySelectMarcAuthorityModal();
          MarcAuthorities.switchToSearch();
          InventoryInstance.searchResults(marcFiles[1].authorityHeading);
          MarcAuthorities.checkFieldAndContentExistence(
            testData.tag010,
            `$a ${marcFiles[1].authority010FieldValue}`,
          );
          InventoryInstance.clickLinkButton();
          QuickMarcEditor.verifyAfterLinkingAuthorityByIndex(65, testData.tag700);
          QuickMarcEditor.pressSaveAndClose();
          QuickMarcEditor.checkAfterSaveAndClose();
        });
        cy.login(testData.userProperties.username, testData.userProperties.password, {
          path: TopMenu.inventoryPath,
          waiter: InventoryInstances.waitContentLoading,
        });
      });
    });

    after('Deleting user, records', () => {
      cy.getAdminToken();
      Users.deleteViaApi(testData.userProperties.userId);
      createdRecordIDs.forEach((id, index) => {
        if (index > 1) MarcAuthority.deleteViaAPI(id);
        else InventoryInstance.deleteInstanceViaApi(id);
      });
    });

    it(
      'C367974 Search for two "Instance" records by "Authority UUID" value of linked "MARC Authority" record (spitfire)',
      { tags: ['criticalPathFlaky', 'spitfire', 'C367974'] },
      () => {
        InventoryInstances.verifyInstanceSearchOptions();
        InventoryInstances.searchInstancesWithOption(
          testData.authUUIDSearchOption,
          createdRecordIDs[2],
        );
        testData.searchResultsC367974.forEach((expectedTitle) => {
          InventorySearchAndFilter.verifyInstanceDisplayed(expectedTitle);
        });
        InventorySearchAndFilter.checkRowsCount(2);
      },
    );
  });
});
