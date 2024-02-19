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
import InventoryViewSource from '../../../../support/fragments/inventory/inventoryViewSource';

describe('MARC', () => {
  describe('MARC Authority', () => {
    describe('Edit linked Authority record', () => {
      const testData = {
        createdRecordIDs: [],
        tag100content: '$a C422055 Kerouac, Jack, $d 1922-1969 $e author. $0 971255',
        instanceTitle: 'On the road [sound recording] / Jack Kerouac.',
        calloutMessage:
          'This record has successfully saved and is in process. Changes may not appear immediately.',
        searchOption: 'Keyword',
      };
      const tag010 = {
        rowIndex: 4,
        inputContent: {
          field010: '$a 80036674 ',
          field010_1: '$a 80036674 $z test',
          field010_2: '$a 80036674 $z test1',
          field010_3: '$a 80036674',
          field010_4: '$a 80036674 $z test',
          field010_5: '$z test',
        },
        expectedContent: {
          field010: '$a 80036674 ',
          field010_1: '$a    80036674  $z test',
          field010_2: '$a    80036674  $z test1',
          field010_3: '$a 80036674',
          field010_4: '$z test',
        },
      };

      const marcFiles = [
        {
          marc: 'marcBibFileForC422055.mrc',
          fileName: `C422055 testMarcFile${getRandomPostfix()}.mrc`,
          jobProfileToRun: 'Default - Create instance and SRS MARC Bib',
          numOfRecords: 1,
          propertyName: 'relatedInstanceInfo',
        },
        {
          marc: 'marcAuthFileForC422055.mrc',
          fileName: `C422055 testMarcFile${getRandomPostfix()}.mrc`,
          jobProfileToRun: 'Default - Create SRS MARC Authority',
          authorityHeading: 'C422055 Kerouac, Jack,',
          numOfRecords: 1,
          propertyName: 'relatedAuthorityInfo',
        },
      ];
      const linkingTagAndValues = {
        rowIndex: 16,
        value: 'C422055 Kerouac, Jack, 1922-1969',
        tag: '100',
      };

      before('Creating user and data', () => {
        cy.getAdminToken().then(() => {
          MarcAuthorities.getMarcAuthoritiesViaApi({ limit: 100, query: 'keyword="C422055"' }).then(
            (records) => {
              records.forEach((record) => {
                if (record.authRefType === 'Authorized') {
                  MarcAuthority.deleteViaAPI(record.id);
                }
              });
            },
          );
        });

        cy.getAdminToken();
        marcFiles.forEach((marcFile) => {
          DataImport.uploadFileViaApi(
            marcFile.marc,
            marcFile.fileName,
            marcFile.jobProfileToRun,
          ).then((response) => {
            response.entries.forEach((record) => {
              testData.createdRecordIDs.push(record[marcFile.propertyName].idList[0]);
            });
          });
        });

        cy.createTempUser([
          Permissions.inventoryAll.gui,
          Permissions.uiMarcAuthoritiesAuthorityRecordView.gui,
          Permissions.uiMarcAuthoritiesAuthorityRecordEdit.gui,
          Permissions.uiQuickMarcQuickMarcAuthoritiesEditorAll.gui,
          Permissions.uiQuickMarcQuickMarcAuthorityLinkUnlink.gui,
          Permissions.uiQuickMarcQuickMarcBibliographicEditorAll.gui,
        ]).then((userProperties) => {
          testData.user = userProperties;

          cy.loginAsAdmin().then(() => {
            cy.visit(TopMenu.inventoryPath);
            InventoryInstances.searchByTitle(testData.createdRecordIDs[0]);
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

          cy.login(testData.user.username, testData.user.password, {
            path: TopMenu.marcAuthorities,
            waiter: MarcAuthorities.waitLoading,
          });
        });
      });

      after('Deleting user, data', () => {
        cy.getAdminToken().then(() => {
          Users.deleteViaApi(testData.user.userId);
          testData.createdRecordIDs.forEach((id, index) => {
            if (index) MarcAuthority.deleteViaAPI(id);
            else InventoryInstance.deleteInstanceViaApi(id);
          });
        });
      });

      it(
        'C422055 Q release | Add/Edit "$z" and delete "$a" / "$z" subfields in "010" field of linked "MARC authority" record when "001" controls "$0" of linked MARC bib field (spitfire) (TaaS)',
        { tags: ['extendedPath', 'spitfire'] },
        () => {
          MarcAuthorities.searchBy(testData.searchOption, linkingTagAndValues.value);
          MarcAuthorities.checkResultList([linkingTagAndValues.value]);
          MarcAuthorities.selectTitle(linkingTagAndValues.value);
          MarcAuthorities.checkRecordDetailPageMarkedValue(marcFiles[1].authorityHeading);
          MarcAuthority.edit();
          QuickMarcEditor.checkContent(tag010.expectedContent.field010, tag010.rowIndex);
          QuickMarcEditor.updateExistingFieldContent(
            tag010.rowIndex,
            tag010.inputContent.field010_1,
          );
          QuickMarcEditor.checkButtonsEnabled();
          QuickMarcEditor.pressSaveAndKeepEditing(testData.calloutMessage);
          QuickMarcEditor.checkContent(tag010.expectedContent.field010_1, tag010.rowIndex);

          QuickMarcEditor.updateExistingFieldContent(
            tag010.rowIndex,
            tag010.inputContent.field010_2,
          );
          QuickMarcEditor.checkButtonsEnabled();
          QuickMarcEditor.pressSaveAndKeepEditing(testData.calloutMessage);
          QuickMarcEditor.checkContent(tag010.expectedContent.field010_2, tag010.rowIndex);

          QuickMarcEditor.updateExistingFieldContent(
            tag010.rowIndex,
            tag010.inputContent.field010_3,
          );
          QuickMarcEditor.checkContent(tag010.expectedContent.field010_3, tag010.rowIndex);
          QuickMarcEditor.checkButtonsEnabled();
          QuickMarcEditor.pressSaveAndKeepEditing(testData.calloutMessage);
          QuickMarcEditor.checkContent(tag010.expectedContent.field010_3, tag010.rowIndex);
          cy.wait(3000);

          QuickMarcEditor.updateExistingFieldContent(4, tag010.inputContent.field010_4);
          QuickMarcEditor.checkButtonsEnabled();
          QuickMarcEditor.pressSaveAndKeepEditing(testData.calloutMessage);
          QuickMarcEditor.checkContent(tag010.expectedContent.field010_1, tag010.rowIndex);

          QuickMarcEditor.updateExistingFieldContent(
            tag010.rowIndex,
            tag010.inputContent.field010_5,
          );
          QuickMarcEditor.checkButtonsEnabled();
          QuickMarcEditor.checkContent(tag010.expectedContent.field010_4, tag010.rowIndex);
          QuickMarcEditor.pressSaveAndKeepEditing(testData.calloutMessage);
          QuickMarcEditor.checkContent(tag010.expectedContent.field010_4, tag010.rowIndex);

          QuickMarcEditor.pressCancel();
          QuickMarcEditor.checkContent(tag010.expectedContent.field010_4, tag010.rowIndex);

          MarcAuthorities.closeMarcViewPane();
          MarcAuthorities.verifyNumberOfTitles(5, '1');
          MarcAuthorities.clickOnNumberOfTitlesLink(5, '1');

          InventoryInstance.verifyInstanceTitle(testData.instanceTitle);
          InventoryInstance.viewSource();
          InventoryViewSource.verifyLinkedToAuthorityIcon(linkingTagAndValues.rowIndex, true);
          InventoryViewSource.contains(testData.tag100content);
        },
      );
    });
  });
});
