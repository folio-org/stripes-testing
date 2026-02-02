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
        tag100: '100',
        tag100content:
          '$a Beethoven, Ludwig van, $d 1770-1827. $m piano, violin, cello, $n op. 44, $r E♭ major',
        tag110: '110',
        tag111: '111',
        tag130: '130',
        tag150: '150',
        tag151: '151',
        tag155: '155',
        tag119: '119',
        calloutMessage:
          'Cannot change the saved MARC authority field 100 because it controls a bibliographic field(s). To change this 1XX, you must unlink all controlled bibliographic fields.',
        calloutMessageAfterDeleteingSubfield:
          'Cannot remove $t from the 100 field because it controls a bibliographic field(s) that requires this subfield. To change this 1XX value, you must unlink all controlled bibliographic fields that requires $t to be controlled.',
        calloutMessageAfterDeleting1XXField: 'Record cannot be saved without 1XX field.',
        searchOption: 'Keyword',
      };

      const marcFiles = [
        {
          marc: 'marcBibFileForC374138.mrc',
          fileName: `C374138 testMarcFile${getRandomPostfix()}.mrc`,
          jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_INSTANCE_AND_SRS,
          numOfRecords: 1,
          propertyName: 'instance',
        },
        {
          marc: 'marcAuthFileForC374138.mrc',
          fileName: `C374138 testMarcFile${getRandomPostfix()}.mrc`,
          jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_AUTHORITY,
          authorityHeading: 'C374138 Beethoven, Ludwig van,',
          numOfRecords: 1,
          propertyName: 'authority',
        },
      ];
      const linkingTagAndValues = {
        rowIndex: 17,
        value:
          'C374138 Beethoven, Ludwig van, 1770-1827. Variations, piano, violin, cello, op. 44, E♭ major',
        tag: '240',
        content:
          '$a Variations, $m piano, violin, cello, $n op. 44, $r E♭ major $0 http://id.loc.gov/authorities/names/n83130832',
      };
      const createdAuthorityIDs = [];

      before('Creating user and data', () => {
        cy.createTempUser([Permissions.moduleDataImportEnabled.gui]).then((userProperties) => {
          testData.preconditionUserId = userProperties.userId;

          // make sure there are no duplicate records in the system
          MarcAuthorities.deleteMarcAuthorityByTitleViaAPI('C374138*');
          marcFiles.forEach((marcFile) => {
            DataImport.uploadFileViaApi(
              marcFile.marc,
              marcFile.fileName,
              marcFile.jobProfileToRun,
            ).then((response) => {
              response.forEach((record) => {
                createdAuthorityIDs.push(record[marcFile.propertyName].id);
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
        ]).then((createdUserProperties) => {
          testData.userProperties = createdUserProperties;

          cy.loginAsAdmin({
            path: TopMenu.inventoryPath,
            waiter: InventoryInstances.waitContentLoading,
          }).then(() => {
            InventoryInstances.searchByTitle(createdAuthorityIDs[0]);
            InventoryInstances.selectInstance();
            InventoryInstance.editMarcBibliographicRecord();
            QuickMarcEditor.clickLinkIconInTagField(linkingTagAndValues.rowIndex);
            MarcAuthorities.switchToSearch();
            InventoryInstance.verifySelectMarcAuthorityModal();
            InventoryInstance.verifySearchOptions();
            InventoryInstance.searchResults(linkingTagAndValues.value);
            InventoryInstance.clickLinkButton();
            QuickMarcEditor.verifyAfterLinkingUsingRowIndex(
              linkingTagAndValues.tag,
              linkingTagAndValues.rowIndex,
            );
            QuickMarcEditor.pressSaveAndClose();
            QuickMarcEditor.checkAfterSaveAndClose();
          });

          cy.login(testData.userProperties.username, testData.userProperties.password, {
            path: TopMenu.marcAuthorities,
            waiter: MarcAuthorities.waitLoading,
          });
        });
      });

      after('Deleting user, data', () => {
        cy.getAdminToken().then(() => {
          Users.deleteViaApi(testData.userProperties.userId);
          Users.deleteViaApi(testData.preconditionUserId);
          createdAuthorityIDs.forEach((id, index) => {
            if (index) MarcAuthority.deleteViaAPI(id);
            else InventoryInstance.deleteInstanceViaApi(id);
          });
        });
      });

      it(
        'C374138 Edit tag value ("100 which has "$t") in the "MARC Authority" record which controls "MARC Bib(s)" (spitfire) (TaaS)',
        { tags: ['extendedPath', 'spitfire', 'C374138'] },
        () => {
          MarcAuthorities.searchBy(testData.searchOption, linkingTagAndValues.value);
          MarcAuthorities.checkResultList([linkingTagAndValues.value]);
          MarcAuthorities.selectTitle(linkingTagAndValues.value);
          MarcAuthorities.checkRecordDetailPageMarkedValue(marcFiles[1].authorityHeading);
          MarcAuthority.edit();
          cy.wait(2000);
          QuickMarcEditor.updateExistingTagName(testData.tag100, testData.tag110);
          QuickMarcEditor.clickSaveAndKeepEditingButton();
          QuickMarcEditor.checkErrorMessage(7, testData.calloutMessage);
          QuickMarcEditor.updateExistingTagName(testData.tag110, testData.tag111);
          QuickMarcEditor.clickSaveAndKeepEditingButton();
          QuickMarcEditor.checkErrorMessage(7, testData.calloutMessage);
          QuickMarcEditor.updateExistingTagName(testData.tag111, testData.tag130);
          QuickMarcEditor.clickSaveAndKeepEditingButton();
          QuickMarcEditor.checkErrorMessage(7, testData.calloutMessage);
          QuickMarcEditor.updateExistingTagName(testData.tag130, testData.tag150);
          QuickMarcEditor.clickSaveAndKeepEditingButton();
          QuickMarcEditor.checkErrorMessage(7, testData.calloutMessage);
          QuickMarcEditor.updateExistingTagName(testData.tag150, testData.tag151);
          QuickMarcEditor.clickSaveAndKeepEditingButton();
          QuickMarcEditor.checkErrorMessage(7, testData.calloutMessage);
          QuickMarcEditor.updateExistingTagName(testData.tag151, testData.tag155);
          QuickMarcEditor.clickSaveAndKeepEditingButton();
          QuickMarcEditor.checkErrorMessage(7, testData.calloutMessage);
          QuickMarcEditor.updateExistingTagName(testData.tag155, testData.tag119);
          QuickMarcEditor.clickSaveAndKeepEditingButton();
          QuickMarcEditor.checkErrorMessage(7, testData.calloutMessage);
          QuickMarcEditor.updateExistingTagName(testData.tag119, testData.tag100);
          QuickMarcEditor.checkButtonsDisabled();
          QuickMarcEditor.updateExistingField(testData.tag100, testData.tag100content);
          QuickMarcEditor.checkButtonsEnabled();
          QuickMarcEditor.clickSaveAndKeepEditingButton();
          QuickMarcEditor.checkErrorMessage(7, testData.calloutMessageAfterDeleteingSubfield);
        },
      );
    });
  });
});
