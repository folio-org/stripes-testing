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
    tag651: '651',
    authorityMarkedValue: 'C375071 Clear Creek (Tex.)',
    subjectValue: 'C375071 Clear Creek (Tex.)--Place in Texas--Form',
    authorityIconText: 'Linked to MARC authority',
    accordion: 'Subject',
  };

  const marcFiles = [
    {
      marc: 'marcBibFileForC375071.mrc',
      fileName: `testMarcBibFileC375071.${getRandomPostfix()}.mrc`,
      jobProfileToRun: 'Default - Create instance and SRS MARC Bib',
    },
    {
      marc: 'marcAuthFileForC375071.mrc',
      fileName: `testMarcAuthFileC375071.${getRandomPostfix()}.mrc`,
      jobProfileToRun: 'Default - Create SRS MARC Authority',
      authorityHeading: 'C375071 Clear Creek (Tex.) Place in Texas',
    },
  ];

  const createdRecordIDs = [];
  const bib651InitialFieldValues = [
    20,
    testData.tag651,
    '\\',
    '0',
    '$a C375071 Creek (Texas) $g Lake $v Form $3 papers',
  ];
  const bib651UnlinkedFieldValues = [
    20,
    testData.tag651,
    '\\',
    '0',
    '$a C375071 Clear Creek (Tex.) $g Place in Texas $v Form $0 id.loc.gov/authorities/names/n79041362 $3 papers',
  ];
  const bib651LinkedFieldValues = [
    20,
    testData.tag651,
    '\\',
    '0',
    '$a C375071 Clear Creek (Tex.) $g Place in Texas',
    '$v Form',
    '$0 id.loc.gov/authorities/names/n79041362',
    '$3 papers',
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
          Logs.waitFileIsImported(marcFile.fileName);
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
    'C375071 Link the "651" of "MARC Bib" field with "151" field of "MARC Authority" record. (spitfire) (TaaS)',
    { tags: ['extendedPath', 'spitfire'] },
    () => {
      InventoryInstances.searchByTitle(createdRecordIDs[0]);
      InventoryInstances.selectInstance();
      InventoryInstance.editMarcBibliographicRecord();
      QuickMarcEditor.verifyTagFieldAfterUnlinking(...bib651InitialFieldValues);
      InventoryInstance.verifyAndClickLinkIcon(testData.tag651);
      MarcAuthorities.switchToSearch();
      InventoryInstance.verifySelectMarcAuthorityModal();
      InventoryInstance.searchResults(marcFiles[1].authorityHeading);
      MarcAuthorities.clickLinkButton();
      QuickMarcEditor.verifyAfterLinkingAuthority(testData.tag651);
      QuickMarcEditor.verifyTagFieldAfterLinking(...bib651LinkedFieldValues);
      QuickMarcEditor.pressSaveAndClose();
      QuickMarcEditor.checkAfterSaveAndClose();
      InventoryInstance.verifyInstanceSubject(
        2,
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
      QuickMarcEditor.verifyTagFieldAfterLinking(...bib651LinkedFieldValues);
      QuickMarcEditor.clickUnlinkIconInTagField(bib651UnlinkedFieldValues[0]);
      QuickMarcEditor.confirmUnlinkingField();
      QuickMarcEditor.verifyTagFieldAfterUnlinking(...bib651UnlinkedFieldValues);
      QuickMarcEditor.verifyIconsAfterUnlinking(bib651UnlinkedFieldValues[0]);
      QuickMarcEditor.pressSaveAndClose();
      QuickMarcEditor.checkAfterSaveAndClose();
      InventoryInstance.checkAbsenceOfAuthorityIconInInstanceDetailPane(testData.accordion);
      InventoryInstance.viewSource();
      InventoryInstance.checkAbsenceOfAuthorityIconInMarcViewPane();
    },
  );
});
