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
    describe('Edit Authority record', () => {
      const testData = {
        tag010: '010',
        subfieldPrefix: '$a',
        tag010content: 'n  91074080 ',
        createdRecordIDs: [],
        searchOptions: {
          keyword: 'Keyword',
          nameTitle: 'C376936 Roberts',
        },
        errorMessage: 'Cannot delete 010. It is required.',
        bib700AfterLinkingToAuth100: [
          55,
          '700',
          '1',
          '\\',
          '$a C376936 Roberts, Julia, $d 1967-',
          '$e Actor.',
          '$0 http://id.loc.gov/authorities/names/n91074080',
          '',
        ],
      };
      const marcFiles = [
        {
          marc: 'marcBibFileC376936.mrc',
          fileName: `C376936 testMarcFile${getRandomPostfix()}.mrc`,
          jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_INSTANCE_AND_SRS,
          numOfRecords: 1,
          propertyName: 'instance',
          instanceTitle:
            'Runaway bride/ produced by Robert W. Cort, Ted Field, Scott Kroopf, Tom Rosenberg; written by Josann McGibbon, Sara Parriott; directed by Garry Marshall.',
        },
        {
          marc: 'marcAuthFileC376936.mrc',
          fileName: `C376936 testMarcFile${getRandomPostfix()}.mrc`,
          jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_AUTHORITY,
          numOfRecords: 1,
          propertyName: 'authority',
        },
      ];
      const linkingTagAndValue = {
        rowIndex: 55,
        value: 'C376936 Roberts, Julia',
        tag: '700',
      };

      before('Create test data', () => {
        cy.getAdminToken();
        cy.createTempUser([Permissions.moduleDataImportEnabled.gui])
          .then((userProperties) => {
            testData.preconditionUserId = userProperties.userId;

            // make sure there are no duplicate authority records in the system
            MarcAuthorities.getMarcAuthoritiesViaApi({
              limit: 100,
              query: 'keyword="C376936"',
            }).then((records) => {
              records.forEach((record) => {
                if (record.authRefType === 'Authorized') {
                  MarcAuthority.deleteViaAPI(record.id);
                }
              });
            });

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
              cy.wait(2000);
            });
          })
          .then(() => {
            cy.loginAsAdmin({
              path: TopMenu.inventoryPath,
              waiter: InventoryInstances.waitContentLoading,
            }).then(() => {
              InventoryInstances.searchByTitle(testData.createdRecordIDs[0]);
              InventoryInstances.selectInstance();
              InventoryInstance.editMarcBibliographicRecord();
              QuickMarcEditor.clickLinkIconInTagField(linkingTagAndValue.rowIndex);
              MarcAuthorities.switchToSearch();
              InventoryInstance.verifySelectMarcAuthorityModal();
              InventoryInstance.verifySearchOptions();
              InventoryInstance.searchResults(linkingTagAndValue.value);
              InventoryInstance.clickLinkButton();
              QuickMarcEditor.verifyAfterLinkingUsingRowIndex(
                linkingTagAndValue.tag,
                linkingTagAndValue.rowIndex,
              );
              QuickMarcEditor.pressSaveAndClose();
              QuickMarcEditor.checkAfterSaveAndClose();
            });
          });

        cy.createTempUser([
          Permissions.inventoryAll.gui,
          Permissions.uiMarcAuthoritiesAuthorityRecordView.gui,
          Permissions.uiMarcAuthoritiesAuthorityRecordEdit.gui,
          Permissions.uiQuickMarcQuickMarcAuthoritiesEditorAll.gui,
          Permissions.uiQuickMarcQuickMarcBibliographicEditorAll.gui,
          Permissions.uiQuickMarcQuickMarcAuthorityLinkUnlink.gui,
        ]).then((userProperties) => {
          testData.user = userProperties;

          cy.login(testData.user.username, testData.user.password, {
            path: TopMenu.marcAuthorities,
            waiter: MarcAuthorities.waitLoading,
          });
          MarcAuthorities.searchBy(
            testData.searchOptions.keyword,
            testData.searchOptions.nameTitle,
          );
        });
      });

      after('Deleting created user and records', () => {
        cy.getAdminToken();
        Users.deleteViaApi(testData.user.userId);
        Users.deleteViaApi(testData.preconditionUserId);
        InventoryInstance.deleteInstanceViaApi(testData.createdRecordIDs[0]);
        MarcAuthority.deleteViaAPI(testData.createdRecordIDs[1]);
      });

      it(
        'C376936 Verify that user can not delete value from "$a" subfield of "010" field in linked "MARC Authority" record when "010" = "$0" (spitfire) (TaaS)',
        { tags: ['extendedPath', 'spitfire', 'C376936'] },
        () => {
          MarcAuthority.edit();
          QuickMarcEditor.checkContent(`${testData.subfieldPrefix} ${testData.tag010content}`, 4);
          QuickMarcEditor.checkDeleteButtonNotExist(4);
          QuickMarcEditor.updateExistingField(testData.tag010, testData.subfieldPrefix);
          QuickMarcEditor.checkButtonsEnabled();
          QuickMarcEditor.pressSaveAndCloseButton();
          QuickMarcEditor.checkCallout(testData.errorMessage);
          QuickMarcEditor.closeAllCallouts();

          QuickMarcEditor.clickSaveAndKeepEditingButton();
          QuickMarcEditor.checkCallout(testData.errorMessage);
          QuickMarcEditor.closeAllCallouts();

          QuickMarcEditor.pressCancel();
          QuickMarcEditor.closeWithoutSavingInEditConformation();
          MarcAuthorities.checkDetailViewIncludesText(
            `${testData.subfieldPrefix} ${testData.tag010content}`,
          );
          MarcAuthorities.closeMarcViewPane();
          MarcAuthorities.verifyNumberOfTitles(5, '1');
          MarcAuthorities.clickOnNumberOfTitlesLink(5, '1');
          InventoryInstance.checkInstanceTitle(marcFiles[0].instanceTitle);
          InventoryInstance.editMarcBibliographicRecord();
          QuickMarcEditor.verifyTagFieldAfterLinking(...testData.bib700AfterLinkingToAuth100);
        },
      );
    });
  });
});
