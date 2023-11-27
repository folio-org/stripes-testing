import Permissions from '../../support/dictionary/permissions';
import TopMenu from '../../support/fragments/topMenu';
import Users from '../../support/fragments/users/users';
import DataImport from '../../support/fragments/data_import/dataImport';
import Logs from '../../support/fragments/data_import/logs/logs';
import JobProfiles from '../../support/fragments/data_import/job_profiles/jobProfiles';
import getRandomPostfix from '../../support/utils/stringTools';
import MarcAuthority from '../../support/fragments/marcAuthority/marcAuthority';
import MarcAuthorities from '../../support/fragments/marcAuthority/marcAuthorities';
import InteractorsTools from '../../support/utils/interactorsTools';
import InventoryInstances from '../../support/fragments/inventory/inventoryInstances';
import InventoryInstance from '../../support/fragments/inventory/inventoryInstance';
import QuickMarcEditor from '../../support/fragments/quickMarcEditor';
import { JOB_STATUS_NAMES } from '../../support/constants';

describe('MARC authority', () => {
  const testData = {
    tag010: '010',
    tag100: '100',
    tag240: '240',
    authority100FieldValue: 'C375100 Beethoven, Ludwig van',
    searchOption: 'Keyword',
    searchValue: 'Beethoven, Ludwig van, 1770-1827. 14 variations sur un thème original',
    fieldForAdding: { tag: '010', content: '$a n 94000339' },
    calloutMessage: 'Record cannot be saved with more than one 010 field',
  };

  const createdRecordIDs = [];

  const marcFiles = [
    {
      marc: 'marcBibFileForC375100.mrc',
      fileName: `testMarcFileC375100.${getRandomPostfix()}.mrc`,
      jobProfileToRun: 'Default - Create instance and SRS MARC Bib',
      numOfRecords: 1,
    },
    {
      marc: 'marcAuthFileForC375100.mrc',
      fileName: `testMarcFileC375100.${getRandomPostfix()}.mrc`,
      jobProfileToRun: 'Default - Create SRS MARC Authority',
      authorityHeading: 'Variations / Ludwig Van Beethoven.',
      numOfRecords: 1,
    },
  ];

  before('Create test data', () => {
    cy.loginAsAdmin({
      path: TopMenu.dataImportPath,
      waiter: DataImport.waitLoading,
    }).then(() => {
      marcFiles.forEach((marcFile) => {
        cy.visit(TopMenu.dataImportPath);
        DataImport.verifyUploadState();
        DataImport.uploadFile(marcFile.marc, marcFile.fileName);
        JobProfiles.waitFileIsUploaded();
        JobProfiles.waitLoadingList();
        JobProfiles.search(marcFile.jobProfileToRun);
        JobProfiles.runImportFile();
        JobProfiles.waitFileIsImported(marcFile.fileName);
        Logs.checkStatusOfJobProfile(JOB_STATUS_NAMES.COMPLETED);
        Logs.openFileDetails(marcFile.fileName);
        for (let i = 0; i < marcFile.numOfRecords; i++) {
          Logs.getCreatedItemsID(i).then((link) => {
            createdRecordIDs.push(link.split('/')[5]);
          });
        }
      });
    });

    cy.createTempUser([
      Permissions.uiMarcAuthoritiesAuthorityRecordView.gui,
      Permissions.uiMarcAuthoritiesAuthorityRecordEdit.gui,
      Permissions.uiQuickMarcQuickMarcAuthoritiesEditorAll.gui,
    ]).then((createdUserProperties) => {
      testData.userProperties = createdUserProperties;

      cy.visit(TopMenu.inventoryPath).then(() => {
        InventoryInstance.searchByTitle(createdRecordIDs[0]);
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
      });
    });
  });

  beforeEach('Login to the application', () => {
    cy.login(testData.userProperties.username, testData.userProperties.password, {
      path: TopMenu.marcAuthorities,
      waiter: MarcAuthorities.waitLoading,
    });
  });

  after('Delete test data', () => {
    Users.deleteViaApi(testData.userProperties.userId);
    InventoryInstance.deleteInstanceViaApi(createdRecordIDs[0]);
    MarcAuthority.deleteViaAPI(createdRecordIDs[1]);
  });

  it(
    'C375100 Unable to add multiple "010" fields to linked "MARC authority" record (spitfire)(TaaS)',
    { tags: ['extendedPath', 'spitfire'] },
    () => {
      MarcAuthorities.searchBy(testData.searchOption, testData.searchValue);
      MarcAuthorities.selectFirstRecord();
      MarcAuthority.edit();
      QuickMarcEditor.checkFieldsExist([testData.tag010]);
      MarcAuthority.addNewField(4, testData.fieldForAdding.tag, testData.fieldForAdding.content);
      QuickMarcEditor.pressSaveAndClose();
      InteractorsTools.checkCalloutMessage(testData.calloutMessage, 'error');
      InteractorsTools.closeCalloutMessage();
      QuickMarcEditor.clickSaveAndKeepEditingButton();
      InteractorsTools.checkCalloutMessage(testData.calloutMessage, 'error');
      InteractorsTools.closeCalloutMessage();
    },
  );
});
