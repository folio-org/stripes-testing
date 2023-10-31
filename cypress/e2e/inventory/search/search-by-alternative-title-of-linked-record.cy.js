import { including } from '@interactors/html';
import { DevTeams, Permissions, TestTypes } from '../../../support/dictionary';
import { randomFourDigitNumber } from '../../../support/utils/stringTools';
import TopMenu from '../../../support/fragments/topMenu';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import Users from '../../../support/fragments/users/users';
import DataImport from '../../../support/fragments/data_import/dataImport';
import JobProfiles from '../../../support/fragments/data_import/job_profiles/jobProfiles';
import Logs from '../../../support/fragments/data_import/logs/logs';
import { JOB_STATUS_NAMES } from '../../../support/constants';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
import MarcAuthorities from '../../../support/fragments/marcAuthority/marcAuthorities';
import QuickMarcEditor from '../../../support/fragments/quickMarcEditor';
import MarcAuthority from '../../../support/fragments/marcAuthority/marcAuthority';

const testData = {
  user: {},
  instanceIDs: [],
  authorityIDs: [],
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
    },
    {
      marc: 'marcAuth130C375255.mrc',
      fileName: `testMarcFileAuth130C375255.${randomFourDigitNumber()}.mrc`,
      jobProfileToRun: 'Default - Create SRS MARC Authority',
      numberOfRecords: 1,
    },
    {
      marc: 'marcAuth240C375255.mrc',
      fileName: `testMarcFileAuth240C375255.${randomFourDigitNumber()}.mrc`,
      jobProfileToRun: 'Default - Create SRS MARC Authority',
      numberOfRecords: 1,
    },
  ],
};

describe('Inventory', () => {
  describe('Search in Inventory', () => {
    before('Create test data', () => {
      cy.loginAsAdmin({ path: TopMenu.dataImportPath, waiter: DataImport.waitLoading }).then(() => {
        testData.marcFiles.forEach((marcFile) => {
          DataImport.verifyUploadState();
          DataImport.uploadFileAndRetry(marcFile.marc, marcFile.fileName);
          JobProfiles.search(marcFile.jobProfileToRun);
          JobProfiles.runImportFile();
          JobProfiles.waitFileIsImported(marcFile.fileName);
          Logs.checkStatusOfJobProfile(JOB_STATUS_NAMES.COMPLETED);
          Logs.openFileDetails(marcFile.fileName);
          for (let i = 0; i < marcFile.numberOfRecords; i++) {
            Logs.getCreatedItemsID(i).then((link) => {
              if (marcFile.jobProfileToRun === 'Default - Create instance and SRS MARC Bib') {
                testData.instanceIDs.push(link.split('/')[5]);
              } else {
                testData.authorityIDs.push(link.split('/')[5]);
              }
            });
          }
          cy.visit(TopMenu.dataImportPath);
        });
      });
      cy.visit(TopMenu.inventoryPath);
      for (let i = 0; i < testData.instanceRecords.length; i++) {
        InventoryInstance.searchByTitle(testData.instanceRecords[i]);
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
      Users.deleteViaApi(testData.user.userId);
      testData.instanceIDs.forEach((id) => {
        InventoryInstance.deleteInstanceViaApi(id);
      });
      testData.authorityIDs.forEach((id) => {
        MarcAuthority.deleteViaAPI(id);
      });
    });

    it(
      'C375255 Title (all) | Search by "Alternative title" field of linked "MARC Bib" record (spitfire) (TaaS)',
      { tags: [TestTypes.criticalPath, DevTeams.spitfire] },
      () => {
        cy.login(testData.user.username, testData.user.password, {
          path: TopMenu.inventoryPath,
          waiter: InventoryInstances.waitContentLoading,
        });
        InventoryInstance.searchByTitle('Bible');
        InventorySearchAndFilter.checkRowsCount(4);
        testData.searchResults.forEach((result) => {
          InventorySearchAndFilter.verifyInstanceDisplayed(result, true);
        });
      },
    );
  });
});
