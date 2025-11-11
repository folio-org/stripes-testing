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
  describe('MARC Bibliographic', () => {
    const testData = {
      authorityHeading: 'C376599 Variations,',
      instanceTitle:
        'C376599 Beethoven, Ludwig van, 1770-1827. Variations, piano, violin, cello, op. 44, E♭ major',
      tag240: '240',
      tag100: '100',
      tag240FieldIndex: 17,
      tag100FieldIndex: 3,
      controllableSubfield: '$n test',
      updatedAuthorityValue:
        '$a C376599 Beethoven, Ludwig van, TEST $d 1770-1827. $t Variations, $m piano, violin, cello, $n op. 44, $r E♭ major',
      errorMessage:
        'A subfield(s) cannot be updated because it is controlled by an authority heading.',
    };

    const marcFiles = [
      {
        marc: 'marcBibFileForC376599.mrc',
        fileName: `testMarcFileC376599.${getRandomPostfix()}.mrc`,
        jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_INSTANCE_AND_SRS,
        propertyName: 'instance',
      },
      {
        marc: 'marcAuthFileForC376599.mrc',
        fileName: `testMarcAuthFileC376599.${getRandomPostfix()}.mrc`,
        jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_AUTHORITY,
        propertyName: 'authority',
      },
    ];

    const createdRecordIDs = [];

    before('Import test data and create linking', () => {
      cy.createTempUser([
        Permissions.inventoryAll.gui,
        Permissions.uiMarcAuthoritiesAuthorityRecordView.gui,
        Permissions.uiMarcAuthoritiesAuthorityRecordEdit.gui,
        Permissions.uiQuickMarcQuickMarcBibliographicEditorAll.gui,
        Permissions.uiQuickMarcQuickMarcAuthorityLinkUnlink.gui,
        Permissions.uiQuickMarcQuickMarcAuthoritiesEditorAll.gui,
      ]).then((createdUserProperties) => {
        testData.userProperties = createdUserProperties;

        cy.getAdminToken();
        MarcAuthorities.deleteMarcAuthorityByTitleViaAPI('C376599*');
        InventoryInstances.deleteFullInstancesByTitleViaApi('C376599*');

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

        cy.waitForAuthRefresh(() => {
          cy.loginAsAdmin({
            path: TopMenu.inventoryPath,
            waiter: InventoryInstances.waitContentLoading,
          });
          InventoryInstances.waitContentLoading();
        }, 20_000).then(() => {
          InventoryInstances.searchByTitle(createdRecordIDs[0]);
          InventoryInstances.selectInstance();
          InventoryInstance.editMarcBibliographicRecord();

          InventoryInstance.verifyAndClickLinkIconByIndex(testData.tag240FieldIndex);
          MarcAuthorities.switchToSearch();
          InventoryInstance.verifySelectMarcAuthorityModal();
          InventoryInstance.searchResults(testData.authorityHeading);
          InventoryInstance.clickLinkButton();
          QuickMarcEditor.verifyAfterLinkingAuthorityByIndex(
            testData.tag240FieldIndex,
            testData.tag240,
          );
          QuickMarcEditor.pressSaveAndClose();
          QuickMarcEditor.checkAfterSaveAndClose();

          cy.waitForAuthRefresh(() => {
            cy.login(testData.userProperties.username, testData.userProperties.password, {
              path: TopMenu.inventoryPath,
              waiter: InventoryInstances.waitContentLoading,
            });
          }, 20_000);
        });
      });
    });

    after('Deleting created user and records', () => {
      cy.getAdminToken();
      Users.deleteViaApi(testData.userProperties.userId);
      InventoryInstance.deleteInstanceViaApi(createdRecordIDs[0]);
      MarcAuthority.deleteViaAPI(createdRecordIDs[1], true);
    });

    it(
      'C376599 Add controllable subfields to linked field of a "MARC bib" record after updating "1XX" in linked "MARC authority" record (spitfire)',
      { tags: ['extendedPath', 'spitfire', 'C376599'] },
      () => {
        InventoryInstances.searchByTitle(createdRecordIDs[0]);
        InventoryInstances.selectInstance();

        InventoryInstance.editMarcBibliographicRecord();

        QuickMarcEditor.fillLinkedFieldBox(
          testData.tag240FieldIndex,
          5,
          testData.controllableSubfield,
        );
        QuickMarcEditor.clickSaveAndKeepEditingButton();

        QuickMarcEditor.checkErrorMessage(testData.tag240FieldIndex, testData.errorMessage);
        QuickMarcEditor.checkEditableQuickMarcFormIsOpened();

        QuickMarcEditor.clickViewMarcAuthorityIconInTagField(testData.tag240FieldIndex);
        MarcAuthority.edit();

        QuickMarcEditor.updateExistingField(testData.tag100, testData.updatedAuthorityValue);
        cy.wait(1000);
        QuickMarcEditor.pressSaveAndClose({ acceptLinkedBibModal: true });

        cy.visit(TopMenu.inventoryPath);
        InventoryInstances.waitContentLoading();
        InventoryInstances.searchByTitle(testData.instanceTitle);
        InventoryInstances.selectInstance();

        InventoryInstance.editMarcBibliographicRecord();

        QuickMarcEditor.fillLinkedFieldBox(
          testData.tag240FieldIndex,
          5,
          testData.controllableSubfield,
        );
        QuickMarcEditor.clickSaveAndKeepEditingButton();
        QuickMarcEditor.checkErrorMessage(testData.tag240FieldIndex, testData.errorMessage);
        QuickMarcEditor.checkEditableQuickMarcFormIsOpened();
      },
    );
  });
});
