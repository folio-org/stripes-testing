import { DEFAULT_JOB_PROFILE_NAMES } from '../../../../support/constants';
import Permissions from '../../../../support/dictionary/permissions';
import DataImport from '../../../../support/fragments/data_import/dataImport';
import InventoryInstance from '../../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../../support/fragments/inventory/inventoryInstances';
import MarcAuthorities from '../../../../support/fragments/marcAuthority/marcAuthorities';
import MarcAuthority from '../../../../support/fragments/marcAuthority/marcAuthority';
import QuickMarcEditor from '../../../../support/fragments/quickMarcEditor';
import TopMenu from '../../../../support/fragments/topMenu';
import Users from '../../../../support/fragments/users/users';
import getRandomPostfix from '../../../../support/utils/stringTools';

describe('MARC', () => {
  describe('MARC Authority', () => {
    describe('Edit linked Authority record', () => {
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
          'Cannot add a $t to the 111 field because it controls a bibliographic field(s) that cannot control this subfield. To change this 1XX value, you must unlink all controlled bibliographic fields that cannot control $t.',
      };
      const marcFiles = [
        {
          marc: 'marcBibFileC374141.mrc',
          fileName: `C374141 testMarcFile${getRandomPostfix()}.mrc`,
          jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_INSTANCE_AND_SRS,
          propertyName: 'instance',
        },
        {
          marc: 'marcAuthFileC374141.mrc',
          fileName: `C374141 testMarcFile${getRandomPostfix()}.mrc`,
          jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_AUTHORITY,
          propertyName: 'authority',
        },
      ];
      const linkingTagAndValue = {
        rowIndex: 14,
        value: 'C374141 Stockholm International Film Festival',
        tag: '111',
      };

      before('Creating user, importing and linking records', () => {
        cy.createTempUser([Permissions.moduleDataImportEnabled.gui]).then((userProperties) => {
          testData.preconditionUserId = userProperties.userId;

          // make sure there are no duplicate authority records in the system
          MarcAuthorities.getMarcAuthoritiesViaApi({ limit: 100, query: 'keyword="C374141"' }).then(
            (records) => {
              records.forEach((record) => {
                if (record.authRefType === 'Authorized') {
                  MarcAuthority.deleteViaAPI(record.id);
                }
              });
            },
          );

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

        cy.createTempUser([
          Permissions.uiMarcAuthoritiesAuthorityRecordView.gui,
          Permissions.uiMarcAuthoritiesAuthorityRecordEdit.gui,
          Permissions.uiQuickMarcQuickMarcAuthoritiesEditorAll.gui,
          Permissions.uiQuickMarcQuickMarcAuthorityLinkUnlink.gui,
        ]).then((userProperties) => {
          testData.user = userProperties;

          cy.loginAsAdmin({
            path: TopMenu.inventoryPath,
            waiter: InventoryInstances.waitContentLoading,
          }).then(() => {
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
        Users.deleteViaApi(testData.preconditionUserId);
        testData.createdRecordIDs.forEach((id, index) => {
          if (index) MarcAuthority.deleteViaAPI(id, true);
          else InventoryInstance.deleteInstanceViaApi(id);
        });
      });

      it(
        'C374141 Edit tag value ("111") in the "MARC Authority" record which controls "MARC Bib(s)" (spitfire) (TaaS)',
        { tags: ['extendedPath', 'spitfire', 'C374141'] },
        () => {
          MarcAuthorities.selectTitle(testData.marcValue);
          MarcAuthority.waitLoading();
          MarcAuthority.edit();
          QuickMarcEditor.checkContent(`${testData.tag111content}`, 8);
          cy.wait(2000);

          QuickMarcEditor.updateExistingTagName(testData.tag111, testData.tag100);
          QuickMarcEditor.pressSaveAndCloseButton();
          QuickMarcEditor.checkErrorMessage(8, testData.errorMessageAfterChangingTag);

          QuickMarcEditor.updateExistingTagName(testData.tag100, testData.tag110);
          QuickMarcEditor.pressSaveAndCloseButton();
          QuickMarcEditor.checkErrorMessage(8, testData.errorMessageAfterChangingTag);

          QuickMarcEditor.updateExistingTagName(testData.tag110, testData.tag130);
          QuickMarcEditor.pressSaveAndCloseButton();
          QuickMarcEditor.checkErrorMessage(8, testData.errorMessageAfterChangingTag);

          QuickMarcEditor.updateExistingTagName(testData.tag130, testData.tag150);
          QuickMarcEditor.pressSaveAndCloseButton();
          QuickMarcEditor.checkErrorMessage(8, testData.errorMessageAfterChangingTag);

          QuickMarcEditor.updateExistingTagName(testData.tag150, testData.tag151);
          QuickMarcEditor.pressSaveAndCloseButton();
          QuickMarcEditor.checkErrorMessage(8, testData.errorMessageAfterChangingTag);

          QuickMarcEditor.updateExistingTagName(testData.tag151, testData.tag155);
          QuickMarcEditor.pressSaveAndCloseButton();
          QuickMarcEditor.checkErrorMessage(8, testData.errorMessageAfterChangingTag);

          QuickMarcEditor.updateExistingTagName(testData.tag155, testData.tag109);
          QuickMarcEditor.pressSaveAndCloseButton();
          QuickMarcEditor.checkErrorMessage(8, testData.errorMessageAfterChangingTag);

          QuickMarcEditor.updateExistingTagName(testData.tag109, testData.tag111);
          QuickMarcEditor.checkButtonsDisabled();
          QuickMarcEditor.updateExistingField(testData.tag111, testData.newTag111content);
          QuickMarcEditor.checkButtonsEnabled();
          QuickMarcEditor.clickSaveAndKeepEditingButton();
          QuickMarcEditor.checkErrorMessage(8, testData.errorMessageAfterAddingSubfield);
        },
      );
    });
  });
});
