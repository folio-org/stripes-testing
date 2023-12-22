import Permissions from '../../../../support/dictionary/permissions';
import TopMenu from '../../../../support/fragments/topMenu';
import Users from '../../../../support/fragments/users/users';
import DataImport from '../../../../support/fragments/data_import/dataImport';
import Logs from '../../../../support/fragments/data_import/logs/logs';
import JobProfiles from '../../../../support/fragments/data_import/job_profiles/jobProfiles';
import getRandomPostfix from '../../../../support/utils/stringTools';
import MarcAuthority from '../../../../support/fragments/marcAuthority/marcAuthority';
import MarcAuthorities from '../../../../support/fragments/marcAuthority/marcAuthorities';
import TopMenuNavigation from '../../../../support/fragments/topMenuNavigation';
import InventoryInstances from '../../../../support/fragments/inventory/inventoryInstances';
import InventoryInstance from '../../../../support/fragments/inventory/inventoryInstance';
import QuickMarcEditor from '../../../../support/fragments/quickMarcEditor';
import { JOB_STATUS_NAMES } from '../../../../support/constants';

describe('MARC -> MARC Authority -> Edit linked Authority record', () => {
  const testData = {
    tag010: '010',
    tag100: '100',
    tag240: '240',
    authority001FieldValue: '4284518',
    authority100FieldValue: 'Beethoven, Ludwig van (no 010)',
    searchOption: 'Keyword',
    fieldForEditing: { tag: '380', newValue: '$a Variations TEST $2 lcsh' },
    calloutMessage: 'Record cannot be saved with more than one 010 field',
  };

  const createdRecordIDs = [];

  const marcFiles = [
    {
      marc: 'marcBibFileForC375139.mrc',
      fileName: `testMarcFileC375139.${getRandomPostfix()}.mrc`,
      jobProfileToRun: 'Default - Create instance and SRS MARC Bib',
      instanceTitle: 'Variations / C375139Ludwig Van Beethoven.',
      numOfRecords: 1,
    },
    {
      marc: 'marcAuthFileForC375139.mrc',
      fileName: `testMarcFileC375139.${getRandomPostfix()}.mrc`,
      jobProfileToRun: 'Default - Create SRS MARC Authority',
      authorityHeading: 'Beethoven, Ludwig van (no 010)',
      numOfRecords: 1,
    },
  ];

  before('Create test data', () => {
    cy.loginAsAdmin({
      path: TopMenu.dataImportPath,
      waiter: DataImport.waitLoading,
    }).then(() => {
      cy.visit(TopMenu.dataImportPath);
      marcFiles.forEach((marcFile) => {
        DataImport.verifyUploadState();
        DataImport.uploadFileAndRetry(marcFile.marc, marcFile.fileName);
        JobProfiles.waitFileIsUploaded();
        JobProfiles.waitLoadingList();
        JobProfiles.search(marcFile.jobProfileToRun);
        JobProfiles.runImportFile();
        JobProfiles.waitFileIsImported(marcFile.fileName);
        Logs.checkStatusOfJobProfile(JOB_STATUS_NAMES.COMPLETED);
        Logs.openFileDetails(marcFile.fileName);
        Logs.getCreatedItemsID().then((link) => {
          createdRecordIDs.push(link.split('/')[5]);
        });
        JobProfiles.closeJobProfile(marcFile.fileName);
      });
    });

    cy.createTempUser([
      Permissions.uiMarcAuthoritiesAuthorityRecordView.gui,
      Permissions.uiMarcAuthoritiesAuthorityRecordEdit.gui,
      Permissions.uiQuickMarcQuickMarcAuthoritiesEditorAll.gui,
      Permissions.inventoryAll.gui,
      Permissions.uiQuickMarcQuickMarcBibliographicEditorAll.gui,
      Permissions.uiQuickMarcQuickMarcAuthorityLinkUnlink.gui,
    ]).then((createdUserProperties) => {
      testData.userProperties = createdUserProperties;

      cy.visit(TopMenu.inventoryPath).then(() => {
        InventoryInstances.searchByTitle(createdRecordIDs[0]);
        InventoryInstances.selectInstance();
        InventoryInstance.editMarcBibliographicRecord();
        InventoryInstance.verifyAndClickLinkIcon(testData.tag240);
        MarcAuthorities.switchToSearch();
        InventoryInstance.verifySelectMarcAuthorityModal();
        InventoryInstance.verifySearchOptions();
        InventoryInstance.searchResults(testData.authority100FieldValue);
        MarcAuthorities.checkFieldAndContentExistence(
          testData.tag100,
          `$a ${testData.authority100FieldValue}`,
        );
        InventoryInstance.clickLinkButton();
        QuickMarcEditor.verifyAfterLinkingAuthority(testData.tag240);
        QuickMarcEditor.pressSaveAndClose();
        QuickMarcEditor.checkAfterSaveAndClose();

        cy.login(testData.userProperties.username, testData.userProperties.password, {
          path: TopMenu.marcAuthorities,
          waiter: MarcAuthorities.waitLoading,
        });
      });
    });
  });

  after('Delete test data', () => {
    Users.deleteViaApi(testData.userProperties.userId);
    InventoryInstance.deleteInstanceViaApi(createdRecordIDs[0]);
    MarcAuthority.deleteViaAPI(createdRecordIDs[1]);
  });

  it(
    'C375139 Edit any field in linked "MARC authority" record without "010" field when "001" = "$0" (spitfire) (TaaS)',
    { tags: ['extendedPath', 'spitfire'] },
    () => {
      MarcAuthorities.searchAndVerify(testData.searchOption, marcFiles[1].authorityHeading);
      MarcAuthorities.verifyMarcViewPaneIsOpened();

      MarcAuthority.edit();
      QuickMarcEditor.checkFieldAbsense(testData.tag010);

      QuickMarcEditor.updateExistingField(
        testData.fieldForEditing.tag,
        testData.fieldForEditing.newValue,
      );
      QuickMarcEditor.checkContent(testData.fieldForEditing.newValue, 7);

      QuickMarcEditor.pressSaveAndClose();
      QuickMarcEditor.checkAfterSaveAndCloseAuthority();
      MarcAuthorities.checkFieldAndContentExistence(
        testData.fieldForEditing.tag,
        testData.fieldForEditing.newValue,
      );

      TopMenuNavigation.navigateToApp('Inventory');

      InventoryInstances.searchAndVerify(marcFiles[0].instanceTitle);
      InventoryInstances.selectInstance();
      InventoryInstance.waitInstanceRecordViewOpened(marcFiles[0].instanceTitle);

      InventoryInstance.editMarcBibliographicRecord();
      QuickMarcEditor.verifyTagFieldAfterLinking(
        18,
        '240',
        '1',
        '0',
        '$a Variations, $m piano, violin, cello, $n op. 44, $r E♭ major',
        '',
        `$0 ${testData.authority001FieldValue}`,
        '',
      );
    },
  );
});
