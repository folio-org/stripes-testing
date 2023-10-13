import TestTypes from '../../../support/dictionary/testTypes';
import DevTeams from '../../../support/dictionary/devTeams';
import Permissions from '../../../support/dictionary/permissions';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import DataImport from '../../../support/fragments/data_import/dataImport';
import Logs from '../../../support/fragments/data_import/logs/logs';
import JobProfiles from '../../../support/fragments/data_import/job_profiles/jobProfiles';
import getRandomPostfix from '../../../support/utils/stringTools';
import MarcAuthority from '../../../support/fragments/marcAuthority/marcAuthority';
import MarcAuthorities from '../../../support/fragments/marcAuthority/marcAuthorities';
import QuickMarcEditor from '../../../support/fragments/quickMarcEditor';
import InventoryViewSource from '../../../support/fragments/inventory/inventoryViewSource';
import MarcAuthorityBrowse from '../../../support/fragments/marcAuthority/MarcAuthorityBrowse';

describe('Manual Linking Bib field to Authority 1XX', () => {
  const testData = {
    tag611: '611',
    authorityValue:
      'C380764 Vatican Council (2nd : 1962-1965 : Basilica di San Pietro in Vaticano)',
    authorityHeading:
      'Basilica di San Pietro in Vaticano) C380764 Vatican Council 1962-1965 : (2nd :',
    linkedIconText: 'Linked to MARC authority',
    accordion: 'Subject',
    searchOptionCorporateName: 'Corporate/Conference name',
    authorized: 'Authorized',
  };

  const marcFiles = [
    {
      marc: 'marcBibFileForC380764.mrc',
      fileName: `testMarcFileC375070.${getRandomPostfix()}.mrc`,
      jobProfileToRun: 'Default - Create instance and SRS MARC Bib',
    },
    {
      marc: 'marcAuthFileForC380764.mrc',
      fileName: `testMarcFileC375070.${getRandomPostfix()}.mrc`,
      jobProfileToRun: 'Default - Create SRS MARC Authority',
    },
  ];

  const createdRecordIDs = [];

  const bib611FieldValues = [
    15,
    testData.tag611,
    '2',
    '7',
    '$a V.Council $2 fast $0 http://id.worldcat.org/fast/fst01405122 $1 http://viaf.org/viaf/133636573/ $d 1960 $c San Pietro $t ValueT',
  ];

  const bib611AfterLinkingToAuth111 = [
    15,
    testData.tag611,
    '2',
    '7',
    '$c Basilica di San Pietro in Vaticano) $a C380764 Vatican Council $d 1962-1965 : $n (2nd :',
    '',
    '$0 id.loc.gov/authorities/names/n79084169',
    '$2 fast $1 http://viaf.org/viaf/133636573/',
  ];

  const bib611AfterUnlinking = [
    15,
    testData.tag611,
    '2',
    '7',
    '$c Basilica di San Pietro in Vaticano) $a C380764 Vatican Council $d 1962-1965 : $n (2nd : $0 id.loc.gov/authorities/names/n79084169 $2 fast $1 http://viaf.org/viaf/133636573/',
  ];

  before('Creating user and data', () => {
    cy.createTempUser([
      Permissions.inventoryAll.gui,
      Permissions.uiMarcAuthoritiesAuthorityRecordView.gui,
      Permissions.uiQuickMarcQuickMarcBibliographicEditorAll.gui,
      Permissions.uiQuickMarcQuickMarcAuthorityLinkUnlink.gui,
    ]).then((createdUserProperties) => {
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
          Logs.getCreatedItemsID().then((link) => {
            createdRecordIDs.push(link.split('/')[5]);
          });
        });
      });

      cy.login(testData.userProperties.username, testData.userProperties.password, {
        path: TopMenu.inventoryPath,
        waiter: InventoryInstances.waitContentLoading,
      });
    });
  });

  after('Deleting created user and data', () => {
    Users.deleteViaApi(testData.userProperties.userId);
    createdRecordIDs.forEach((id, index) => {
      if (index) MarcAuthority.deleteViaAPI(id);
      else InventoryInstance.deleteInstanceViaApi(id);
    });
  });

  it(
    'C380764 Link the "611" of "MARC Bib" field with "111" field of "MARC Authority" record. (spitfire) (TaaS)',
    { tags: [TestTypes.extendedPath, DevTeams.spitfire] },
    () => {
      InventoryInstance.searchByTitle(createdRecordIDs[0]);
      InventoryInstances.selectInstance();
      InventoryInstance.editMarcBibliographicRecord();
      QuickMarcEditor.verifyTagFieldAfterUnlinking(...bib611FieldValues);
      InventoryInstance.verifyAndClickLinkIcon(testData.tag611);
      MarcAuthorities.switchToSearch();
      InventoryInstance.verifySelectMarcAuthorityModal();
      InventoryInstance.verifySearchOptions();
      MarcAuthorities.checkSearchInput(
        'keyword==V.Council 1960 ValueT or identifiers.value==fst01405122',
      );
      MarcAuthorities.verifyEmptyAuthorityField();
      MarcAuthorities.closeAuthorityLinkingModal();

      QuickMarcEditor.updateExistingField(
        testData.tag611,
        '$2 fast $0 http://id.worldcat.org/fast/fst01405122 $1 http://viaf.org/viaf/133636573/ $c San Pietro $t ValueT',
      );
      InventoryInstance.verifyAndClickLinkIcon(testData.tag611);
      MarcAuthorities.switchToSearch();
      InventoryInstance.verifySelectMarcAuthorityModal();
      InventoryInstance.verifySearchOptions();
      MarcAuthorities.checkSearchInput('keyword==ValueT or identifiers.value==fst01405122');
      MarcAuthorities.verifyEmptyAuthorityField();

      MarcAuthorities.switchToBrowse();
      MarcAuthorities.verifyDisabledSearchButton();
      MarcAuthorityBrowse.searchBy(testData.searchOptionCorporateName, testData.authorityValue);
      MarcAuthorities.checkRow(testData.authorityValue);
      MarcAuthorities.selectTitle(testData.authorityValue);
      InventoryInstance.clickLinkButton();
      QuickMarcEditor.verifyAfterLinkingUsingRowIndex(testData.tag611, bib611FieldValues[0]);
      QuickMarcEditor.verifyTagFieldAfterLinking(...bib611AfterLinkingToAuth111);
      QuickMarcEditor.pressSaveAndClose();
      QuickMarcEditor.checkAfterSaveAndClose();

      InventoryInstance.verifyRecordAndMarcAuthIcon(
        testData.accordion,
        `${testData.linkedIconText}\n${testData.authorityHeading}`,
      );
      InventoryInstance.clickViewAuthorityIconDisplayedInInstanceDetailsPane(testData.accordion);
      MarcAuthorities.checkDetailViewIncludesText(testData.authorityValue);
      InventoryInstance.goToPreviousPage();
      // Wait for the content to be loaded.
      cy.wait(6000);
      InventoryInstance.waitLoading();
      InventoryInstance.viewSource();
      InventoryViewSource.contains(`${testData.linkedIconText}\n\t611`);
      InventoryInstance.checkExistanceOfAuthorityIconInMarcViewPane();
      InventoryInstance.clickViewAuthorityIconDisplayedInMarcViewPane();
      MarcAuthorities.checkDetailViewIncludesText(testData.authorityValue);
      InventoryInstance.goToPreviousPage();
      // Wait for the content to be loaded.
      cy.wait(6000);
      InventoryViewSource.waitLoading();
      InventoryViewSource.close();
      InventoryInstance.waitLoading();
      InventoryInstance.editMarcBibliographicRecord();
      QuickMarcEditor.verifyTagFieldAfterLinking(...bib611AfterLinkingToAuth111);

      QuickMarcEditor.clickUnlinkIconInTagField(bib611FieldValues[0]);
      QuickMarcEditor.verifyTagFieldAfterUnlinking(...bib611AfterUnlinking);
      QuickMarcEditor.verifyIconsAfterUnlinking(bib611FieldValues[0]);
      QuickMarcEditor.pressSaveAndClose();
      QuickMarcEditor.checkAfterSaveAndClose();
      InventoryInstance.checkAbsenceOfAuthorityIconInInstanceDetailPane(testData.accordion);
      InventoryInstance.viewSource();
      InventoryInstance.checkAbsenceOfAuthorityIconInMarcViewPane();
    },
  );
});
