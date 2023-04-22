import getRandomPostfix from '../../../support/utils/stringTools';
import permissions from '../../../support/dictionary/permissions';
import TestTypes from '../../../support/dictionary/testTypes';
import DevTeams from '../../../support/dictionary/devTeams';
import SettingsMenu from '../../../support/fragments/settingsMenu';
import FieldMappingProfiles from '../../../support/fragments/data_import/mapping_profiles/fieldMappingProfiles';
import NewFieldMappingProfile from '../../../support/fragments/data_import/mapping_profiles/newFieldMappingProfile';
import NewActionProfile from '../../../support/fragments/data_import/action_profiles/newActionProfile';
import ActionProfiles from '../../../support/fragments/data_import/action_profiles/actionProfiles';
import JobProfiles from '../../../support/fragments/data_import/job_profiles/jobProfiles';
import NewJobProfile from '../../../support/fragments/data_import/job_profiles/newJobProfile';
import TopMenu from '../../../support/fragments/topMenu';
import DataImport from '../../../support/fragments/data_import/dataImport';
import Logs from '../../../support/fragments/data_import/logs/logs';
import FileDetails from '../../../support/fragments/data_import/logs/fileDetails';
import OrderLines from '../../../support/fragments/orders/orderLines';
import InstanceRecordView from '../../../support/fragments/inventory/instanceRecordView';
import Users from '../../../support/fragments/users/users';

describe('ui-data-import', () => {
  let user;
  const quantityOfItems = '1';
  // unique profile names
  const instanceMappingProfileName = `C380446 Test P/E mix open order with instance, holdings, item ${getRandomPostfix()}`;
  const holdingsMappingProfileName = `C380446 Create simple holdings for open order ${getRandomPostfix()}`;
  const itemMappingProfileName = `C380446 Create simple item for open order ${getRandomPostfix()}`;
  const instanceActionProfileName = `C380446 Test P/E mix open order with instance, holdings, item ${getRandomPostfix()}`;
  const holdingsActionProfileName = `C380446 Create simple holdings for open order ${getRandomPostfix()}`;
  const itemActionProfileName = `C380446 Create simple item for open order ${getRandomPostfix()}`;
  const jobProfileName = `C380446 Test P/E mix open order with instance, holdings, item ${getRandomPostfix()}`;
  const marcFileName = `C380446 autotest file ${getRandomPostfix()}`;

  const collectionOfMappingAndActionProfiles = [
    {
      mappingProfile: { name: instanceMappingProfileName,
        typeValue : NewFieldMappingProfile.folioRecordTypeValue.order,
        orderStatus: 'Open',
        approved: true,
        vendor: 'GOBI Library Solutions',
        title: '245$a',
        acquisitionMethod: 'Approval Plan',
        orderFormat: 'P/E Mix',
        receivingWorkflow: 'Synchronized',
        physicalUnitPrice: '20',
        quantityPhysical: '1',
        currency: 'USD',
        electronicUnitPrice: '25',
        quantityElectronic: '1',
        locationName: 'Annex (KU/CC/DI/A)',
        locationQuantityPhysical: '1',
        locationQuantityElectronic: '1' },
      actionProfile: { typeValue: NewActionProfile.folioRecordTypeValue.order,
        name: instanceActionProfileName }
    },
    {
      mappingProfile: { name: holdingsMappingProfileName,
        typeValue : NewFieldMappingProfile.folioRecordTypeValue.holdings,
        permanentLocation: '"Main Library (KU/CC/DI/M)"',
        permanentLocationUI:'Main Library' },
      actionProfile: { typeValue: NewActionProfile.folioRecordTypeValue.holdings,
        name: holdingsActionProfileName }
    },
    {
      mappingProfile: { name: itemMappingProfileName,
        typeValue : NewFieldMappingProfile.folioRecordTypeValue.item,
        materialType:'book',
        permanentLoanType: 'Course reserves',
        status: 'On order' },
      actionProfile: { typeValue: NewActionProfile.folioRecordTypeValue.item,
        name: itemActionProfileName }
    },
  ];
  const jobProfile = {
    ...NewJobProfile.defaultJobProfile,
    profileName: jobProfileName,
  };

  before('create test data', () => {
    cy.createTempUser([
      permissions.settingsDataImportEnabled.gui,
      permissions.moduleDataImportEnabled.gui,
      permissions.viewOrganization.gui,
      permissions.inventoryAll.gui,
      permissions.uiOrdersView.gui
    ])
      .then(userProperties => {
        user = userProperties;
        cy.login(user.username, user.password, { path: SettingsMenu.mappingProfilePath, waiter: FieldMappingProfiles.waitLoading });
      });
  });

  //   after('delete test data', () => {

  //   });

  it('C380446 Import to create open orders: P/E mix with Instances, Holdings, Items (folijet)',
    { tags: [TestTypes.smoke, DevTeams.folijet] }, () => {
      // create mapping profiles
      FieldMappingProfiles.openNewMappingProfileForm();
      NewFieldMappingProfile.fillOrderMappingProfile(collectionOfMappingAndActionProfiles[0].mappingProfile);
      FieldMappingProfiles.saveProfile();
      FieldMappingProfiles.closeViewModeForMappingProfile(collectionOfMappingAndActionProfiles[0].mappingProfile.name);

      FieldMappingProfiles.openNewMappingProfileForm();
      NewFieldMappingProfile.fillSummaryInMappingProfile(collectionOfMappingAndActionProfiles[1].mappingProfile);
      NewFieldMappingProfile.fillPermanentLocation(collectionOfMappingAndActionProfiles[1].mappingProfile.permanentLocation);
      FieldMappingProfiles.saveProfile();
      FieldMappingProfiles.closeViewModeForMappingProfile(collectionOfMappingAndActionProfiles[1].mappingProfile.name);

      FieldMappingProfiles.openNewMappingProfileForm();
      NewFieldMappingProfile.fillSummaryInMappingProfile(collectionOfMappingAndActionProfiles[2].mappingProfile);
      NewFieldMappingProfile.fillMaterialType(collectionOfMappingAndActionProfiles[2].mappingProfile.materialType);
      NewFieldMappingProfile.fillPermanentLoanType(collectionOfMappingAndActionProfiles[2].mappingProfile.permanentLoanType);
      NewFieldMappingProfile.fillStatus(collectionOfMappingAndActionProfiles[2].mappingProfile.status);
      FieldMappingProfiles.saveProfile();
      FieldMappingProfiles.closeViewModeForMappingProfile(collectionOfMappingAndActionProfiles[2].mappingProfile.name);

      // create action profiles
      collectionOfMappingAndActionProfiles.forEach(profile => {
        cy.visit(SettingsMenu.actionProfilePath);
        ActionProfiles.create(profile.actionProfile, profile.mappingProfile.name);
        ActionProfiles.checkActionProfilePresented(profile.actionProfile.name);
      });

      // create job profile
      cy.visit(SettingsMenu.jobProfilePath);
      JobProfiles.createJobProfile(jobProfile);
      NewJobProfile.linkActionProfile(collectionOfMappingAndActionProfiles[0].actionProfile);
      NewJobProfile.linkActionProfileByName('Default - Create instance');
      NewJobProfile.linkActionProfile(collectionOfMappingAndActionProfiles[1].actionProfile);
      NewJobProfile.linkActionProfile(collectionOfMappingAndActionProfiles[2].actionProfile);
      NewJobProfile.saveAndClose();
      JobProfiles.checkJobProfilePresented(jobProfile.profileName);

      cy.visit(TopMenu.dataImportPath);
      // TODO delete reload after fix https://issues.folio.org/browse/MODDATAIMP-691
      cy.reload();
      DataImport.uploadFile('marcFileForC380446.mrc', marcFileName);
      JobProfiles.searchJobProfileForImport(jobProfile.profileName);
      JobProfiles.runImportFile();
      JobProfiles.waitFileIsImported(marcFileName);
      Logs.checkStatusOfJobProfile('Completed');
      Logs.openFileDetails(marcFileName);
      [FileDetails.columnName.srsMarc,
        FileDetails.columnName.instance,
        FileDetails.columnName.holdings,
        FileDetails.columnName.item
      ].forEach(columnName => {
        FileDetails.checkStatusInColumn(FileDetails.status.created, columnName);
      });
      FileDetails.checkItemQuantityInSummaryTable(quantityOfItems);
      FileDetails.openOrderInInventory('Created');

      OrderLines.waitLoading();
      OrderLines.checkCreateInventory();
      OrderLines.openLinkedInstance();
      InstanceRecordView.verifyInstanceRecordViewOpened();
      InstanceRecordView.verifyLinkedPOL();
      InstanceRecordView.verifyIsHoldingsCreated(['Main Library >']);
      // step 29-31
    });
});
