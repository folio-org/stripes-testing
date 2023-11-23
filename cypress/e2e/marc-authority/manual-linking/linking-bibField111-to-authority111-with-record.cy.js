import { JOB_STATUS_NAMES } from '../../../support/constants';
import { Permissions } from '../../../support/dictionary';
import DataImport from '../../../support/fragments/data_import/dataImport';
import JobProfiles from '../../../support/fragments/data_import/job_profiles/jobProfiles';
import Logs from '../../../support/fragments/data_import/logs/logs';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import InventoryViewSource from '../../../support/fragments/inventory/inventoryViewSource';
import MarcAuthorities from '../../../support/fragments/marcAuthority/marcAuthorities';
import MarcAuthority from '../../../support/fragments/marcAuthority/marcAuthority';
import QuickMarcEditor from '../../../support/fragments/quickMarcEditor';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import getRandomPostfix from '../../../support/utils/stringTools';

describe('Manual Linking Bib field to Authority 111', () => {
  const testData = {
    tag111: '111',
    authorityMarkedValue: 'Mediterranean Conference on Medical and Biological Engineering',
    subjectValue: 'C374197 Speaking Oratory--debating',
    linkedIconText: 'Linked to MARC authority',
    accordion: 'Contributor',
  };

  const marcFiles = [
    {
      marc: 'marcBibFileC374197.mrc',
      fileName: `testMarcFile.${getRandomPostfix()}.mrc`,
      jobProfileToRun: 'Default - Create instance and SRS MARC Bib',
    },
    {
      marc: 'marcAuthFileC374197.mrc',
      fileName: `testMarcFileC374197.${getRandomPostfix()}.mrc`,
      jobProfileToRun: 'Default - Create SRS MARC Authority',
      authorityHeading: 'Mediterranean Conference on Medical and Biological Engineering',
      authority111FieldValue: 'n85281584',
    },
  ];

  const createdRecordIDs = [];
  const bib111InitialFieldValues = [
    28,
    testData.tag111,
    '2',
    '\\',
    '$a Mediterranean Conference on Medical and Biological Engineering and Computing $n (13th : $d 2013 : $c Seville, Spain)',
  ];
  const bib111UnlinkedFieldValues = [
    28,
    testData.tag111,
    '2',
    '\\',
    '$a Mediterranean Conference on Medical and Biological Engineering $n (13th : $d 2013 : $0 id.loc.gov/authorities/names/n85281584',
  ];
  const bib111LinkedFieldValues = [
    28,
    testData.tag111,
    '2',
    '\\',
    '$a Mediterranean Conference on Medical and Biological Engineering',
    '$n (13th : $d 2013 :',
    `$0 id.loc.gov/authorities/names/${marcFiles[1].authority111FieldValue}`,
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
    cy.getAdminToken(() => {
      Users.deleteViaApi(testData.userProperties.userId);
    });
    createdRecordIDs.forEach((id, index) => {
      if (index) MarcAuthority.deleteViaAPI(id);
      else InventoryInstance.deleteInstanceViaApi(id);
    });
  });

  it(
    'C374197 Link the "111" of "MARC Bib" field with "111" field of "MARC Authority" record. (spitfire) (TaaS)',
    { tags: ['extendedPath', 'spitfire', 'nonParallel'] },
    () => {
      InventoryInstance.searchByTitle(createdRecordIDs[0]);
      InventoryInstances.selectInstance();
      InventoryInstance.editMarcBibliographicRecord();
      QuickMarcEditor.verifyTagFieldAfterUnlinking(...bib111InitialFieldValues);
      InventoryInstance.verifyAndClickLinkIcon(testData.tag111);
      MarcAuthorities.switchToSearch();
      InventoryInstance.verifySelectMarcAuthorityModal();
      InventoryInstance.searchResults(marcFiles[1].authorityHeading);
      InventoryInstance.selectRecord();
      MarcAuthorities.checkFieldAndContentExistence(
        testData.tag111,
        `$a ${marcFiles[1].authorityHeading}`,
      );
      MarcAuthorities.clickLinkButton();
      QuickMarcEditor.verifyAfterLinkingAuthority(testData.tag111);
      QuickMarcEditor.verifyTagFieldAfterLinking(...bib111LinkedFieldValues);
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
      QuickMarcEditor.verifyTagFieldAfterLinking(...bib111LinkedFieldValues);
      QuickMarcEditor.clickUnlinkIconInTagField(bib111UnlinkedFieldValues[0]);
      QuickMarcEditor.verifyTagFieldAfterUnlinking(...bib111UnlinkedFieldValues);
      QuickMarcEditor.verifyIconsAfterUnlinking(bib111UnlinkedFieldValues[0]);
      QuickMarcEditor.pressSaveAndClose();
      QuickMarcEditor.checkAfterSaveAndClose();
      InventoryInstance.checkAbsenceOfAuthorityIconInInstanceDetailPane(testData.accordion);
      InventoryInstance.viewSource();
      InventoryInstance.checkAbsenceOfAuthorityIconInMarcViewPane();
    },
  );
});
