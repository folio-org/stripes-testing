import { DEFAULT_JOB_PROFILE_NAMES } from '../../../../support/constants';
import Permissions from '../../../../support/dictionary/permissions';
import DataImport from '../../../../support/fragments/data_import/dataImport';
import InventoryInstance from '../../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../../support/fragments/inventory/inventoryInstances';
import InventorySearchAndFilter from '../../../../support/fragments/inventory/inventorySearchAndFilter';
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
        tag400: '400',
        tag035: '035',
        update400Field: '$ test 400 field',
        update035Field: '$ test 035 field',
        authorityTitle:
          'C374160 Beethoven, Ludwig van, 1770-1827. Variations, piano, violin, cello, op. 44, E♭ major',
      };

      const marcFiles = [
        {
          marc: 'marcBibFileForC374160.mrc',
          fileName: `testMarcFileC374160.${getRandomPostfix()}.mrc`,
          jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_INSTANCE_AND_SRS,
          instanceTitle: 'C374160 Variations / Ludwig Van Beethoven.',
          propertyName: 'instance',
        },
        {
          marc: 'marcAuthFileForC374160.mrc',
          fileName: `testMarcFileC374160.${getRandomPostfix()}.mrc`,
          jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_AUTHORITY,
          authorityHeading: 'C374160 Beethoven, Ludwig van',
          propertyName: 'authority',
        },
      ];

      const linkingTagAndValues = {
        tag: '240',
        rowIndex: 17,
        value: 'C374160 Beethoven, Ludwig van',
        boxFourth: '$a Variations, $m piano, violin, cello, $n op. 44, $r E♭ major',
        boxFifth: '',
        boxSifth: '$0 http://id.loc.gov/authorities/names/n83130832',
        boxSeventh: '',
      };

      const createdRecordIDs = [];

      before('Creating user, importing and linking records', () => {
        // make sure there are no duplicate authority records in the system
        cy.getAdminToken().then(() => {
          MarcAuthorities.getMarcAuthoritiesViaApi({ limit: 100, query: 'keyword="C374160"' }).then(
            (records) => {
              records.forEach((record) => {
                if (record.authRefType === 'Authorized') {
                  MarcAuthority.deleteViaAPI(record.id, true);
                }
              });
            },
          );

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

          cy.createTempUser([
            Permissions.uiMarcAuthoritiesAuthorityRecordView.gui,
            Permissions.inventoryAll.gui,
            Permissions.uiMarcAuthoritiesAuthorityRecordEdit.gui,
            Permissions.uiQuickMarcQuickMarcAuthoritiesEditorAll.gui,
            Permissions.uiQuickMarcQuickMarcBibliographicEditorAll.gui,
            Permissions.uiQuickMarcQuickMarcAuthorityLinkUnlink.gui,
          ])
            .then((userProperties) => {
              testData.user = userProperties;

              cy.loginAsAdmin({
                path: TopMenu.inventoryPath,
                waiter: InventoryInstances.waitContentLoading,
              });
            })
            .then(() => {
              InventoryInstances.searchByTitle(createdRecordIDs[0]);
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
        });
        cy.login(testData.user.username, testData.user.password, {
          path: TopMenu.marcAuthorities,
          waiter: MarcAuthorities.waitLoading,
          authRefresh: true,
        });
      });

      after('Deleting user, data', () => {
        cy.getAdminToken();
        Users.deleteViaApi(testData.user.userId);
        createdRecordIDs.forEach((id, index) => {
          if (index) MarcAuthority.deleteViaAPI(id);
          else InventoryInstance.deleteInstanceViaApi(id);
        });
      });

      it(
        'C374160 Edit any field value of linked "MARC Authority" record but not "1XX" and "010" (spitfire) (TaaS)',
        { tags: ['extendedPath', 'spitfire', 'C374160'] },
        () => {
          MarcAuthorities.searchBy('Keyword', marcFiles[1].authorityHeading);
          cy.ifConsortia(true, () => {
            MarcAuthorities.clickAccordionByName('Shared');
            MarcAuthorities.actionsSelectCheckbox('No');
          });
          MarcAuthorities.verifySearchResultTabletIsAbsent(false);
          MarcAuthorities.selectTitle(testData.authorityTitle);
          MarcAuthority.edit();
          QuickMarcEditor.updateExistingFieldContent(11, testData.update400Field);
          QuickMarcEditor.checkButtonsEnabled();
          QuickMarcEditor.clickSaveAndKeepEditingButton();
          QuickMarcEditor.verifyAndDismissRecordUpdatedCallout();
          QuickMarcEditor.updateExistingField(testData.tag035, testData.update035Field);
          QuickMarcEditor.checkButtonsEnabled();
          QuickMarcEditor.pressSaveAndClose();
          QuickMarcEditor.verifyAndDismissRecordUpdatedCallout();
          MarcAuthorities.verifyMarcViewPaneIsOpened();
          MarcAuthorities.closeMarcViewPane();
          MarcAuthorities.verifyNumberOfTitles(5, '1');
          MarcAuthorities.clickOnNumberOfTitlesLink(5, '1');
          InventorySearchAndFilter.verifyInstanceDisplayed(marcFiles[0].instanceTitle);
          InventoryInstance.editMarcBibliographicRecord();
          QuickMarcEditor.verifyTagFieldAfterLinking(
            linkingTagAndValues.rowIndex,
            linkingTagAndValues.tag,
            '1',
            '0',
            linkingTagAndValues.boxFourth,
            linkingTagAndValues.boxFifth,
            linkingTagAndValues.boxSifth,
            linkingTagAndValues.boxSeventh,
          );
        },
      );
    });
  });
});
