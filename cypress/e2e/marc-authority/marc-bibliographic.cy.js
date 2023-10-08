import getRandomPostfix from '../../support/utils/stringTools';
import { DevTeams, TestTypes, Permissions } from '../../support/dictionary';
import TopMenu from '../../support/fragments/topMenu';
import DataImport from '../../support/fragments/data_import/dataImport';
import Users from '../../support/fragments/users/users';
import JobProfiles from '../../support/fragments/data_import/job_profiles/jobProfiles';
import Logs from '../../support/fragments/data_import/logs/logs';
import InventoryInstance from '../../support/fragments/inventory/inventoryInstance';
import QuickMarcEditor from '../../support/fragments/quickMarcEditor';
import MarcAuthority from '../../support/fragments/marcAuthority/marcAuthority';
import SettingsMenu from '../../support/fragments/settingsMenu';
import MarcFieldProtection from '../../support/fragments/settings/dataImport/marcFieldProtection';
import InventoryViewSource from '../../support/fragments/inventory/inventoryViewSource';

describe('MARC -> MARC Bibliographic', () => {
  const testData = {
    tags: {
      tag260: '260',
      tag520: '520',
      tag655: '655',
      tag755: '755',
    },
  };
  const jobProfileToRun = 'Default - Create instance and SRS MARC Bib';
  const tagArray = [
    '100',
    '110',
    '111',
    '130',
    '240',
    '600',
    '610',
    '611',
    '630',
    '650',
    '651',
    '655',
    '700',
    '710',
    '711',
    '730',
    '800',
    '810',
    '811',
    '830',
  ];
  let createdInstanceID;
  let fileName;
  const protectedFields = [
    {
      protectedField: '245',
      in1: '*',
      in2: '*',
      subfield: 'a',
      data: '*',
      source: 'User',
    },
    {
      protectedField: '260',
      in1: '1',
      in2: '1',
      subfield: 'a',
      data: '*',
      source: 'User',
    },
    {
      protectedField: '520',
      in1: '*',
      in2: '*',
      subfield: '*',
      data: '*',
      source: 'User',
    },
    {
      protectedField: '655',
      in1: '1',
      in2: '*',
      subfield: 'b',
      data: 'Added row',
      source: 'User',
    },
    {
      protectedField: '755',
      in1: '*',
      in2: '*',
      subfield: 'a',
      data: '*',
      source: 'User',
    },
  ];

  beforeEach(() => {
    fileName = `testMarcFile.${getRandomPostfix()}.mrc`;
    cy.createTempUser([
      Permissions.inventoryAll.gui,
      Permissions.uiQuickMarcQuickMarcEditorDuplicate.gui,
      Permissions.uiQuickMarcQuickMarcAuthorityLinkUnlink.gui,
      Permissions.uiQuickMarcQuickMarcBibliographicEditorAll.gui,
      Permissions.moduleDataImportEnabled.gui,
      Permissions.settingsDataImportEnabled.gui,
    ]).then((createdUserProperties) => {
      testData.userProperties = createdUserProperties;

      cy.login(testData.userProperties.username, testData.userProperties.password, {
        path: TopMenu.dataImportPath,
        waiter: DataImport.waitLoading,
      });
      DataImport.uploadFile('marcFileForC360542.mrc', fileName);
      JobProfiles.waitLoadingList();
      JobProfiles.search(jobProfileToRun);
      JobProfiles.runImportFile();
      JobProfiles.waitFileIsImported(fileName);
      Logs.checkStatusOfJobProfile('Completed');
      Logs.openFileDetails(fileName);
      Logs.getCreatedItemsID().then((link) => {
        createdInstanceID = link.split('/')[5];
      });
      Logs.goToTitleLink('Created');
    });
  });

  afterEach(() => {
    if (createdInstanceID) InventoryInstance.deleteInstanceViaApi(createdInstanceID);
    Users.deleteViaApi(testData.userProperties.userId);
    MarcFieldProtection.getListViaApi({
      query: `"field"=="${protectedFields.protectedField}"`,
    }).then((list) => {
      list.forEach(({ id }) => MarcFieldProtection.deleteViaApi(id));
    });
  });

  it(
    'C360541 Verify that "Link to MARC Authority record" icon displays next to MARC fields when editing Bib record (spitfire) (TaaS)',
    { tags: [TestTypes.criticalPath, DevTeams.spitfire] },
    () => {
      InventoryInstance.editMarcBibliographicRecord();
      tagArray.forEach((tag) => {
        QuickMarcEditor.checkLinkButtonExist(tag);
      });
      QuickMarcEditor.checkLinkButtonToolTipText('Link to MARC Authority record');
    },
  );

  it(
    'C360542 Verify that "Link to MARC Authority record" icon displays next to MARC fields when deriving Bib record (spitfire)',
    { tags: [TestTypes.smoke, DevTeams.spitfire] },
    () => {
      InventoryInstance.deriveNewMarcBib();
      tagArray.forEach((tag) => {
        QuickMarcEditor.checkLinkButtonExist(tag);
      });
    },
  );

  it(
    'C353526 Protection of specified fields when editing "MARC Bibliographic" record (spitfire) (TaaS)',
    { tags: [TestTypes.criticalPath, DevTeams.spitfire] },
    () => {
      InventoryInstance.editMarcBibliographicRecord();
      MarcAuthority.checkInfoButton('999');
      MarcAuthority.addNewField(5, testData.tags.tag260, '$a London', '1', '1');
      MarcAuthority.addNewField(6, testData.tags.tag520, '$a Added row');
      MarcAuthority.addNewField(7, testData.tags.tag655, '$b Added row', '1', '/');
      MarcAuthority.addNewField(8, testData.tags.tag655, '$b Different row', '1', '/');
      MarcAuthority.addNewField(9, testData.tags.tag655, '$b Row without indicator', '1', '/');
      MarcAuthority.addNewField(10, testData.tags.tag755, '$b Different row', '1', '/');
      QuickMarcEditor.pressSaveAndClose();
      QuickMarcEditor.checkAfterSaveAndClose();
      cy.visit(SettingsMenu.marcFieldProtectionPath);
      MarcFieldProtection.verifyListOfExistingSettingsIsDisplayed();
      protectedFields.forEach((field) => {
        MarcFieldProtection.clickNewButton();
        MarcFieldProtection.fillMarcFieldProtection(field);
        MarcFieldProtection.save();
        cy.wait(1000);
        MarcFieldProtection.verifyFieldProtectionIsCreated(field.protectedField);
      });
      cy.go('back');
      InventoryInstance.editMarcBibliographicRecord();
      MarcAuthority.checkInfoButton('001');
      MarcAuthority.checkInfoButton('999');
      MarcAuthority.checkInfoButton('245');
      MarcAuthority.checkInfoButton('260');
      MarcAuthority.checkInfoButton('520', 7);
      MarcAuthority.checkInfoButton('655', 8);
      MarcAuthority.updateDataByRowIndex(6, 'Updated protected row content');
      MarcAuthority.updateDataByRowIndex(7, 'Updated protected row content');
      MarcAuthority.updateDataByRowIndex(8, 'Updated protected row content');
      MarcAuthority.updateDataByRowIndex(30, 'Updated protected row content');
      QuickMarcEditor.pressSaveAndClose();
      InventoryInstance.viewSource();
      InventoryViewSource.verifyFieldInMARCBibSource('245\t', 'Updated protected row content');
      InventoryViewSource.verifyFieldInMARCBibSource('260\t', 'Updated protected row content');
      InventoryViewSource.verifyFieldInMARCBibSource('520\t', 'Updated protected row content');
      InventoryViewSource.verifyFieldInMARCBibSource('655\t', 'Updated protected row content');
    },
  );
});
