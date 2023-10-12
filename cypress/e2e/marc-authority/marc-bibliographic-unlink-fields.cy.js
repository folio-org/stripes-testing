import getRandomPostfix from '../../support/utils/stringTools';
import { DevTeams, TestTypes, Permissions } from '../../support/dictionary';
import TopMenu from '../../support/fragments/topMenu';
import DataImport from '../../support/fragments/data_import/dataImport';
import Users from '../../support/fragments/users/users';
import JobProfiles from '../../support/fragments/data_import/job_profiles/jobProfiles';
import Logs from '../../support/fragments/data_import/logs/logs';
import InventoryInstance from '../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../support/fragments/inventory/inventoryInstances';
import QuickMarcEditor from '../../support/fragments/quickMarcEditor';
import MarcAuthority from '../../support/fragments/marcAuthority/marcAuthority';
import MarcAuthorities from '../../support/fragments/marcAuthority/marcAuthorities';

describe('MARC -> MARC Bibliographic', () => {
  const testData = {
    tag100: '100',
    tag010: '010',
    tag700: '700',
    authority100FieldValue: 'C365598 Chin, Staceyann, 1972-',
    authority010FieldValue: 'n2008052404',
    authority700FieldValue: 'C365598 Woodson, Jacqueline',
    successMsg:
      'This record has successfully saved and is in process. Changes may not appear immediately.',
    accordion: 'Contributor',
  };
  const marcFiles = [
    {
      marc: 'marcFileForC365598_1.mrc',
      fileName: `testMarcFile.${getRandomPostfix()}.mrc`,
      jobProfileToRun: 'Default - Create SRS MARC Authority',
      numOfRecords: 1,
    },
    {
      marc: 'marcFileForC365598_2.mrc',
      fileName: `testMarcFile.${getRandomPostfix()}.mrc`,
      jobProfileToRun: 'Default - Create SRS MARC Authority',
      numOfRecords: 1,
    },
    {
      marc: 'marcFileForC365598_3.mrc',
      fileName: `testMarcFile.${getRandomPostfix()}.mrc`,
      jobProfileToRun: 'Default - Create instance and SRS MARC Bib',
      numOfRecords: 1,
    },
  ];
  const linkedField = {
    rowIndex: 11,
    tag: '100',
    secondBox: '1',
    thirdBox: '\\',
    content: '$a C365598 Chin, Staceyann, $d 1972-',
    eSubfield: '$e Author $e Narrator',
    zeroSubfield: '$0 id.loc.gov/authorities/names/n2008052404365598',
    seventhBox: '$1 http://viaf.org/viaf/24074052',
  };
  const unlinkedField = {
    rowIndex: 11,
    tag: '100',
    indicator0: '1',
    indicator1: '\\',
    content:
      '$a C365598 Chin, Staceyann, $d 1972- $e Author $e Narrator $0 id.loc.gov/authorities/names/n2008052404365598 $1 http://viaf.org/viaf/24074052',
  };
  const contributors = {
    firstName: 'C365598 Chin, Staceyann, 1972-',
    secondName: 'Woodson, Jacqueline',
  };
  const createdAuthorityIDs = [];

  before(() => {
    cy.createTempUser([
      Permissions.inventoryAll.gui,
      Permissions.uiMarcAuthoritiesAuthorityRecordView.gui,
      Permissions.uiQuickMarcQuickMarcAuthoritiesEditorAll.gui,
      Permissions.uiQuickMarcQuickMarcBibliographicEditorAll.gui,
      Permissions.uiQuickMarcQuickMarcAuthorityLinkUnlink.gui,
    ])
      .then((createdUserProperties) => {
        testData.userProperties = createdUserProperties;

        cy.loginAsAdmin().then(() => {
          marcFiles.forEach((marcFile) => {
            cy.visit(TopMenu.dataImportPath);
            DataImport.waitLoading();

            DataImport.uploadFile(marcFile.marc, marcFile.fileName);
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
        });
      })
      .then(() => {
        cy.login(testData.userProperties.username, testData.userProperties.password, {
          path: TopMenu.inventoryPath,
          waiter: InventoryInstances.waitContentLoading,
        });
      });
  });

  after(() => {
    Users.deleteViaApi(testData.userProperties.userId);
    InventoryInstance.deleteInstanceViaApi(createdAuthorityIDs[2]);
    createdAuthorityIDs.forEach((id, index) => {
      if (index !== 2) MarcAuthority.deleteViaAPI(id);
    });
  });

  it(
    'C365598 Unlink "MARC Bibliographic" field from "MARC Authority" record and use the "Save & close" button in editing window. (spitfire) (TaaS)',
    { tags: [TestTypes.criticalPath, DevTeams.spitfire] },
    () => {
      InventoryInstance.searchByTitle(createdAuthorityIDs[2]);
      InventoryInstances.selectInstance();
      // unstable without this waiter
      cy.wait(1000);
      InventoryInstance.editMarcBibliographicRecord();

      InventoryInstance.verifyAndClickLinkIcon(testData.tag100);
      MarcAuthorities.switchToSearch();
      InventoryInstance.verifySelectMarcAuthorityModal();
      InventoryInstance.searchResults(testData.authority100FieldValue);
      InventoryInstance.clickLinkButton();
      QuickMarcEditor.verifyAfterLinkingAuthority(testData.tag100);
      InventoryInstance.verifyAndClickLinkIcon(testData.tag700);
      MarcAuthorities.switchToSearch();
      InventoryInstance.verifySelectMarcAuthorityModal();
      InventoryInstance.searchResults(testData.authority700FieldValue);
      InventoryInstance.clickLinkButton();
      QuickMarcEditor.verifyAfterLinkingAuthority(testData.tag700);
      QuickMarcEditor.pressSaveAndKeepEditing(testData.successMsg);
      QuickMarcEditor.verifyTagFieldAfterLinking(
        linkedField.rowIndex,
        linkedField.tag,
        linkedField.secondBox,
        linkedField.thirdBox,
        linkedField.content,
        linkedField.eSubfield,
        linkedField.zeroSubfield,
        linkedField.seventhBox,
      );
      QuickMarcEditor.verifyUnlinkAndViewAuthorityButtons(11);
      QuickMarcEditor.checkUnlinkTooltipText('100', 'Unlink from MARC Authority record');
      QuickMarcEditor.checkUnlinkModal(
        11,
        'By selecting Unlink, then field 100 will be unlinked from the MARC authority record. Are you sure you want to continue?',
      );
      QuickMarcEditor.verifyTagFieldAfterUnlinking(
        unlinkedField.rowIndex,
        unlinkedField.tag,
        unlinkedField.indicator0,
        unlinkedField.indicator1,
        unlinkedField.content,
      );
      QuickMarcEditor.pressSaveAndClose();
      QuickMarcEditor.checkAfterSaveAndClose();
      InventoryInstance.verifyContributor(0, 1, contributors.firstName);
      InventoryInstance.checkMarcAppIconAbsent(0);
      InventoryInstance.verifyContributorWithMarcAppLink(1, 1, contributors.secondName);
      InventoryInstance.checkMarcAppIconExist(1);
    },
  );
});
