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
        tag154: '154',
        tag155: '155',
        tag655: '655',
        tag155RowIndex: 7,
        tag655RowIndex: 52,
        authority155FieldValue: '$a C374146 Drama',
        newAuthority155FieldValue: '$a C374146 Drama $t test',
        searchOption: 'Keyword',
        authorized: 'Authorized',
        reference: 'Reference',
        cannotChangeCalloutMessage:
          'Cannot change the saved MARC authority field 155 because it controls a bibliographic field(s). To change this 1XX, you must unlink all controlled bibliographic fields.',
        cannotSaveCalloutMessage: 'Record cannot be saved without 1XX field.',
        cannotAddCalloutMessage:
          'Cannot add a $t to the 155 field because it controls a bibliographic field(s) that cannot control this subfield. To change this 1XX value, you must unlink all controlled bibliographic fields that cannot control $t.',
      };

      const marcFiles = [
        {
          marc: 'marcBibFileForC374146.mrc',
          fileName: `testMarcFileC374146.${getRandomPostfix()}.mrc`,
          jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_INSTANCE_AND_SRS,
          instanceTitle: 'C374146 Drama',
          propertyName: 'instance',
        },
        {
          marc: 'marcAuthFileForC374146.mrc',
          fileName: `testMarcFileC374146.${getRandomPostfix()}.mrc`,
          jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_AUTHORITY,
          authorityHeading: 'Drama',
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
            query: 'keyword="374146" and (authRefType==("Authorized" or "Auth/Ref"))',
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
          cy.reload();
          InventoryInstances.waitContentLoading();
        }, 20_000).then(() => {
          InventoryInstances.searchByTitle(createdRecordIDs[0]);
          InventoryInstances.selectInstance();
          InventoryInstance.editMarcBibliographicRecord();
          InventoryInstance.verifyAndClickLinkIconByIndex(testData.tag655RowIndex);
          InventoryInstance.verifySelectMarcAuthorityModal();
          MarcAuthorities.switchToSearch();
          InventoryInstance.searchResults(marcFiles[0].instanceTitle);
          MarcAuthorities.checkFieldAndContentExistence(
            testData.tag155,
            testData.authority155FieldValue,
          );
          InventoryInstance.clickLinkButton();
          QuickMarcEditor.verifyAfterLinkingAuthorityByIndex(
            testData.tag655RowIndex,
            testData.tag655,
          );
          QuickMarcEditor.pressSaveAndClose();
          cy.wait(1500);
          QuickMarcEditor.pressSaveAndClose();
          cy.wait(3_000);

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
              cy.reload();
              MarcAuthorities.waitLoading();
            }, 20_000);
          });
        });
      });

      after('Delete test data', () => {
        cy.getAdminToken();
        InventoryInstance.deleteInstanceViaApi(createdRecordIDs[0]);
        MarcAuthority.deleteViaAPI(createdRecordIDs[1]);
        Users.deleteViaApi(testData.userProperties.userId);
        Users.deleteViaApi(testData.preconditionUserId);
      });

      it(
        'C374146 Edit tag value ("155") in the "MARC Authority" record which controls "MARC Bib(s)" (spitfire) (TaaS)',
        { tags: ['extendedPath', 'spitfire', 'C374146'] },
        () => {
          MarcAuthorities.searchBy(testData.searchOption, marcFiles[1].authorityHeading);

          MarcAuthorities.checkAuthorizedColumn(testData.authorized);
          MarcAuthorities.selectItem(marcFiles[0].instanceTitle, false);

          MarcAuthority.edit();
          QuickMarcEditor.checkContent(testData.authority155FieldValue, testData.tag155RowIndex);
          cy.wait(2000);

          QuickMarcEditor.updateExistingTagName(testData.tag155, testData.tag100);
          QuickMarcEditor.pressSaveAndCloseButton();
          QuickMarcEditor.checkErrorMessage(7, testData.cannotChangeCalloutMessage);

          QuickMarcEditor.updateExistingTagName(testData.tag100, testData.tag110);
          QuickMarcEditor.pressSaveAndCloseButton();
          QuickMarcEditor.checkErrorMessage(7, testData.cannotChangeCalloutMessage);

          QuickMarcEditor.updateExistingTagName(testData.tag110, testData.tag111);
          QuickMarcEditor.clickSaveAndKeepEditingButton();
          QuickMarcEditor.checkErrorMessage(7, testData.cannotChangeCalloutMessage);

          QuickMarcEditor.updateExistingTagName(testData.tag111, testData.tag130);
          QuickMarcEditor.pressSaveAndCloseButton();
          QuickMarcEditor.checkErrorMessage(7, testData.cannotChangeCalloutMessage);

          QuickMarcEditor.updateExistingTagName(testData.tag130, testData.tag150);
          QuickMarcEditor.pressSaveAndCloseButton();
          QuickMarcEditor.checkErrorMessage(7, testData.cannotChangeCalloutMessage);

          QuickMarcEditor.updateExistingTagName(testData.tag150, testData.tag151);
          QuickMarcEditor.clickSaveAndKeepEditingButton();
          QuickMarcEditor.checkErrorMessage(7, testData.cannotChangeCalloutMessage);

          QuickMarcEditor.updateExistingTagName(testData.tag151, testData.tag154);
          // Todo: the below two lines should be uncommented once https://issues.folio.org/browse/UIQM-526 is resolved.
          // QuickMarcEditor.pressSaveAndKeepEditing(testData.cannotSaveCalloutMessage);
          // QuickMarcEditor.closeCallout();

          QuickMarcEditor.updateExistingTagName(testData.tag154, testData.tag155);
          QuickMarcEditor.checkButtonsDisabled();

          QuickMarcEditor.updateExistingFieldContent(
            testData.tag155RowIndex,
            testData.newAuthority155FieldValue,
          );
          QuickMarcEditor.checkButtonsEnabled();

          QuickMarcEditor.clickSaveAndKeepEditingButton();
          QuickMarcEditor.checkErrorMessage(7, testData.cannotAddCalloutMessage);
        },
      );
    });
  });
});
