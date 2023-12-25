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
import MarcAuthorityBrowse from '../../../../../support/fragments/marcAuthority/MarcAuthorityBrowse';

describe('Manual Linking Bib field to Authority 1XX', () => {
  const testData = {
    tag711: '711',
    contributor: 'C375082 Mostly Mozart Festival. sonet',
    linkedIconText: 'Linked to MARC authority',
    accordion: 'Contributor',
    bib711AfterUnlinking: [
      29,
      '711',
      '2',
      '\\',
      '$a C375082 Mostly Mozart Festival. $e Orchestra $t sonet $v version 1 $0 id.loc.gov/authorities/names/n81142344 $4 prf',
    ],
  };
  const marcFiles = [
    {
      marc: 'marcBibFileC375082.mrc',
      fileName: `testMarcFileC375082.${getRandomPostfix()}.mrc`,
      jobProfileToRun: 'Default - Create instance and SRS MARC Bib',
    },
    {
      marc: 'marcAuthFileC375082.mrc',
      fileName: `testMarcFileC375082.${getRandomPostfix()}.mrc`,
      jobProfileToRun: 'Default - Create SRS MARC Authority',
      searchOption: 'Name-title',
      authorityHeading: 'C375082 Mostly Mozart Festival.',
    },
  ];
  const createdRecordIDs = [];

  const bib711FieldValues = [
    29,
    testData.tag711,
    '2',
    '\\',
    '$a C375082 Mostly Festival. $e Orch. $4 prf $v version 1',
  ];
  const bib711AfterLinkingToAuth111 = [
    29,
    testData.tag711,
    '2',
    '\\',
    '$a C375082 Mostly Mozart Festival. $e Orchestra $t sonet',
    '$v version 1',
    '$0 id.loc.gov/authorities/names/n81142344',
    '$4 prf',
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
    'C375082 Link the "711" of "MARC Bib" field with "111" field of "MARC Authority" record. (spitfire) (TaaS)',
    { tags: ['extendedPath', 'spitfire'] },
    () => {
      InventoryInstances.searchByTitle(createdRecordIDs[0]);
      InventoryInstances.selectInstance();
      InventoryInstance.editMarcBibliographicRecord();
      QuickMarcEditor.verifyTagFieldAfterUnlinking(...bib711FieldValues);
      InventoryInstance.verifyAndClickLinkIcon(testData.tag711);
      MarcAuthorities.switchToSearch();
      InventoryInstance.verifySelectMarcAuthorityModal();
      MarcAuthorityBrowse.searchBy(marcFiles[1].searchOption, marcFiles[1].authorityHeading);
      InventoryInstance.clickLinkButton();
      QuickMarcEditor.verifyAfterLinkingAuthority(testData.tag711);
      QuickMarcEditor.verifyTagFieldAfterLinking(...bib711AfterLinkingToAuth111);
      QuickMarcEditor.pressSaveAndClose();
      QuickMarcEditor.checkAfterSaveAndClose();
      InventoryInstance.verifyRecordAndMarcAuthIcon(
        testData.accordion,
        `${testData.linkedIconText}\n${testData.contributor}`,
      );
      InventoryInstance.clickViewAuthorityIconDisplayedInInstanceDetailsPane(testData.accordion);
      MarcAuthorities.checkRecordDetailPageMarkedValue(marcFiles[1].authorityHeading);
      InventoryInstance.goToPreviousPage();
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
      QuickMarcEditor.checkFieldsExist([testData.tag711]);
      QuickMarcEditor.verifyTagFieldAfterLinking(...bib711AfterLinkingToAuth111);
      QuickMarcEditor.clickUnlinkIconInTagField(29);
      QuickMarcEditor.checkUnlinkModal(testData.tag711);
      QuickMarcEditor.confirmUnlinkingField();
      QuickMarcEditor.verifyTagFieldAfterUnlinking(...testData.bib711AfterUnlinking);
      QuickMarcEditor.pressSaveAndClose();
      QuickMarcEditor.checkAfterSaveAndClose();
      InventoryInstance.verifyContributor(5, 1, testData.contributor);
      InventoryInstance.checkMarcAppIconAbsent(5);
      InventoryInstance.viewSource();
      InventoryViewSource.notContains(testData.linkedIconText);
    },
  );
});
