import Permissions from '../../../../../support/dictionary/permissions';
import TopMenu from '../../../../../support/fragments/topMenu';
import Users from '../../../../../support/fragments/users/users';
import InventoryInstances from '../../../../../support/fragments/inventory/inventoryInstances';
import InventoryInstance from '../../../../../support/fragments/inventory/inventoryInstance';
import DataImport from '../../../../../support/fragments/data_import/dataImport';
import Logs from '../../../../../support/fragments/data_import/logs/logs';
import JobProfiles from '../../../../../support/fragments/data_import/job_profiles/jobProfiles';
import getRandomPostfix from '../../../../../support/utils/stringTools';
import MarcAuthority from '../../../../../support/fragments/marcAuthority/marcAuthority';
import MarcAuthorities from '../../../../../support/fragments/marcAuthority/marcAuthorities';
import QuickMarcEditor from '../../../../../support/fragments/quickMarcEditor';
import InventoryViewSource from '../../../../../support/fragments/inventory/inventoryViewSource';

describe('Manual Linking Bib field to Authority 1XX', () => {
  const testData = {
    tag730: '730',
    linkedIconText: 'Linked to MARC authority',
    bib730AfterUnlinking: [
      67,
      '730',
      '\\',
      '\\',
      '$a C375083 Gone with the wind $f 1939) $g (Motion picture : $w one $0 id.loc.gov/authorities/names/n79067095 $1 tre $2 test',
    ],
  };
  const marcFiles = [
    {
      marc: 'marcBibFileC375083.mrc',
      fileName: `testMarcFileC375083.${getRandomPostfix()}.mrc`,
      jobProfileToRun: 'Default - Create instance and SRS MARC Bib',
    },
    {
      marc: 'marcAuthFileC375083.mrc',
      fileName: `testMarcFileC375083.${getRandomPostfix()}.mrc`,
      jobProfileToRun: 'Default - Create SRS MARC Authority',
      authorityHeading: 'C375083 Gone with the wind (Motion picture : 1939)',
    },
  ];
  const createdRecordIDs = [];

  const bib730FieldValues = [
    67,
    testData.tag730,
    '\\',
    '\\',
    '$a C375083 The Gone with the Wind $1 tre $2 test $w one',
  ];
  const bib730AfterLinkingToAuth130 = [
    67,
    testData.tag730,
    '\\',
    '\\',
    '$a C375083 Gone with the wind $f 1939) $g (Motion picture :',
    '$w one',
    '$0 id.loc.gov/authorities/names/n79066095',
    '$1 tre $2 test',
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
    'C375083 Link the "730" of "MARC Bib" field with "130" field of "MARC Authority" record. (spitfire) (TaaS)',
    { tags: ['extendedPath', 'spitfire'] },
    () => {
      InventoryInstances.searchByTitle(createdRecordIDs[0]);
      InventoryInstances.selectInstance();
      InventoryInstance.editMarcBibliographicRecord();
      QuickMarcEditor.verifyTagFieldAfterUnlinking(...bib730FieldValues);
      InventoryInstance.verifyAndClickLinkIcon(testData.tag730);
      MarcAuthorities.switchToSearch();
      InventoryInstance.verifySelectMarcAuthorityModal();
      InventoryInstance.searchResults(marcFiles[1].authorityHeading);
      InventoryInstance.clickLinkButton();
      QuickMarcEditor.verifyAfterLinkingAuthority(testData.tag730);
      QuickMarcEditor.verifyTagFieldAfterLinking(...bib730AfterLinkingToAuth130);
      QuickMarcEditor.pressSaveAndClose();
      QuickMarcEditor.checkAfterSaveAndClose();
      InventoryInstance.waitLoading();
      InventoryInstance.viewSource();
      InventoryInstance.checkExistanceOfAuthorityIconInMarcViewPane();
      InventoryInstance.clickViewAuthorityIconDisplayedInMarcViewPane();
      MarcAuthorities.checkDetailViewIncludesText(marcFiles[1].authorityHeading);
      InventoryInstance.goToPreviousPage();
      InventoryViewSource.waitLoading();
      InventoryViewSource.close();
      InventoryInstance.waitLoading();
      InventoryInstance.editMarcBibliographicRecord();
      QuickMarcEditor.checkFieldsExist([testData.tag730]);
      QuickMarcEditor.verifyTagFieldAfterLinking(...bib730AfterLinkingToAuth130);
      QuickMarcEditor.clickUnlinkIconInTagField(67);
      QuickMarcEditor.checkUnlinkModal(testData.tag730);
      QuickMarcEditor.confirmUnlinkingField();
      QuickMarcEditor.verifyTagFieldAfterUnlinking(...testData.bib730AfterUnlinking);
      QuickMarcEditor.pressSaveAndClose();
      QuickMarcEditor.checkAfterSaveAndClose();
      InventoryInstance.viewSource();
      InventoryViewSource.notContains(testData.linkedIconText);
    },
  );
});
