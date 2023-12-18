import getRandomPostfix from '../../../../support/utils/stringTools';
import Permissions from '../../../../support/dictionary/permissions';
import TopMenu from '../../../../support/fragments/topMenu';
import DataImport from '../../../../support/fragments/data_import/dataImport';
import MarcAuthority from '../../../../support/fragments/marcAuthority/marcAuthority';
import Users from '../../../../support/fragments/users/users';
import JobProfiles from '../../../../support/fragments/data_import/job_profiles/jobProfiles';
import Logs from '../../../../support/fragments/data_import/logs/logs';
import MarcAuthorities from '../../../../support/fragments/marcAuthority/marcAuthorities';
import QuickMarcEditor from '../../../../support/fragments/quickMarcEditor';
import InventoryInstance from '../../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../../support/fragments/inventory/inventoryInstances';
import { JOB_STATUS_NAMES } from '../../../../support/constants';

describe('MARC Authority -> Edit linked Authority record', () => {
  const testData = {
    createdRecordIDs: [],
    marcValue: 'C374141 Stockholm International Film Festival',
    searchOption: 'Corporate/Conference name',
    tag111content: '$a C374141 Stockholm International Film Festival',
    newTag111content: '$a C374141 Stockholm International Film Festival $t test',
    tag109: '109',
    tag100: '100',
    tag110: '110',
    tag111: '111',
    tag130: '130',
    tag150: '150',
    tag151: '151',
    tag155: '155',
    errorMessageAfterChangingTag:
      'Cannot change the saved MARC authority field 111 because it controls a bibliographic field(s). To change this 1XX, you must unlink all controlled bibliographic fields.',
    errorMessageAfterSaving: 'Record cannot be saved without 1XX field.',
    errorMessageAfterAddingSubfield:
      'Cannot add a $t to the $111 field because it controls a bibliographic field(s) that cannot control this subfield. To change this 1XX value, you must unlink all controlled bibliographic fields that cannot control $t.',
  };
  const marcFiles = [
    {
      marc: 'marcBibFileC374141.mrc',
      fileName: `testMarcFileC374141${getRandomPostfix()}.mrc`,
      jobProfileToRun: 'Default - Create instance and SRS MARC Bib',
    },
    {
      marc: 'marcAuthFileC374141.mrc',
      fileName: `testMarcFileC374141${getRandomPostfix()}.mrc`,
      jobProfileToRun: 'Default - Create SRS MARC Authority',
    },
  ];
  const linkingTagAndValue = {
    rowIndex: 14,
    value: 'C374141 Stockholm International Film Festival',
    tag: '111',
  };

  before('Creating user, importing and linking records', () => {
    cy.getAdminToken();
    // make sure there are no duplicate authority records in the system
    cy.getAdminToken().then(() => {
      MarcAuthorities.getMarcAuthoritiesViaApi({ limit: 100, query: 'keyword="C374141"' }).then(
        (records) => {
          records.forEach((record) => {
            if (record.authRefType === 'Authorized') {
              MarcAuthority.deleteViaAPI(record.id);
            }
          });
        },
      );
    });
    cy.createTempUser([
      Permissions.uiMarcAuthoritiesAuthorityRecordView.gui,
      Permissions.uiMarcAuthoritiesAuthorityRecordEdit.gui,
      Permissions.uiQuickMarcQuickMarcAuthoritiesEditorAll.gui,
      Permissions.uiQuickMarcQuickMarcAuthorityLinkUnlink.gui,
    ]).then((userProperties) => {
      testData.user = userProperties;

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
              testData.createdRecordIDs.push(link.split('/')[5]);
            });
          },
        );
      });

      cy.visit(TopMenu.inventoryPath).then(() => {
        InventoryInstances.searchByTitle(testData.createdRecordIDs[0]);
        InventoryInstances.selectInstance();
        InventoryInstance.editMarcBibliographicRecord();
        InventoryInstance.verifyAndClickLinkIcon(testData.tag111);
        MarcAuthorities.switchToSearch();
        InventoryInstance.verifySelectMarcAuthorityModal();
        InventoryInstance.searchResults(linkingTagAndValue.value);
        InventoryInstance.clickLinkButton();
        QuickMarcEditor.verifyAfterLinkingUsingRowIndex(
          linkingTagAndValue.tag,
          linkingTagAndValue.rowIndex,
        );
        QuickMarcEditor.pressSaveAndClose();
        QuickMarcEditor.checkAfterSaveAndClose();
      });

      cy.login(testData.user.username, testData.user.password, {
        path: TopMenu.marcAuthorities,
        waiter: MarcAuthorities.waitLoading,
      });
      MarcAuthorities.switchToBrowse();
      MarcAuthorities.searchByParameter(testData.searchOption, testData.marcValue);
    });
  });

  after('Deleting user, data', () => {
    cy.getAdminToken();
    Users.deleteViaApi(testData.user.userId);
    testData.createdRecordIDs.forEach((id, index) => {
      if (index) MarcAuthority.deleteViaAPI(id);
      // else InventoryInstance.deleteInstanceViaApi(id);
    });
  });

  it(
    'C374141 Edit tag value ("111") in the "MARC Authority" record which controls "MARC Bib(s)" (spitfire) (TaaS)',
    { tags: ['extendedPath', 'spitfire'] },
    () => {
      MarcAuthorities.selectTitle(testData.marcValue);
      MarcAuthority.waitLoading();
      MarcAuthority.edit();
      QuickMarcEditor.checkContent(`${testData.tag111content}`, 8);

      QuickMarcEditor.updateExistingTagName(testData.tag111, testData.tag100);
      QuickMarcEditor.pressSaveAndClose();
      QuickMarcEditor.checkCallout(testData.errorMessageAfterChangingTag);
      QuickMarcEditor.closeCallout();

      QuickMarcEditor.updateExistingTagName(testData.tag100, testData.tag110);
      QuickMarcEditor.pressSaveAndClose();
      QuickMarcEditor.checkCallout(testData.errorMessageAfterChangingTag);
      QuickMarcEditor.closeCallout();

      QuickMarcEditor.updateExistingTagName(testData.tag110, testData.tag130);
      QuickMarcEditor.pressSaveAndClose();
      QuickMarcEditor.checkCallout(testData.errorMessageAfterChangingTag);
      QuickMarcEditor.closeCallout();

      QuickMarcEditor.updateExistingTagName(testData.tag130, testData.tag150);
      QuickMarcEditor.pressSaveAndClose();
      QuickMarcEditor.checkCallout(testData.errorMessageAfterChangingTag);
      QuickMarcEditor.closeCallout();

      QuickMarcEditor.updateExistingTagName(testData.tag150, testData.tag151);
      QuickMarcEditor.pressSaveAndClose();
      QuickMarcEditor.checkCallout(testData.errorMessageAfterChangingTag);
      QuickMarcEditor.closeCallout();

      QuickMarcEditor.updateExistingTagName(testData.tag151, testData.tag155);
      QuickMarcEditor.pressSaveAndClose();
      QuickMarcEditor.checkCallout(testData.errorMessageAfterChangingTag);
      QuickMarcEditor.closeCallout();

      QuickMarcEditor.updateExistingTagName(testData.tag155, testData.tag109);
      QuickMarcEditor.pressSaveAndClose();
      QuickMarcEditor.checkCallout(testData.errorMessageAfterSaving);
      QuickMarcEditor.closeCallout();

      QuickMarcEditor.updateExistingTagName(testData.tag109, testData.tag111);
      QuickMarcEditor.checkButtonsDisabled();
      QuickMarcEditor.updateExistingField(testData.tag111, testData.newTag111content);
      QuickMarcEditor.checkButtonsEnabled();
      QuickMarcEditor.pressSaveAndKeepEditing(testData.errorMessageAfterAddingSubfield);
    },
  );
});
