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
        tag101: '101',
        tag700: '700',
        tag700RowIndex: 33,
        authority100FieldValue: '$a C374136 Roberts, Julia, $d 1967-',
        newAuthority100FieldValue: '$a C374136 Roberts, Julia, $d 1967- $t test',
        searchOption: 'Keyword',
        searchValue: 'C374136 Roberts, Julia',
        newTagValues: ['110', '111', '130', '150', '151', '155', '101'],
        cannotChangeSavedFieldCallout:
          'Cannot change the saved MARC authority field 100 because it controls a bibliographic field(s). To change this 1XX, you must unlink all controlled bibliographic fields.',
        cannotSaveRecordCollout: 'Record cannot be saved without 1XX field.',
        changesSavedCallout:
          'This record has successfully saved and is in process. Changes may not appear immediately.',
        tag100Callout:
          'Cannot add a $t to the $100 field because it controls a bibliographic field(s) that cannot control this subfield. To change this 1XX value, you must unlink all controlled bibliographic fields that cannot control $t.',
      };

      const marcFiles = [
        {
          marc: 'marcBibFileForC374136.mrc',
          fileName: `testMarcFileC374136.${getRandomPostfix()}.mrc`,
          jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_INSTANCE_AND_SRS,
          numOfRecords: 1,
          propertyName: 'instance',
        },
        {
          marc: 'marcAuthFileForC374136.mrc',
          fileName: `testMarcFileC374136.${getRandomPostfix()}.mrc`,
          jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_AUTHORITY,
          authorityHeading: 'C374136 Roberts, Julia, 1967-',
          numOfRecords: 1,
          propertyName: 'authority',
        },
      ];

      const createdRecordIDs = [];

      before('Create test data', () => {
        cy.getAdminToken();
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
        });

        cy.loginAsAdmin({
          path: TopMenu.dataImportPath,
          waiter: DataImport.waitLoading,
        });
        cy.visit(TopMenu.inventoryPath).then(() => {
          InventoryInstances.searchByTitle(createdRecordIDs[0]);
          InventoryInstances.selectInstance();
          InventoryInstance.editMarcBibliographicRecord();
          InventoryInstance.verifyAndClickLinkIconByIndex(testData.tag700RowIndex);
          InventoryInstance.verifySelectMarcAuthorityModal();
          MarcAuthorities.switchToSearch();
          InventoryInstance.verifySearchOptions();
          InventoryInstance.searchResults(marcFiles[1].authorityHeading);
          MarcAuthorities.checkFieldAndContentExistence(
            testData.tag100,
            testData.authority100FieldValue,
          );
          InventoryInstance.clickLinkButton();
          QuickMarcEditor.verifyAfterLinkingUsingRowIndex(testData.tag700, testData.tag700RowIndex);
          QuickMarcEditor.pressSaveAndClose();

          cy.createTempUser([
            Permissions.uiMarcAuthoritiesAuthorityRecordEdit.gui,
            Permissions.uiMarcAuthoritiesAuthorityRecordView.gui,
            Permissions.uiQuickMarcQuickMarcAuthoritiesEditorAll.gui,
            Permissions.uiQuickMarcQuickMarcAuthorityLinkUnlink.gui,
          ]).then((createdUserProperties) => {
            testData.userProperties = createdUserProperties;

            cy.login(testData.userProperties.username, testData.userProperties.password, {
              path: TopMenu.marcAuthorities,
              waiter: MarcAuthorities.waitLoading,
            });
          });
        });
      });

      after('Delete test data', () => {
        cy.getAdminToken();
        Users.deleteViaApi(testData.userProperties.userId);
        InventoryInstance.deleteInstanceViaApi(createdRecordIDs[0]);
        MarcAuthority.deleteViaAPI(createdRecordIDs[1]);
      });

      it(
        'C374136 Edit tag value ("100") in the "MARC Authority" record which controls "MARC Bib(s)" (spitfire) (TaaS)',
        { tags: ['extendedPathBroken', 'spitfire', 'C374136'] },
        () => {
          MarcAuthorities.searchBy(testData.searchOption, testData.searchValue);

          MarcAuthority.edit();
          cy.wait(2000);
          let previousTagValue = testData.tag100;
          testData.newTagValues.forEach((newTagValue) => {
            const callOutMessage =
              newTagValue === testData.tag101
                ? testData.cannotSaveRecordCollout
                : testData.cannotChangeSavedFieldCallout;
            QuickMarcEditor.updateExistingTagName(previousTagValue, newTagValue);
            QuickMarcEditor.pressSaveAndClose();
            QuickMarcEditor.checkCallout(callOutMessage);
            QuickMarcEditor.closeCallout();
            previousTagValue = newTagValue;
          });

          QuickMarcEditor.updateExistingTagName(testData.tag101, testData.tag100);
          QuickMarcEditor.checkButtonsDisabled();

          QuickMarcEditor.updateExistingField(testData.tag100, testData.newAuthority100FieldValue);
          QuickMarcEditor.pressSaveAndClose();
          QuickMarcEditor.checkCallout(testData.tag100Callout);
        },
      );
    });
  });
});
