import { DEFAULT_JOB_PROFILE_NAMES } from '../../../../support/constants';
import Permissions from '../../../../support/dictionary/permissions';
import DataImport from '../../../../support/fragments/data_import/dataImport';
import InventoryInstance from '../../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../../support/fragments/inventory/inventoryInstances';
import MarcAuthorities from '../../../../support/fragments/marcAuthority/marcAuthorities';
import MarcAuthoritiesSearch from '../../../../support/fragments/marcAuthority/marcAuthoritiesSearch';
import MarcAuthority from '../../../../support/fragments/marcAuthority/marcAuthority';
import QuickMarcEditor from '../../../../support/fragments/quickMarcEditor';
import TopMenu from '../../../../support/fragments/topMenu';
import Users from '../../../../support/fragments/users/users';
import getRandomPostfix from '../../../../support/utils/stringTools';

describe('MARC', () => {
  describe('MARC Authority', () => {
    describe('Edit linked Authority record', () => {
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
          'Cannot remove $t from the $110 field because it controls a bibliographic field(s) that requires  this subfield. To change this 1XX value, you must unlink all controlled bibliographic fields that requires $t to be controlled.',
      };
      const marcFiles = [
        {
          marc: 'marcBibFileC374140.mrc',
          fileName: `C374140 testMarcFile${getRandomPostfix()}.mrc`,
          jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_INSTANCE_AND_SRS,
          propertyName: 'instance',
        },
        {
          marc: 'marcAuthFileC374140.mrc',
          fileName: `C374140 testMarcFile${getRandomPostfix()}.mrc`,
          jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_AUTHORITY,
          propertyName: 'authority',
          authorityHeading:
            'C374140 Egypt. C374140 Treaties, etc. 1978 September 17 (Framework for Peace in the Middle East)',
        },
      ];
      const linkingTagAndValue = {
        rowIndex: 10,
        value: 'C374140 Treaties',
        tag: '240',
      };

      before('Creating user, importing and linking records', () => {
        cy.getAdminToken();
        // make sure there are no duplicate authority records in the system
        MarcAuthorities.deleteMarcAuthorityByTitleViaAPI('C374140*');

        cy.getAdminToken();
        marcFiles.forEach((marcFile) => {
          DataImport.uploadFileViaApi(
            marcFile.marc,
            marcFile.fileName,
            marcFile.jobProfileToRun,
          ).then((response) => {
            response.forEach((record) => {
              testData.createdRecordIDs.push(record[marcFile.propertyName].id);
            });
          });
        });

        cy.loginAsAdmin();
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
          cy.wait(1500);
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
          cy.wait(2000);
          // tagsForChanging: ['100', '110', '111', '112', '130', '150', '151', '155'],
          QuickMarcEditor.updateExistingTagName(
            testData.tagsForChanging[1],
            testData.tagsForChanging[0],
          );
          QuickMarcEditor.pressSaveAndClose();
          QuickMarcEditor.checkErrorMessage(8, testData.errorMessageAfterChangingTag);

          QuickMarcEditor.updateExistingTagName(
            testData.tagsForChanging[0],
            testData.tagsForChanging[2],
          );
          QuickMarcEditor.pressSaveAndClose();
          QuickMarcEditor.checkErrorMessage(8, testData.errorMessageAfterChangingTag);

          QuickMarcEditor.updateExistingTagName(
            testData.tagsForChanging[2],
            testData.tagsForChanging[4],
          );
          QuickMarcEditor.pressSaveAndClose();
          QuickMarcEditor.checkErrorMessage(8, testData.errorMessageAfterChangingTag);

          QuickMarcEditor.updateExistingTagName(
            testData.tagsForChanging[4],
            testData.tagsForChanging[5],
          );
          QuickMarcEditor.pressSaveAndClose();
          QuickMarcEditor.checkErrorMessage(8, testData.errorMessageAfterChangingTag);

          QuickMarcEditor.updateExistingTagName(
            testData.tagsForChanging[5],
            testData.tagsForChanging[6],
          );
          QuickMarcEditor.pressSaveAndClose();
          QuickMarcEditor.checkErrorMessage(8, testData.errorMessageAfterChangingTag);

          QuickMarcEditor.updateExistingTagName(
            testData.tagsForChanging[6],
            testData.tagsForChanging[7],
          );
          QuickMarcEditor.pressSaveAndClose();
          QuickMarcEditor.checkErrorMessage(8, testData.errorMessageAfterChangingTag);

          QuickMarcEditor.updateExistingTagName(
            testData.tagsForChanging[7],
            testData.tagsForChanging[3],
          );
          QuickMarcEditor.pressSaveAndClose();
          QuickMarcEditor.checkErrorMessage(8, testData.errorMessageAfterChangingTag);

          QuickMarcEditor.updateExistingTagName(
            testData.tagsForChanging[3],
            testData.tagsForChanging[1],
          );
          QuickMarcEditor.checkButtonsDisabled();
          QuickMarcEditor.updateExistingField(testData.tag110, testData.tag110changedContent);
          QuickMarcEditor.checkButtonsEnabled();
          QuickMarcEditor.checkButtonsEnabled();
          QuickMarcEditor.clickSaveAndKeepEditingButton();
          QuickMarcEditor.checkErrorMessage(8, testData.errorMessageAfterDeletingSubfield);
        },
      );
    });
  });
});
