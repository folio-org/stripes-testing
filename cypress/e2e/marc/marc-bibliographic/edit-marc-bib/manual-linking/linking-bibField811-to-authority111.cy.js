import { Permissions } from '../../../../../support/dictionary';
import DataImport from '../../../../../support/fragments/data_import/dataImport';
import JobProfiles from '../../../../../support/fragments/data_import/job_profiles/jobProfiles';
import Logs from '../../../../../support/fragments/data_import/logs/logs';
import InventoryInstance from '../../../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../../../support/fragments/inventory/inventoryInstances';
import InventoryViewSource from '../../../../../support/fragments/inventory/inventoryViewSource';
import MarcAuthorities from '../../../../../support/fragments/marcAuthority/marcAuthorities';
import MarcAuthority from '../../../../../support/fragments/marcAuthority/marcAuthority';
import QuickMarcEditor from '../../../../../support/fragments/quickMarcEditor';
import TopMenu from '../../../../../support/fragments/topMenu';
import Users from '../../../../../support/fragments/users/users';
import getRandomPostfix from '../../../../../support/utils/stringTools';

describe('MARC -> MARC Bibliographic -> Edit MARC bib -> Manual linking', () => {
  const testData = {
    tag811: '811',
    authorityMarkedValue: 'C375086 Delaware Symposium on Language Studies.',
    seriesValue:
      'C375086 Delaware Symposium on Language Studies. 1985 Delaware symposia on language studies 4.',
    authorityIconText: 'Linked to MARC authority',
    accordion: 'Title data',
  };

  const marcFiles = [
    {
      marc: 'marcBibFileForC375086.mrc',
      fileName: `testMarcBibFileC375071.${getRandomPostfix()}.mrc`,
      jobProfileToRun: 'Default - Create instance and SRS MARC Bib',
    },
    {
      marc: 'marcAuthFileForC375086.mrc',
      fileName: `testMarcAuthFileC375071.${getRandomPostfix()}.mrc`,
      jobProfileToRun: 'Default - Create SRS MARC Authority',
      authorityHeading: 'C375086 Delaware Symposium on Language Studies.',
    },
  ];

  const createdRecordIDs = [];
  const bib811InitialFieldValues = [
    25,
    testData.tag811,
    '2',
    '\\',
    '$a C375086 Symposium on Lang. Studies $v 4. $f 1984',
  ];
  const bib811UnlinkedFieldValues = [
    25,
    testData.tag811,
    '2',
    '\\',
    '$a C375086 Delaware Symposium on Language Studies. $f 1985 $t Delaware symposia on language studies $v 4. $0 id.loc.gov/authorities/names/n84745425',
  ];
  const bib811LinkedFieldValues = [
    25,
    testData.tag811,
    '2',
    '\\',
    '$a C375086 Delaware Symposium on Language Studies. $f 1985 $t Delaware symposia on language studies',
    '$v 4.',
    '$0 id.loc.gov/authorities/names/n84745425',
    '',
  ];

  before('Creating user', () => {
    cy.createTempUser([
      Permissions.inventoryAll.gui,
      Permissions.uiMarcAuthoritiesAuthorityRecordView.gui,
      Permissions.uiQuickMarcQuickMarcBibliographicEditorAll.gui,
      Permissions.uiQuickMarcQuickMarcAuthorityLinkUnlink.gui,
    ]).then((createdUserProperties) => {
      testData.userProperties = createdUserProperties;

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
          Logs.getCreatedItemsID().then((link) => {
            createdRecordIDs.push(link.split('/')[5]);
          });
        });
      });

      cy.login(testData.userProperties.username, testData.userProperties.password, {
        path: TopMenu.inventoryPath,
        waiter: InventoryInstances.waitContentLoading,
      });
    });
  });

  after('Deleting created user', () => {
    cy.getAdminToken();
    Users.deleteViaApi(testData.userProperties.userId);
    createdRecordIDs.forEach((id, index) => {
      if (index) MarcAuthority.deleteViaAPI(id);
      else InventoryInstance.deleteInstanceViaApi(id);
    });
  });

  it(
    'C375086 Link the "811" of "MARC Bib" field with "111" field of "MARC Authority" record. (spitfire) (TaaS)',
    { tags: ['extendedPath', 'spitfire'] },
    () => {
      InventoryInstances.searchByTitle(createdRecordIDs[0]);
      InventoryInstances.selectInstance();
      InventoryInstance.editMarcBibliographicRecord();
      QuickMarcEditor.verifyTagFieldAfterUnlinking(...bib811InitialFieldValues);
      InventoryInstance.verifyAndClickLinkIcon(testData.tag811);
      MarcAuthorities.switchToSearch();
      InventoryInstance.verifySelectMarcAuthorityModal();
      InventoryInstance.searchResults(marcFiles[1].authorityHeading);
      MarcAuthorities.clickLinkButton();
      QuickMarcEditor.verifyAfterLinkingAuthority(testData.tag811);
      QuickMarcEditor.verifyTagFieldAfterLinking(...bib811LinkedFieldValues);
      QuickMarcEditor.pressSaveAndClose();
      QuickMarcEditor.checkAfterSaveAndClose();
      InventoryInstance.verifySeriesStatement(
        0,
        `${testData.authorityIconText}${testData.seriesValue}`,
      );
      InventoryInstance.checkExistanceOfAuthorityIconInInstanceDetailPane(testData.accordion);
      InventoryInstance.clickViewAuthorityIconDisplayedInInstanceDetailsPane(testData.accordion);
      MarcAuthorities.checkDetailViewIncludesText(testData.authorityMarkedValue);
      InventoryInstance.goToPreviousPage();
      // Wait for the content to be loaded.
      cy.wait(6000);
      InventoryInstance.waitLoading();
      InventoryInstance.viewSource();
      InventoryInstance.checkExistanceOfAuthorityIconInMarcViewPane();
      InventoryInstance.clickViewAuthorityIconDisplayedInMarcViewPane();
      MarcAuthorities.checkDetailViewIncludesText(testData.authorityMarkedValue);
      InventoryInstance.goToPreviousPage();
      // Wait for the content to be loaded.
      cy.wait(6000);
      InventoryViewSource.waitLoading();
      InventoryViewSource.close();
      InventoryInstance.waitLoading();
      InventoryInstance.editMarcBibliographicRecord();
      QuickMarcEditor.verifyTagFieldAfterLinking(...bib811LinkedFieldValues);
      QuickMarcEditor.clickUnlinkIconInTagField(bib811UnlinkedFieldValues[0]);
      QuickMarcEditor.confirmUnlinkingField();
      QuickMarcEditor.verifyTagFieldAfterUnlinking(...bib811UnlinkedFieldValues);
      QuickMarcEditor.verifyIconsAfterUnlinking(bib811UnlinkedFieldValues[0]);
      QuickMarcEditor.pressSaveAndClose();
      QuickMarcEditor.checkAfterSaveAndClose();
      InventoryInstance.checkAbsenceOfAuthorityIconInInstanceDetailPane(testData.accordion);
      InventoryInstance.viewSource();
      InventoryInstance.checkAbsenceOfAuthorityIconInMarcViewPane();
    },
  );
});
