import getRandomPostfix from '../../support/utils/stringTools';
import permissions from '../../support/dictionary/permissions';
import TestTypes from '../../support/dictionary/testTypes';
import DevTeams from '../../support/dictionary/devTeams';
import TopMenu from '../../support/fragments/topMenu';
import SettingsMenu from '../../support/fragments/settingsMenu';
import DataImport from '../../support/fragments/data_import/dataImport';
import JobProfiles from '../../support/fragments/data_import/job_profiles/jobProfiles';
import Logs from '../../support/fragments/data_import/logs/logs';
import FileDetails from '../../support/fragments/data_import/logs/fileDetails';
import MarcFieldProtection from '../../support/fragments/settings/dataImport/marcFieldProtection';
import Z3950TargetProfiles from '../../support/fragments/settings/inventory/z39.50TargetProfiles';
import InventorySearch from '../../support/fragments/inventory/inventorySearch';
import InventoryInstance from '../../support/fragments/inventory/inventoryInstance';
import InventoryEditMarcRecord from '../../support/fragments/inventory/inventoryEditMarcRecord';
import InventoryViewSource from '../../support/fragments/inventory/inventoryViewSource';
import Users from '../../support/fragments/users/users';
import InventoryInstances from '../../support/fragments/inventory/inventoryInstances';

describe('ui-data-import: Check that protected fields in incoming records are not deleted during import: Scenario 2', () => {
  let user = null;
  let instanceHrid = null;
  const authentication = '100473910/PAOLF';
  const oclcForImport = '19257462';
  const marcFields = [580, 780, 785];

  before(() => {
    cy.createTempUser([
      permissions.moduleDataImportEnabled.gui,
      permissions.settingsDataImportEnabled.gui,
      permissions.uiInventorySettingsConfigureSingleRecordImport.gui,
      permissions.uiQuickMarcQuickMarcBibliographicEditorAll.gui,
      permissions.inventoryAll.gui,
      permissions.uiInventorySingleRecordImport.gui,
      permissions.uiInventoryViewCreateEditInstances.gui
    ])
      .then(userProperties => {
        user = userProperties;

        cy.login(user.username, user.password, { path: TopMenu.dataImportPath, waiter: DataImport.waitLoading });

        const fileName = `C358968autotestFile.${getRandomPostfix()}.mrc`;

        Z3950TargetProfiles.changeOclcWorldCatToDefaultViaApi();
        DataImport.uploadFile('Test_file_with_856_field.mrc', fileName);
        JobProfiles.searchJobProfileForImport('Default - Create instance and SRS MARC Bib');
        JobProfiles.runImportFile(fileName);
        Logs.checkStatusOfJobProfile('Completed');
        Logs.openFileDetails(fileName);
        [FileDetails.columnName.srsMarc,
          FileDetails.columnName.instance].forEach(columnName => {
          FileDetails.checkStatusInColumn(FileDetails.status.created, columnName);
        });
        FileDetails.checkSrsRecordQuantityInSummaryTable('1');
        FileDetails.checkInstanceQuantityInSummaryTable('1');

        // get Instance HRID through API
        InventorySearch.getInstanceHRID()
          .then(hrId => {
            instanceHrid = hrId;
          });
      });
  });

  after(() => {
    MarcFieldProtection.getListOfMarcFieldProtectionViaApi({ query: '"field"=="*"' })
      .then(list => {
        list.forEach(({ id }) => MarcFieldProtection.deleteMarcFieldProtectionViaApi(id));
      });
    Z3950TargetProfiles.changeOclcWorldCatToDefaultViaApi();
    cy.getInstance({ limit: 1, expandAll: true, query: `"hrid"=="${instanceHrid}"` })
      .then((instance) => {
        InventoryInstance.deleteInstanceViaApi(instance.id);
      });
    Users.deleteViaApi(user.userId);
  });

  it('C359189 Check that protected fields in incoming records are not deleted during import: Scenario 2 (folijet)', { tags: [TestTypes.smoke, DevTeams.folijet] }, () => {
    cy.visit(SettingsMenu.marcFieldProtectionPath);
    MarcFieldProtection.currentListOfProtectedMarcFieldsIsPresented();
    MarcFieldProtection.createNewMarcFieldProtection();
    MarcFieldProtection.fillMarcFieldProtection('*', '5', 'NcD');
    MarcFieldProtection.checkFieldProtectionIsCreated('NcD');

    cy.visit(SettingsMenu.targetProfilesPath);
    Z3950TargetProfiles.openOclcWorldCat();
    Z3950TargetProfiles.editOclcWorldCat(authentication);
    Z3950TargetProfiles.checkIsOclcWorldCatIsChanged(authentication);

    cy.visit(TopMenu.inventoryPath);
    InventoryInstances.importWithOclc(oclcForImport);
    // check fields is presented in .mrc file
    InventoryInstance.viewSource();
    InventoryViewSource.contains(`${marcFields[0]}\t`);
    // step 8

    InventoryViewSource.close();
    InventoryInstance.editMarcBibliographicRecord();
    InventoryEditMarcRecord.checkEditableQuickMarcFormIsOpened();
    InventoryEditMarcRecord.addField('580', 'Test $5 NcD');
    InventoryEditMarcRecord.editField('$t Acta chemica Scandinavica. Series A, Physical and inorganic chemistry $x 0302-4377 $w (DLC)sn 79006037 $w (OCoLC)981847 $5 NcD', '63');
    InventoryEditMarcRecord.editField('$t Dalton (Cambridge, England) $x 1470-479X $w (DLC)   00252543 $w (OCoLC)44000666 5', '70');
    InventoryEditMarcRecord.saveAndClose();
    InventoryInstance.startOverlaySourceBibRecord();
    InventoryInstance.singleRecordImportModalIsPresented();
    InventoryInstance.importWithOclc(oclcForImport);
    InventoryInstance.checkCalloutMessage(`Updated record ${oclcForImport}`);

    // step 15
    InventoryInstance.viewSource();
  });
});
