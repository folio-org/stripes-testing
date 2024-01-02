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
import MarcAuthoritiesSearch from '../../../../support/fragments/marcAuthority/marcAuthoritiesSearch';

describe('MARC Authority -> Edit linked Authority record', () => {
  const testData = {
    tag110: '110',
    tag110content: '$a C374139 Beatles $t test',
    tagsForChanging: ['100', '101', '110', '111', '130', '150', '151', '155'],
    createdRecordIDs: [],
    searchOption: 'Keyword',
    marcValue: 'Best, Pete,',
    errorMessageAfterChangingTag:
      'Cannot change the saved MARC authority field 110 because it controls a bibliographic field(s). To change this 1XX, you must unlink all controlled bibliographic fields.',
    errorMessageAfterSaving: 'Record cannot be saved without 1XX field.',
    errorMessageAfterAddingSubfield:
      'Cannot add a $t to the $110 field because it controls a bibliographic field(s) that cannot control this subfield. To change this 1XX value, you must unlink all controlled bibliographic fields that cannot control $t.',
  };
  const marcFiles = [
    {
      marc: 'marcBibFileC374139.mrc',
      fileName: `testMarcFileC374139${getRandomPostfix()}.mrc`,
      jobProfileToRun: 'Default - Create instance and SRS MARC Bib',
    },
    {
      marc: 'marcAuthFileC374139.mrc',
      fileName: `testMarcFileC374139${getRandomPostfix()}.mrc`,
      jobProfileToRun: 'Default - Create SRS MARC Authority',
    },
  ];
  const linkingTagAndValue = {
    rowIndex: 33,
    value: 'C374139 Beatles',
    tag: '110',
  };

  before('Creating user, importing and linking records', () => {
    cy.getAdminToken();
    cy.loginAsAdmin().then(() => {
      marcFiles.forEach((marcFile) => {
        cy.visit(TopMenu.dataImportPath);
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
      });
    });

    cy.visit(TopMenu.inventoryPath).then(() => {
      InventoryInstances.searchByTitle(testData.createdRecordIDs[0]);
      InventoryInstances.selectInstance();
      InventoryInstance.editMarcBibliographicRecord();
      InventoryInstance.verifyAndClickLinkIcon(linkingTagAndValue.tag);
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

    cy.createTempUser([
      Permissions.uiMarcAuthoritiesAuthorityRecordView.gui,
      Permissions.uiMarcAuthoritiesAuthorityRecordEdit.gui,
      Permissions.uiQuickMarcQuickMarcAuthoritiesEditorAll.gui,
      Permissions.uiQuickMarcQuickMarcAuthorityLinkUnlink.gui,
    ]).then((createdUserProperties) => {
      testData.user = createdUserProperties;

      cy.login(testData.user.username, testData.user.password, {
        path: TopMenu.marcAuthorities,
        waiter: MarcAuthorities.waitLoading,
      });
    });
  });

  after('Deleting user, data', () => {
    cy.getAdminToken().then(() => {
      Users.deleteViaApi(testData.user.userId);
      testData.createdRecordIDs.forEach((id, index) => {
        if (index) MarcAuthority.deleteViaAPI(id);
        else InventoryInstance.deleteInstanceViaApi(id);
      });
    });
  });

  it(
    'C374139 Edit tag value ("110") in the "MARC Authority" record which controls "MARC Bib(s)" (spitfire) (TaaS)',
    { tags: ['extendedPath', 'spitfire'] },
    () => {
      MarcAuthorities.waitLoading();
      MarcAuthoritiesSearch.searchBy(testData.searchOption, testData.marcValue);
      MarcAuthority.waitLoading();
      MarcAuthority.edit();
      QuickMarcEditor.checkContent(`$a ${linkingTagAndValue.value}`, 20);

      QuickMarcEditor.updateExistingTagName(
        testData.tagsForChanging[2],
        testData.tagsForChanging[0],
      );
      QuickMarcEditor.pressSaveAndClose();
      QuickMarcEditor.checkCallout(testData.errorMessageAfterChangingTag);
      QuickMarcEditor.closeCallout();

      QuickMarcEditor.updateExistingTagName(
        testData.tagsForChanging[0],
        testData.tagsForChanging[3],
      );
      QuickMarcEditor.pressSaveAndClose();
      QuickMarcEditor.checkCallout(testData.errorMessageAfterChangingTag);
      QuickMarcEditor.closeCallout();

      QuickMarcEditor.updateExistingTagName(
        testData.tagsForChanging[3],
        testData.tagsForChanging[4],
      );
      QuickMarcEditor.pressSaveAndClose();
      QuickMarcEditor.checkCallout(testData.errorMessageAfterChangingTag);
      QuickMarcEditor.closeCallout();

      QuickMarcEditor.updateExistingTagName(
        testData.tagsForChanging[4],
        testData.tagsForChanging[5],
      );
      QuickMarcEditor.pressSaveAndClose();
      QuickMarcEditor.checkCallout(testData.errorMessageAfterChangingTag);
      QuickMarcEditor.closeCallout();

      QuickMarcEditor.updateExistingTagName(
        testData.tagsForChanging[5],
        testData.tagsForChanging[6],
      );
      QuickMarcEditor.pressSaveAndClose();
      QuickMarcEditor.checkCallout(testData.errorMessageAfterChangingTag);
      QuickMarcEditor.closeCallout();

      QuickMarcEditor.updateExistingTagName(
        testData.tagsForChanging[6],
        testData.tagsForChanging[7],
      );
      QuickMarcEditor.pressSaveAndClose();
      QuickMarcEditor.checkCallout(testData.errorMessageAfterChangingTag);
      QuickMarcEditor.closeCallout();

      QuickMarcEditor.updateExistingTagName(
        testData.tagsForChanging[7],
        testData.tagsForChanging[1],
      );
      QuickMarcEditor.pressSaveAndClose();
      QuickMarcEditor.checkCallout(testData.errorMessageAfterSaving);
      QuickMarcEditor.closeCallout();

      QuickMarcEditor.updateExistingTagName(
        testData.tagsForChanging[1],
        testData.tagsForChanging[2],
      );
      QuickMarcEditor.checkButtonsDisabled();
      QuickMarcEditor.updateExistingField(testData.tag110, testData.tag110content);
      QuickMarcEditor.checkButtonsEnabled();
      QuickMarcEditor.pressSaveAndKeepEditing(testData.errorMessageAfterAddingSubfield);
    },
  );
});
