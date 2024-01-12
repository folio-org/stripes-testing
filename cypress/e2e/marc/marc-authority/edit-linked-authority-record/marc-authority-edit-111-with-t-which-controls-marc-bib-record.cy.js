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
    tag111: '111',
    tag129: '129',
    tag240: '240',
    authority111FieldValue: 'Conference on Security and Cooperation in Europe',
    newAuthority111FieldValue:
      '$a Conference on Security and Cooperation in Europe $d (1972-1975 : $c Helsinki, Finland). $l English',
    newTagValuesSaveAndClose: ['100', '110', '130'],
    newTagValuesSaveAndKeepEditing: ['150', '151', '155'],
    searchOption: 'Keyword',
    browseSearchOption: 'Name-title',
    cannotChangeCalloutMessage:
      'Cannot change the saved MARC authority field 111 because it controls a bibliographic field(s). To change this 1XX, you must unlink all controlled bibliographic fields.',
    cannotSaveCalloutMessage: 'Record cannot be saved without 1XX field.',
    cannotRemoveCalloutMessage:
      'Cannot remove $t from the $111 field because it controls a bibliographic field(s) that requires  this subfield. To change this 1XX value, you must unlink all controlled bibliographic fields that requires $t to be controlled.',
  };

  const marcFiles = [
    {
      marc: 'marcBibFileForC374142.mrc',
      fileName: `testMarcFileC374142.${getRandomPostfix()}.mrc`,
      jobProfileToRun: 'Default - Create instance and SRS MARC Bib',
    },
    {
      marc: 'marcAuthFileForC374142.mrc',
      fileName: `testMarcFileC374142.${getRandomPostfix()}.mrc`,
      jobProfileToRun: 'Default - Create SRS MARC Authority',
      authorityHeading:
        'C374142 Conference on Security and Cooperation in Europe (1972-1975 : Helsinki, Finland). Helsinki Final Act',
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
        Logs.waitFileIsImported(marcFile.fileName);
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
      InventoryInstance.verifyAndClickLinkIcon(testData.tag240);
      InventoryInstance.verifySelectMarcAuthorityModal();
      MarcAuthorities.switchToSearch();
      InventoryInstance.verifySearchOptions();
      InventoryInstance.searchResults(marcFiles[1].authorityHeading);
      MarcAuthorities.checkFieldAndContentExistence(
        testData.tag111,
        testData.authority111FieldValue,
      );
      InventoryInstance.clickLinkButton();
      QuickMarcEditor.verifyAfterLinkingAuthority(testData.tag240);
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
    cy.getAdminToken();
    Users.deleteViaApi(testData.userProperties.userId);
    InventoryInstance.deleteInstanceViaApi(createdRecordIDs[0]);
    MarcAuthority.deleteViaAPI(createdRecordIDs[1]);
  });

  it(
    'C374142 Edit tag value ("111 which has "$t") in the "MARC Authority" record which controls "MARC Bib(s)" (spitfire) (TaaS)',
    { tags: ['extendedPath', 'spitfire'] },
    () => {
      MarcAuthorities.switchToBrowse();
      MarcAuthorities.searchByParameter(testData.browseSearchOption, marcFiles[1].authorityHeading);

      MarcAuthorities.selectTitle(marcFiles[1].authorityHeading);
      MarcAuthority.edit();

      let previousTagValue = testData.tag111;
      testData.newTagValuesSaveAndClose.forEach((newTagValue) => {
        QuickMarcEditor.updateExistingTagName(previousTagValue, newTagValue);
        QuickMarcEditor.pressSaveAndClose();
        QuickMarcEditor.checkCallout(testData.cannotChangeCalloutMessage);
        QuickMarcEditor.closeCallout();
        previousTagValue = newTagValue;
      });

      testData.newTagValuesSaveAndKeepEditing.forEach((newTagValue) => {
        QuickMarcEditor.updateExistingTagName(previousTagValue, newTagValue);
        QuickMarcEditor.pressSaveAndKeepEditing(testData.cannotChangeCalloutMessage);
        QuickMarcEditor.closeCallout();
        previousTagValue = newTagValue;
      });

      QuickMarcEditor.updateExistingTagName(previousTagValue, testData.tag129);
      QuickMarcEditor.pressSaveAndClose();
      QuickMarcEditor.checkCallout(testData.cannotSaveCalloutMessage);
      QuickMarcEditor.closeCallout();

      QuickMarcEditor.updateExistingTagName(testData.tag129, testData.tag111);
      QuickMarcEditor.checkButtonsDisabled();

      QuickMarcEditor.updateExistingField(testData.tag111, testData.newAuthority111FieldValue);
      QuickMarcEditor.checkButtonsEnabled();

      QuickMarcEditor.pressSaveAndKeepEditing(testData.cannotRemoveCalloutMessage);
      QuickMarcEditor.closeCallout();
    },
  );
});
