import getRandomPostfix from '../../../support/utils/stringTools';
import TestTypes from '../../../support/dictionary/testTypes';
import DevTeams from '../../../support/dictionary/devTeams';
import Permissions from '../../../support/dictionary/permissions';
import TopMenu from '../../../support/fragments/topMenu';
import DataImport from '../../../support/fragments/data_import/dataImport';
import Users from '../../../support/fragments/users/users';
import JobProfiles from '../../../support/fragments/data_import/job_profiles/jobProfiles';
import Logs from '../../../support/fragments/data_import/logs/logs';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
import { JOB_STATUS_NAMES } from '../../../support/constants';
import MarcAuthority from '../../../support/fragments/marcAuthority/marcAuthority';
import MarcAuthorities from '../../../support/fragments/marcAuthority/marcAuthorities';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import QuickMarcEditor from '../../../support/fragments/quickMarcEditor';
import Parallelization from '../../../support/dictionary/parallelization';

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
      jobProfileToRun: 'Default - Create instance and SRS MARC Bib',
      numberOfRecords: 2,
    },
    {
      marc: 'marcAuthFileC367974.mrc',
      fileName: `testMarcFileC367974.${getRandomPostfix()}.mrc`,
      jobProfileToRun: 'Default - Create SRS MARC Authority',
      authorityHeading: 'DiCaprio, Leonardo C367974',
      authority010FieldValue: 'n94000330367974',
      numberOfRecords: 1,
    },
  ];

  const createdRecordIDs = [];

  before('Importing data, linking Bib fields', () => {
    cy.createTempUser([Permissions.inventoryAll.gui]).then((createdUserProperties) => {
      testData.userProperties = createdUserProperties;
      marcFiles.forEach((marcFile) => {
        cy.loginAsAdmin({ path: TopMenu.dataImportPath, waiter: DataImport.waitLoading }).then(
          () => {
            DataImport.verifyUploadState();
            DataImport.uploadFileAndRetry(marcFile.marc, marcFile.fileName);
            JobProfiles.search(marcFile.jobProfileToRun);
            JobProfiles.runImportFile();
            JobProfiles.waitFileIsImported(marcFile.fileName);
            Logs.checkStatusOfJobProfile(JOB_STATUS_NAMES.COMPLETED);
            Logs.openFileDetails(marcFile.fileName);
            for (let i = 0; i < marcFile.numberOfRecords; i++) {
              Logs.getCreatedItemsID(i).then((link) => {
                createdRecordIDs.push(link.split('/')[5]);
              });
            }
          },
        );
      });
      // linking fields in MARC Bib records
      cy.visit(TopMenu.inventoryPath).then(() => {
        InventoryInstances.waitContentLoading();
        InventoryInstance.searchByTitle(createdRecordIDs[1]);
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
          `‡a ${marcFiles[1].authority010FieldValue}`,
        );
        InventoryInstance.clickLinkButton();
        QuickMarcEditor.verifyAfterLinkingAuthorityByIndex(22, testData.tag700);
        QuickMarcEditor.pressSaveAndClose();
        QuickMarcEditor.checkAfterSaveAndClose();
        InventoryInstance.searchByTitle(createdRecordIDs[0]);
        InventoryInstances.selectInstance();
        cy.wait(1500);
        InventoryInstance.editMarcBibliographicRecord();
        InventoryInstance.verifyAndClickLinkIconByIndex(65);
        InventoryInstance.verifySelectMarcAuthorityModal();
        MarcAuthorities.switchToSearch();
        InventoryInstance.searchResults(marcFiles[1].authorityHeading);
        MarcAuthorities.checkFieldAndContentExistence(
          testData.tag010,
          `‡a ${marcFiles[1].authority010FieldValue}`,
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
    Users.deleteViaApi(testData.userProperties.userId);
    createdRecordIDs.forEach((id, index) => {
      if (index > 1) MarcAuthority.deleteViaAPI(id);
      else InventoryInstance.deleteInstanceViaApi(id);
    });
  });

  it(
    'C367974 Search for two "Instance" records by "Authority UUID" value of linked "MARC Authority" record (spitfire)',
    { tags: [TestTypes.criticalPath, DevTeams.spitfire, Parallelization.nonParallel] },
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
