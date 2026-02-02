import { including } from '@interactors/html';
import { DEFAULT_JOB_PROFILE_NAMES, APPLICATION_NAMES } from '../../../support/constants';
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
import TopMenuNavigation from '../../../support/fragments/topMenuNavigation';

const testData = {
  user: {},
  createdRecordIDs: [],
  tags: ['130', '240'],
  instanceRecords: [
    'Prayer Bible (Test record with 130 linked field).',
    'Prayer Bible (Test record with 240 linked field).',
  ],
  searchQueries: ['Bible. Polish. Biblia Płocka 1992', 'Abraham, Angela, 1958- Hosanna Bible'],
  instanceSearchQueries: ['Prayer Bible', 'The Gospel'],
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
      jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_INSTANCE_AND_SRS,
      numberOfRecords: 4,
      propertyName: 'instance',
    },
    {
      marc: 'marcAuth130C375255.mrc',
      fileName: `testMarcFileAuth130C375255.${randomFourDigitNumber()}.mrc`,
      jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_AUTHORITY,
      numberOfRecords: 1,
      propertyName: 'authority',
    },
    {
      marc: 'marcAuth240C375255.mrc',
      fileName: `testMarcFileAuth240C375255.${randomFourDigitNumber()}.mrc`,
      jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_AUTHORITY,
      numberOfRecords: 1,
      propertyName: 'authority',
    },
  ],
};

describe('Inventory', () => {
  describe('Search in Inventory', () => {
    before('Create test data', () => {
      cy.getAdminToken();
      cy.waitForAuthRefresh(() => {
        cy.loginAsAdmin({
          path: TopMenu.dataImportPath,
          waiter: DataImport.waitLoading,
          authRefresh: true,
        });
        cy.reload();
        DataImport.waitLoading();
      }, 20_000).then(() => {
        testData.instanceSearchQueries.forEach((query) => {
          InventoryInstances.deleteFullInstancesByTitleViaApi(query);
        });
        testData.searchQueries.forEach((query) => {
          MarcAuthorities.deleteMarcAuthorityByTitleViaAPI(query);
        });
        testData.marcFiles.forEach((marcFile) => {
          DataImport.uploadFileViaApi(
            marcFile.marc,
            marcFile.fileName,
            marcFile.jobProfileToRun,
          ).then((response) => {
            response.forEach((record) => {
              testData.createdRecordIDs.push(record[marcFile.propertyName].id);
            });
          });
        });
      });
      TopMenuNavigation.openAppFromDropdown(APPLICATION_NAMES.INVENTORY);
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
    });

    after('Delete test data', () => {
      cy.getAdminToken();
      Users.deleteViaApi(testData.user.userId);
      for (let i = 0; i < 4; i++) {
        InventoryInstance.deleteInstanceViaApi(testData.createdRecordIDs[i]);
      }
      MarcAuthority.deleteViaAPI(testData.createdRecordIDs[4], true);
      MarcAuthority.deleteViaAPI(testData.createdRecordIDs[5], true);
    });

    it(
      'C375255 Title (all) | Search by "Alternative title" field of linked "MARC Bib" record (spitfire) (TaaS)',
      { tags: ['criticalPathFlaky', 'spitfire', 'C375255'] },
      () => {
        cy.login(testData.user.username, testData.user.password, {
          path: TopMenu.inventoryPath,
          waiter: InventoryInstances.waitContentLoading,
          authRefresh: true,
        });
        cy.ifConsortia(true, () => {
          InventorySearchAndFilter.byShared('No');
          InventoryInstances.waitLoading();
        });
        InventoryInstances.searchByTitle('Bible');
        testData.searchResults.forEach((result) => {
          InventorySearchAndFilter.verifyInstanceDisplayed(result, true);
        });
      },
    );
  });
});
