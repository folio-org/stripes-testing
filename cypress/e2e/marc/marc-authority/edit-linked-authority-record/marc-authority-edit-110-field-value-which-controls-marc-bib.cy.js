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
        tag110content: '$a C374139 Beatles $t test',
        tagsForChanging: ['100', '101', '110', '111', '130', '150', '151', '155'],
        createdRecordIDs: [],
        searchOption: 'Keyword',
        marcValue: 'Best, Pete,',
        errorMessageAfterChangingTag:
          'Cannot change the saved MARC authority field 110 because it controls a bibliographic field(s). To change this 1XX, you must unlink all controlled bibliographic fields.',
        errorMessageAfterSaving: 'Record cannot be saved without 1XX field.',
        errorMessageAfterAddingSubfield:
          'Cannot add a $t to the 110 field because it controls a bibliographic field(s) that cannot control this subfield. To change this 1XX value, you must unlink all controlled bibliographic fields that cannot control $t.',
      };
      const marcFiles = [
        {
          marc: 'marcBibFileC374139.mrc',
          fileName: `C374139 testMarcFile${getRandomPostfix()}.mrc`,
          jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_INSTANCE_AND_SRS,
          propertyName: 'instance',
        },
        {
          marc: 'marcAuthFileC374139.mrc',
          fileName: `C374139 testMarcFile${getRandomPostfix()}.mrc`,
          jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_AUTHORITY,
          propertyName: 'authority',
        },
      ];
      const linkingTagAndValue = {
        rowIndex: 33,
        value: 'C374139 Beatles',
        tag: '110',
      };

      before('Creating user, importing and linking records', () => {
        cy.createTempUser([Permissions.moduleDataImportEnabled.gui]).then((userProperties) => {
          testData.preconditionUserId = userProperties.userId;

          // make sure there are no duplicate records in the system
          MarcAuthorities.deleteMarcAuthorityByTitleViaAPI('C374139*');
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
            cy.wait(2000);
          });
        });

        cy.waitForAuthRefresh(() => {
          cy.loginAsAdmin({
            path: TopMenu.inventoryPath,
            waiter: InventoryInstances.waitContentLoading,
          });
        }, 20_000).then(() => {
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
          QuickMarcEditor.saveAndCloseWithValidationWarnings();
          QuickMarcEditor.checkAfterSaveAndClose();
        });

        cy.createTempUser([
          Permissions.uiMarcAuthoritiesAuthorityRecordView.gui,
          Permissions.uiMarcAuthoritiesAuthorityRecordEdit.gui,
          Permissions.uiQuickMarcQuickMarcAuthoritiesEditorAll.gui,
          Permissions.uiQuickMarcQuickMarcAuthorityLinkUnlink.gui,
        ]).then((createdUserProperties) => {
          testData.user = createdUserProperties;

          cy.waitForAuthRefresh(() => {
            cy.login(testData.user.username, testData.user.password, {
              path: TopMenu.marcAuthorities,
              waiter: MarcAuthorities.waitLoading,
            });
          }, 20_000);
        });
      });

      after('Deleting user, data', () => {
        cy.getAdminToken().then(() => {
          Users.deleteViaApi(testData.user.userId);
          Users.deleteViaApi(testData.preconditionUserId);
          testData.createdRecordIDs.forEach((id, index) => {
            if (index) MarcAuthority.deleteViaAPI(id, true);
            else InventoryInstance.deleteInstanceViaApi(id);
          });
        });
      });

      it(
        'C374139 Edit tag value ("110") in the "MARC Authority" record which controls "MARC Bib(s)" (spitfire) (TaaS)',
        { tags: ['extendedPath', 'spitfire', 'C374139'] },
        () => {
          MarcAuthorities.waitLoading();
          MarcAuthoritiesSearch.searchBy(testData.searchOption, testData.marcValue);
          cy.ifConsortia(true, () => {
            MarcAuthorities.clickAccordionByName('Shared');
            MarcAuthorities.actionsSelectCheckbox('No');
          });
          MarcAuthority.waitLoading();
          MarcAuthority.edit();
          QuickMarcEditor.checkContent(`$a ${linkingTagAndValue.value}`, 20);
          cy.wait(2000);

          QuickMarcEditor.updateExistingTagName(
            testData.tagsForChanging[2],
            testData.tagsForChanging[0],
          );
          QuickMarcEditor.pressSaveAndCloseButton();
          QuickMarcEditor.checkErrorMessage(20, testData.errorMessageAfterChangingTag);

          QuickMarcEditor.updateExistingTagName(
            testData.tagsForChanging[0],
            testData.tagsForChanging[3],
          );
          QuickMarcEditor.pressSaveAndCloseButton();
          QuickMarcEditor.checkErrorMessage(20, testData.errorMessageAfterChangingTag);

          QuickMarcEditor.updateExistingTagName(
            testData.tagsForChanging[3],
            testData.tagsForChanging[4],
          );
          QuickMarcEditor.pressSaveAndCloseButton();
          QuickMarcEditor.checkErrorMessage(20, testData.errorMessageAfterChangingTag);

          QuickMarcEditor.updateExistingTagName(
            testData.tagsForChanging[4],
            testData.tagsForChanging[5],
          );
          QuickMarcEditor.pressSaveAndCloseButton();
          QuickMarcEditor.checkErrorMessage(20, testData.errorMessageAfterChangingTag);

          QuickMarcEditor.updateExistingTagName(
            testData.tagsForChanging[5],
            testData.tagsForChanging[6],
          );
          QuickMarcEditor.pressSaveAndCloseButton();
          QuickMarcEditor.checkErrorMessage(20, testData.errorMessageAfterChangingTag);

          QuickMarcEditor.updateExistingTagName(
            testData.tagsForChanging[6],
            testData.tagsForChanging[7],
          );
          QuickMarcEditor.pressSaveAndCloseButton();
          QuickMarcEditor.checkErrorMessage(20, testData.errorMessageAfterChangingTag);

          QuickMarcEditor.updateExistingTagName(
            testData.tagsForChanging[7],
            testData.tagsForChanging[1],
          );
          QuickMarcEditor.pressSaveAndCloseButton();
          QuickMarcEditor.checkErrorMessage(20, testData.errorMessageAfterChangingTag);

          QuickMarcEditor.updateExistingTagName(
            testData.tagsForChanging[1],
            testData.tagsForChanging[2],
          );
          QuickMarcEditor.checkButtonsDisabled();
          QuickMarcEditor.updateExistingField(testData.tag110, testData.tag110content);
          QuickMarcEditor.checkButtonsEnabled();
          QuickMarcEditor.clickSaveAndKeepEditingButton();
          QuickMarcEditor.checkErrorMessage(20, testData.errorMessageAfterAddingSubfield);
        },
      );
    });
  });
});
