import getRandomPostfix from '../../support/utils/stringTools';
import TestTypes from '../../support/dictionary/testTypes';
import DevTeams from '../../support/dictionary/devTeams';
import Permissions from '../../support/dictionary/permissions';
import TopMenu from '../../support/fragments/topMenu';
import DataImport from '../../support/fragments/data_import/dataImport';
import MarcAuthority from '../../support/fragments/marcAuthority/marcAuthority';
import Users from '../../support/fragments/users/users';
import JobProfiles from '../../support/fragments/data_import/job_profiles/jobProfiles';
import Logs from '../../support/fragments/data_import/logs/logs';
import MarcAuthorities from '../../support/fragments/marcAuthority/marcAuthorities';
import QuickMarcEditor from '../../support/fragments/quickMarcEditor';
import InventoryInstance from '../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../support/fragments/inventory/inventoryInstances';
import { JOB_STATUS_NAMES } from '../../support/constants';
import Parallelization from '../../support/dictionary/parallelization';

describe('MARC Authority -> Edit linked Authority record', () => {
  const testData = {
    tag010: '010',
    tag700: '700',
    subfieldZValue: 'n12345',
    updatedSubfieldZValue: 'n12345678910',
  };

  const marcFiles = [
    {
      marc: 'marcBibFileC376596.mrc',
      fileName: `testMarcFileC376596.${getRandomPostfix()}.mrc`,
      jobProfileToRun: 'Default - Create instance and SRS MARC Bib',
      instanceTitle: 'The coronation of Queen Elizabeth II C376596',
    },
    {
      marc: 'marcAuthFileC376596.mrc',
      fileName: `testMarcFileC376596.${getRandomPostfix()}.mrc`,
      jobProfileToRun: 'Default - Create SRS MARC Authority',
      authorityHeading: 'Elizabeth C376596',
      authority010FieldValue: 'n80126296376596',
    },
  ];

  const createdRecordIDs = [];

  before('Creating user, importing and linking records', () => {
    cy.createTempUser([
      Permissions.inventoryAll.gui,
      Permissions.uiMarcAuthoritiesAuthorityRecordView.gui,
      Permissions.uiMarcAuthoritiesAuthorityRecordEdit.gui,
      Permissions.uiQuickMarcQuickMarcAuthoritiesEditorAll.gui,
      Permissions.uiQuickMarcQuickMarcBibliographicEditorAll.gui,
    ]).then((createdUserProperties) => {
      testData.userProperties = createdUserProperties;

      marcFiles.forEach((marcFile) => {
        cy.loginAsAdmin({ path: TopMenu.dataImportPath, waiter: DataImport.waitLoading }).then(
          () => {
            DataImport.verifyUploadState();
            DataImport.uploadFileAndRetry(marcFile.marc, marcFile.fileName);
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

      cy.visit(TopMenu.inventoryPath).then(() => {
        InventoryInstances.waitContentLoading();
        InventoryInstance.searchByTitle(createdRecordIDs[0]);
        InventoryInstances.selectInstance();
        // wait for detail view to be fully loaded
        cy.wait(1500);
        InventoryInstance.editMarcBibliographicRecord();
        InventoryInstance.verifyAndClickLinkIcon(testData.tag700);
        MarcAuthorities.switchToSearch();
        InventoryInstance.verifySelectMarcAuthorityModal();
        InventoryInstance.searchResults(marcFiles[1].authorityHeading);
        MarcAuthorities.checkFieldAndContentExistence(
          testData.tag010,
          `‡a ${marcFiles[1].authority010FieldValue}`,
        );
        InventoryInstance.clickLinkButton();
        QuickMarcEditor.verifyAfterLinkingAuthority(testData.tag700);
        QuickMarcEditor.pressSaveAndClose();
        QuickMarcEditor.checkAfterSaveAndClose();
      });
      cy.login(testData.userProperties.username, testData.userProperties.password, {
        path: TopMenu.marcAuthorities,
        waiter: MarcAuthorities.waitLoading,
      });
    });
  });

  after('Deleting user, data', () => {
    Users.deleteViaApi(testData.userProperties.userId);
    createdRecordIDs.forEach((id, index) => {
      if (index) MarcAuthority.deleteViaAPI(id);
      else InventoryInstance.deleteInstanceViaApi(id);
    });
  });

  it(
    'C376596 Add/Edit/Delete "$z" subfield in "010" field of linked "MARC authority" record when "010" = "$0" (spitfire)',
    { tags: [TestTypes.criticalPath, DevTeams.spitfire, Parallelization.nonParallel] },
    () => {
      MarcAuthorities.searchBy('Keyword', marcFiles[1].authorityHeading);
      MarcAuthorities.selectTitle(marcFiles[1].authorityHeading);
      MarcAuthority.edit();
      QuickMarcEditor.checkContent(`$a ${marcFiles[1].authority010FieldValue}`, 4);
      QuickMarcEditor.updateExistingField(
        testData.tag010,
        `$a ${marcFiles[1].authority010FieldValue} $z ${testData.subfieldZValue}`,
      );
      QuickMarcEditor.checkButtonsEnabled();
      QuickMarcEditor.clickSaveAndKeepEditing();
      QuickMarcEditor.verifyAndDismissRecordUpdatedCallout();
      QuickMarcEditor.updateExistingField(
        testData.tag010,
        `$a ${marcFiles[1].authority010FieldValue} $z ${testData.updatedSubfieldZValue}`,
      );
      QuickMarcEditor.checkButtonsEnabled();
      QuickMarcEditor.clickSaveAndKeepEditing();
      QuickMarcEditor.verifyAndDismissRecordUpdatedCallout();
      QuickMarcEditor.updateExistingField(
        testData.tag010,
        `$a ${marcFiles[1].authority010FieldValue}`,
      );
      QuickMarcEditor.checkButtonsEnabled();
      QuickMarcEditor.pressSaveAndClose();
      QuickMarcEditor.verifyAndDismissRecordUpdatedCallout();

      MarcAuthorities.searchBy('Keyword', marcFiles[1].authorityHeading);
      MarcAuthorities.verifyNumberOfTitles(4, '1');
      MarcAuthorities.clickOnNumberOfTitlesLink(4, '1');

      InventoryInstance.editMarcBibliographicRecord();
      QuickMarcEditor.verifyTagFieldAfterLinking(
        60,
        testData.tag700,
        '0',
        '\\',
        `$a ${marcFiles[1].authorityHeading}`,
        '',
        `$0 id.loc.gov/authorities/names/${marcFiles[1].authority010FieldValue}`,
        '',
      );
    },
  );
});
