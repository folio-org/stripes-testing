import Permissions from '../../../../../support/dictionary/permissions';
import TopMenu from '../../../../../support/fragments/topMenu';
import Users from '../../../../../support/fragments/users/users';
import InventoryInstance from '../../../../../support/fragments/inventory/inventoryInstance';
import QuickMarcEditor from '../../../../../support/fragments/quickMarcEditor';
import InventoryInstances from '../../../../../support/fragments/inventory/inventoryInstances';
import MarcAuthorities from '../../../../../support/fragments/marcAuthority/marcAuthorities';
import DataImport from '../../../../../support/fragments/data_import/dataImport';
import Logs from '../../../../../support/fragments/data_import/logs/logs';
import JobProfiles from '../../../../../support/fragments/data_import/job_profiles/jobProfiles';
import getRandomPostfix from '../../../../../support/utils/stringTools';
import MarcAuthority from '../../../../../support/fragments/marcAuthority/marcAuthority';

describe('MARC -> MARC Bibliographic -> derive MARC bib -> Manual linking', () => {
  let userData = {};
  const testData = {
    tag700: '700',
    rowIndex: 79,
    newContent: '$a',
    createdRecordsIDs: [],
  };

  const marcFiles = [
    {
      marc: 'marcBibFileForC380758.mrc',
      fileName: `testMarcFileC380758${getRandomPostfix()}.mrc`,
      jobProfileToRun: 'Default - Create instance and SRS MARC Bib',
      numOfRecords: 1,
    },
    {
      marc: 'marcAuthFileC380758.mrc',
      fileName: `testMarcFileC380758${getRandomPostfix()}.mrc`,
      jobProfileToRun: 'Default - Create SRS MARC Authority',
      authorityHeading: 'C380758 Lee, Stan, 1922-2018',
      numOfRecords: 1,
    },
  ];

  const bib700AfterLinkingToAuth100 = [
    testData.rowIndex,
    testData.tag700,
    '1',
    '\\',
    '$a C380758 Lee, Stan, $d 1922-2018',
    '',
    '$0 id.loc.gov/authorities/names/n83169267',
    '',
  ];

  const bib700AfterUnLinkingToAuth100 = [testData.rowIndex, testData.tag700, '1', '\\', '$a'];

  before('Creating user and test data', () => {
    cy.createTempUser([
      Permissions.moduleDataImportEnabled.gui,
      Permissions.inventoryAll.gui,
      Permissions.uiMarcAuthoritiesAuthorityRecordView.gui,
      Permissions.uiQuickMarcQuickMarcEditorDuplicate.gui,
      Permissions.uiQuickMarcQuickMarcAuthorityLinkUnlink.gui,
    ]).then((createdUserProperties) => {
      userData = createdUserProperties;

      cy.loginAsAdmin().then(() => {
        marcFiles.forEach((marcFile) => {
          cy.visit(TopMenu.dataImportPath);
          DataImport.verifyUploadState();
          DataImport.uploadFileAndRetry(marcFile.marc, marcFile.fileName);
          JobProfiles.waitLoadingList();
          JobProfiles.search(marcFile.jobProfileToRun);
          JobProfiles.runImportFile();
          JobProfiles.waitFileIsImported(marcFile.fileName);
          Logs.checkStatusOfJobProfile('Completed');
          Logs.openFileDetails(marcFile.fileName);
          for (let i = 0; i < marcFile.numOfRecords; i++) {
            Logs.getCreatedItemsID(i).then((link) => {
              testData.createdRecordsIDs.push(link.split('/')[5]);
            });
          }
        });
      });

      cy.login(userData.username, userData.password, {
        path: TopMenu.inventoryPath,
        waiter: InventoryInstances.waitContentLoading,
      });
    });
  });

  after('delete test data', () => {
    cy.getAdminToken();
    Users.deleteViaApi(userData.userId);
    InventoryInstance.deleteInstanceViaApi(testData.createdRecordsIDs[0]);
    MarcAuthority.deleteViaAPI(testData.createdRecordsIDs[1]);
  });

  it(
    'C380758 Derive | Link of empty MARC Bib field with "MARC Authority" record (only $a is displayed) (spitfire) (TaaS)',
    { tags: ['extendedPath', 'spitfire'] },
    () => {
      InventoryInstances.searchByTitle(testData.createdRecordsIDs[0]);
      InventoryInstances.selectInstance();
      InventoryInstance.deriveNewMarcBib();
      QuickMarcEditor.updateExistingFieldContent(testData.rowIndex, testData.newContent);
      QuickMarcEditor.clickLinkIconInTagField(testData.rowIndex);
      MarcAuthorities.switchToSearch();
      InventoryInstance.verifySelectMarcAuthorityModal();
      InventoryInstance.searchResults(marcFiles[1].authorityHeading);
      InventoryInstance.clickLinkButton();
      QuickMarcEditor.verifyAfterLinkingUsingRowIndex(testData.tag700, testData.rowIndex);
      QuickMarcEditor.checkUnlinkTooltipText(
        testData.rowIndex,
        'Unlink from MARC Authority record',
      );
      QuickMarcEditor.checkViewMarcAuthorityTooltipText(testData.rowIndex);
      QuickMarcEditor.verifyTagFieldAfterLinking(...bib700AfterLinkingToAuth100);
      QuickMarcEditor.clickUnlinkIconInTagField(testData.rowIndex);
      QuickMarcEditor.confirmUnlinkingField();
      QuickMarcEditor.verifyTagFieldAfterUnlinking(...bib700AfterUnLinkingToAuth100);
      QuickMarcEditor.verifyTagFieldNotLinked(...bib700AfterUnLinkingToAuth100);
    },
  );
});
