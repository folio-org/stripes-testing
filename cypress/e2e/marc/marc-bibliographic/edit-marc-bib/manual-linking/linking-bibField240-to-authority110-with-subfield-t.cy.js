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

describe('Manual Linking Bib field to Authority 1XX', () => {
  const testData = {
    tag100: '110',
    tag240: '240',
    newTag240Content: '$a C374111 Testing $g European Economic Community, $d 1977 Jan. 18',
    authority110FieldValue: 'C374111 Egypt.',
    authorityIconText: 'Linked to MARC authority',
    calloutMessage:
      'This record has successfully saved and is in process. Changes may not appear immediately.',
    accordion: 'Title data',
  };

  const marcFiles = [
    {
      marc: 'marcBibFileC374111.mrc',
      fileName: `testMarcFileC374111${getRandomPostfix()}.mrc`,
      jobProfileToRun: 'Default - Create instance and SRS MARC Bib',
      numOfRecords: 1,
      instanceAlternativeTitle:
        'Treaties, etc. Israel, 1978 September 17 (Framework for Peace in the Middle East)',
    },
    {
      marc: 'marcAuthFileC374111.mrc',
      fileName: `testMarcFileC374111${getRandomPostfix()}.mrc`,
      jobProfileToRun: 'Default - Create SRS MARC Authority',
      numOfRecords: 1,
    },
  ];
  const bib240AfterLinkingToAuth110 = [
    11,
    testData.tag240,
    '1',
    '0',
    '$a Treaties, etc. $g Israel, $d 1978 September 17 (Framework for Peace in the Middle East)',
    '',
    '$0 id.loc.gov/authorities/names/n91006627',
    '',
  ];
  const bib240AfterUninkingToAuth110 = [
    11,
    testData.tag240,
    '1',
    '0',
    '$a Treaties, etc. $g Israel, $d 1978 September 17 (Framework for Peace in the Middle East) $0 id.loc.gov/authorities/names/n91006627',
  ];

  const createdAuthorityIDs = [];

  before('Creating user', () => {
    cy.createTempUser([
      Permissions.inventoryAll.gui,
      Permissions.uiMarcAuthoritiesAuthorityRecordView.gui,
      Permissions.uiQuickMarcQuickMarcAuthoritiesEditorAll.gui,
      Permissions.uiQuickMarcQuickMarcBibliographicEditorAll.gui,
      Permissions.uiQuickMarcQuickMarcAuthorityLinkUnlink.gui,
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
            Logs.checkStatusOfJobProfile('Completed');
            Logs.openFileDetails(marcFile.fileName);
            for (let i = 0; i < marcFile.numOfRecords; i++) {
              Logs.getCreatedItemsID(i).then((link) => {
                createdAuthorityIDs.push(link.split('/')[5]);
              });
            }
          },
        );
      });
      cy.login(testData.userProperties.username, testData.userProperties.password, {
        path: TopMenu.inventoryPath,
        waiter: InventoryInstances.waitContentLoading,
      });
    });
  });

  after('Deleting created user', () => {
    cy.getAdminToken().then(() => {
      Users.deleteViaApi(testData.userProperties.userId);
      InventoryInstance.deleteInstanceViaApi(createdAuthorityIDs[0]);
      createdAuthorityIDs.forEach((id, index) => {
        if (index) MarcAuthority.deleteViaAPI(id);
      });
    });
  });

  it(
    'C374111 Link the "240" of "MARC Bib" field with "110" field with a $t of "MARC Authority" record. (spitfire) (TaaS)',
    { tags: ['extendedPath', 'spitfire'] },
    () => {
      InventoryInstance.searchByTitle(createdAuthorityIDs[0]);
      InventoryInstances.selectInstance();
      InventoryInstance.editMarcBibliographicRecord();
      QuickMarcEditor.updateExistingField(testData.tag240, testData.newTag240Content);
      QuickMarcEditor.checkContent(testData.newTag240Content, 11);
      InventoryInstance.verifyAndClickLinkIcon(testData.tag240);
      MarcAuthorities.switchToSearch();
      InventoryInstance.verifySelectMarcAuthorityModal();
      InventoryInstance.verifySearchOptions();
      InventoryInstance.searchResults(testData.authority110FieldValue);
      InventoryInstance.clickLinkButton();
      QuickMarcEditor.verifyAfterLinkingAuthority(testData.tag240);
      QuickMarcEditor.checkUnlinkTooltipText(testData.tag240, 'Unlink from MARC Authority record');
      QuickMarcEditor.checkViewMarcAuthorityTooltipText(bib240AfterLinkingToAuth110[0]);
      QuickMarcEditor.verifyTagFieldAfterLinking(...bib240AfterLinkingToAuth110);
      QuickMarcEditor.pressSaveAndClose();
      QuickMarcEditor.checkAfterSaveAndClose();
      InventoryInstance.waitInventoryLoading();
      InventoryInstance.verifyAlternativeTitle(
        0,
        1,
        `${testData.authorityIconText}${marcFiles[0].instanceAlternativeTitle}`,
      );
      InventoryInstance.clickViewAuthorityIconDisplayedInInstanceDetailsPane(testData.accordion);
      MarcAuthorities.checkRecordDetailPageMarkedValue(testData.authority110FieldValue);

      cy.visit(TopMenu.inventoryPath);
      InventoryInstance.searchByTitle(createdAuthorityIDs[0]);
      InventoryInstances.selectInstance();
      InventoryInstance.editMarcBibliographicRecord();
      QuickMarcEditor.verifyTagFieldAfterLinking(...bib240AfterLinkingToAuth110);
      QuickMarcEditor.clickUnlinkIconInTagField(11);
      QuickMarcEditor.confirmUnlinkingField();
      QuickMarcEditor.verifyTagFieldAfterUnlinking(...bib240AfterUninkingToAuth110);
      QuickMarcEditor.pressSaveAndKeepEditing(testData.calloutMessage);
      QuickMarcEditor.verifyTagFieldAfterUnlinking(...bib240AfterUninkingToAuth110);
    },
  );
});
