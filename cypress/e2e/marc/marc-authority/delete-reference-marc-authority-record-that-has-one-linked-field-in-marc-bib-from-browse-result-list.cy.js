import getRandomPostfix from '../../../support/utils/stringTools';
import Permissions from '../../../support/dictionary/permissions';
import DataImport from '../../../support/fragments/data_import/dataImport';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import MarcAuthorities from '../../../support/fragments/marcAuthority/marcAuthorities';
import MarcAuthoritiesBrowseSearch from '../../../support/fragments/marcAuthority/marcAuthoritiesBrowseSearch';
import MarcAuthoritiesDelete from '../../../support/fragments/marcAuthority/marcAuthoritiesDelete';
import MarcAuthority from '../../../support/fragments/marcAuthority/marcAuthority';
import QuickMarcEditor from '../../../support/fragments/quickMarcEditor';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import InventoryViewSource from '../../../support/fragments/inventory/inventoryViewSource';

describe('MARC', () => {
  describe('MARC Authority', () => {
    const testData = {
      createdRecordIDs: [],
      marcValue: 'C423379 Beethoven, Ludwig van, 1770-1827. 14 Variationen über ein Originalthema',
      markedValue: 'C423379 Beethoven, Ludwig van,',
      searchOption: 'Name-title',
      authorized: 'Authorized',
      reference: 'Reference',
      bib240UnlinkedFieldValue: [
        18,
        '240',
        '1',
        '0',
        '$a Variations, $m piano, violin, cello, $n op. 44, $r E♭ major $0 http://id.loc.gov/authorities/names/n83130832423379',
      ],
    };
    const marcFiles = [
      {
        marc: 'marcBibFileForC423379.mrc',
        fileName: `C423379 testMarcFile${getRandomPostfix()}.mrc`,
        jobProfileToRun: 'Default - Create instance and SRS MARC Bib',
        numOfRecords: 1,
        propertyName: 'relatedInstanceInfo',
      },
      {
        marc: 'marcAuthFileForC423379.mrc',
        fileName: `C423379 testMarcFile${getRandomPostfix()}.mrc`,
        jobProfileToRun: 'Default - Create SRS MARC Authority',
        numOfRecords: 1,
        propertyName: 'relatedAuthorityInfo',
      },
    ];
    const linkingTagAndValues = {
      rowIndex: 18,
      value: 'C423379 Beethoven, Ludwig van,',
      tag: 240,
      content: '$a C423379 Variations, $m piano. $k Selections',
    };

    before('Creating test data', () => {
      // make sure there are no duplicate authority records in the system before auto-linking
      cy.getAdminToken();
      MarcAuthorities.getMarcAuthoritiesViaApi({ limit: 100, query: 'keyword="C423379"' }).then(
        (records) => {
          records.forEach((record) => {
            if (record.authRefType === 'Authorized') {
              MarcAuthority.deleteViaAPI(record.id);
            }
          });
        },
      );

      cy.createTempUser([
        Permissions.inventoryAll.gui,
        Permissions.uiMarcAuthoritiesAuthorityRecordView.gui,
        Permissions.uiMarcAuthoritiesAuthorityRecordDelete.gui,
        Permissions.uiQuickMarcQuickMarcBibliographicEditorAll.gui,
        Permissions.uiQuickMarcQuickMarcAuthorityLinkUnlink.gui,
      ]).then((userProperties) => {
        testData.user = userProperties;

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

        cy.loginAsAdmin();
        cy.visit(TopMenu.inventoryPath).then(() => {
          InventoryInstances.searchByTitle(testData.createdRecordIDs[0]);
          InventoryInstances.selectInstance();
          InventoryInstance.editMarcBibliographicRecord();
          QuickMarcEditor.clickLinkIconInTagField(linkingTagAndValues.rowIndex);
          MarcAuthorities.switchToSearch();
          InventoryInstance.verifySelectMarcAuthorityModal();
          InventoryInstance.verifySearchOptions();
          InventoryInstance.searchResults(linkingTagAndValues.value);
          MarcAuthorities.selectTitle(testData.marcValue);
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
        MarcAuthorities.switchToBrowse();
      });
    });

    after('Deleting user, data', () => {
      cy.getAdminToken();
      Users.deleteViaApi(testData.user.userId);
      InventoryInstance.deleteInstanceViaApi(testData.createdRecordIDs[0]);
    });

    it(
      'C423379 Delete "Reference" "MARC authority" record that has one linked field in "MARC Bib" record from browse result list (spitfire) (TaaS)',
      { tags: ['extendedPath', 'spitfire'] },
      () => {
        MarcAuthoritiesBrowseSearch.searchBy(testData.searchOption, testData.marcValue);
        MarcAuthorities.selectTitle(testData.marcValue);
        MarcAuthorities.checkRecordDetailPageMarkedValue(testData.markedValue);
        MarcAuthority.delete();
        MarcAuthoritiesDelete.checkDeleteModal();
        MarcAuthoritiesDelete.confirmDelete();
        MarcAuthoritiesDelete.verifyDeleteComplete(testData.marcValue);

        cy.visit(TopMenu.inventoryPath);
        InventoryInstances.searchByTitle(testData.createdRecordIDs[0]);
        InventoryInstances.selectInstance();
        InventoryInstance.editMarcBibliographicRecord();
        QuickMarcEditor.verifyTagFieldAfterUnlinking(...testData.bib240UnlinkedFieldValue);
        QuickMarcEditor.verifyIconsAfterUnlinking(linkingTagAndValues.rowIndex);
        QuickMarcEditor.pressCancel();
        InventoryInstance.waitInventoryLoading();
        InventoryInstance.viewSource();
        InventoryViewSource.verifyLinkedToAuthorityIcon(linkingTagAndValues.rowIndex - 3, false);
      },
    );
  });
});
