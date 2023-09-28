import TestTypes from '../../../support/dictionary/testTypes';
import DevTeams from '../../../support/dictionary/devTeams';
import Permissions from '../../../support/dictionary/permissions';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import DataImport from '../../../support/fragments/data_import/dataImport';
import Logs from '../../../support/fragments/data_import/logs/logs';
import JobProfiles from '../../../support/fragments/data_import/job_profiles/jobProfiles';
import getRandomPostfix from '../../../support/utils/stringTools';
import MarcAuthority from '../../../support/fragments/marcAuthority/marcAuthority';
import MarcAuthorities from '../../../support/fragments/marcAuthority/marcAuthorities';
import QuickMarcEditor from '../../../support/fragments/quickMarcEditor';
import Parallelization from '../../../support/dictionary/parallelization';
import { JOB_STATUS_NAMES } from '../../../support/constants';

describe('Manual Linking Bib field to Authority 1XX', () => {
  const testData = {
    tag150: '150',
    tag010: '010',
    tag650: '650',
    authorityMarkedValue: 'C375070 Speaking Oratory',
    subjectValue: 'C375070 Speaking Oratory--debating',
    accordion: 'Subject',
  };

  const marcFiles = [
    {
      marc: 'marcBibFileC375070.mrc',
      fileName: `testMarcFileC375070.${getRandomPostfix()}.mrc`,
      jobProfileToRun: 'Default - Create instance and SRS MARC Bib',
    },
    {
      marc: 'marcAuthFileC375070.mrc',
      fileName: `testMarcFileC375070.${getRandomPostfix()}.mrc`,
      jobProfileToRun: 'Default - Create SRS MARC Authority',
      authorityHeading: 'C375070 Speaking Oratory debating',
      authority010FieldValue: 'sh85095299375070',
    },
  ];

  const createdRecordIDs = [];

  const bib650LinkedFieldValues = [
    15,
    testData.tag650,
    '\\',
    '7',
    '$a C375070 Speaking Oratory $b debating',
    '',
    `$0 id.loc.gov/authorities/subjects/${marcFiles[1].authority010FieldValue}`,
    '$2 fast',
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
            JobProfiles.searchJobProfileForImport(marcFile.jobProfileToRun);
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
    });
  });

  beforeEach('Login to the application', () => {
    cy.login(testData.userProperties.username, testData.userProperties.password, {
      path: TopMenu.inventoryPath,
      waiter: InventoryInstances.waitContentLoading,
    });
  });

  after('Deleting created user', () => {
    Users.deleteViaApi(testData.userProperties.userId);
    createdRecordIDs.forEach((id, index) => {
      if (index) MarcAuthority.deleteViaAPI(id);
      else InventoryInstance.deleteInstanceViaApi(id);
    });
  });

  it(
    'C375070 Link the "650" of "MARC Bib" field with 150" field of "MARC Authority" record. (spitfire)',
    { tags: [TestTypes.extendedPath, DevTeams.spitfire] },
    () => {
      InventoryInstance.searchByTitle(createdRecordIDs[0]);
      InventoryInstances.selectInstance();
      InventoryInstance.editMarcBibliographicRecord();
      InventoryInstance.verifyAndClickLinkIcon(testData.tag650);
      MarcAuthorities.switchToSearch();
      InventoryInstance.verifySelectMarcAuthorityModal();
      InventoryInstance.searchResults(marcFiles[1].authorityHeading);
      MarcAuthorities.checkFieldAndContentExistence(
        testData.tag010,
        `‡a ${marcFiles[1].authority010FieldValue}`,
      );
      MarcAuthorities.checkFieldAndContentExistence(
        testData.tag150,
        `‡a ${testData.authorityMarkedValue}`,
      );
      InventoryInstance.clickLinkButton();
      QuickMarcEditor.verifyAfterLinkingAuthority(testData.tag650);
      QuickMarcEditor.verifyTagFieldAfterLinking(bib650LinkedFieldValues);
      QuickMarcEditor.pressSaveAndClose();
      QuickMarcEditor.checkAfterSaveAndClose();
      InventoryInstance.verifyInstanceSubject(2, 0, testData.subjectValue);
      InventoryInstance.checkExistanceOfAuthorityIconInInstanceDetailPane(testData.accordion);
      InventoryInstance.clickViewAuthorityIconDisplayedInInstanceDetailsPane(testData.accordion);
      MarcAuthorities.checkRecordDetailPageMarkedValue(marcFiles[1].authorityHeading);
      InventoryInstance.goToPreviousPage();

      // InventoryInstance.clickViewAuthorityIconDisplayedInInstanceDetailsPane(testData.accordion);
      // MarcAuthorities.checkRecordDetailPageMarkedValue(testData.authorityMarkedValue);
      // InventoryInstance.goToPreviousPage();

      // // Wait for the content to be loaded.
      // cy.wait(6000);
      // InventoryInstance.viewSource();
      // InventoryInstance.clickViewAuthorityIconDisplayedInMarcViewPane();
      // MarcAuthorities.checkRecordDetailPageMarkedValue(testData.authorityMarkedValue);
      // InventoryInstance.goToPreviousPage();
      // MarcAuthorities.closeMarcViewPane();

      // InventoryInstance.editMarcBibliographicRecord();
      // QuickMarcEditor.clickUnlinkIconInTagField(18);
      // QuickMarcEditor.verifyTagFieldAfterUnlinking(
      //   18,
      //   '240',
      //   '1',
      //   '0',
      //   '$a Variations, $m piano, violin, cello, $n op. 44, $r E♭ major $0 id.loc.gov/authorities/names/n83130832',
      // );
      // QuickMarcEditor.checkLinkButtonExist(testData.tag240);
      // QuickMarcEditor.pressSaveAndClose();
      // QuickMarcEditor.checkAfterSaveAndClose();

      // InventoryInstance.checkAbsenceOfAuthorityIconInInstanceDetailPane(testData.accordion);

      // InventoryInstance.viewSource();
      // InventoryInstance.checkAbsenceOfAuthorityIconInMarcViewPane();
    },
  );
});
