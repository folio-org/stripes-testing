import { JOB_STATUS_NAMES } from '../../../../../support/constants';
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
    tag650: '650',
    subjectValue: 'C377033 Speaking Oratory--debating--TestV--TestX--TestY--TestZ',
    linkedIconText: 'Linked to MARC authority',
    subjectAccordion: 'Subject',
  };
  const marcFiles = [
    {
      marc: 'marcBibFileC377033.mrc',
      fileName: `testMarcFileC377033${getRandomPostfix()}.mrc`,
      jobProfileToRun: 'Default - Create instance and SRS MARC Bib',
    },
    {
      marc: 'marcAuthFileC377033.mrc',
      fileName: `testMarcFileC377033${getRandomPostfix()}.mrc`,
      jobProfileToRun: 'Default - Create SRS MARC Authority',
      authorityHeading: 'C377033 Speaking Oratory debating',
    },
  ];
  const createdRecordIDs = [];
  const bib630AfterLinkingToAuth150 = [
    15,
    testData.tag650,
    '\\',
    '7',
    '$a C377033 Speaking Oratory $b debating',
    '$v TestV $x TestX $y TestY $z TestZ',
    '$0 id.loc.gov/authorities/subjects/sh85095299',
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
    });
  });

  beforeEach('Login to the application', () => {
    cy.login(testData.userProperties.username, testData.userProperties.password, {
      path: TopMenu.inventoryPath,
      waiter: InventoryInstances.waitContentLoading,
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
    'C377033 Link the "650" of "MARC Bib" field to "MARC Authority" record (with "v", "x", "y", "z" subfields). (spitfire) (TaaS)',
    { tags: ['extendedPath', 'spitfire'] },
    () => {
      InventoryInstance.searchByTitle(createdRecordIDs[0]);
      InventoryInstances.selectInstance();
      InventoryInstance.editMarcBibliographicRecord();
      InventoryInstance.verifyAndClickLinkIcon(testData.tag650);
      InventoryInstance.verifySelectMarcAuthorityModal();
      InventoryInstance.verifySearchOptions();
      MarcAuthorities.switchToSearch();
      MarcAuthorities.clickReset();
      InventoryInstance.searchResults(marcFiles[1].authorityHeading);
      InventoryInstance.clickLinkButton();
      QuickMarcEditor.verifyAfterLinkingAuthority(testData.tag650);
      QuickMarcEditor.checkUnlinkTooltipText(testData.tag650, 'Unlink from MARC Authority record');
      QuickMarcEditor.checkViewMarcAuthorityTooltipText(bib630AfterLinkingToAuth150[0]);
      QuickMarcEditor.verifyTagFieldAfterLinking(...bib630AfterLinkingToAuth150);
      QuickMarcEditor.pressSaveAndClose();
      QuickMarcEditor.checkAfterSaveAndClose();
      InventoryInstance.verifyInstanceSubject(
        2,
        0,
        `${testData.linkedIconText}${testData.subjectValue}`,
      );
      InventoryInstance.checkExistanceOfAuthorityIconInInstanceDetailPane(
        testData.subjectAccordion,
      );
    },
  );
});
