import { Permissions } from '../../../../support/dictionary';
import DataImport from '../../../../support/fragments/data_import/dataImport';
import JobProfiles from '../../../../support/fragments/data_import/job_profiles/jobProfiles';
import Logs from '../../../../support/fragments/data_import/logs/logs';
import TopMenu from '../../../../support/fragments/topMenu';
import Users from '../../../../support/fragments/users/users';
import MarcAuthorities from '../../../../support/fragments/marcAuthority/marcAuthorities';
import MarcAuthority from '../../../../support/fragments/marcAuthority/marcAuthority';
import InventoryInstance from '../../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../../support/fragments/inventory/inventoryInstances';
import QuickMarcEditor from '../../../../support/fragments/quickMarcEditor';
import getRandomPostfix from '../../../../support/utils/stringTools';
import { JOB_STATUS_NAMES } from '../../../../support/constants';

describe('MARC -> MARC Authority -> Edit linked Authority record', () => {
  const testData = {
    tag100: '100',
    tag040: '040',
    tag952: '952',
    tag600: '600',
    authority100FieldValue: 'Clovio, Giulio',
    newAuthority100FieldValue: '$aClovio, Giulio,$d1498-1578 TEST',
    tag040NewValue: '0',
    tag952RowIndex: 18,
    tag600RowIndex: 25,
    ldr: {
      tag: 'LDR',
      ldrValue23Symbols: '00862cz\\\\a2200265n\\\\450',
      ldrValue24Symbols: '00862cz\\\\a2200265n\\\\4500',
    },
    searchOption: 'Keyword',
    calloutLDRMessage:
      'Record cannot be saved. The Leader must contain 24 characters, including null spaces.',
    calloutMessage: 'Record cannot be saved. A MARC tag must contain three characters.',
  };

  const marcFiles = [
    {
      marc: 'marcBibFileForC375171.mrc',
      fileName: `testMarcFileC375171.${getRandomPostfix()}.mrc`,
      jobProfileToRun: 'Default - Create instance and SRS MARC Bib',
    },
    {
      marc: 'marcAuthFileForC375171.mrc',
      fileName: `testMarcFileC375171.${getRandomPostfix()}.mrc`,
      jobProfileToRun: 'Default - Create SRS MARC Authority',
      authorityHeading: 'Clovio, Giulio',
    },
  ];

  const createdRecordIDs = [];

  before('Create test data', () => {
    cy.loginAsAdmin({
      path: TopMenu.dataImportPath,
      waiter: DataImport.waitLoading,
    }).then(() => {
      marcFiles.forEach((marcFile) => {
        cy.visit(TopMenu.dataImportPath);
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
      });
    });

    cy.visit(TopMenu.inventoryPath).then(() => {
      InventoryInstances.searchByTitle(createdRecordIDs[0]);
      InventoryInstances.selectInstance();
      InventoryInstance.editMarcBibliographicRecord();
      InventoryInstance.verifyAndClickLinkIconByIndex(testData.tag600RowIndex);
      InventoryInstance.verifySelectMarcAuthorityModal();
      MarcAuthorities.switchToSearch();
      InventoryInstance.verifySearchOptions();
      InventoryInstance.searchResults(marcFiles[1].authorityHeading);
      MarcAuthorities.checkFieldAndContentExistence(
        testData.tag100,
        testData.authority100FieldValue,
      );
      InventoryInstance.clickLinkButton();
      QuickMarcEditor.verifyAfterLinkingUsingRowIndex(testData.tag600, testData.tag600RowIndex);
      QuickMarcEditor.pressSaveAndClose();

      cy.createTempUser([
        Permissions.uiMarcAuthoritiesAuthorityRecordEdit.gui,
        Permissions.uiMarcAuthoritiesAuthorityRecordView.gui,
        Permissions.uiQuickMarcQuickMarcAuthoritiesEditorAll.gui,
      ]).then((createdUserProperties) => {
        testData.userProperties = createdUserProperties;

        cy.login(testData.userProperties.username, testData.userProperties.password, {
          path: TopMenu.marcAuthorities,
          waiter: MarcAuthorities.waitLoading,
        });
      });
    });
  });

  after('Delete test data', () => {
    cy.getAdminToken();
    Users.deleteViaApi(testData.userProperties.userId);
    InventoryInstance.deleteInstanceViaApi(createdRecordIDs[0]);
    MarcAuthority.deleteViaAPI(createdRecordIDs[1]);
  });

  it(
    'C375171 Save linked "MARC authority" record with wrong tag value, invalid LDR, updated "1XX" and deleted field (spitfire) (TaaS)',
    { tags: ['extendedPath', 'spitfire'] },
    () => {
      MarcAuthorities.searchBy(testData.searchOption, marcFiles[1].authorityHeading);

      MarcAuthority.edit();
      QuickMarcEditor.updateExistingTagName(testData.tag040, testData.tag040NewValue);
      QuickMarcEditor.checkButtonsEnabled();

      QuickMarcEditor.checkLDRValue(testData.ldr.ldrValue24Symbols);
      QuickMarcEditor.updateExistingField(testData.ldr.tag, testData.ldr.ldrValue23Symbols);
      QuickMarcEditor.checkLDRValue(testData.ldr.ldrValue23Symbols);

      QuickMarcEditor.updateExistingField(testData.tag100, testData.newAuthority100FieldValue);

      QuickMarcEditor.deleteField(testData.tag952RowIndex);
      QuickMarcEditor.afterDeleteNotification(testData.tag952);
      QuickMarcEditor.pressSaveAndClose();
      QuickMarcEditor.checkCallout(testData.calloutLDRMessage);
      QuickMarcEditor.closeCallout();

      QuickMarcEditor.updateExistingField(testData.ldr.tag, testData.ldr.ldrValue24Symbols);
      QuickMarcEditor.checkLDRValue(testData.ldr.ldrValue24Symbols);

      QuickMarcEditor.pressSaveAndKeepEditing(testData.calloutMessage);
      QuickMarcEditor.verifyAndDismissWrongTagLengthCallout();

      QuickMarcEditor.updateExistingTagName(testData.tag040NewValue, testData.tag040);
      QuickMarcEditor.pressSaveAndClose();
      QuickMarcEditor.verifyConfirmModal();

      QuickMarcEditor.confirmDelete();
      QuickMarcEditor.verifyUpdateLinkedBibsKeepEditingModal(1);

      QuickMarcEditor.confirmUpdateLinkedBibsKeepEditing(1);
    },
  );
});
