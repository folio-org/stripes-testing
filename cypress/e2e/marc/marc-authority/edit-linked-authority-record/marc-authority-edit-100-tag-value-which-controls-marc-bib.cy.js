import { Permissions } from '../../../../support/dictionary';
import DataImport from '../../../../support/fragments/data_import/dataImport';
import JobProfiles from '../../../../support/fragments/data_import/job_profiles/jobProfiles';
import Logs from '../../../../support/fragments/data_import/logs/logs';
import TopMenu from '../../../../support/fragments/topMenu';
import Users from '../../../../support/fragments/users/users';
import MarcAuthorities from '../../../../support/fragments/marcAuthority/marcAuthorities';
import MarcAuthority from '../../../../support/fragments/marcAuthority/marcAuthority';
import QuickMarcEditor from '../../../../support/fragments/quickMarcEditor';
import InventoryInstance from '../../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../../support/fragments/inventory/inventoryInstances';
import getRandomPostfix from '../../../../support/utils/stringTools';
import { JOB_STATUS_NAMES } from '../../../../support/constants';

describe('MARC -> MARC Authority -> Edit linked Authority record', () => {
  const testData = {
    tag100: '100',
    tag101: '101',
    tag700: '700',
    tag700RowIndex: 33,
    authority100FieldValue: '$a Roberts, Julia, $d 1967-',
    newAuthority100FieldValue: '$a Roberts, Julia, $d 1967- $t test',
    searchOption: 'Keyword',
    searchValue: 'Roberts, Julia',
    newTagValues: ['110', '111', '130', '150', '151', '155', '101'],
    cannotChangeSavedFieldCallout:
      'Cannot change the saved MARC authority field 100 because it controls a bibliographic field(s). To change this 1XX, you must unlink all controlled bibliographic fields.',
    cannotSaveRecordCollout: 'Record cannot be saved without 1XX field.',
    changesSavedCallout:
      'This record has successfully saved and is in process. Changes may not appear immediately.',
    tag100Callout:
      'Cannot add a $t to the $100 field because it controls a bibliographic field(s) that cannot control this subfield. To change this 1XX value, you must unlink all controlled bibliographic fields that cannot control $t.',
  };

  const marcFiles = [
    {
      marc: 'marcBibFileForC374136.mrc',
      fileName: `testMarcFileC374136.${getRandomPostfix()}.mrc`,
      jobProfileToRun: 'Default - Create instance and SRS MARC Bib',
      numOfRecords: 1,
    },
    {
      marc: 'marcAuthFileForC374136.mrc',
      fileName: `testMarcFileC374136.${getRandomPostfix()}.mrc`,
      jobProfileToRun: 'Default - Create SRS MARC Authority',
      authorityHeading: 'Roberts, Julia, 1967-',
      numOfRecords: 1,
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
      InventoryInstance.verifyAndClickLinkIconByIndex(testData.tag700RowIndex);
      InventoryInstance.verifySelectMarcAuthorityModal();
      MarcAuthorities.switchToSearch();
      InventoryInstance.verifySearchOptions();
      InventoryInstance.searchResults(marcFiles[1].authorityHeading);
      MarcAuthorities.checkFieldAndContentExistence(
        testData.tag100,
        testData.authority100FieldValue,
      );
      InventoryInstance.clickLinkButton();
      QuickMarcEditor.verifyAfterLinkingUsingRowIndex(testData.tag700, testData.tag700RowIndex);
      QuickMarcEditor.pressSaveAndClose();

      cy.createTempUser([
        Permissions.uiMarcAuthoritiesAuthorityRecordEdit.gui,
        Permissions.uiMarcAuthoritiesAuthorityRecordView.gui,
        Permissions.uiQuickMarcQuickMarcAuthoritiesEditorAll.gui,
        Permissions.uiQuickMarcQuickMarcAuthorityLinkUnlink.gui,
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
    Users.deleteViaApi(testData.userProperties.userId);
    InventoryInstance.deleteInstanceViaApi(createdRecordIDs[0]);
    MarcAuthority.deleteViaAPI(createdRecordIDs[1]);
  });

  it(
    'C374136 Edit tag value ("100") in the "MARC Authority" record which controls "MARC Bib(s)" (spitfire) (TaaS)',
    { tags: ['extendedPath', 'spitfire'] },
    () => {
      MarcAuthorities.searchBy(testData.searchOption, testData.searchValue);

      MarcAuthority.edit();
      let previousTagValue = testData.tag100;
      testData.newTagValues.forEach((newTagValue) => {
        const callOutMessage =
          newTagValue === testData.tag101
            ? testData.cannotSaveRecordCollout
            : testData.cannotChangeSavedFieldCallout;
        QuickMarcEditor.updateExistingTagName(previousTagValue, newTagValue);
        QuickMarcEditor.pressSaveAndClose();
        QuickMarcEditor.checkCallout(callOutMessage);
        QuickMarcEditor.closeCallout();
        previousTagValue = newTagValue;
      });

      QuickMarcEditor.updateExistingTagName(testData.tag101, testData.tag100);
      QuickMarcEditor.checkButtonsDisabled();

      QuickMarcEditor.updateExistingField(testData.tag100, testData.newAuthority100FieldValue);
      QuickMarcEditor.pressSaveAndClose();
      QuickMarcEditor.checkCallout(testData.tag100Callout);
    },
  );
});
