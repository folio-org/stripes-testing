import Permissions from '../../../../../support/dictionary/permissions';
import DataImport from '../../../../../support/fragments/data_import/dataImport';
import JobProfiles from '../../../../../support/fragments/data_import/job_profiles/jobProfiles';
import Logs from '../../../../../support/fragments/data_import/logs/logs';
import InventoryInstance from '../../../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../../../support/fragments/inventory/inventoryInstances';
import InventoryViewSource from '../../../../../support/fragments/inventory/inventoryViewSource';
import MarcAuthority from '../../../../../support/fragments/marcAuthority/marcAuthority';
import MarcAuthorities from '../../../../../support/fragments/marcAuthority/marcAuthorities';
import QuickMarcEditor from '../../../../../support/fragments/quickMarcEditor';
import InstanceRecordView from '../../../../../support/fragments/inventory/instanceRecordView';
import TopMenu from '../../../../../support/fragments/topMenu';
import Users from '../../../../../support/fragments/users/users';
import getRandomPostfix from '../../../../../support/utils/stringTools';
import { JOB_STATUS_NAMES } from '../../../../../support/constants';

describe('MARC -> MARC Bibliographic -> Edit MARC bib -> Manual linking', () => {
  let userData = {};
  const testData = {
    tag100: '100',
    tag100RowIndex: 11,
    field100Value: '$a Chin, Staceyann, $d 1972-',
    authorityTitle: 'Chin, Staceyann, 1972-',
    instanceTitle:
      'Crossfire : a litany for survival : poems 1998-2019 / Staceyann Chin ; foreword by Jacqueline Woodson.',
    linked100Field: [
      11,
      '100',
      '1',
      '\\',
      '$a Chin, Staceyann, $d 1972-',
      '$e Author $e Narrator',
      '$0 id.loc.gov/authorities/names/n2008052404',
      '$1 http://viaf.org/viaf/24074052',
    ],
    bib100AfterUnlinking: [
      11,
      '100',
      '1',
      '\\',
      '$a Chin, Staceyann, $d 1972- $e Author $e Narrator $0 id.loc.gov/authorities/names/n2008052404 $1 http://viaf.org/viaf/24074052',
    ],
    linkedIconText: 'Linked to MARC authority',
    unlinkIconText: 'Unlink from MARC Authority record',
  };

  const marcFiles = [
    {
      marc: 'marcBibFileForC365599.mrc',
      fileName: `testMarcFileC365599.${getRandomPostfix()}.mrc`,
      jobProfileToRun: 'Default - Create instance and SRS MARC Bib',
    },
    {
      marc: 'marcAuthFileForC365599.mrc',
      fileName: `testMarcFileC365599.${getRandomPostfix()}.mrc`,
      jobProfileToRun: 'Default - Create SRS MARC Authority',
    },
  ];

  const createdRecordIDs = [];

  before('Create test data', () => {
    cy.createTempUser([
      Permissions.inventoryAll.gui,
      Permissions.uiMarcAuthoritiesAuthorityRecordView.gui,
      Permissions.uiMarcAuthoritiesAuthorityRecordEdit.gui,
      Permissions.uiQuickMarcQuickMarcBibliographicEditorAll.gui,
      Permissions.uiQuickMarcQuickMarcAuthorityLinkUnlink.gui,
    ]).then((createdUserProperties) => {
      userData = createdUserProperties;

      InventoryInstances.getInstancesViaApi({
        limit: 100,
        query: `title="${testData.instanceTitle}"`,
      }).then((instances) => {
        if (instances) {
          instances.forEach(({ id }) => {
            InventoryInstance.deleteInstanceViaApi(id);
          });
        }
      });
      MarcAuthorities.getMarcAuthoritiesViaApi({
        limit: 100,
        query: `keyword="${testData.authorityTitle}" and (authRefType==("Authorized" or "Auth/Ref"))`,
      }).then((authorities) => {
        if (authorities) {
          authorities.forEach(({ id }) => {
            MarcAuthority.deleteViaAPI(id);
          });
        }
      });

      cy.loginAsAdmin().then(() => {
        cy.visit(TopMenu.dataImportPath);
        marcFiles.forEach((marcFile) => {
          DataImport.verifyUploadState();
          DataImport.uploadFile(marcFile.marc, marcFile.fileName);
          JobProfiles.waitLoadingList();
          JobProfiles.search(marcFile.jobProfileToRun);
          JobProfiles.runImportFile();
          Logs.waitFileIsImported(marcFile.fileName);
          Logs.checkStatusOfJobProfile(JOB_STATUS_NAMES.COMPLETED);
          Logs.openFileDetails(marcFile.fileName);
          Logs.getCreatedItemsID().then((link) => {
            createdRecordIDs.push(link.split('/')[5]);
          });
          JobProfiles.closeJobProfile(marcFile.fileName);
        });
      });

      cy.visit(TopMenu.inventoryPath).then(() => {
        InventoryInstances.searchByTitle(createdRecordIDs[0]);
        InventoryInstances.selectInstance();
        InventoryInstance.editMarcBibliographicRecord();

        InventoryInstance.verifyAndClickLinkIcon(testData.tag100);
        InventoryInstance.verifySelectMarcAuthorityModal();
        MarcAuthorities.switchToSearch();
        InventoryInstance.searchResults(testData.authorityTitle);
        MarcAuthorities.checkFieldAndContentExistence(testData.tag100, testData.field100Value);
        InventoryInstance.clickLinkButton();
        QuickMarcEditor.verifyAfterLinkingAuthority(testData.tag100);
        QuickMarcEditor.closeCallout();
        QuickMarcEditor.pressSaveAndClose();
        cy.wait(1000);

        cy.login(userData.username, userData.password, {
          path: TopMenu.inventoryPath,
          waiter: InventoryInstances.waitContentLoading,
        });
        InventoryInstances.searchByTitle(createdRecordIDs[0]);
        InventoryInstances.selectInstance();
      });
    });
  });
  after('Delete test data', () => {
    cy.getAdminToken();
    Users.deleteViaApi(userData.userId);
    createdRecordIDs.forEach((id, index) => {
      if (index) MarcAuthority.deleteViaAPI(id);
      else InventoryInstance.deleteInstanceViaApi(id);
    });
  });

  it(
    'C365599 Unlink "MARC Bibliographic" field from "MARC Authority" record and use the "Save & keep editing" button in editing window (spitfire) (TaaS)',
    { tags: ['extendedPath', 'spitfire'] },
    () => {
      InventoryInstance.editMarcBibliographicRecord();
      QuickMarcEditor.verifyUnlinkAndViewAuthorityButtons(testData.tag100RowIndex);
      QuickMarcEditor.verifySaveAndKeepEditingButtonDisabled();

      QuickMarcEditor.verifyTagFieldAfterLinking(...testData.linked100Field);

      QuickMarcEditor.checkUnlinkTooltipText(testData.tag100RowIndex, testData.unlinkIconText);

      QuickMarcEditor.clickUnlinkIconInTagField(testData.tag100RowIndex);
      QuickMarcEditor.checkUnlinkModal(testData.tag100);

      QuickMarcEditor.confirmUnlinkingField();
      QuickMarcEditor.verifyTagFieldAfterUnlinking(...testData.bib100AfterUnlinking);
      QuickMarcEditor.checkLinkButtonExist(testData.tag100);
      QuickMarcEditor.verifySaveAndKeepEditingButtonEnabled();

      QuickMarcEditor.clickSaveAndKeepEditing();
      QuickMarcEditor.closeCallout();
      QuickMarcEditor.verifyTagFieldAfterUnlinking(...testData.bib100AfterUnlinking);

      QuickMarcEditor.clickLinkIconInTagField(testData.tag100RowIndex);
      InventoryInstance.verifySelectMarcAuthorityModal();

      InventoryInstance.closeFindAuthorityModal();
      QuickMarcEditor.pressCancel();
      InstanceRecordView.verifyInstancePaneExists();

      InstanceRecordView.verifyContributorNameWithoutMarcAppIcon(0, testData.authorityTitle);

      InstanceRecordView.viewSource();
      InventoryViewSource.waitLoading();
      InventoryViewSource.notContains(testData.linkedIconText);
    },
  );
});
