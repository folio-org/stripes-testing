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
    tag610: '610',
    authorityMarkedValue: 'C374706 Radio "Vaticana". Hrvatski program',
    subjectValue: 'C374706 Radio "Vaticana". Hrvatski program test--Congresses',
    authorityIconText: 'Linked to MARC authority',
    accordion: 'Subject',
  };

  const marcFiles = [
    {
      marc: 'marcBibFileForC374706.mrc',
      fileName: `testMarcBibFileC374706.${getRandomPostfix()}.mrc`,
      jobProfileToRun: 'Default - Create instance and SRS MARC Bib',
    },
    {
      marc: 'marcAuthFileForC374706.mrc',
      fileName: `testMarcAuthFileC374706.${getRandomPostfix()}.mrc`,
      jobProfileToRun: 'Default - Create SRS MARC Authority',
      authorityHeading: 'C374706 Radio Vaticana. Hrvatski program',
    },
  ];

  const createdRecordIDs = [];
  const bib610InitialFieldValues = [
    18,
    testData.tag610,
    '2',
    '0',
    '$a C374706 Radio Vaticana $v Congresses. $t "Vatican" $u test',
  ];
  const bib610UnlinkedFieldValues = [
    18,
    testData.tag610,
    '2',
    '0',
    '$a C374706 Radio "Vaticana". $b Hrvatski program $v Congresses. $u test $0 id.loc.gov/authorities/names/n93094742',
  ];
  const bib610LinkedFieldValues = [
    18,
    testData.tag610,
    '2',
    '0',
    '$a C374706 Radio "Vaticana". $b Hrvatski program',
    '$v Congresses. $u test',
    '$0 id.loc.gov/authorities/names/n93094742',
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
    'C374706 Link the "610" of "MARC Bib" field with "110" field of "MARC Authority" record. (spitfire) (TaaS)',
    { tags: ['extendedPath', 'spitfire'] },
    () => {
      InventoryInstances.searchByTitle(createdRecordIDs[0]);
      InventoryInstances.selectInstance();
      InventoryInstance.editMarcBibliographicRecord();
      QuickMarcEditor.verifyTagFieldAfterUnlinking(...bib610InitialFieldValues);
      InventoryInstance.verifyAndClickLinkIcon(testData.tag610);
      MarcAuthorities.switchToSearch();
      InventoryInstance.verifySelectMarcAuthorityModal();
      InventoryInstance.searchResults(marcFiles[1].authorityHeading);
      MarcAuthorities.clickLinkButton();
      QuickMarcEditor.verifyAfterLinkingAuthority(testData.tag610);
      QuickMarcEditor.verifyTagFieldAfterLinking(...bib610LinkedFieldValues);
      QuickMarcEditor.pressSaveAndClose();
      QuickMarcEditor.checkAfterSaveAndClose();
      InventoryInstance.verifyInstanceSubject(
        0,
        0,
        `${testData.authorityIconText}${testData.subjectValue}`,
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
      QuickMarcEditor.verifyTagFieldAfterLinking(...bib610LinkedFieldValues);
      QuickMarcEditor.clickUnlinkIconInTagField(bib610UnlinkedFieldValues[0]);
      QuickMarcEditor.confirmUnlinkingField();
      QuickMarcEditor.verifyTagFieldAfterUnlinking(...bib610UnlinkedFieldValues);
      QuickMarcEditor.verifyIconsAfterUnlinking(bib610UnlinkedFieldValues[0]);
      QuickMarcEditor.pressSaveAndClose();
      QuickMarcEditor.checkAfterSaveAndClose();
      InventoryInstance.checkAbsenceOfAuthorityIconInInstanceDetailPane(testData.accordion);
      InventoryInstance.viewSource();
      InventoryInstance.checkAbsenceOfAuthorityIconInMarcViewPane();
    },
  );
});
