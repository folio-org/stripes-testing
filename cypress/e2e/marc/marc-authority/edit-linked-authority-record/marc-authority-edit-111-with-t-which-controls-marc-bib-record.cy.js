import { DEFAULT_JOB_PROFILE_NAMES } from '../../../../support/constants';
import { Permissions } from '../../../../support/dictionary';
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
          'Cannot remove $t from the 111 field because it controls a bibliographic field(s) that requires this subfield. To change this 1XX value, you must unlink all controlled bibliographic fields that requires $t to be controlled.',
      };

      const marcFiles = [
        {
          marc: 'marcBibFileForC374142.mrc',
          fileName: `C374142 testMarcFile${getRandomPostfix()}.mrc`,
          jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_INSTANCE_AND_SRS,
          propertyName: 'instance',
        },
        {
          marc: 'marcAuthFileForC374142.mrc',
          fileName: `testMarcFileC374142.${getRandomPostfix()}.mrc`,
          jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_AUTHORITY,
          propertyName: 'authority',
          authorityHeading:
            'C374142 Conference on Security and Cooperation in Europe (1972-1975 : Helsinki, Finland). Helsinki Final Act',
        },
      ];

      const createdRecordIDs = [];

      before('Create test data', () => {
        cy.createTempUser([Permissions.moduleDataImportEnabled.gui]).then((userProperties) => {
          testData.preconditionUserId = userProperties.userId;

          // make sure there are no duplicate authority records in the system
          MarcAuthorities.deleteMarcAuthorityByTitleViaAPI('C374142');

          marcFiles.forEach((marcFile) => {
            DataImport.uploadFileViaApi(
              marcFile.marc,
              marcFile.fileName,
              marcFile.jobProfileToRun,
            ).then((response) => {
              response.forEach((record) => {
                createdRecordIDs.push(record[marcFile.propertyName].id);
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
          InventoryInstances.searchByTitle(createdRecordIDs[0]);
          InventoryInstances.selectInstance();
          InventoryInstance.editMarcBibliographicRecord();
          InventoryInstance.verifyAndClickLinkIcon(testData.tag240);
          InventoryInstance.verifySelectMarcAuthorityModal();
          MarcAuthorities.switchToSearch();
          InventoryInstance.verifySearchOptions();
          InventoryInstance.searchResults(marcFiles[1].authorityHeading);
          MarcAuthoritiesSearch.selectExcludeReferencesFilter();
          MarcAuthorities.checkFieldAndContentExistence(
            testData.tag111,
            testData.authority111FieldValue,
          );
          InventoryInstance.clickLinkButton();
          QuickMarcEditor.verifyAfterLinkingAuthority(testData.tag240);
          QuickMarcEditor.pressSaveAndClose();
          QuickMarcEditor.checkAfterSaveAndClose();

          cy.createTempUser([
            Permissions.uiMarcAuthoritiesAuthorityRecordEdit.gui,
            Permissions.uiMarcAuthoritiesAuthorityRecordView.gui,
            Permissions.uiQuickMarcQuickMarcAuthoritiesEditorAll.gui,
            Permissions.uiQuickMarcQuickMarcAuthorityLinkUnlink.gui,
          ]).then((createdUserProperties) => {
            testData.userProperties = createdUserProperties;

            cy.waitForAuthRefresh(() => {
              cy.login(testData.userProperties.username, testData.userProperties.password, {
                path: TopMenu.marcAuthorities,
                waiter: MarcAuthorities.waitLoading,
              });
            }, 20_000);
          });
        });
      });

      after('Delete test data', () => {
        cy.getAdminToken();
        Users.deleteViaApi(testData.userProperties.userId);
        Users.deleteViaApi(testData.preconditionUserId);
        InventoryInstance.deleteInstanceViaApi(createdRecordIDs[0]);
        MarcAuthority.deleteViaAPI(createdRecordIDs[1]);
      });

      it(
        'C374142 Edit tag value ("111 which has "$t") in the "MARC Authority" record which controls "MARC Bib(s)" (spitfire) (TaaS)',
        { tags: ['extendedPath', 'spitfire', 'C374142'] },
        () => {
          MarcAuthorities.switchToBrowse();
          MarcAuthorities.searchByParameter(
            testData.browseSearchOption,
            marcFiles[1].authorityHeading,
          );

          MarcAuthorities.selectTitle(marcFiles[1].authorityHeading);
          MarcAuthority.edit();
          cy.wait(2000);

          let previousTagValue = testData.tag111;
          testData.newTagValuesSaveAndClose.forEach((newTagValue) => {
            QuickMarcEditor.updateExistingTagName(previousTagValue, newTagValue);
            QuickMarcEditor.pressSaveAndClose();
            QuickMarcEditor.checkErrorMessage(10, testData.cannotChangeCalloutMessage);
            previousTagValue = newTagValue;
          });

          testData.newTagValuesSaveAndKeepEditing.forEach((newTagValue) => {
            QuickMarcEditor.updateExistingTagName(previousTagValue, newTagValue);
            QuickMarcEditor.clickSaveAndKeepEditingButton();
            QuickMarcEditor.checkErrorMessage(10, testData.cannotChangeCalloutMessage);
            previousTagValue = newTagValue;
          });

          QuickMarcEditor.updateExistingTagName(previousTagValue, testData.tag129);
          QuickMarcEditor.pressSaveAndClose();
          QuickMarcEditor.checkErrorMessage(10, testData.cannotChangeCalloutMessage);

          QuickMarcEditor.updateExistingTagName(testData.tag129, testData.tag111);
          QuickMarcEditor.checkButtonsDisabled();

          QuickMarcEditor.updateExistingField(testData.tag111, testData.newAuthority111FieldValue);
          QuickMarcEditor.checkButtonsEnabled();

          QuickMarcEditor.clickSaveAndKeepEditingButton();
          QuickMarcEditor.checkErrorMessage(10, testData.cannotRemoveCalloutMessage);
        },
      );
    });
  });
});
