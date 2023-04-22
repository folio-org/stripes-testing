/* eslint-disable cypress/no-unnecessary-waiting */
import TestTypes from '../../../../support/dictionary/testTypes';
import DevTeams from '../../../../support/dictionary/devTeams';
import permissions from '../../../../support/dictionary/permissions';
import Helper from '../../../../support/fragments/finance/financeHelper';
import SettingsMenu from '../../../../support/fragments/settingsMenu';
import FieldMappingProfiles from '../../../../support/fragments/data_import/mapping_profiles/fieldMappingProfiles';
import NewFieldMappingProfile from '../../../../support/fragments/data_import/mapping_profiles/newFieldMappingProfile';
import ActionProfiles from '../../../../support/fragments/data_import/action_profiles/actionProfiles';
import NewActionProfile from '../../../../support/fragments/data_import/action_profiles/newActionProfile';
import NewMatchProfile from '../../../../support/fragments/data_import/match_profiles/newMatchProfile';
import MatchProfiles from '../../../../support/fragments/data_import/match_profiles/matchProfiles';
import JobProfiles from '../../../../support/fragments/data_import/job_profiles/jobProfiles';
import NewJobProfile from '../../../../support/fragments/data_import/job_profiles/newJobProfile';
import ExportFieldMappingProfiles from '../../../../support/fragments/data-export/exportMappingProfile/exportFieldMappingProfiles';
import ExportJobProfiles from '../../../../support/fragments/data-export/exportJobProfile/exportJobProfiles';
import DataImport from '../../../../support/fragments/data_import/dataImport';
import Logs from '../../../../support/fragments/data_import/logs/logs';
import FileDetails from '../../../../support/fragments/data_import/logs/fileDetails';
import TopMenu from '../../../../support/fragments/topMenu';
import ItemRecordView from '../../../../support/fragments/inventory/itemRecordView';
import ItemActions from '../../../../support/fragments/inventory/inventoryItem/itemActions';
import InventorySearchAndFilter from '../../../../support/fragments/inventory/inventorySearchAndFilter';
import ExportFile from '../../../../support/fragments/data-export/exportFile';
import FileManager from '../../../../support/utils/fileManager';
import StatisticalCodes from '../../../../support/fragments/settings/inventory/instance-holdings-item/statisticalCodes';
import Users from '../../../../support/fragments/users/users';

describe('ui-data-import', () => {
  let user;
  let statisticalCode;
  const titlesItemsStatusChanged = [
    'Making the news popular : mobilizing U.S. news audiences / Anthony M. Nadler.',
    'Genius : the game / Leopoldo Gout.',
    'Animal philosophy : essential readings in continental thought / edited by Matthew Calarco and Peter Atterton.'
  ];
  const titlesItemStatusNotChanged = [
    'Political communication in the age of dissemination.',
    'Language, borders and identity / edited by Dominic Watt and Carmen Llamas.'
  ];
  const itemNote = 'THIS WAS UPDATED!';

  // unique profile names
  const jobProfileNameForCreate = `C357552 Create simple instance, holdings, items ${Helper.getRandomBarcode()}`;
  const jobProfileNameForUpdate = `C357552 Update item based on HRID and Status ${Helper.getRandomBarcode()}`;
  const matchProfileNameForMatchOnItemHrid = `C357552 Match 902$a to Item HRID ${Helper.getRandomBarcode()}`;
  const matchProfileNameForMatchOnItemStatus = `C357552 Item status = Available ${Helper.getRandomBarcode()}`;
  const actionProfileNameForHoldings = `C357552 Create simple holdings ${Helper.getRandomBarcode()}`;
  const actionProfileNameForCreateItem = `C357552 Create simple items ${Helper.getRandomBarcode()}`;
  const actionProfileNameForUpdateItem = `C357552 Update simple items ${Helper.getRandomBarcode()}`;
  const mappingProfileNameForHoldings = `C357552 Create simple holdings ${Helper.getRandomBarcode()}`;
  const mappingProfileNameForCreateItem = `C357552 Create simple items ${Helper.getRandomBarcode()}`;
  const mappingProfileNameForUpdateItem = `C357552 Update Item by POL match ${Helper.getRandomBarcode()}`;
  const mappingProfileNameForExport = `C357552 Item HRID ${Helper.getRandomBarcode()}`;
  const jobProfileNameForExport = `C357552 Bibs with Item HRIDs ${Helper.getRandomBarcode()}`;

  // file names
  const nameMarcFileForImportCreate = `C357552autotestFile.${Helper.getRandomBarcode()}.mrc`;
  const nameForCSVFile = `C357552autotestFile${Helper.getRandomBarcode()}.csv`;
  const nameMarcFileForUpdate = `C357552autotestFile${Helper.getRandomBarcode()}.mrc`;

  const collectionOfMappingAndActionProfiles = [
    {
      mappingProfile: { typeValue: NewFieldMappingProfile.folioRecordTypeValue.holdings,
        name: mappingProfileNameForHoldings },
      actionProfile: { typeValue: NewActionProfile.folioRecordTypeValue.holdings,
        name: actionProfileNameForHoldings,
        action: 'Create (all record types except MARC Authority or MARC Holdings)' }
    },
    {
      mappingProfile: { typeValue: NewFieldMappingProfile.folioRecordTypeValue.item,
        name: mappingProfileNameForCreateItem },
      actionProfile: { typeValue: NewActionProfile.folioRecordTypeValue.item,
        name: actionProfileNameForCreateItem,
        action: 'Create (all record types except MARC Authority or MARC Holdings)' }
    },
    {
      mappingProfile: { typeValue: NewFieldMappingProfile.folioRecordTypeValue.item,
        name: mappingProfileNameForUpdateItem },
      actionProfile: { typeValue: NewActionProfile.folioRecordTypeValue.item,
        name: actionProfileNameForUpdateItem,
        action: 'Update (all record types except Orders, Invoices, or MARC Holdings)' }
    }
  ];

  const matchProfileItemHrid = {
    profileName: matchProfileNameForMatchOnItemHrid,
    incomingRecordFields: {
      field: '902',
      in1: '*',
      in2: '*',
      subfield: 'a'
    },
    matchCriterion: 'Exactly matches',
    existingRecordType: 'ITEM',
    itemOption: NewMatchProfile.optionsList.itemHrid
  };

  const matchProfileItemStatus = {
    profileName: matchProfileNameForMatchOnItemStatus,
    incomingStaticValue: 'Available',
    matchCriterion: 'Exactly matches',
    existingRecordType: 'ITEM',
    itemOption: NewMatchProfile.optionsList.status,
  };

  const createJobProfile = {
    ...NewJobProfile.defaultJobProfile,
    profileName: jobProfileNameForCreate,
  };

  const updateJobProfile = {
    ...NewJobProfile.defaultJobProfile,
    profileName: jobProfileNameForUpdate,
  };

  const exportMappingProfile = {
    name: mappingProfileNameForExport,
  };

  before('create test data', () => {
    cy.createTempUser([
      permissions.moduleDataImportEnabled.gui,
      permissions.settingsDataImportEnabled.gui,
      permissions.dataExportEnableSettings.gui,
      permissions.inventoryAll.gui,
      permissions.uiInventoryMarcItemInProcess.gui,
      permissions.uiInventoryMarcItemIntellectual.gui,
      permissions.uiInventoryMarcItemLongMissing.gui,
      permissions.uiInventoryMarcItemRestricted.gui,
      permissions.uiInventoryMarcItemUnavailable.gui,
      permissions.uiInventoryMarcItemUnknow.gui,
      permissions.uiInventoryMarkItemsWithdrawn.gui,
      permissions.dataExportEnableApp.gui,
      permissions.settingsDataImportEnabled.gui
    ])
      .then(userProperties => {
        user = userProperties;

        StatisticalCodes.createViaApi().then((resp) => {
          statisticalCode = `ARL (Collection stats): ${resp.code} - ${resp.name}`;
        });
        cy.login(user.username, user.password,
          { path: SettingsMenu.mappingProfilePath, waiter: FieldMappingProfiles.waitLoading });
      });
  });

  after('delete test data', () => {
    Users.deleteViaApi(user.userId);
    // delete generated profiles
    JobProfiles.deleteJobProfile(jobProfileNameForCreate);
    JobProfiles.deleteJobProfile(jobProfileNameForUpdate);
    MatchProfiles.deleteMatchProfile(matchProfileNameForMatchOnItemHrid);
    MatchProfiles.deleteMatchProfile(matchProfileNameForMatchOnItemStatus);
    collectionOfMappingAndActionProfiles.forEach(profile => {
      ActionProfiles.deleteActionProfile(profile.actionProfile.name);
      FieldMappingProfiles.deleteFieldMappingProfile(profile.mappingProfile.name);
    });
    // delete downloads folder and created files in fixtures
    FileManager.deleteFolder(Cypress.config('downloadsFolder'));
    FileManager.deleteFile(`cypress/fixtures/${nameMarcFileForUpdate}`);
    FileManager.deleteFile(`cypress/fixtures/${nameForCSVFile}`);
  });

  const mappingProfileForCreateHoldings = (holdingsMappingProfile) => {
    FieldMappingProfiles.openNewMappingProfileForm();
    NewFieldMappingProfile.fillSummaryInMappingProfile(holdingsMappingProfile);
    NewFieldMappingProfile.addStatisticalCode(statisticalCode, 4);
    NewFieldMappingProfile.fillPermanentLocation('"Online (E)"');
    FieldMappingProfiles.saveProfile();
    FieldMappingProfiles.closeViewModeForMappingProfile(holdingsMappingProfile.name);
  };

  const mappingProfileForCreateItem = (itemMappingProfile) => {
    FieldMappingProfiles.openNewMappingProfileForm();
    NewFieldMappingProfile.fillSummaryInMappingProfile(itemMappingProfile);
    NewFieldMappingProfile.fillMaterialType();
    NewFieldMappingProfile.addStatisticalCode(statisticalCode, 6);
    NewFieldMappingProfile.fillPermanentLoanType('Can circulate');
    NewFieldMappingProfile.fillStatus('Available');
    FieldMappingProfiles.saveProfile();
    FieldMappingProfiles.closeViewModeForMappingProfile(itemMappingProfile.name);
  };

  const mappingProfileForUpdateItem = (itemMappingProfile) => {
    FieldMappingProfiles.openNewMappingProfileForm();
    NewFieldMappingProfile.fillSummaryInMappingProfile(itemMappingProfile);
    NewFieldMappingProfile.addItemNotes('"Note"', `"${itemNote}"`, 'Mark for all affected records');
    FieldMappingProfiles.saveProfile();
    FieldMappingProfiles.closeViewModeForMappingProfile(itemMappingProfile.name);
  };

  it('C357552 Check item update via match by status (folijet)',
    { tags: [TestTypes.criticalPath, DevTeams.folijet] }, () => {
      mappingProfileForCreateHoldings(collectionOfMappingAndActionProfiles[0].mappingProfile);
      FieldMappingProfiles.checkMappingProfilePresented(collectionOfMappingAndActionProfiles[0].mappingProfile.name);
      mappingProfileForCreateItem(collectionOfMappingAndActionProfiles[1].mappingProfile);
      FieldMappingProfiles.checkMappingProfilePresented(collectionOfMappingAndActionProfiles[1].mappingProfile.name);
      mappingProfileForUpdateItem(collectionOfMappingAndActionProfiles[2].mappingProfile);
      FieldMappingProfiles.checkMappingProfilePresented(collectionOfMappingAndActionProfiles[2].mappingProfile.name);

      collectionOfMappingAndActionProfiles.forEach(profile => {
        cy.visit(SettingsMenu.actionProfilePath);
        ActionProfiles.create(profile.actionProfile, profile.mappingProfile.name);
        ActionProfiles.checkActionProfilePresented(profile.actionProfile.name);
      });

      cy.visit(SettingsMenu.matchProfilePath);
      MatchProfiles.createMatchProfile(matchProfileItemHrid);
      MatchProfiles.checkMatchProfilePresented(matchProfileItemHrid.profileName);
      MatchProfiles.createMatchProfileWithStaticValue(matchProfileItemStatus);
      MatchProfiles.checkMatchProfilePresented(matchProfileItemStatus.profileName);

      cy.visit(SettingsMenu.jobProfilePath);
      JobProfiles.createJobProfile(createJobProfile);
      NewJobProfile.linkActionProfileByName('Default - Create instance');
      NewJobProfile.linkActionProfile(collectionOfMappingAndActionProfiles[0].actionProfile);
      NewJobProfile.linkActionProfile(collectionOfMappingAndActionProfiles[1].actionProfile);
      NewJobProfile.saveAndClose();
      JobProfiles.checkJobProfilePresented(jobProfileNameForCreate);

      // need to wait until the first job profile will be created
      cy.wait(2500);
      JobProfiles.createJobProfile(updateJobProfile);
      NewJobProfile.linkMatchProfile(matchProfileNameForMatchOnItemHrid);
      NewJobProfile.linkMatchProfileForMatches(matchProfileNameForMatchOnItemStatus);
      NewJobProfile.linkActionProfileForMatches(actionProfileNameForUpdateItem);
      NewJobProfile.saveAndClose();
      JobProfiles.checkJobProfilePresented(jobProfileNameForUpdate);

      // create Field mapping profile for export
      cy.visit(SettingsMenu.exportMappingProfilePath);
      ExportFieldMappingProfiles.createMappingProfileForItemHrid(exportMappingProfile.name);

      cy.visit(SettingsMenu.exportJobProfilePath);
      ExportJobProfiles.createJobProfile(jobProfileNameForExport, mappingProfileNameForExport);

      // upload a marc file for creating of the new instance, holding and item
      cy.visit(TopMenu.dataImportPath);
      // TODO delete reload after fix https://issues.folio.org/browse/MODDATAIMP-691
      cy.reload();
      DataImport.uploadFile('marcFileForC357552.mrc', nameMarcFileForImportCreate);
      JobProfiles.searchJobProfileForImport(jobProfileNameForCreate);
      JobProfiles.runImportFile();
      JobProfiles.waitFileIsImported(nameMarcFileForImportCreate);
      Logs.openFileDetails(nameMarcFileForImportCreate);
      for (let i = 0; i < 9; i++) {
        [FileDetails.columnName.srsMarc,
          FileDetails.columnName.instance,
          FileDetails.columnName.holdings,
          FileDetails.columnName.item].forEach(columnName => {
          FileDetails.checkStatusInColumn(FileDetails.status.created, columnName, i);
        });
      }
      [
        {
          lineNumber: 0,
          markFunction: ItemActions.markAsWithdrawn,
          status: 'Withdrawn'
        },
        {
          lineNumber: 3,
          markFunction: ItemActions.markAsInProcess,
          status: 'In process (non-requestable)'
        },
        {
          lineNumber: 7,
          markFunction: ItemActions.markAsUnknown,
          status: 'Unknown'
        }
      ].forEach(marker => {
        Logs.clickOnHotLink(marker.lineNumber, 5, 'Created');
        ItemRecordView.waitLoading();
        marker.markFunction();
        ItemRecordView.verifyItemStatusInPane(marker.status);
        cy.visit(TopMenu.dataImportPath);
        Logs.openFileDetails(nameMarcFileForImportCreate);
      });

      cy.visit(TopMenu.inventoryPath);
      InventorySearchAndFilter.switchToItem();
      InventorySearchAndFilter.filterItemByStatisticalCode(statisticalCode);
      InventorySearchAndFilter.saveUUIDs();
      ExportFile.downloadCSVFile(nameForCSVFile, 'SearchInstanceUUIDs*');

      // download exported marc file
      cy.visit(TopMenu.dataExportPath);
      ExportFile.uploadFile(nameForCSVFile);
      ExportFile.exportWithCreatedJobProfile(nameForCSVFile, jobProfileNameForExport);
      ExportFile.downloadExportedMarcFile(nameMarcFileForUpdate);

      // upload the exported marc file
      cy.visit(TopMenu.dataImportPath);
      // TODO delete reload after fix https://issues.folio.org/browse/MODDATAIMP-691
      cy.reload();
      DataImport.uploadExportedFile(nameMarcFileForUpdate);
      JobProfiles.searchJobProfileForImport(jobProfileNameForUpdate);
      JobProfiles.runImportFile();
      JobProfiles.waitFileIsImported(nameMarcFileForUpdate);
      Logs.openFileDetails(nameMarcFileForUpdate);
      FileDetails.checkItemQuantityInSummaryTable('7', 1);
      FileDetails.checkItemQuantityInSummaryTable('3', 2);
      // check items what statuses were not changed have Updated status
      titlesItemStatusNotChanged.forEach(title => {
        FileDetails.openItemInInventoryByTitle(title);
        ItemRecordView.waitLoading();
        ItemRecordView.checkItemNote(itemNote);
        cy.visit(TopMenu.dataImportPath);
        Logs.openFileDetails(nameMarcFileForUpdate);
      });
      // check items what statuses were changed have Discarded status
      titlesItemsStatusChanged.forEach(title => {
        FileDetails.checkStatusByTitle(title, 'Discarded');
      });
    });
});
