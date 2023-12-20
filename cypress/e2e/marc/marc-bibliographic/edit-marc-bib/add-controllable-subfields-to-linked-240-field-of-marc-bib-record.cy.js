import Permissions from '../../../../support/dictionary/permissions';
import TopMenu from '../../../../support/fragments/topMenu';
import DataImport from '../../../../support/fragments/data_import/dataImport';
import Users from '../../../../support/fragments/users/users';
import JobProfiles from '../../../../support/fragments/data_import/job_profiles/jobProfiles';
import Logs from '../../../../support/fragments/data_import/logs/logs';
import QuickMarcEditor from '../../../../support/fragments/quickMarcEditor';
import getRandomPostfix from '../../../../support/utils/stringTools';
import InventoryInstances from '../../../../support/fragments/inventory/inventoryInstances';
import InventoryInstance from '../../../../support/fragments/inventory/inventoryInstance';
import { JOB_STATUS_NAMES } from '../../../../support/constants';
import MarcAuthority from '../../../../support/fragments/marcAuthority/marcAuthority';
import MarcAuthorities from '../../../../support/fragments/marcAuthority/marcAuthorities';
import InventorySearchAndFilter from '../../../../support/fragments/inventory/inventorySearchAndFilter';

describe('MARC -> MARC Bibliographic -> Edit MARC bib', () => {
  const testData = {
    tagForLinking: '240',
    marcBibTitle: 'Variations / Ludwig Van Beethoven.',
    searchOption: 'Keyword (title, contributor, identifier, HRID, UUID)',
    marcAuthTitle: 'Variations',
    errorCalloutMessage:
      'MARC 240 has a subfield(s) that cannot be saved because the field is controlled by an authority record.',
  };
  const marcFiles = [
    {
      marc: 'marcBibFileForC376598.mrc',
      fileName: `testMarcBibFileC376598.${getRandomPostfix()}.mrc`,
      jobProfileToRun: 'Default - Create instance and SRS MARC Bib',
    },
    {
      marc: 'marcAuthFileForC376598.mrc',
      fileName: `testMarcAuthFileC376598.${getRandomPostfix()}.mrc`,
      jobProfileToRun: 'Default - Create SRS MARC Authority',
    },
  ];

  const createdRecordIDs = [];

  before('Create test data', () => {
    cy.createTempUser([
      Permissions.inventoryAll.gui,
      Permissions.uiQuickMarcQuickMarcBibliographicEditorAll.gui,
    ]).then((createdUserProperties) => {
      testData.userProperties = createdUserProperties;

      marcFiles.forEach((marcFile) => {
        cy.loginAsAdmin({ path: TopMenu.dataImportPath, waiter: DataImport.waitLoading }).then(
          () => {
            DataImport.verifyUploadState();
            DataImport.uploadFileAndRetry(marcFile.marc, marcFile.fileName);
            JobProfiles.waitLoadingList();
            JobProfiles.search(marcFile.jobProfileToRun);
            JobProfiles.runImportFile();
            JobProfiles.waitFileIsImported(marcFile.fileName);
            Logs.checkStatusOfJobProfile(JOB_STATUS_NAMES.COMPLETED);
            Logs.openFileDetails(marcFile.fileName);
            Logs.getCreatedItemsID().then((link) => {
              createdRecordIDs.push(link.split('/')[5]);
            });
          },
        );
      });
      cy.loginAsAdmin({
        path: TopMenu.inventoryPath,
        waiter: InventoryInstances.waitContentLoading,
      }).then(() => {
        InventorySearchAndFilter.selectSearchOptions(testData.searchOption, testData.marcBibTitle);
        InventorySearchAndFilter.clickSearch();
        InventoryInstances.selectInstanceById(createdRecordIDs[0]);
        InventoryInstance.waitLoading();
        InventoryInstance.editMarcBibliographicRecord();
        InventoryInstance.verifyAndClickLinkIcon(testData.tagForLinking);
        MarcAuthorities.switchToSearch();
        cy.wait(1000); // need to wait for choose Type of Heading
        MarcAuthorities.chooseTypeOfHeading('Conference Name');
        InventoryInstance.searchResults(testData.marcAuthTitle);
        InventoryInstance.selectRecord();
        MarcAuthorities.clickLinkButton();
        QuickMarcEditor.verifyAfterLinkingAuthority(testData.tagForLinking);
        QuickMarcEditor.pressSaveAndClose();
        cy.wait(1000); // need to wait until save is done
      });
      cy.login(testData.userProperties.username, testData.userProperties.password, {
        path: TopMenu.inventoryPath,
        waiter: InventoryInstances.waitContentLoading,
      });
    });
  });

  after('Delete test data', () => {
    cy.getAdminToken(() => {
      Users.deleteViaApi(testData.userProperties.userId);
    });
    createdRecordIDs.forEach((id, index) => {
      if (index) MarcAuthority.deleteViaAPI(id);
      else InventoryInstance.deleteInstanceViaApi(id);
    });
  });

  it(
    'C376598 Add controllable subfields to linked "240" field of a "MARC bib" record (linked to "111" field of "MARC authority" record) (spitfire) (TaaS)',
    { tags: ['extendedPath', 'spitfire'] },
    () => {
      InventorySearchAndFilter.selectSearchOptions(testData.searchOption, testData.marcBibTitle);
      InventorySearchAndFilter.clickSearch();
      InventoryInstances.selectInstanceById(createdRecordIDs[0]);
      InventoryInstance.waitLoading();
      InventoryInstance.editMarcBibliographicRecord();
      QuickMarcEditor.updateLinkedFifthBox(18, '$n test');
      cy.wait(500); // need wait until changes appear
      QuickMarcEditor.pressSaveAndKeepEditing(testData.errorCalloutMessage);
      QuickMarcEditor.updateLinkedFifthBox(18, '$f test');
      QuickMarcEditor.pressSaveAndKeepEditing(testData.errorCalloutMessage);
      QuickMarcEditor.updateLinkedFifthBox(18, '$h test');
      QuickMarcEditor.pressSaveAndKeepEditing(testData.errorCalloutMessage);
      QuickMarcEditor.updateLinkedFifthBox(18, '$k test');
      QuickMarcEditor.pressSaveAndKeepEditing(testData.errorCalloutMessage);
      QuickMarcEditor.updateLinkedFifthBox(18, '$l test');
      QuickMarcEditor.pressSaveAndKeepEditing(testData.errorCalloutMessage);
      QuickMarcEditor.updateLinkedFifthBox(18, '$p test');
      QuickMarcEditor.pressSaveAndKeepEditing(testData.errorCalloutMessage);
      QuickMarcEditor.updateLinkedFifthBox(18, '$s test');
      QuickMarcEditor.pressSaveAndKeepEditing(testData.errorCalloutMessage);
      QuickMarcEditor.updateLinkedFifthBox(18, '$g test');
      QuickMarcEditor.pressSaveAndKeepEditing(testData.errorCalloutMessage);
      QuickMarcEditor.updateLinkedFifthBox(18, '$d test');
      QuickMarcEditor.pressSaveAndKeepEditing(testData.errorCalloutMessage);
    },
  );
});
