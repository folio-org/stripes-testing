import { TestTypes, DevTeams, Permissions } from '../../../../../support/dictionary';
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
import Parallelization from '../../../../../support/dictionary/parallelization';

describe('MARC -> MARC Bibliographic -> Edit MARC bib -> Manual linking', () => {
  const testData = {
    tag110: '110',
    authorityMarkedValue: 'Beatles',
    subjectValue: 'C374194 Speaking Oratory--debating',
    linkedIconText: 'Linked to MARC authority',
    accordion: 'Contributor',
  };

  const marcFiles = [
    {
      marc: 'marcBibFileC374194.mrc',
      fileName: `testMarcFile.${getRandomPostfix()}.mrc`,
      jobProfileToRun: 'Default - Create instance and SRS MARC Bib',
    },
    {
      marc: 'marcAuthFileC374194.mrc',
      fileName: `testMarcFileC374194.${getRandomPostfix()}.mrc`,
      jobProfileToRun: 'Default - Create SRS MARC Authority',
      authorityHeading: 'Beatles',
      authority110FieldValue: 'n79018119',
    },
  ];

  const createdRecordIDs = [];
  const bib110InitialFieldValues = [33, testData.tag110, '2', '\\', '$a The Beatles. $4 prf'];
  const bib110UnlinkedFieldValues = [
    33,
    testData.tag110,
    '2',
    '\\',
    '$a Beatles $0 id.loc.gov/authorities/names/n79018119 $4 prf',
  ];
  const bib110LinkedFieldValues = [
    33,
    testData.tag110,
    '2',
    '\\',
    '$a Beatles',
    '',
    `$0 id.loc.gov/authorities/names/${marcFiles[1].authority110FieldValue}`,
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
    cy.getAdminToken(() => {
      Users.deleteViaApi(testData.userProperties.userId);
    });
    createdRecordIDs.forEach((id, index) => {
      if (index) MarcAuthority.deleteViaAPI(id);
      else InventoryInstance.deleteInstanceViaApi(id);
    });
  });

  it(
    'C374194 Link the "110" of "MARC Bib" field with "110" field of "MARC Authority" record (spitfire) (TaaS)',
    { tags: [TestTypes.extendedPath, DevTeams.spitfire, Parallelization.nonParallel] },
    () => {
      InventoryInstance.searchByTitle(createdRecordIDs[0]);
      InventoryInstances.selectInstance();
      InventoryInstance.editMarcBibliographicRecord();
      QuickMarcEditor.verifyTagFieldAfterUnlinking(...bib110InitialFieldValues);
      InventoryInstance.verifyAndClickLinkIcon(testData.tag110);
      MarcAuthorities.switchToSearch();
      InventoryInstance.verifySelectMarcAuthorityModal();
      InventoryInstance.searchResults(marcFiles[1].authorityHeading);
      InventoryInstance.selectRecord();
      MarcAuthorities.checkFieldAndContentExistence(
        testData.tag110,
        `$a ${marcFiles[1].authorityHeading}`,
      );
      MarcAuthorities.clickLinkButton();
      QuickMarcEditor.verifyAfterLinkingAuthority(testData.tag110);
      QuickMarcEditor.verifyTagFieldAfterLinking(...bib110LinkedFieldValues);
      QuickMarcEditor.pressSaveAndClose();
      QuickMarcEditor.checkAfterSaveAndClose();
      InventoryInstance.verifyContributorWithMarcAppLink(0, 1, `${testData.authorityMarkedValue}`);
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
      QuickMarcEditor.verifyTagFieldAfterLinking(...bib110LinkedFieldValues);
      QuickMarcEditor.clickUnlinkIconInTagField(bib110UnlinkedFieldValues[0]);
      QuickMarcEditor.verifyTagFieldAfterUnlinking(...bib110UnlinkedFieldValues);
      QuickMarcEditor.verifyIconsAfterUnlinking(bib110UnlinkedFieldValues[0]);
      QuickMarcEditor.pressSaveAndClose();
      QuickMarcEditor.checkAfterSaveAndClose();
      InventoryInstance.checkAbsenceOfAuthorityIconInInstanceDetailPane(testData.accordion);
      InventoryInstance.viewSource();
      InventoryInstance.checkAbsenceOfAuthorityIconInMarcViewPane();
    },
  );
});
