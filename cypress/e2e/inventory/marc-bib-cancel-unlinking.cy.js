import { DevTeams, TestTypes, Permissions, Parallelization } from '../../support/dictionary';
import TopMenu from '../../support/fragments/topMenu';
import Users from '../../support/fragments/users/users';
import InventoryInstance from '../../support/fragments/inventory/inventoryInstance';
import QuickMarcEditor from '../../support/fragments/quickMarcEditor';
import InventoryInstances from '../../support/fragments/inventory/inventoryInstances';
import getRandomPostfix from '../../support/utils/stringTools';
import DataImport from '../../support/fragments/data_import/dataImport';
import JobProfiles from '../../support/fragments/data_import/job_profiles/jobProfiles';
import Logs from '../../support/fragments/data_import/logs/logs';
import MarcAuthorities from '../../support/fragments/marcAuthority/marcAuthorities';
import InventoryKeyboardShortcuts from '../../support/fragments/inventory/inventoryKeyboardShortcuts';
import InventoryHotkeys from '../../support/fragments/inventory/inventoryHotkeys';
import InstanceRecordView from '../../support/fragments/inventory/instanceRecordView';
import MarcAuthority from '../../support/fragments/marcAuthority/marcAuthority';

describe('MARC › MARC Bibliographic › Edit MARC bib', () => {
  const hotKeys = InventoryHotkeys.hotKeys;
  const testData = {
    linkedTag: '100',
    tag100: [
      11,
      '100',
      '1',
      '\\',
      '$a C365601 Chin, Staceyann, $d 1972-',
      '$e Author $e Narrator',
      '$0 id.loc.gov/authorities/names/n2008052404',
      '$1 http://viaf.org/viaf/24074052',
    ],
  };
  const marcFiles = [
    {
      marc: 'marcBibFileC365601.mrc',
      fileName: `C365601 autotestMarcFile.${getRandomPostfix()}.mrc`,
      jobProfileToRun: 'Default - Create instance and SRS MARC Bib',
      numOfRecords: 1,
    },
    {
      marc: 'marcAuthFileC365601_1.mrc',
      fileName: `C365601 autotestMarcFile.${getRandomPostfix()}.mrc`,
      jobProfileToRun: 'Default - Create SRS MARC Authority',
      numOfRecords: 1,
    },
  ];
  const linkingTagAndValues = {
    rowIndex: 11,
    value: 'C365601 Chin, Staceyann, ',
    tag: '100',
  };
  const contributor = 'C365601 Chin, Staceyann, 1972-';
  const createdAuthorityIDs = [];

  before('Creating test user and an inventory instance', () => {
    cy.loginAsAdmin()
      .then(() => {
        marcFiles.forEach((marcFile) => {
          cy.visit(TopMenu.dataImportPath);
          DataImport.verifyUploadState();
          DataImport.uploadFileAndRetry(marcFile.marc, marcFile.fileName);
          JobProfiles.waitLoadingList();
          JobProfiles.search(marcFile.jobProfileToRun);
          JobProfiles.runImportFile();
          JobProfiles.waitFileIsImported(marcFile.fileName);
          Logs.checkStatusOfJobProfile('Completed');
          Logs.openFileDetails(marcFile.fileName);
          for (let i = 0; i < marcFile.numOfRecords; i++) {
            Logs.getCreatedItemsID(i).then((link) => {
              createdAuthorityIDs.push(link.split('/')[5]);
            });
          }
        });
      })
      .then(() => {
        cy.visit(TopMenu.inventoryPath);
        InventoryInstance.searchByTitle(createdAuthorityIDs[0]);
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

    cy.createTempUser([
      Permissions.inventoryAll.gui,
      Permissions.uiMarcAuthoritiesAuthorityRecordView.gui,
      Permissions.uiQuickMarcQuickMarcAuthoritiesEditorAll.gui,
      Permissions.uiQuickMarcQuickMarcBibliographicEditorAll.gui,
      Permissions.uiQuickMarcQuickMarcAuthorityLinkUnlink.gui,
    ]).then((userProperties) => {
      testData.user = userProperties;

      cy.login(testData.user.username, testData.user.password, {
        path: TopMenu.inventoryPath,
        waiter: InventoryInstances.waitContentLoading,
      }).then(() => {
        InventoryInstances.waitContentLoading();
        InventoryInstance.searchByTitle(createdAuthorityIDs[0]);
        InventoryInstances.selectInstance();
        InventoryInstance.editMarcBibliographicRecord();
      });
    });
  });

  after('Deleting test user and an inventory instance', () => {
    cy.getAdminToken().then(() => {
      Users.deleteViaApi(testData.user.userId);
      InventoryInstance.deleteInstanceViaApi(createdAuthorityIDs[0]);
      MarcAuthority.deleteViaAPI(createdAuthorityIDs[1]);
    });
  });

  it(
    'C365601 Cancel unlinking "MARC Bibliographic" field from "MARC Authority" record and use the "Cancel" button in editing window. (Spitfire) (TaaS)',
    { tags: [TestTypes.extendedPath, DevTeams.spitfire, Parallelization.nonParallel] },
    () => {
      QuickMarcEditor.verifyUnlinkAndViewAuthorityButtons(linkingTagAndValues.rowIndex);
      QuickMarcEditor.checkButtonsDisabled();
      // step 2
      QuickMarcEditor.checkUnlinkTooltipText('100', 'Unlink from MARC Authority record');
      QuickMarcEditor.clickUnlinkIconInTagField(linkingTagAndValues.rowIndex);
      QuickMarcEditor.checkUnlinkModal(
        'By selecting Unlink, then field 100 will be unlinked from the MARC authority record. Are you sure you want to continue?',
      );
      QuickMarcEditor.cancelUnlinkingField();
      QuickMarcEditor.checkDeleteModalClosed();
      // step 5
      QuickMarcEditor.clickUnlinkIconInTagField(linkingTagAndValues.rowIndex);
      QuickMarcEditor.checkUnlinkModal(
        'By selecting Unlink, then field 100 will be unlinked from the MARC authority record. Are you sure you want to continue?',
      );
      InventoryKeyboardShortcuts.pressHotKey(hotKeys.close);
      QuickMarcEditor.checkDeleteModalClosed();
      // step 7
      QuickMarcEditor.pressCancel();
      InstanceRecordView.verifyInstancePaneExists();
      InstanceRecordView.verifyContributorWithMarcAppLink(0, 1, contributor);
    },
  );
});
