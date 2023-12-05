import getRandomPostfix from '../../../../support/utils/stringTools';
import Permissions from '../../../../support/dictionary/permissions';
import TopMenu from '../../../../support/fragments/topMenu';
import DataImport from '../../../../support/fragments/data_import/dataImport';
import MarcAuthority from '../../../../support/fragments/marcAuthority/marcAuthority';
import Users from '../../../../support/fragments/users/users';
import JobProfiles from '../../../../support/fragments/data_import/job_profiles/jobProfiles';
import Logs from '../../../../support/fragments/data_import/logs/logs';
import MarcAuthorities from '../../../../support/fragments/marcAuthority/marcAuthorities';
import QuickMarcEditor from '../../../../support/fragments/quickMarcEditor';
import InventoryInstance from '../../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../../support/fragments/inventory/inventoryInstances';
import { JOB_STATUS_NAMES } from '../../../../support/constants';
import MarcAuthoritiesSearch from '../../../../support/fragments/marcAuthority/marcAuthoritiesSearch';
import InventoryKeyboardShortcuts from '../../../../support/fragments/inventory/inventoryKeyboardShortcuts';
import InventoryHotkeys from '../../../../support/fragments/inventory/inventoryHotkeys';

describe('MARC Authority -> Edit linked Authority record', () => {
  const testData = {
    tag240: '240',
    tag100: '100',
    updatedValue:
      '$aC374156 Beethoven, Ludwig van,$d1770-1827.$tVariation:,$nop. 44,$rE♭ major$s ver. 5',
    authorityIconText: 'Linked to MARC authority',
    updatedFieldContent: '$a Variation:, $n op. 44, $r E♭ major $s ver. 5',
  };
  const marcFiles = [
    {
      marc: 'marcBibFileC374156.mrc',
      fileName: `testMarcFileC374156${getRandomPostfix()}.mrc`,
      jobProfileToRun: 'Default - Create instance and SRS MARC Bib',
      instanceTitle: 'Variations / Ludwig Van Beethoven.',
      instanceAlternativeTitle: 'Variation:, op. 44, E♭ major ver. 5',
    },
    {
      marc: 'marcAuthFileC374156.mrc',
      fileName: `testMarcFileC374156${getRandomPostfix()}.mrc`,
      jobProfileToRun: 'Default - Create SRS MARC Authority',
      authorityHeading:
        'Beethoven, Ludwig van, 1770-1827. Variations, piano, violin, cello, op. 44, E♭ major',
      updatedAuthorityHeading:
        'C374156 Beethoven, Ludwig van, 1770-1827. Variation:, op. 44, E♭ major ver. 5',
    },
  ];
  const linkingTagAndValue = {
    rowIndex: 18,
    value: 'Beethoven, Ludwig van,',
    tag: '240',
  };
  const hotKeys = InventoryHotkeys.hotKeys;
  const createdRecordIDs = [];

  before('Creating user, importing and linking records', () => {
    cy.createTempUser([
      Permissions.inventoryAll.gui,
      Permissions.uiMarcAuthoritiesAuthorityRecordView.gui,
      Permissions.uiMarcAuthoritiesAuthorityRecordEdit.gui,
      Permissions.uiQuickMarcQuickMarcAuthoritiesEditorAll.gui,
      Permissions.uiQuickMarcQuickMarcBibliographicEditorAll.gui,
      Permissions.uiQuickMarcQuickMarcAuthorityLinkUnlink.gui,
    ]).then((createdUserProperties) => {
      testData.userProperties = createdUserProperties;

      marcFiles.forEach((marcFile) => {
        cy.loginAsAdmin({ path: TopMenu.dataImportPath, waiter: DataImport.waitLoading }).then(
          () => {
            DataImport.verifyUploadState();
            DataImport.uploadFileAndRetry(marcFile.marc, marcFile.fileName);
            JobProfiles.search(marcFile.jobProfileToRun);
            JobProfiles.runImportFile();
            JobProfiles.waitFileIsImported(marcFile.fileName);
            Logs.checkStatusOfJobProfile(JOB_STATUS_NAMES.COMPLETED);
            Logs.openFileDetails(marcFile.fileName);
            Logs.getCreatedItemsID().then((link) => {
              createdRecordIDs.push(link.split('/')[5]);
            });
          },
        );
      });

      cy.visit(TopMenu.inventoryPath).then(() => {
        InventoryInstance.searchByTitle(createdRecordIDs[0]);
        InventoryInstances.selectInstance();
        InventoryInstance.editMarcBibliographicRecord();
        InventoryInstance.verifyAndClickLinkIcon(testData.tag240);
        MarcAuthorities.switchToSearch();
        InventoryInstance.verifySelectMarcAuthorityModal();
        InventoryInstance.searchResults(linkingTagAndValue.value);
        MarcAuthoritiesSearch.selectAuthorityByIndex(0);
        InventoryInstance.clickLinkButton();
        QuickMarcEditor.verifyAfterLinkingUsingRowIndex(
          linkingTagAndValue.tag,
          linkingTagAndValue.rowIndex,
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
      createdRecordIDs.forEach((id, index) => {
        if (index) MarcAuthority.deleteViaAPI(id);
        else InventoryInstance.deleteInstanceViaApi(id);
      });
    });
  });

  it(
    'C374156 Edit "1XX" field value of "MARC Authority" record which controls "MARC Bibs" (spitfire) (TaaS)',
    { tags: ['extendedPath', 'spitfire'] },
    () => {
      MarcAuthorities.searchBy('Keyword', marcFiles[1].authorityHeading);
      MarcAuthorities.selectTitle(marcFiles[1].authorityHeading);
      MarcAuthority.edit();
      QuickMarcEditor.updateExistingField(testData.tag100, testData.updatedValue);
      QuickMarcEditor.checkButtonsEnabled();
      QuickMarcEditor.checkContent(testData.updatedValue, 7);
      QuickMarcEditor.saveAndCloseUpdatedLinkedBibField();
      QuickMarcEditor.cancelUpdateLinkedBibs();
      QuickMarcEditor.saveAndCloseUpdatedLinkedBibField();
      InventoryKeyboardShortcuts.pressHotKey(hotKeys.close);
      QuickMarcEditor.checkUpdateLinkedBibModalAbsent();
      QuickMarcEditor.saveAndCloseUpdatedLinkedBibField();
      QuickMarcEditor.confirmUpdateLinkedBibs(1);
      MarcAuthorities.closeMarcViewPane();
      MarcAuthorities.searchBy('Keyword', marcFiles[1].updatedAuthorityHeading);
      MarcAuthorities.checkResultList([marcFiles[1].updatedAuthorityHeading]);
      MarcAuthorities.verifyNumberOfTitles(5, '1');
      MarcAuthorities.clickOnNumberOfTitlesLink(5, '1');
      InventoryInstance.checkInstanceTitle(marcFiles[0].instanceTitle);
      InventoryInstance.verifyAlternativeTitle(
        0,
        1,
        `${testData.authorityIconText}${marcFiles[0].instanceAlternativeTitle}`,
      );
      InventoryInstance.editMarcBibliographicRecord();
      QuickMarcEditor.verifyTagFieldAfterLinking(
        linkingTagAndValue.rowIndex,
        linkingTagAndValue.tag,
        '1',
        '0',
        '$a Variation:, $n op. 44, $r E♭ major $s ver. 5',
        '',
        '$0 id.loc.gov/authorities/names/n83130832',
        '',
      );
    },
  );
});
