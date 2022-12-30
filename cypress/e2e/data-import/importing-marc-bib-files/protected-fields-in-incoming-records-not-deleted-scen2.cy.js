import getRandomPostfix from '../../../support/utils/stringTools';
import permissions from '../../../support/dictionary/permissions';
import TestTypes from '../../../support/dictionary/testTypes';
import DevTeams from '../../../support/dictionary/devTeams';
import TopMenu from '../../../support/fragments/topMenu';
import SettingsMenu from '../../../support/fragments/settingsMenu';
import DataImport from '../../../support/fragments/data_import/dataImport';
import JobProfiles from '../../../support/fragments/data_import/job_profiles/jobProfiles';
import Logs from '../../../support/fragments/data_import/logs/logs';
import FileDetails from '../../../support/fragments/data_import/logs/fileDetails';
import MarcFieldProtection from '../../../support/fragments/settings/dataImport/marcFieldProtection';
import Z3950TargetProfiles from '../../../support/fragments/settings/inventory/z39.50TargetProfiles';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import InventoryEditMarcRecord from '../../../support/fragments/inventory/inventoryEditMarcRecord';
import InventoryViewSource from '../../../support/fragments/inventory/inventoryViewSource';
import Users from '../../../support/fragments/users/users';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';

describe('ui-data-import: Check that protected fields in incoming records are not deleted during import: Scenario 2', () => {
  let user = null;
  let instanceHrid = null;
  const authentication = '100473910/PAOLF';
  const oclcForImport = '19257462';

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

        const fileName = `C359189autotestFile.${getRandomPostfix()}.mrc`;

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
        InventorySearchAndFilter.getInstanceHRID()
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
    InventoryViewSource.contains('Merged with: Journal of the Chemical Society. Perkin transactions I; Journal of the Chemical Society. Perkin transactions II; and Journal of the Chemical Society. Dalton transactions, to form: Perkin 1; Perkin 2; and Dalton (Cambridge, England).');
    InventoryViewSource.contains('Acta chemica Scandinavica. Series A, Physical and inorganic chemistry');
    InventoryViewSource.contains('Acta chemica Scandinavica. Series B, Organic chemistry and biochemistry');
    InventoryViewSource.contains('Journal of the Chemical Society. Perkin transactions I');
    InventoryViewSource.contains('Journal of the Chemical Society. Perkin transactions II');
    InventoryViewSource.contains('Journal of the Chemical Society. Dalton transactions');
    InventoryViewSource.contains('Perkin 1');
    InventoryViewSource.contains('Perkin 2');
    InventoryViewSource.contains('Dalton (Cambridge, England)');
    InventoryViewSource.close();
    // edit the MARC bibliographic record
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
    // check fields is presented in .mrc file
    InventoryInstance.viewSource();
    InventoryViewSource.contains('Test ‡5 NcD');
    InventoryViewSource.contains(' Acta chemica Scandinavica. Series A, Physical and inorganic chemistry ‡x 0302-4377 ‡w (DLC)sn 79006037 ‡w (OCoLC)981847 ‡5 NcD');
    // step 15 785 tags with a $5 of NcD should still be in the record (One 580, one 780, five 785s)
    InventoryViewSource.contains('Merged with: Journal of the Chemical Society. Perkin transactions I; Journal of the Chemical Society. Perkin transactions II; and Journal of the Chemical Society. Dalton transactions, to form: Perkin 1; Perkin 2; and Dalton (Cambridge, England).');
    InventoryViewSource.contains('Acta chemica Scandinavica. Series A, Physical and inorganic chemistry ‡x 0302-4377 ‡w (DLC)sn 79006037 ‡w (OCoLC)981847');
    InventoryViewSource.contains('Acta chemica Scandinavica. Series B, Organic chemistry and biochemistry ‡x 0302-4369 ‡w (DLC)sn 78006299 ‡w (OCoLC)981837');
    InventoryViewSource.contains('Journal of the Chemical Society. Perkin transactions I ‡x 0300-922X ‡w (DLC)  2006219014 ‡w (OCoLC)1033975');
    InventoryViewSource.contains('Journal of the Chemical Society. Perkin transactions II ‡x 0300-9580 ‡w (DLC)   72623335 ‡w (OCoLC)1064266');
    InventoryViewSource.contains('Journal of the Chemical Society. Dalton transactions ‡x 0300-9246 ‡w (DLC)   72624566 ‡w (OCoLC)1034240');
    InventoryViewSource.contains('Perkin 1 ‡x 1470-4358 ‡w (DLC)   00252538 ‡w (OCoLC)44000773');
    InventoryViewSource.contains('Perkin 2 ‡x 1470-1820 ‡w (DLC)   00214936 ‡w (OCoLC)44000837');
    InventoryViewSource.contains('Dalton (Cambridge, England) ‡x 1470-479X ‡w (DLC)   00252543 ‡w (OCoLC)44000666');
  });
});
