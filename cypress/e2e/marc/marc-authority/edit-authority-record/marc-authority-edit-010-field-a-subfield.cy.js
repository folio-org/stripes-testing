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
      const createdAuthorityIDs = [];
      const testData = {
        authority: {
          searchInput: 'Literature',
          searchOption: 'Keyword',
        },
        bibliographic: {
          title: 'Titanic',
        },
        field010: {
          tag: '010',
          multipleASubfields: '$a gf2014026297 $a n2014026298',
        },
        errorMultiple010Subfields: "Subfield 'a' is non-repeatable",
        linkingValue: 'C376593 Drama',
      };

      const marcFiles = [
        {
          marc: 'marcBibFileForC376593.mrc',
          fileName: `C376593 testMarcBibFile.${getRandomPostfix()}.mrc`,
          jobProfile: DEFAULT_JOB_PROFILE_NAMES.CREATE_INSTANCE_AND_SRS,
          propertyName: 'instance',
        },
        {
          marc: 'marcAuthFileForC376593.mrc',
          fileName: `C376593 testMarcAuthFile.${getRandomPostfix()}.mrc`,
          jobProfile: DEFAULT_JOB_PROFILE_NAMES.CREATE_AUTHORITY,
          propertyName: 'authority',
        },
      ];

      before('Upload files', () => {
        cy.getAdminToken();
        MarcAuthorities.deleteMarcAuthorityByTitleViaAPI('C376593*');
        InventoryInstances.deleteFullInstancesByTitleViaApi(testData.bibliographic.title);

        cy.createTempUser([
          Permissions.uiMarcAuthoritiesAuthorityRecordEdit.gui,
          Permissions.uiMarcAuthoritiesAuthorityRecordView.gui,
          Permissions.uiQuickMarcQuickMarcAuthoritiesEditorAll.gui,
          Permissions.inventoryAll.gui,
          Permissions.uiQuickMarcQuickMarcBibliographicEditorAll.gui,
          Permissions.uiQuickMarcQuickMarcAuthorityLinkUnlink.gui,
        ]).then((createdUserProperties) => {
          testData.userProperties = createdUserProperties;

          marcFiles.forEach((marcFile) => {
            DataImport.uploadFileViaApi(marcFile.marc, marcFile.fileName, marcFile.jobProfile).then(
              (response) => {
                response.forEach((record) => {
                  createdAuthorityIDs.push(record[marcFile.propertyName].id);
                });
              },
            );
          });
          // Create the link between bib and authority records
          cy.waitForAuthRefresh(() => {
            cy.loginAsAdmin({
              path: TopMenu.inventoryPath,
              waiter: InventoryInstances.waitContentLoading,
            });
          }, 20_000).then(() => {
            InventoryInstances.searchByTitle(createdAuthorityIDs[0]);
            InventoryInstances.selectInstanceById(createdAuthorityIDs[0]);
            InventoryInstance.waitLoading();
            InventoryInstance.editMarcBibliographicRecord();
            InventoryInstance.verifyAndClickLinkIconByIndex(51);
            MarcAuthorities.switchToSearch();
            cy.wait(1000);
            MarcAuthorities.chooseTypeOfHeading('Genre');
            InventoryInstance.searchResults(testData.linkingValue);
            MarcAuthority.contains(`\t$a ${testData.linkingValue}`);
            MarcAuthorities.clickLinkButton();
            QuickMarcEditor.pressSaveAndClose();
            QuickMarcEditor.checkAfterSaveAndClose();
          });

          cy.login(testData.userProperties.username, testData.userProperties.password, {
            path: TopMenu.marcAuthorities,
            waiter: MarcAuthorities.waitLoading,
          });
        });
      });

      after('Delete test data', () => {
        cy.getAdminToken();
        createdAuthorityIDs.forEach((id, index) => {
          if (index) MarcAuthority.deleteViaAPI(id);
          else InventoryInstance.deleteInstanceViaApi(id);
        });
        Users.deleteViaApi(testData.userProperties.userId);
      });

      it(
        'C376593 Add multiple "$a" to "010" field in linked "MARC Authority" record when "$0" = "010 $a" (spitfire)',
        { tags: ['extendedPath', 'spitfire', 'C376593'] },
        () => {
          // #1-3 Search and open the MARC Authority record
          MarcAuthorities.searchBy(testData.authority.searchOption, testData.authority.searchInput);

          // #4 Click Actions > Edit
          MarcAuthority.edit();

          // #5 Add second "$a" subfield to "010" field
          MarcAuthority.changeField(testData.field010.tag, testData.field010.multipleASubfields);
          QuickMarcEditor.checkContent(testData.field010.multipleASubfields, 4);

          // #6 Click "Save & keep editing" and verify error
          QuickMarcEditor.clickSaveAndKeepEditingButton();
          QuickMarcEditor.checkErrorMessage(4, testData.errorMultiple010Subfields);

          // #7 Click "Save & close" and verify error persists
          QuickMarcEditor.pressSaveAndCloseButton();
          QuickMarcEditor.checkErrorMessage(4, testData.errorMultiple010Subfields);
        },
      );
    });
  });
});
