import Permissions from '../../../../../support/dictionary/permissions';
import DataImport from '../../../../../support/fragments/data_import/dataImport';
import JobProfiles from '../../../../../support/fragments/data_import/job_profiles/jobProfiles';
import Logs from '../../../../../support/fragments/data_import/logs/logs';
import InventoryInstance from '../../../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../../../support/fragments/inventory/inventoryInstances';
import MarcAuthorities from '../../../../../support/fragments/marcAuthority/marcAuthorities';
import MarcAuthority from '../../../../../support/fragments/marcAuthority/marcAuthority';
import QuickMarcEditor from '../../../../../support/fragments/quickMarcEditor';
import TopMenu from '../../../../../support/fragments/topMenu';
// import Users from '../../../../../support/fragments/users/users';
import getRandomPostfix from '../../../../../support/utils/stringTools';
import InstanceRecordView from '../../../../../support/fragments/inventory/instanceRecordView';

describe('MARC -> MARC Bibliographic -> derive MARC bib -> Manual linking', () => {
  const testData = {
    tag100: '100',
    createdRecordIDs: [],
    bib100AfterLinkingToAuth100: [
      33,
      '100',
      '1',
      '\\',
      '$a C366577 Coates, Ta-Nehisi',
      '$e author.',
      '$0 id.loc.gov/authorities/names/n2008001084',
      '',
    ],
    marcAuthIcon: 'Linked to MARC authority',
    contributorName: 'C366577 Coates, Ta-Nehisi',
  };

  const marcFiles = [
    {
      marc: 'marcBibFileForC366577.mrc',
      fileName: `C366577 testMarcFile${getRandomPostfix()}.mrc`,
      jobProfileToRun: 'Default - Create instance and SRS MARC Bib',
      numOfRecords: 1,
    },
    {
      marc: 'marcAuthFileForC366577.mrc',
      fileName: `C366577 testMarcFile${getRandomPostfix()}.mrc`,
      jobProfileToRun: 'Default - Create SRS MARC Authority',
      numOfRecords: 1,
    },
  ];

  const linkingTagAndValue = {
    rowIndex: 33,
    value: 'C366577 Coates, Ta-Nehisi',
    tag: 100,
  };

  before('Creating user and records', () => {
    // make sure there are no duplicate authority records in the system
    cy.getAdminToken().then(() => {
      MarcAuthorities.getMarcAuthoritiesViaApi({ limit: 100, query: 'keyword="C366577"' }).then(
        (records) => {
          records.forEach((record) => {
            if (record.authRefType === 'Authorized') {
              MarcAuthority.deleteViaAPI(record.id);
            }
          });
        },
      );
    });
    cy.loginAsAdmin();
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
          testData.createdRecordIDs.push(link.split('/')[5]);
        });
      }
    });

    cy.createTempUser([
      Permissions.moduleDataImportEnabled.gui,
      Permissions.inventoryAll.gui,
      Permissions.uiMarcAuthoritiesAuthorityRecordView.gui,
      Permissions.uiQuickMarcQuickMarcEditorDuplicate.gui,
    ]).then((userProperties) => {
      testData.user = userProperties;

      cy.visit(TopMenu.inventoryPath).then(() => {
        InventoryInstances.searchByTitle(testData.createdRecordIDs[0]);
        InventoryInstances.selectInstance();
        InventoryInstance.editMarcBibliographicRecord();
        QuickMarcEditor.clickLinkIconInTagField(linkingTagAndValue.rowIndex);
        MarcAuthorities.switchToSearch();
        InventoryInstance.verifySelectMarcAuthorityModal();
        InventoryInstance.verifySearchOptions();
        InventoryInstance.searchResults(linkingTagAndValue.value);
        InventoryInstance.clickLinkButton();
        QuickMarcEditor.verifyAfterLinkingUsingRowIndex(
          linkingTagAndValue.tag,
          linkingTagAndValue.rowIndex,
        );
        QuickMarcEditor.pressSaveAndClose();
        QuickMarcEditor.checkAfterSaveAndClose();
      });

      cy.login(testData.user.username, testData.user.password, {
        path: TopMenu.inventoryPath,
        waiter: InventoryInstances.waitContentLoading,
      });
    });
  });

  // after('Deleting created user and records', () => {
  //   cy.getAdminToken();
  //   Users.deleteViaApi(testData.user.userId);
  //   InventoryInstance.deleteInstanceViaApi(testData.createdRecordIDs[0]);
  //   testData.createdRecordIDs.forEach((id, index) => {
  //     if (index) MarcAuthority.deleteViaAPI(id);
  //   });
  // });

  it(
    'C366577 Derive | Restore deleted and saved linked field of "MARC Bib" record in deriving window (spitfire) (TaaS)',
    { tags: ['extendedPath', 'spitfire'] },
    () => {
      InventoryInstances.searchByTitle(testData.createdRecordIDs[0]);
      InventoryInstances.selectInstance();
      InventoryInstance.deriveNewMarcBibRecord();
      // QuickMarcEditor.checkButtonSaveAndCloseEnable();
      QuickMarcEditor.verifyTagFieldAfterLinking(...testData.bib100AfterLinkingToAuth100);
      QuickMarcEditor.deleteField(33);
      QuickMarcEditor.afterDeleteNotification(testData.tag100);
      QuickMarcEditor.undoDelete();
      QuickMarcEditor.verifyTagValue(33, testData.tag100);
      QuickMarcEditor.deleteField(33);
      QuickMarcEditor.afterDeleteNotification(testData.tag100);
      QuickMarcEditor.clickSaveAndCloseThenCheck(1);
      QuickMarcEditor.checkDeletingFieldsModal();
      QuickMarcEditor.clickRestoreDeletedField();
      QuickMarcEditor.checkDeleteModalClosed();
      QuickMarcEditor.verifyTagValue(33, testData.tag100);
      QuickMarcEditor.pressSaveAndClose();
      QuickMarcEditor.checkAfterSaveAndClose();
      InstanceRecordView.verifyInstancePaneExists();
      InventoryInstance.verifyContributor(
        0,
        1,
        `${testData.marcAuthIcon}${testData.contributorName}`,
      );
    },
  );
});
