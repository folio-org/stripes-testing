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
import Users from '../../../../../support/fragments/users/users';
import getRandomPostfix from '../../../../../support/utils/stringTools';

describe('Manual Unlinking Bib field from Authority 1XX', () => {
  const testData = {
    tag100: '100',
    createdRecordIDs: [],
    bib100AfterLinkingToAuth100: [
      11,
      '100',
      '1',
      '\\',
      '$a C366578 Chin, Staceyann, $d 1972-',
      '$e Author $e Narrator',
      '$0 id.loc.gov/authorities/names/n2008052404',
      '$1 http://viaf.org/viaf/24074052',
    ],
    bib100AfterUnlinking: [
      11,
      '100',
      '1',
      '\\',
      '$a C366578 Chin, Staceyann, $d 1972- $e Author $e Narrator $0 id.loc.gov/authorities/names/n2008052404 $1 http://viaf.org/viaf/24074052',
    ],
    contributorName: 'C366578 Chin, Staceyann,',
  };

  const marcFiles = [
    {
      marc: 'marcBibFileForC366578.mrc',
      fileName: `C366578 testMarcFile${getRandomPostfix()}.mrc`,
      jobProfileToRun: 'Default - Create instance and SRS MARC Bib',
      numOfRecords: 1,
    },
    {
      marc: 'marcAuthFileForC366578.mrc',
      fileName: `C366578 testMarcFile${getRandomPostfix()}.mrc`,
      jobProfileToRun: 'Default - Create SRS MARC Authority',
      numOfRecords: 1,
    },
  ];

  const linkingTagAndValue = {
    rowIndex: 11,
    value: 'C366578 Chin, Staceyann,',
    tag: 100,
  };

  before('Creating user and records', () => {
    // make sure there are no duplicate authority records in the system
    cy.getAdminToken().then(() => {
      MarcAuthorities.getMarcAuthoritiesViaApi({ limit: 100, query: 'keyword="C366578"' }).then(
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
      Permissions.uiQuickMarcQuickMarcBibliographicEditorAll.gui,
      Permissions.uiQuickMarcQuickMarcAuthorityLinkUnlink.gui,
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

  after('Deleting created user and records', () => {
    cy.getAdminToken();
    Users.deleteViaApi(testData.user.userId);
    InventoryInstance.deleteInstanceViaApi(testData.createdRecordIDs[0]);
    testData.createdRecordIDs.forEach((id, index) => {
      if (index) MarcAuthority.deleteViaAPI(id);
    });
  });

  it(
    'C366578 Delete unlinked field of "MARC Bib" record in editing window (spitfire) (TaaS)',
    { tags: ['extendedPath', 'spitfire'] },
    () => {
      InventoryInstances.searchByTitle(testData.createdRecordIDs[0]);
      InventoryInstances.selectInstance();
      InventoryInstance.editMarcBibliographicRecord();
      QuickMarcEditor.verifyTagFieldAfterLinking(...testData.bib100AfterLinkingToAuth100);
      QuickMarcEditor.clickUnlinkIconInTagField(linkingTagAndValue.rowIndex);
      QuickMarcEditor.confirmUnlinkingField();
      QuickMarcEditor.verifyTagFieldAfterUnlinking(...testData.bib100AfterUnlinking);
      QuickMarcEditor.checkLinkButtonExist(testData.tag100);
      QuickMarcEditor.checkButtonsEnabled();
      QuickMarcEditor.deleteField(linkingTagAndValue.rowIndex);
      QuickMarcEditor.afterDeleteNotification(testData.tag100);
      QuickMarcEditor.clickSaveAndCloseThenCheck(1);
      QuickMarcEditor.constinueWithSaveAndCheckInstanceRecord();
      InventoryInstance.verifyContributorAbsent(testData.contributorName);
    },
  );
});
