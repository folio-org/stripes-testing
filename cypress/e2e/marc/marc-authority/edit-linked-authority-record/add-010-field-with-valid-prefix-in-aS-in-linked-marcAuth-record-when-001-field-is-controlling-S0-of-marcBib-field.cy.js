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
        tag010: '010',
        tag010content: '$a n123123',
        tag100content: [
          13,
          '100',
          '1',
          '\\',
          '$a C422060 Robinson, Peter, $d 1950-2022 $c Inspector Banks series ;',
          '$e author.',
          '$0 http://id.loc.gov/authorities/names/n123123',
          '',
        ],
        searchOption: 'Keyword',
        instanceTitle: 'Sleeping in the ground : an Inspector Banks novel / Peter Robinson.',
        calloutMessage:
          'This record has successfully saved and is in process. Changes may not appear immediately.',
      };

      const marcFiles = [
        {
          marc: 'marcBibFileForC422060.mrc',
          fileName: `C422060 testMarcFile${getRandomPostfix()}.mrc`,
          jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_INSTANCE_AND_SRS,
          numOfRecords: 1,
          propertyName: 'instance',
        },
        {
          marc: 'marcAuthFileForC422060.mrc',
          fileName: `C422060 testMarcFile${getRandomPostfix()}.mrc`,
          jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_AUTHORITY,
          numOfRecords: 1,
          propertyName: 'authority',
        },
      ];
      const linkingTagAndValues = {
        rowIndex: 13,
        value: 'C422060 Robinson, Peter, 1950-2022',
        itemName: 'C422060 Robinson, Peter, 1950-2022 Inspector Banks series ;',
        tag: '100',
      };

      before('Creating user and data', () => {
        cy.getAdminToken().then(() => {
          MarcAuthorities.getMarcAuthoritiesViaApi({ limit: 100, query: 'keyword="C422060"' }).then(
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
            response.forEach((record) => {
              testData.createdRecordIDs.push(record[marcFile.propertyName].id);
            });
          });
        });

        cy.createTempUser([
          Permissions.uiMarcAuthoritiesAuthorityRecordView.gui,
          Permissions.uiMarcAuthoritiesAuthorityRecordEdit.gui,
          Permissions.uiQuickMarcQuickMarcAuthoritiesEditorAll.gui,
          Permissions.inventoryAll.gui,
          Permissions.uiQuickMarcQuickMarcBibliographicEditorAll.gui,
          Permissions.uiQuickMarcQuickMarcAuthorityLinkUnlink.gui,
        ]).then((userProperties) => {
          testData.user = userProperties;

          cy.waitForAuthRefresh(() => {
            cy.loginAsAdmin({
              path: TopMenu.inventoryPath,
              waiter: InventoryInstances.waitContentLoading,
            });
          }, 20_000).then(() => {
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
          InventoryInstance.deleteInstanceViaApi(testData.createdRecordIDs[0]);
          MarcAuthority.deleteViaAPI(testData.createdRecordIDs[1]);
        });
      });

      it(
        'C422060 Q release | Add "010" field with valid prefix in "$a" subfield in linked "MARC authority" record when "001" field is controlling "$0" of MARC bib\'s field (spitfire) (TaaS)',
        { tags: ['extendedPath', 'spitfire', 'C422060'] },
        () => {
          MarcAuthorities.searchBy(testData.searchOption, linkingTagAndValues.value);
          MarcAuthorities.selectTitle(linkingTagAndValues.itemName);
          MarcAuthority.edit();
          QuickMarcEditor.checkFieldAbsense(testData.tag010);
          QuickMarcEditor.addNewField(testData.tag010, testData.tag010content, 4);
          QuickMarcEditor.checkButtonsEnabled();
          QuickMarcEditor.pressSaveAndCloseButton();
          MarcAuthorities.checkCallout(testData.calloutMessage);
          MarcAuthorities.verifyMarcViewPaneIsOpened();
          MarcAuthorities.closeMarcViewPane();
          MarcAuthorities.verifyNumberOfTitles(5, '1');
          MarcAuthorities.clickOnNumberOfTitlesLink(5, '1');
          InventoryInstance.verifyInstanceTitle(testData.instanceTitle);
          InventoryInstance.editMarcBibliographicRecord();
          QuickMarcEditor.checkEditableQuickMarcFormIsOpened();
          QuickMarcEditor.verifyTagFieldAfterLinking(...testData.tag100content);
        },
      );
    });
  });
});
