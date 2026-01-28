import { DEFAULT_JOB_PROFILE_NAMES } from '../../../../support/constants';
import { Permissions } from '../../../../support/dictionary';
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
        tag100: '100',
        tag110: '110',
        tag111: '111',
        tag130: '130',
        tag150: '150',
        tag151: '151',
        tag152: '152',
        tag155: '155',
        tag651: '651',
        tag151RpwIndex: 9,
        authority151FieldValue: '$a C374145 Clear Creek (Tex.)',
        newAuthority151FieldValue: '$a C374145 Clear Creek (Tex.) $t test',
        searchOption: 'Keyword',
        authorized: 'Authorized',
        reference: 'Reference',
        cannotChangeCalloutMessage:
          'Cannot change the saved MARC authority field 151 because it controls a bibliographic field(s). To change this 1XX, you must unlink all controlled bibliographic fields.',
        cannotSaveCalloutMessage: 'Record cannot be saved without 1XX field.',
        cannotAddCalloutMessage:
          'Cannot add a $t to the 151 field because it controls a bibliographic field(s) that cannot control this subfield. To change this 1XX value, you must unlink all controlled bibliographic fields that cannot control $t.',
      };

      const marcFiles = [
        {
          marc: 'marcBibFileForC374145.mrc',
          fileName: `C374145 testMarcFile${getRandomPostfix()}.mrc`,
          jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_INSTANCE_AND_SRS,
          instanceTitle: 'C374145 Clear Creek (Tex.)',
          propertyName: 'instance',
        },
        {
          marc: 'marcAuthFileForC374145.mrc',
          fileName: `C374145 testMarcFile${getRandomPostfix()}.mrc`,
          jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_AUTHORITY,
          authorityHeading: 'Clear Creek',
          propertyName: 'authority',
        },
      ];

      const createdRecordIDs = [];

      before('Create test data', () => {
        cy.createTempUser([Permissions.moduleDataImportEnabled.gui]).then((userProperties) => {
          testData.preconditionUserId = userProperties.userId;
          // make sure there are no duplicate authority records in the system
          MarcAuthorities.getMarcAuthoritiesViaApi({
            limit: 100,
            query: 'keyword="374145" and (authRefType==("Authorized" or "Auth/Ref"))',
          }).then((authorities) => {
            if (authorities) {
              authorities.forEach(({ id }) => {
                MarcAuthority.deleteViaAPI(id);
              });
            }
          });

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
          InventoryInstance.verifyAndClickLinkIcon(testData.tag651);
          InventoryInstance.verifySelectMarcAuthorityModal();
          MarcAuthorities.switchToSearch();
          InventoryInstance.searchResults(marcFiles[0].instanceTitle);
          MarcAuthorities.checkFieldAndContentExistence(
            testData.tag151,
            testData.authority151FieldValue,
          );
          InventoryInstance.clickLinkButton();
          QuickMarcEditor.verifyAfterLinkingAuthority(testData.tag651);
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
        'C374145 Edit tag value ("151") in the "MARC Authority" record which controls "MARC Bib(s)" (spitfire) (TaaS)',
        { tags: ['extendedPath', 'spitfire', 'C374145'] },
        () => {
          MarcAuthorities.searchBy(testData.searchOption, marcFiles[1].authorityHeading);

          MarcAuthorities.checkAuthorizedReferenceColumn(testData.authorized, testData.reference);
          MarcAuthorities.selectItem(marcFiles[0].instanceTitle, false);

          MarcAuthority.edit();
          QuickMarcEditor.checkContent(testData.authority151FieldValue, testData.tag151RpwIndex);
          cy.wait(2000);

          QuickMarcEditor.updateExistingTagName(testData.tag151, testData.tag100);
          QuickMarcEditor.pressSaveAndCloseButton();
          QuickMarcEditor.checkErrorMessage(9, testData.cannotChangeCalloutMessage);

          QuickMarcEditor.updateExistingTagName(testData.tag100, testData.tag110);
          QuickMarcEditor.pressSaveAndCloseButton();
          QuickMarcEditor.checkErrorMessage(9, testData.cannotChangeCalloutMessage);

          QuickMarcEditor.updateExistingTagName(testData.tag110, testData.tag111);
          QuickMarcEditor.clickSaveAndKeepEditingButton();
          QuickMarcEditor.checkErrorMessage(9, testData.cannotChangeCalloutMessage);

          QuickMarcEditor.updateExistingTagName(testData.tag111, testData.tag130);
          QuickMarcEditor.pressSaveAndCloseButton();
          QuickMarcEditor.checkErrorMessage(9, testData.cannotChangeCalloutMessage);

          QuickMarcEditor.updateExistingTagName(testData.tag130, testData.tag150);
          QuickMarcEditor.pressSaveAndCloseButton();
          QuickMarcEditor.checkErrorMessage(9, testData.cannotChangeCalloutMessage);

          QuickMarcEditor.updateExistingTagName(testData.tag150, testData.tag155);
          QuickMarcEditor.clickSaveAndKeepEditingButton();
          QuickMarcEditor.checkErrorMessage(9, testData.cannotChangeCalloutMessage);

          QuickMarcEditor.updateExistingTagName(testData.tag155, testData.tag152);
          // Todo: the below two lines should be uncommented once https://issues.folio.org/browse/UIQM-526 is resolved.
          // QuickMarcEditor.pressSaveAndKeepEditing(testData.cannotSaveCalloutMessage);
          // QuickMarcEditor.closeCallout();

          QuickMarcEditor.updateExistingTagName(testData.tag152, testData.tag151);
          QuickMarcEditor.checkButtonsDisabled();

          QuickMarcEditor.updateExistingFieldContent(
            testData.tag151RpwIndex,
            testData.newAuthority151FieldValue,
          );
          QuickMarcEditor.checkButtonsEnabled();

          QuickMarcEditor.clickSaveAndKeepEditingButton();
          QuickMarcEditor.checkErrorMessage(9, testData.cannotAddCalloutMessage);
        },
      );
    });
  });
});
