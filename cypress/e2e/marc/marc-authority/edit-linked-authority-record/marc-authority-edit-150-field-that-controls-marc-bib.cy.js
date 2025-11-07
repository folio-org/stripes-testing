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
        tag149: '149',
        tag150: '150',
        tag151: '151',
        tag155: '155',
        tag650: '650',
        tag150RpwIndex: 9,
        authority150FieldValue: '$a C374144 Oratory',
        newAuthority150FieldValue: '$a Oratory $t test',
        searchOption: 'Keyword',
        authorized: 'Authorized',
        reference: 'Reference',
        cannotChangeCalloutMessage:
          'Cannot change the saved MARC authority field 150 because it controls a bibliographic field(s). To change this 1XX, you must unlink all controlled bibliographic fields.',
        cannotSaveCalloutMessage: 'Record cannot be saved without 1XX field.',
        cannotAddCalloutMessage:
          'Cannot add a $t to the 150 field because it controls a bibliographic field(s) that cannot control this subfield. To change this 1XX value, you must unlink all controlled bibliographic fields that cannot control $t.',
      };

      const marcFiles = [
        {
          marc: 'marcBibFileForC374144.mrc',
          fileName: `C374144 testMarcFile${getRandomPostfix()}.mrc`,
          jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_INSTANCE_AND_SRS,
          instanceTitle: 'C374144 Oratory, Primitive',
          propertyName: 'instance',
        },
        {
          marc: 'marcAuthFileForC374144.mrc',
          fileName: `C374144testMarcFile${getRandomPostfix()}.mrc`,
          jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_AUTHORITY,
          authorityHeading: 'C374144 Oratory',
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
            query: 'keyword="374144" and (authRefType==("Authorized" or "Auth/Ref"))',
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
          InventoryInstance.verifyAndClickLinkIcon(testData.tag650);
          InventoryInstance.verifySelectMarcAuthorityModal();
          MarcAuthorities.switchToSearch();
          InventoryInstance.searchResults(marcFiles[0].instanceTitle);
          MarcAuthorities.checkFieldAndContentExistence(
            testData.tag150,
            testData.authority150FieldValue,
          );
          InventoryInstance.clickLinkButton();
          QuickMarcEditor.verifyAfterLinkingAuthority(testData.tag650);
          QuickMarcEditor.saveAndCloseWithValidationWarnings();
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
        'C374144 Edit tag value ("150") in the "MARC Authority" record which controls "MARC Bib(s)" (spitfire) (TaaS)',
        { tags: ['extendedPath', 'spitfire', 'C374144'] },
        () => {
          MarcAuthorities.searchBy(testData.searchOption, marcFiles[1].authorityHeading);

          MarcAuthorities.checkAuthorizedReferenceColumn(testData.authorized, testData.reference);
          MarcAuthorities.selectItem(marcFiles[0].instanceTitle, false);

          MarcAuthority.edit();
          QuickMarcEditor.checkContent(testData.authority150FieldValue, testData.tag150RpwIndex);
          cy.wait(2000);

          QuickMarcEditor.updateExistingTagName(testData.tag150, testData.tag100);
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

          QuickMarcEditor.updateExistingTagName(testData.tag130, testData.tag151);
          QuickMarcEditor.pressSaveAndCloseButton();
          QuickMarcEditor.checkErrorMessage(9, testData.cannotChangeCalloutMessage);

          QuickMarcEditor.updateExistingTagName(testData.tag151, testData.tag155);
          QuickMarcEditor.pressSaveAndCloseButton();
          QuickMarcEditor.checkErrorMessage(9, testData.cannotChangeCalloutMessage);

          QuickMarcEditor.updateExistingTagName(testData.tag155, testData.tag149);
          QuickMarcEditor.checkErrorMessage(9, testData.cannotChangeCalloutMessage);

          QuickMarcEditor.updateExistingTagName(testData.tag149, testData.tag150);
          QuickMarcEditor.checkButtonsDisabled();

          QuickMarcEditor.updateExistingFieldContent(
            testData.tag150RpwIndex,
            testData.newAuthority150FieldValue,
          );
          QuickMarcEditor.checkButtonsEnabled();

          QuickMarcEditor.clickSaveAndKeepEditingButton();
          QuickMarcEditor.checkErrorMessage(9, testData.cannotAddCalloutMessage);
        },
      );
    });
  });
});
