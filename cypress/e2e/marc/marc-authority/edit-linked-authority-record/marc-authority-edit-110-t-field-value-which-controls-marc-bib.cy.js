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
    tag240: '240',
    tag110content:
      'C374140 Egypt. $t C374140 Treaties, etc. $g Israel, $d 1978 September 17 (Framework for Peace in the Middle East)',
    tag110changedContent:
      '$a Egypt. $g Israel, $d 1978 September 17 (Framework for Peace in the Middle East)',
    tagsForChanging: ['100', '110', '111', '112', '130', '150', '151', '155'],
    createdRecordIDs: [],
    searchOption: 'Keyword',
    marcValue: 'C374140 Egypt',
    errorMessageAfterChangingTag:
      'Cannot change the saved MARC authority field 110 because it controls a bibliographic field(s). To change this 1XX, you must unlink all controlled bibliographic fields.',
    errorMessageAfterSaving: 'Record cannot be saved without 1XX field.',
    errorMessageAfterDeletingSubfield:
      'Cannot remove $t from the $110 field because it controls a bibliographic field(s)',
  };
  const marcFiles = [
    {
      marc: 'marcBibFileC374140.mrc',
      fileName: `C374140 testMarcFile${getRandomPostfix()}.mrc`,
      jobProfileToRun: 'Default - Create instance and SRS MARC Bib',
    },
    {
      marc: 'marcAuthFileC374140.mrc',
      fileName: `C374140 testMarcFile${getRandomPostfix()}.mrc`,
      jobProfileToRun: 'Default - Create SRS MARC Authority',
      authorityHeading:
        'C374140 Egypt. C374140 Treaties, etc. 1978 September 17 (Framework for Peace in the Middle East)',
    },
  ];
  const linkingTagAndValue = {
    rowIndex: 11,
    value: 'C374140 Treaties',
    tag: '240',
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
    'C374140 Edit tag value ("110 which has "$t") in the "MARC Authority" record which controls "MARC Bib(s)" (spitfire) (TaaS)',
    { tags: ['extendedPath', 'spitfire'] },
    () => {
      MarcAuthorities.waitLoading();
      MarcAuthoritiesSearch.searchBy(testData.searchOption, testData.marcValue);
      MarcAuthorities.selectTitle(marcFiles[1].authorityHeading);
      MarcAuthority.waitLoading();
      MarcAuthority.edit();
      QuickMarcEditor.checkContent(`$a ${testData.tag110content}`, 8);
      // tagsForChanging: ['100', '110', '111', '112', '130', '150', '151', '155'],
      QuickMarcEditor.updateExistingTagName(
        testData.tagsForChanging[1],
        testData.tagsForChanging[0],
      );
      QuickMarcEditor.pressSaveAndClose();
      QuickMarcEditor.checkCallout(testData.errorMessageAfterChangingTag);
      QuickMarcEditor.closeCallout();

      QuickMarcEditor.updateExistingTagName(
        testData.tagsForChanging[0],
        testData.tagsForChanging[2],
      );
      QuickMarcEditor.pressSaveAndClose();
      QuickMarcEditor.checkCallout(testData.errorMessageAfterChangingTag);
      QuickMarcEditor.closeCallout();

      QuickMarcEditor.updateExistingTagName(
        testData.tagsForChanging[2],
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
        testData.tagsForChanging[3],
      );
      QuickMarcEditor.pressSaveAndClose();
      QuickMarcEditor.checkCallout(testData.errorMessageAfterSaving);
      QuickMarcEditor.closeCallout();

      QuickMarcEditor.updateExistingTagName(
        testData.tagsForChanging[3],
        testData.tagsForChanging[1],
      );
      QuickMarcEditor.checkButtonsDisabled();
      QuickMarcEditor.updateExistingField(testData.tag110, testData.tag110changedContent);
      QuickMarcEditor.checkButtonsEnabled();
      QuickMarcEditor.checkButtonsEnabled();
      QuickMarcEditor.pressSaveAndKeepEditing(testData.errorMessageAfterDeletingSubfield);
    },
  );
});
