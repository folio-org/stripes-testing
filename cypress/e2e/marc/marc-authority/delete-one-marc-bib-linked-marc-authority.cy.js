import { DEFAULT_JOB_PROFILE_NAMES } from '../../../support/constants';
import Permissions from '../../../support/dictionary/permissions';
import DataImport from '../../../support/fragments/data_import/dataImport';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import MarcAuthorities from '../../../support/fragments/marcAuthority/marcAuthorities';
import MarcAuthoritiesDelete from '../../../support/fragments/marcAuthority/marcAuthoritiesDelete';
import MarcAuthoritiesSearch from '../../../support/fragments/marcAuthority/marcAuthoritiesSearch';
import QuickMarcEditor from '../../../support/fragments/quickMarcEditor';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import getRandomPostfix from '../../../support/utils/stringTools';

describe('MARC', () => {
  describe('MARC Authority', () => {
    const testData = {
      marcValue: 'C350932 Beethoven, Ludwig van, 1770-1827. 14 variations sur un thème original',
      markedValue: 'C350932 Beethoven, Ludwig van,',
      searchOption: 'Keyword',
    };

    const marcFiles = [
      {
        marc: 'marcBibFileForC350932.mrc',
        fileName: `testMarcFile.${getRandomPostfix()}.mrc`,
        jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_INSTANCE_AND_SRS,
        numOfRecords: 1,
        propertyName: 'instance',
      },
      {
        marc: 'marcAuthFileForC350932.mrc',
        fileName: `testMarcFile.${getRandomPostfix()}.mrc`,
        jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_AUTHORITY,
        numOfRecords: 1,
        propertyName: 'authority',
      },
    ];

    const createdAuthorityIDs = [];

    const linkingTagAndValues = {
      rowIndex: 17,
      value:
        'C350932 Beethoven, Ludwig van, 1770-1827. Variations, piano, violin, cello, op. 44, E♭ major',
      tag: '240',
      content:
        '$a Variations, $m piano, violin, cello, $n op. 44, $r E♭ major $0 http://id.loc.gov/authorities/names/n83130832',
    };

    before('Creating user and data', () => {
      cy.getAdminToken();
      // make sure there are no duplicate authority records in the system
      MarcAuthorities.deleteMarcAuthorityByTitleViaAPI('C350932*');

      cy.createTempUser([
        Permissions.inventoryAll.gui,
        Permissions.uiMarcAuthoritiesAuthorityRecordView.gui,
        Permissions.uiMarcAuthoritiesAuthorityRecordDelete.gui,
        Permissions.uiQuickMarcQuickMarcBibliographicEditorAll.gui,
        Permissions.uiQuickMarcQuickMarcBibliographicEditorAll.gui,
        Permissions.uiQuickMarcQuickMarcAuthorityLinkUnlink.gui,
      ]).then((createdUserProperties) => {
        testData.userProperties = createdUserProperties;

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
        });

        cy.loginAsAdmin().then(() => {
          cy.visit(TopMenu.inventoryPath);
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

        cy.waitForAuthRefresh(() => {
          cy.login(testData.userProperties.username, testData.userProperties.password, {
            path: TopMenu.marcAuthorities,
            waiter: MarcAuthorities.waitLoading,
          });
        }, 20_000);
      });
    });

    after('Deleting created user and data', () => {
      cy.getAdminToken();
      Users.deleteViaApi(testData.userProperties.userId);
      InventoryInstance.deleteInstanceViaApi(createdAuthorityIDs[0]);
    });

    it(
      'C350932 Delete reference "MARC Authority" record that has one linked field in "MARC Bib" record (spitfire) (TaaS)',
      { tags: ['extendedPath', 'spitfire', 'C350932'] },
      () => {
        MarcAuthoritiesSearch.searchBy(testData.searchOption, testData.marcValue);
        MarcAuthorities.selectTitle(testData.marcValue);
        MarcAuthorities.checkRecordDetailPageMarkedValue(testData.markedValue);
        MarcAuthoritiesDelete.clickDeleteButton();
        MarcAuthoritiesDelete.checkDeleteModal();
        MarcAuthoritiesDelete.checkDeleteModalMessage(
          `Are you sure you want to permanently delete the authority record:  ${testData.marcValue} ? If you proceed with deletion, then 1 linked bibliographic record will retain authorized value and will become uncontrolled.`,
        );
        MarcAuthoritiesDelete.confirmDelete();
        MarcAuthoritiesDelete.verifyDeleteComplete(testData.marcValue);

        cy.visit(TopMenu.inventoryPath);
        InventoryInstances.searchByTitle(createdAuthorityIDs[0]);
        InventoryInstances.selectInstance();
        InventoryInstance.editMarcBibliographicRecord();
        QuickMarcEditor.verifyTagFieldAfterUnlinking(
          linkingTagAndValues.rowIndex,
          linkingTagAndValues.tag,
          '1',
          '0',
          linkingTagAndValues.content,
        );
        QuickMarcEditor.verifyIconsAfterUnlinking(linkingTagAndValues.rowIndex);
        QuickMarcEditor.closeEditorPane();
        InventoryInstance.viewSource();
        InventoryInstance.checkAbsenceOfAuthorityIconInMarcViewPane();
      },
    );
  });
});
