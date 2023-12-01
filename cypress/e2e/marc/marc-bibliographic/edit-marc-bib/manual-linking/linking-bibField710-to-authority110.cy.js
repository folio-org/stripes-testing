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
import { JOB_STATUS_NAMES } from '../../../../../support/constants';
import InventoryViewSource from '../../../../../support/fragments/inventory/inventoryViewSource';

describe('Manual Linking Bib field to Authority 1XX', () => {
  const testData = {
    tag710: '710',
    contributor: 'C375081 Carleton University. Anthropology Caucus 2023-',
    linkedIconText: 'Linked to MARC authority',
    accordion: 'Contributor',
    bib710AfterUnlinking: [
      26,
      '710',
      '2',
      '0',
      '$a C375081 Carleton University. $b Anthropology Caucus $d 2023- $e term. $0 id.loc.gov/authorities/names/n93016434',
    ],
  };
  const marcFiles = [
    {
      marc: 'marcBibFileC375081.mrc',
      fileName: `testMarcFileC375081.${getRandomPostfix()}.mrc`,
      jobProfileToRun: 'Default - Create instance and SRS MARC Bib',
    },
    {
      marc: 'marcAuthFileC375081.mrc',
      fileName: `testMarcFileC375081.${getRandomPostfix()}.mrc`,
      jobProfileToRun: 'Default - Create SRS MARC Authority',
      authorityHeading: 'C375081 Carleton University.',
    },
  ];
  const createdRecordIDs = [];

  const bib710FieldValues = [
    26,
    testData.tag710,
    '2',
    '0',
    '$a C375081 University. $b School of Social Work $e term. $t test',
  ];
  const bib710AfterLinkingToAuth110 = [
    26,
    testData.tag710,
    '2',
    '0',
    '$a C375081 Carleton University. $b Anthropology Caucus $d 2023-',
    '$e term.',
    '$0 id.loc.gov/authorities/names/n93016434',
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
    'C375081 Link the "710" of "MARC Bib" field with "110" field of "MARC Authority" record. (spitfire) (TaaS)',
    { tags: ['extendedPath', 'spitfire'] },
    () => {
      InventoryInstance.searchByTitle(createdRecordIDs[0]);
      InventoryInstances.selectInstance();
      InventoryInstance.editMarcBibliographicRecord();
      QuickMarcEditor.verifyTagFieldAfterUnlinking(...bib710FieldValues);
      InventoryInstance.verifyAndClickLinkIcon(testData.tag710);
      MarcAuthorities.switchToSearch();
      InventoryInstance.verifySelectMarcAuthorityModal();
      InventoryInstance.searchResults(marcFiles[1].authorityHeading);
      InventoryInstance.clickLinkButton();
      QuickMarcEditor.verifyAfterLinkingAuthority(testData.tag710);
      QuickMarcEditor.verifyTagFieldAfterLinking(...bib710AfterLinkingToAuth110);
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
      QuickMarcEditor.checkFieldsExist([testData.tag710]);
      QuickMarcEditor.verifyTagFieldAfterLinking(...bib710AfterLinkingToAuth110);
      QuickMarcEditor.clickUnlinkIconInTagField(26);
      QuickMarcEditor.checkUnlinkModal(testData.tag710);
      QuickMarcEditor.confirmUnlinkingField();
      QuickMarcEditor.verifyTagFieldAfterUnlinking(...testData.bib710AfterUnlinking);
      QuickMarcEditor.pressSaveAndClose();
      QuickMarcEditor.checkAfterSaveAndClose();
      InventoryInstance.verifyContributor(2, 1, testData.contributor);
      InventoryInstance.checkMarcAppIconAbsent(2);
      InventoryInstance.viewSource();
      InventoryViewSource.notContains(testData.linkedIconText);
    },
  );
});
